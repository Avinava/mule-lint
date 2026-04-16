# Event-Driven Architecture Patterns

> **Applies to:** Event-Driven (Platform Events, Anypoint MQ, Kafka)  
> **Related Rules:** `SF-001` · `SF-002` · `MULE-003` · `MULE-007`  
> **Last Updated:** April 2026

## When to Read This

Read this when building Mule applications triggered by Salesforce Platform Events, Anypoint MQ messages, Kafka topics, or any asynchronous event source — as opposed to HTTP request/response APIs.

---

## Key Differences from HTTP APIs

| Aspect             | HTTP API                               | Event-Driven                                                         |
| ------------------ | -------------------------------------- | -------------------------------------------------------------------- |
| **Trigger**        | `http:listener` + `apikit:router`      | `salesforce:replay-channel-listener`, `anypoint-mq:subscriber`, etc. |
| **Error response** | JSON → HTTP response with `httpStatus` | Writeback to source system + notification dispatch                   |
| **Correlation ID** | From `x-correlation-id` header         | From event metadata (e.g., `EventUuid`)                              |
| **RAML/AsyncAPI**  | RAML 1.0 or OAS 3.0                    | AsyncAPI 2.6 (recommended for 2026+)                                 |
| **Retry**          | Client retries (HTTP 5xx)              | Platform replay / redelivery policies                                |
| **Rate limiting**  | API Manager policies                   | Consumer `maxConcurrency` + back-pressure                            |

---

## Patterns

### Pattern 1: Salesforce Platform Event Listener

**Use when:** integrating with Salesforce real-time events (Change Data Capture, Custom Platform Events).

```xml
<!-- listeners/sf-account-event-listener.xml -->
<flow name="sf-account-event-listener">
    <salesforce:replay-channel-listener
        config-ref="Salesforce_Config"
        channel="/event/Account_Event__e"
        replayOption="LATEST"
        doc:name="Account Event Listener">
        <reconnection>
            <reconnect-forever frequency="5000"/>
        </reconnection>
    </salesforce:replay-channel-listener>

    <!-- Set standard variables from event metadata -->
    <ee:transform doc:name="Set Variables">
        <ee:variables>
            <ee:set-variable variableName="correlationId"><![CDATA[
                payload.EventUuid default correlationId
            ]]></ee:set-variable>
            <ee:set-variable variableName="logCategory"><![CDATA[
                "com.myorg.papi"
            ]]></ee:set-variable>
            <ee:set-variable variableName="salesforceId"><![CDATA[
                payload.Record_Id__c default ""
            ]]></ee:set-variable>
        </ee:variables>
    </ee:transform>

    <logger level="INFO" category="#[vars.logCategory]"
            message='#["[" ++ vars.correlationId ++ "] Account event received"]'/>

    <flow-ref name="account-process-subflow"/>

    <error-handler ref="global-error-handler"/>
</flow>
```

**Key rules:**

- Always set `reconnect-forever` on event listeners — they must auto-recover from disconnects
- Use `replayOption="LATEST"` for new events; `EARLIEST` replays all cached events (24h window)
- Null-guard event payload fields — platform events can contain `null` values for optional fields

### Pattern 2: Entity Process Sub-flow

**Use when:** processing events by entity type (Account, Contact, Opportunity, etc.).

Each entity gets its own process sub-flow that:

1. Reads entity configuration from `entity-config/{entity}.yaml`
2. Transforms SF event payload to target system format (DWL)
3. Calls the downstream SAPI
4. Calls writeback on success

```xml
<!-- entities/account-process.xml -->
<sub-flow name="account-process-subflow">
    <ee:transform doc:name="SF Account → NS Customer">
        <ee:message>
            <ee:set-payload resource="dwl/transforms/sf-account-to-ns-customer.dwl"/>
        </ee:message>
    </ee:transform>
    <flow-ref name="sapi-request-subflow"/>
    <flow-ref name="sf-writeback-subflow"/>
</sub-flow>
```

### Pattern 3: `initialState` Configuration

**Use when:** an entity integration is not yet ready for production but you want the flow scaffolded.

```xml
<!-- Set initialState="stopped" to disable at startup -->
<flow name="sf-order-event-listener" initialState="stopped">
    <salesforce:replay-channel-listener channel="/event/Order_Event__e" .../>
    <!-- ... -->
</flow>
```

Change to `initialState="started"` (or remove the attribute) when the entity is ready.

### Pattern 4: Event Deduplication

**Use when:** platform events may be replayed and you need exactly-once processing.

```xml
<!-- Use ObjectStore to track processed events by correlationId -->
<os:contains key="#[vars.correlationId]" objectStore="Event_Store"
             target="alreadyProcessed"/>
<choice>
    <when expression="#[vars.alreadyProcessed]">
        <logger category="com.myorg" message="Duplicate event, skipping"/>
    </when>
    <otherwise>
        <!-- Process the event -->
        <flow-ref name="account-process-subflow"/>
        <!-- Mark as processed -->
        <os:store key="#[vars.correlationId]" objectStore="Event_Store">
            <os:value>#[now()]</os:value>
        </os:store>
    </otherwise>
</choice>
```

### Pattern 5: Anypoint MQ Consumer

**Use when:** using Anypoint MQ for decoupled, asynchronous message processing.

```xml
<anypoint-mq:subscriber config-ref="MQ_Config"
    destination="orders-queue"
    acknowledgementMode="MANUAL">
    <reconnection>
        <reconnect-forever frequency="5000"/>
    </reconnection>
</anypoint-mq:subscriber>

<!-- Process message -->
<try>
    <flow-ref name="process-order-subflow"/>
    <anypoint-mq:ack config-ref="MQ_Config"/>
    <error-handler>
        <on-error-continue type="ANY">
            <logger level="ERROR" message="#[error.description]"/>
            <!-- Message returns to queue for redelivery -->
        </on-error-continue>
    </error-handler>
</try>
```

**Key rules:**

- Configure Dead Letter Queues (DLQ) for undeliverable messages
- Use `MANUAL` acknowledgment for business-critical flows
- Set redelivery policies to avoid infinite retry loops

### Pattern 6: VM Queue Dispatcher (Multi-Entity Orchestration)

**Use when:** a Process API handles 5+ entity types from mixed trigger sources (SF push topics, platform events, schedulers, ERP polling) and you need centralized routing with back-pressure control.

**Do NOT use when:** you have a simple 2–3 entity integration (direct listener → process is simpler), or you already use Anypoint MQ / Kafka externally (don't add a second internal queue).

**Decision: Direct vs. Queue-Mediated**

| Scenario                    | Direct? | Queue? | Why                                   |
| --------------------------- | ------- | ------ | ------------------------------------- |
| 2–3 entity SAPI             | ✅      | ❌     | Unnecessary indirection               |
| 5+ entities, mixed triggers | ❌      | ✅     | Centralized routing, back-pressure    |
| Strict ordering required    | ❌      | ✅     | `maxConcurrency="1"` ensures ordering |
| Already using Anypoint MQ   | ✅      | ❌     | Use external queue instead            |

**Architecture:**

```
Listeners (sf-listeners.xml, schedulers.xml)
    ↓ Transform → { message: payload, recordType: "Check__c" }
    ↓ vm:publish → "jobQueue" (PERSISTENT)

VM Queue Listener (vm-queue-listeners.xml, maxConcurrency="1")
    ↓ vm:listener → extract recordType + payload
    ↓ choice → route by recordType to implementation flow
```

**Message contract — every queue message uses this shape:**

```xml
<ee:transform doc:name="Wrap Queue Message">
    <ee:set-payload><![CDATA[%dw 2.0
output application/java
---
{
    message: payload,
    "recordType": "Check__c"
}]]></ee:set-payload>
</ee:transform>
<vm:publish queueName="jobQueue" config-ref="VM_Config" sendCorrelationId="AUTO"/>
```

**Queue consumer with choice router:**

```xml
<flow name="job-queue-listener" maxConcurrency="1">
    <vm:listener queueName="jobQueue" config-ref="VM_Config" numberOfConsumers="2"/>
    <set-variable variableName="recordType" value="#[payload.recordType]"/>
    <set-payload value="#[payload.message]"/>
    <choice>
        <when expression='#[vars.recordType == "Check__c"]'>
            <flow-ref name="processCheckFlow"/>
        </when>
        <when expression='#[vars.recordType == "Invoice__c"]'>
            <flow-ref name="processInvoiceFlow"/>
        </when>
        <!-- Additional record types -->
    </choice>
</flow>
```

**Key rules:**

- Use `queueType="PERSISTENT"` — messages survive app restarts on CloudHub 2.0
- Set `maxConcurrency` on the consumer flow to control throughput
- Variable setup (correlationId, logCategory) moves to the **consumer**, not the listener
- For high-volume entities, consider a separate queue (e.g., `scheduledJobQueue`) to avoid head-of-line blocking

### Pattern 7: Scheduler Watermarking with ObjectStore

**Use when:** a scheduler polls an external system for records modified since the last run. Fundamentally different from Pattern 4 (deduplication): deduplication tracks "have I seen this ID?", watermarking tracks "give me everything changed since timestamp X".

**Do NOT use when:** the trigger is push-based (platform events, MQ) — those systems handle replay/redelivery natively.

| Scenario                                 | Watermark? | Why                                   |
| ---------------------------------------- | ---------- | ------------------------------------- |
| Scheduler polls ERP for modified records | ✅         | Only fetch incremental changes        |
| Platform Event listener                  | ❌         | Built-in replay (24h window)          |
| Anypoint MQ consumer                     | ❌         | Redelivery handled by MQ              |
| HTTP-triggered on-demand sync            | ❌         | Request-response, no persistent state |

```xml
<flow name="invoiceScheduler">
    <scheduler>
        <scheduling-strategy>
            <fixed-frequency frequency="${scheduler.frequency}" timeUnit="MINUTES"/>
        </scheduling-strategy>
    </scheduler>

    <!-- 1. Retrieve watermark (seeds with now() on first run) -->
    <os:retrieve key="invoiceTimestamp" objectStore="timestamp-store"
                 target="invoiceTimestamp">
        <os:default-value>#[now()]</os:default-value>
    </os:retrieve>

    <!-- 2. Store NEW timestamp BEFORE query (gap-free) -->
    <os:store key="invoiceTimestamp" objectStore="timestamp-store">
        <os:value>#[now() default vars.invoiceTimestamp]</os:value>
    </os:store>

    <!-- 3. Query for records modified after watermark -->
    <http:request method="GET" path="/api/invoices">
        <http:query-params>#[{ "modifiedAfter": vars.invoiceTimestamp }]</http:query-params>
    </http:request>

    <!-- 4. Process records... -->

    <error-handler>
        <on-error-propagate>
            <!-- ROLL BACK timestamp on failure — records will be re-fetched -->
            <os:store key="invoiceTimestamp" objectStore="timestamp-store">
                <os:value>#[vars.invoiceTimestamp]</os:value>
            </os:store>
            <flow-ref name="errorLogFlow"/>
        </on-error-propagate>
    </error-handler>
</flow>
```

**Key design decisions:**

1. **Store timestamp BEFORE query, not after** — prevents gap where records modified between query and store are missed
2. **Roll back on error** — `on-error-propagate` restores the previous timestamp so next run re-fetches
3. **TTL on ObjectStore** — set `entryTtl` and `expirationInterval` to prevent unbounded growth
4. **Round-robin for multiple schedulers** — if you have check, invoice, and credit memo schedulers, wrap them in `<round-robin>` under a single `<scheduler>` to prevent overlapping runs

### Pattern 8: Deferred Task Polling (Async API Integration)

**Use when:** calling APIs that return a deferred/async task ID instead of an immediate result (common with financial, bulk, and provisioning APIs). You must poll a status endpoint until the task completes.

**Do NOT use when:** the API returns results synchronously, or when a webhook/callback is available (register the callback instead).

| Scenario                         | Use Polling?                        | Why                            |
| -------------------------------- | ----------------------------------- | ------------------------------ |
| API returns deferred task ID     | ✅                                  | Must poll for completion       |
| API returns result synchronously | ❌                                  | No polling needed              |
| Webhook/callback available       | ❌                                  | Event-driven is more efficient |
| Task runs > 10 minutes           | ⚠️ Consider scheduler-based polling | May exceed Mule flow timeout   |

**The pattern uses `raise-error` to drive `until-successful` as a polling loop:**

```xml
<flow name="pollTaskStatusSubFlow">
    <set-variable value="#[0]" variableName="retryCount"/>
    <set-variable value='#[p("polling.max_retries") default "10"]'
                  variableName="maxRetries"/>

    <until-successful maxRetries="#[vars.maxRetries]"
                      millisBetweenRetries="#[vars.retryInterval]">

        <http:request method="GET" path="#[vars.pollPath]"
                      target="statusResponse" sendBodyMode="NEVER"/>

        <set-variable value="#[vars.retryCount + 1]" variableName="retryCount"/>

        <choice>
            <when expression="#[vars.statusResponse.status == 'SUCCESS'
                             or vars.statusResponse.status == 'FAILED']">
                <!-- Terminal state — exit loop -->
            </when>
            <otherwise>
                <!-- Still pending — throw to trigger until-successful retry -->
                <raise-error type="APP:TASK_PENDING"
                             description="Task still pending"/>
            </otherwise>
        </choice>
    </until-successful>

    <!-- Build structured result -->
    <ee:transform>
        <ee:set-payload><![CDATA[%dw 2.0
output application/json
---
{
    status: vars.statusResponse.status,
    taskId: vars.taskId,
    attempts: vars.retryCount,
    data: vars.statusResponse.data default {},
    message: if (vars.statusResponse.status == "SUCCESS") "Task completed"
             else "Task failed: " ++ (vars.statusResponse.data.error default "")
}]]></ee:set-payload>
    </ee:transform>

    <error-handler>
        <on-error-continue type="MULE:RETRY_EXHAUSTED">
            <!-- Timeout — max retries exceeded -->
            <ee:transform>
                <ee:set-payload><![CDATA[%dw 2.0
output application/json
---
{
    status: "TIMEOUT",
    taskId: vars.taskId,
    attempts: vars.retryCount,
    data: {},
    message: "Polling timed out after " ++ vars.retryCount ++ " attempts"
}]]></ee:set-payload>
            </ee:transform>
        </on-error-continue>
    </error-handler>
</flow>
```

**Key design decisions:**

1. **Custom error type** — `raise-error type="APP:TASK_PENDING"` drives the retry loop semantically (not a real error)
2. **Parameterized sub-flow** — `vars.taskId` + `vars.taskType` make it reusable across entities (user creation, card termination, etc.)
3. **Fixed interval, not exponential backoff** — task status endpoints are idempotent; fixed interval is fine
4. **Orphan cleanup scheduler** — for tasks missed due to app restart, add a separate scheduler that queries for records missing the completion flag and re-polls

---

## AsyncAPI 2.6 (2026 Standard)

For event-driven APIs, design specifications using AsyncAPI 2.6 in Anypoint Code Builder:

```yaml
# asyncapi.yaml
asyncapi: '2.6.0'
info:
  title: Account Sync Events
  version: '1.0.0'
channels:
  account/created:
    subscribe:
      message:
        payload:
          type: object
          properties:
            recordId: { type: string }
            operation: { type: string, enum: [CREATE, UPDATE] }
```

Validate your AsyncAPI spec against organizational rulesets in API Governance before publishing to Exchange.

---

## Checklist

- [ ] Event listeners have `reconnect-forever` for auto-recovery
- [ ] Correlation ID sourced from event metadata (not HTTP headers)
- [ ] No `httpStatus` in error handlers (event-driven flows have no HTTP response)
- [ ] Error handling triggers writeback + notification (not HTTP error response)
- [ ] Entity-specific process sub-flows are separated into individual XML files
- [ ] `initialState="stopped"` used for entities not yet active
- [ ] Dead Letter Queue configured for Anypoint MQ consumers
- [ ] Null-guards on all event payload field accesses
- [ ] VM queues use `queueType="PERSISTENT"` for durability (Pattern 6)
- [ ] VM queue consumer flow has explicit `maxConcurrency` set (Pattern 6)
- [ ] Scheduler watermark stored BEFORE query, rolled back on error (Pattern 7)
- [ ] ObjectStore has `entryTtl` and `expirationInterval` configured (Pattern 7)
- [ ] Deferred task polling uses structured result `{ status, taskId, attempts, data }` (Pattern 8)
- [ ] Orphan cleanup scheduler exists for deferred tasks (Pattern 8)

---

**See also:** [Error Handling](error-handling.md) · [Connector Patterns](connector-patterns.md) · [Variable Contracts](variable-contracts.md)
