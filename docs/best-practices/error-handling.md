# Error Handling Best Practices

> **Applies to:** HTTP APIs · Event-Driven · Batch · All  
> **Related Rules:** `MULE-001` · `MULE-003` · `MULE-005` · `MULE-007` · `MULE-009` · `ERR-001` · `ERR-002` · `ERR-003` · `ERR-004`  
> **Last Updated:** April 2026

## When to Read This

Read this when designing, implementing, or reviewing error handling for any Mule 4 application — whether it exposes an HTTP API, listens to platform events, or processes batch data.

---

## Decision Matrix

| Project Type                   | Error Handler Location                                       | Sets `httpStatus`?                         | Error Response Format                    | Correlation ID Source                                         |
| ------------------------------ | ------------------------------------------------------------ | ------------------------------------------ | ---------------------------------------- | ------------------------------------------------------------- |
| **HTTP API (SAPI/Experience)** | Dedicated `error-handling.xml` or `global-error-handler.xml` | ✅ Yes — sets `httpStatus` in every branch | JSON error envelope → HTTP response      | `attributes.headers.'x-correlation-id' default correlationId` |
| **Event-Driven (PAPI)**        | Part of `error-handling.xml`                                 | ❌ No — no HTTP response layer             | Error payload → writeback + notification | Platform Event `EventUuid`                                    |
| **Batch / Scheduler**          | Inline or referenced `error-handler`                         | Depends on trigger                         | Logged error + retry/dead-letter         | Generated UUID or scheduler ID                                |

---

## Key Principles

1. **Every flow needs error handling** — either an explicit `<error-handler>` or a `ref` to a global one
2. **Set HTTP status codes** — always set `httpStatus` variable for API responses (HTTP APIs only)
3. **Include correlation ID** — enable distributed tracing across all API layers
4. **Be specific about error types** — avoid catching `type="ANY"` except as the **last** handler in the chain
5. **Consistent error envelope** — use the same response shape for all error types

---

## Patterns

### Pattern 1: Global Error Handler (HTTP APIs)

**Use when:** building any HTTP-facing API (System API, Experience API, or APIKit-based Process API).

Every error branch should:

- Set `httpStatus` via `ee:set-variable`
- Build a JSON error response with `environment`, `correlationId`, `error`, and `message`
- Place `type="ANY"` as the **last** branch (catch-all)

```xml
<!-- src/main/mule/common/error-handling.xml -->
<error-handler name="global-error-handler">

    <!-- 400 Bad Request -->
    <on-error-propagate type="APIKIT:BAD_REQUEST">
        <ee:transform>
            <ee:message>
                <ee:set-payload><![CDATA[%dw 2.0
output application/json
---
{
    environment: p('mule.env'),
    correlationId: (vars.correlationId default "") as String,
    error: "InvalidInput",
    message: error.detailedDescription default "Bad request"
}]]></ee:set-payload>
            </ee:message>
            <ee:variables>
                <ee:set-variable variableName="httpStatus">400</ee:set-variable>
            </ee:variables>
        </ee:transform>
    </on-error-propagate>

    <!-- 404 Not Found -->
    <on-error-propagate type="APIKIT:NOT_FOUND">
        <!-- ... set httpStatus to 404, build response ... -->
    </on-error-propagate>

    <!-- 500 Internal Server Error (catch-all — MUST be last) -->
    <on-error-propagate type="ANY" enableNotifications="true" logException="true">
        <ee:transform>
            <ee:message>
                <ee:set-payload><![CDATA[%dw 2.0
output application/json
---
{
    environment: p('mule.env'),
    correlationId: (vars.correlationId default "") as String,
    error: "InternalError",
    message: error.detailedDescription default "An unexpected error occurred."
}]]></ee:set-payload>
            </ee:message>
            <ee:variables>
                <ee:set-variable variableName="httpStatus">500</ee:set-variable>
            </ee:variables>
        </ee:transform>
    </on-error-propagate>

</error-handler>
```

Reference it from the main API flow:

```xml
<flow name="api-main">
    <http:listener config-ref="httpListenerConfig" path="/api/*">
        <http:response statusCode="#[vars.httpStatus default 200]"/>
        <http:error-response statusCode="#[vars.httpStatus default 500]">
            <http:body><![CDATA[#[payload]]]></http:body>
        </http:error-response>
    </http:listener>
    <apikit:router config-ref="api-config"/>
    <error-handler ref="global-error-handler"/>
</flow>
```

### Pattern 2: Error Handler (Event-Driven)

**Use when:** building a process API driven by Salesforce Platform Events, Anypoint MQ, or Kafka.

No `httpStatus`. Instead, errors trigger:

1. Structured error payload build
2. Writeback to source system (e.g., SF error field update)
3. Notification dispatch (email, Slack, NetSuite error log)

```xml
<error-handler name="global-error-handler">
    <on-error-propagate enableNotifications="true" logException="true">
        <!-- Build structured error payload -->
        <ee:transform>
            <ee:variables>
                <ee:set-variable variableName="errorPayload"
                    resource="dwl/transforms/error-payload.dwl"/>
            </ee:variables>
        </ee:transform>
        <!-- Log the error -->
        <logger level="ERROR" message="#[vars.errorPayload]"
                category="#[vars.logCategory default 'com.myorg.papi']"/>
        <!-- Writeback error status to source system -->
        <flow-ref name="sf-writeback-subflow"/>
        <!-- Dispatch notifications -->
        <flow-ref name="notification-router-subflow"/>
    </on-error-propagate>
</error-handler>
```

### Pattern 3: Try Scope for Risky Operations

**Use when:** a flow makes 2+ external calls (HTTP requests, DB operations, connector calls).

```xml
<!-- ❌ Bad — multiple calls without isolation -->
<flow name="process-order-flow">
    <http:request config-ref="API"/>
    <db:insert config-ref="Database"/>
</flow>

<!-- ✅ Good — each risky operation isolated -->
<flow name="process-order-flow">
    <try>
        <http:request config-ref="API"/>
        <error-handler>
            <on-error-propagate type="HTTP:CONNECTIVITY">
                <logger category="com.myorg" level="ERROR"
                        message="#['API call failed: ' ++ error.description]"/>
            </on-error-propagate>
        </error-handler>
    </try>
    <try>
        <db:insert config-ref="Database"/>
        <error-handler>...</error-handler>
    </try>
</flow>
```

### Pattern 4: Centralized Error Log Object (CRM Writeback)

**Use when:** integration errors need visibility in the CRM for operations teams (multi-system integrations where business users manage error resolution).

**Do NOT use when:** it's an internal-only SAPI where standard logging dashboards suffice, or for transient errors that will auto-recover via retry.

| Scenario                                 | CRM Error Log? | Why                                             |
| ---------------------------------------- | -------------- | ----------------------------------------------- |
| Multi-system sync (CRM ↔ ERP ↔ Payments) | ✅             | Ops needs single-pane visibility                |
| Internal SAPI with no business users     | ❌             | Logging + dashboards sufficient                 |
| Transient error (retry will succeed)     | ❌             | Handle with retry, not logging                  |
| Real-time latency-sensitive flow         | ⚠️             | Extra HTTP call per error; make async if needed |

**Standardized error payload contract:**

```xml
<!-- Every caller builds this shape before calling errorLogFlow -->
<ee:transform doc:name="Error Payload">
    <ee:set-payload><![CDATA[%dw 2.0
output application/json
---
{
    "Subject": "Failed to sync Invoice to ERP",
    "Error": error.detailedDescription default "",
    "Link": p('links.crm.record') ++ vars.recordId ++ "/view",
    "RecordId": vars.recordId default ""
}]]></ee:set-payload>
</ee:transform>
<flow-ref name="errorLogFlow"/>
```

**The error log flow — with self-healing handler:**

```xml
<flow name="errorLogFlow">
    <ee:transform doc:name="Map to CRM Error Object">
        <ee:set-payload><![CDATA[%dw 2.0
output application/json
---
{
    "Application__c": "Mulesoft",
    "Type__c": "Integration",
    "Stacktrace__c": payload.Error default "",
    "Record_Link__c": payload.Link default "",
    "Record_Id__c": payload.RecordId default "",
    "Subject__c": payload.Subject default ""
}]]></ee:set-payload>
    </ee:transform>

    <http:request method="POST" config-ref="SAPI_Config" path="/Error_Log__c"/>

    <error-handler>
        <!-- CRITICAL: Must NEVER throw — prevents infinite loop -->
        <on-error-continue enableNotifications="true" logException="false">
            <logger level="WARN"
                    message="Error logging failed: #[error.detailedDescription]"/>
        </on-error-continue>
    </error-handler>
</flow>
```

> ⚠️ **Self-healing rule:** The `errorLogFlow` **must never propagate an error**. If it does, the parent flow's error handler re-enters the error log → infinite loop. Always use `on-error-continue`.

---

## Connector-Specific Error Types

### Salesforce Connector (11.3.0+)

| Error Type                            | HTTP Status | Description                  |
| ------------------------------------- | ----------- | ---------------------------- |
| `SALESFORCE:CONNECTIVITY`             | 502         | Connection failure to SF org |
| `SALESFORCE:INVALID_INPUT`            | 400         | DML/SOQL validation error    |
| `SALESFORCE:INVALID_RESPONSE`         | 400         | Unparseable SF response      |
| `SALESFORCE:FAULTY_RESPONSE`          | 400         | SF returned error body       |
| `SALESFORCE:NOT_FOUND`                | 404         | Record not found             |
| `SALESFORCE:TIMEOUT`                  | 504         | Connector timed out          |
| `SALESFORCE:LIMIT_EXCEEDED`           | 429         | API governor limit hit       |
| `SALESFORCE:INSUFFICIENT_PERMISSIONS` | 403         | Permission denied            |

### APIKit Error Types

| Error Type                      | HTTP Status | Description                 |
| ------------------------------- | ----------- | --------------------------- |
| `APIKIT:BAD_REQUEST`            | 400         | Schema validation failure   |
| `APIKIT:NOT_FOUND`              | 404         | Unknown URI path            |
| `APIKIT:METHOD_NOT_ALLOWED`     | 405         | HTTP verb not in RAML       |
| `APIKIT:NOT_ACCEPTABLE`         | 406         | Content negotiation failure |
| `APIKIT:UNSUPPORTED_MEDIA_TYPE` | 415         | Wrong Content-Type          |

---

## Checklist

- [ ] Global error handler defined in a dedicated XML file
- [ ] Every flow has `<error-handler ref="global-error-handler"/>` or explicit handler
- [ ] `httpStatus` set in every error branch (HTTP APIs only)
- [ ] `correlationId` included in every error response
- [ ] `type="ANY"` is the **last** handler in the chain
- [ ] Connector-specific error types handled before generic ones
- [ ] Error response shape is consistent across all branches
- [ ] Error log flow uses `on-error-continue` — never cascades (Pattern 4)

---

**See also:** [Variable Contracts](variable-contracts.md) · [Logging](logging.md) · [Rules Catalog](rules-catalog.md)
