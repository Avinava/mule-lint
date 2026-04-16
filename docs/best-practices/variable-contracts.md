# Variable Contracts & Correlation ID Patterns

> **Applies to:** All  
> **Related Rules:** `MULE-007` · `MULE-102` · `STD-001`  
> **Last Updated:** April 2026

## When to Read This

Read this when designing the variable contract between flows and sub-flows. Standardized variables ensure consistent behavior across routing, logging, error handling, and response building.

---

## Standard Variable Set

Every APIKit route flow or event listener flow should set these variables **before** delegating to sub-flows:

| Variable          | Type    | Required           | Description                                                     |
| ----------------- | ------- | ------------------ | --------------------------------------------------------------- |
| `correlationId`   | String  | ✅ Always          | Unique request/event identifier for distributed tracing         |
| `logCategory`     | String  | ✅ Always          | Logger category (e.g., `com.myorg.sf.sapi`)                     |
| `flowName`        | String  | ✅ Always          | Human-readable flow identifier for logging                      |
| `env`             | String  | ✅ Always          | Current environment from `p('mule.env')`                        |
| `action`          | String  | ✅ For CRUD APIs   | Operation type: `CREATE`, `UPDATE`, `UPSERT`, `DELETE`, `QUERY` |
| `sObjectType`     | String  | ✅ For entity APIs | Entity/record type from URI parameter                           |
| `isArray`         | Boolean | ✅ For CRUD APIs   | Whether the original request payload was an array               |
| `externalIdField` | String  | Optional           | External ID field for upsert operations (defaults to `Id`)      |

---

## Patterns

### Pattern 1: APIKit Route Variable Setup

**Use when:** setting variables in an APIKit-generated route flow.

Set all variables in a single `ee:transform` at the top of every route flow:

```xml
<flow name="post:\salesforce\(sObjectType):application\json:api-config">
    <ee:transform doc:name="Set Variables">
        <ee:variables>
            <ee:set-variable variableName="correlationId"><![CDATA[
                attributes.headers.'x-correlation-id' default correlationId
            ]]></ee:set-variable>
            <ee:set-variable variableName="logCategory"><![CDATA[
                "com.myorg.sf.sapi"
            ]]></ee:set-variable>
            <ee:set-variable variableName="flowName"><![CDATA[
                "Mulesoft: my-sapi - " ++ flow.name
            ]]></ee:set-variable>
            <ee:set-variable variableName="env"><![CDATA[
                p('mule.env')
            ]]></ee:set-variable>
            <ee:set-variable variableName="action"><![CDATA[
                "CREATE"
            ]]></ee:set-variable>
            <ee:set-variable variableName="sObjectType"><![CDATA[
                attributes.uriParams.'sObjectType'
            ]]></ee:set-variable>
            <ee:set-variable variableName="isArray"><![CDATA[
                payload is Array
            ]]></ee:set-variable>
        </ee:variables>
    </ee:transform>
    <logger level="INFO" category="#[vars.logCategory]"
            message='#["[" ++ vars.correlationId ++ "] CREATE for: " ++ vars.sObjectType]'/>
    <flow-ref name="process-subflow"/>
</flow>
```

### Pattern 2: Event Listener Variable Setup

**Use when:** setting variables from a Salesforce Platform Event or Anypoint MQ message.

```xml
<flow name="sf-account-event-listener">
    <salesforce:replay-channel-listener channel="/event/Account_Event__e" .../>
    <ee:transform doc:name="Set Variables">
        <ee:variables>
            <!-- Correlation ID from event metadata, NOT HTTP header -->
            <ee:set-variable variableName="correlationId"><![CDATA[
                payload.EventUuid default correlationId
            ]]></ee:set-variable>
            <ee:set-variable variableName="logCategory"><![CDATA[
                "com.myorg.sf.papi"
            ]]></ee:set-variable>
            <ee:set-variable variableName="salesforceId"><![CDATA[
                payload.Record_Id__c default ""
            ]]></ee:set-variable>
            <ee:set-variable variableName="entity"><![CDATA[
                "account"
            ]]></ee:set-variable>
        </ee:variables>
    </ee:transform>
    <!-- ... -->
</flow>
```

### Pattern 3: Array-In / Array-Out Response Mirroring

**Use when:** an API accepts both single objects and arrays, and the response must mirror the input shape.

Set `vars.isArray` in the route flow:

```xml
<ee:set-variable variableName="isArray"><![CDATA[
    payload is Array
]]></ee:set-variable>
```

Use it in DWL response transforms to mirror the shape:

```dataweave
%dw 2.0
output application/json
---
if (vars.isArray)
    payload map { id: $.id, success: $.success }
else
    { id: payload[0].id, success: payload[0].success }
```

### Pattern 4: Action-Based Routing

**Use when:** a single process sub-flow handles multiple CRUD operations.

The `vars.action` variable drives routing inside the process sub-flow:

```xml
<sub-flow name="salesforce-process-subflow">
    <choice>
        <when expression="#[vars.action == 'CREATE']">
            <flow-ref name="salesforce-create-subflow"/>
        </when>
        <when expression="#[vars.action == 'UPSERT']">
            <flow-ref name="salesforce-upsert-subflow"/>
        </when>
        <when expression="#[vars.action == 'DELETE']">
            <flow-ref name="salesforce-delete-subflow"/>
        </when>
        <when expression="#[vars.action == 'QUERY' or vars.action == 'QUERY_ENTITY']">
            <flow-ref name="salesforce-query-subflow"/>
        </when>
    </choice>
</sub-flow>
```

---

## Correlation ID Patterns

| Source         | Pattern                                                       | Use Case                     |
| -------------- | ------------------------------------------------------------- | ---------------------------- |
| HTTP header    | `attributes.headers.'x-correlation-id' default correlationId` | HTTP APIs (SAPI, Experience) |
| Platform Event | `payload.EventUuid default correlationId`                     | Event-driven PAPI            |
| Anypoint MQ    | `attributes.messageId default correlationId`                  | MQ consumers                 |
| Generated      | `correlationId` (Mule built-in)                               | Fallback / internal flows    |

**Propagation rules:**

- Include in all outbound HTTP requests as `x-correlation-id` header
- Include in all log messages: `#["[" ++ vars.correlationId ++ "] message"]`
- Include in all error response payloads
- Store in `vars.correlationId` (camelCase)

---

## Variable Naming Conventions

| Convention          | Example                                   | Use For                    |
| ------------------- | ----------------------------------------- | -------------------------- |
| `camelCase`         | `correlationId`, `sObjectType`, `isArray` | All `set-variable` names   |
| Static strings      | `"com.myorg.sf.sapi"`                     | Logger categories, actions |
| Property references | `p('mule.env')`                           | Environment-derived values |

> ❌ **Don't use:** `snake_case` (`correlation_id`), `PascalCase` (`CorrelationId`), or `SCREAMING_CASE` (`CORRELATION_ID`) for variable names.

---

## Checklist

- [ ] All route flows set `correlationId`, `logCategory`, `flowName`, `env` before delegation
- [ ] CRUD route flows additionally set `action`, `sObjectType`, `isArray`
- [ ] Correlation ID sourced correctly for project type (HTTP vs. event vs. MQ)
- [ ] `correlationId` propagated in all outbound requests, logs, and error responses
- [ ] Variables use `camelCase` naming
- [ ] `isArray` set before calling process sub-flow (for response mirroring)

---

**See also:** [Error Handling](error-handling.md) · [Logging](logging.md) · [Event-Driven Patterns](event-driven-patterns.md)
