# Performance Best Practices

> **Applies to:** All  
> **Related Rules:** `MULE-501` · `MULE-502` · `MULE-503` · `PERF-002` · `RES-001` · `RES-002` · `MULE-801`  
> **Last Updated:** April 2026

## When to Read This

Read this when optimizing flow performance, configuring connection pooling, implementing async patterns, or reviewing a project for production readiness.

---

## Key Principles

1. **Set explicit timeouts** — avoid hanging connections and resource leaks
2. **Handle async errors** — async scopes silently swallow errors
3. **Limit choice complexity** — refactor large choice blocks to DWL lookups
4. **Configure connection pools** — essential for production throughput
5. **Use streaming for large payloads** — avoid loading everything into memory

---

## Patterns

### Pattern 1: Async Scope Error Handling

Async scopes don't propagate errors to the parent flow — they're silently lost:

```xml
<!-- ❌ Bad — errors silently swallowed -->
<async>
    <http:request config-ref="HTTP_Config" path="/webhook"/>
</async>

<!-- ✅ Good — explicit error handling inside async -->
<async>
    <try>
        <http:request config-ref="HTTP_Config" path="/webhook"/>
        <error-handler>
            <on-error-continue>
                <logger category="com.myorg.async" level="ERROR"
                        message="#['Async webhook failed: ' ++ error.description]"/>
            </on-error-continue>
        </error-handler>
    </try>
</async>
```

### Pattern 2: Refactor Large Choice Blocks

```xml
<!-- ❌ Bad — too many when clauses (> 5) -->
<choice>
    <when expression="#[vars.status == 'NEW']">...</when>
    <when expression="#[vars.status == 'PENDING']">...</when>
    <when expression="#[vars.status == 'APPROVED']">...</when>
    <!-- 10+ more conditions -->
    <otherwise>...</otherwise>
</choice>

<!-- ✅ Good — DataWeave lookup + dynamic flow-ref -->
<ee:transform>
    <ee:set-variable variableName="handler"><![CDATA[%dw 2.0
var handlers = {
    "NEW": "new-handler-subflow",
    "PENDING": "pending-handler-subflow",
    "APPROVED": "approved-handler-subflow"
}
---
handlers[vars.status] default "default-handler-subflow"
]]></ee:set-variable>
</ee:transform>
<flow-ref name="#[vars.handler]"/>
```

### Pattern 3: HTTP Timeout Configuration

```xml
<!-- ✅ Always set explicit timeouts -->
<http:request-config name="API_Config"
    responseTimeout="${https.request.responseTimeout}">
    <http:request-connection host="${api.host}" port="${api.port}">
        <http:client-socket-properties>
            <http:tcp-client-socket-properties connectionTimeout="30000"/>
        </http:client-socket-properties>
    </http:request-connection>
</http:request-config>
```

> ⚠️ **Grizzly rule:** `connectionIdleTimeout` must be ≥ `responseTimeout`. If idle timeout fires first, it kills the connection before the response arrives.

### Pattern 4: Connection Pooling

```xml
<!-- ✅ Good — HTTP with pooling configured -->
<http:request-config name="API_Config">
    <http:request-connection host="${api.host}" port="${api.port}"
        maxConnections="20"
        connectionIdleTimeout="300000"/>
</http:request-config>

<!-- ✅ Good — Database with pooling -->
<db:config name="Database_Config">
    <db:my-sql-connection host="${db.host}" port="${db.port}"
        database="${db.name}" user="${db.user}"
        password="${secure::db.password}">
        <db:pooling-profile maxPoolSize="10"
            minPoolSize="2" maxWait="30000"/>
    </db:my-sql-connection>
</db:config>
```

### Pattern 5: Scatter-Gather Limits

Keep parallel routes manageable (< 5–7 routes):

```xml
<scatter-gather>
    <route><flow-ref name="service1-subflow"/></route>
    <route><flow-ref name="service2-subflow"/></route>
    <route><flow-ref name="service3-subflow"/></route>
</scatter-gather>
```

### Pattern 6: Streaming for Large Payloads

Mule 4 uses **file-stored repeatable streams** by default (512 KB in-memory buffer). For large payloads:

- **Don't** call `payload` multiple times — it forces stream re-read
- **Do** store needed values in variables before consuming the stream
- **Do** use streaming-compatible connectors and DataWeave

```xml
<!-- ✅ Store needed values before processing -->
<set-variable variableName="recordCount" value="#[sizeOf(payload)]"/>
<ee:transform>
    <ee:set-payload resource="dwl/transforms/process-batch.dwl"/>
</ee:transform>
```

### Pattern 7: Pre-batch Bulk Lookup (N+1 Prevention)

**Use when:** iterating over 10+ records with `foreach` where each record requires 1+ related record lookups from an external system. Without this pattern, 100 records × 3 lookups = 300 API calls. With it: 3 API calls.

**Do NOT use when:** iterating < 5 records (overhead not worth it), lookups are already cached in ObjectStore, or the downstream system doesn't support bulk/IN queries.

| Scenario                                   | Bulk Lookup? | Why                      |
| ------------------------------------------ | ------------ | ------------------------ |
| 100 records, each needs 3 related lookups  | ✅           | 300 calls → 3 calls      |
| 3 records, each needs 1 lookup             | ❌           | Overhead exceeds savings |
| Lookups already cached in ObjectStore      | ❌           | Already optimized        |
| Downstream doesn't support IN/bulk queries | ❌           | Can't batch anyway       |

**Architecture:**

```
1. Save batch to variable
2. Extract unique lookup IDs (distinctBy, filter !isEmpty)
3. Scatter-gather: bulk-fetch all related records in parallel
4. Build groupBy lookup maps → O(1) resolution per record
5. Restore original batch as payload
6. Foreach: resolve from maps (zero API calls)
```

**Implementation:**

```xml
<sub-flow name="bulkResolveLookupsSubFlow">
    <!-- 1. Save the original batch -->
    <set-variable value="#[payload]" variableName="batch"/>

    <!-- 2. Extract unique lookup IDs -->
    <ee:transform>
        <ee:variables>
            <ee:set-variable variableName="lookupIds"><![CDATA[%dw 2.0
output application/java
---
{
    projectIds: (vars.batch.projectId default [])
                    filter (!isEmpty($)) distinctBy $,
    contactIds: (vars.batch.contactId default [])
                    filter (!isEmpty($)) distinctBy $
}]]></ee:set-variable>
        </ee:variables>
    </ee:transform>

    <!-- 3. Bulk fetch in parallel -->
    <scatter-gather>
        <route>
            <http:request method="GET" path="/Project__c">
                <http:query-params>#[output application/java --- {
                    "query": "SELECT Id, Project_ID__c FROM Project__c
                              WHERE Project_ID__c IN ('"
                        ++ (vars.lookupIds.projectIds joinBy "','") ++ "')"
                }]</http:query-params>
            </http:request>
        </route>
        <route>
            <http:request method="GET" path="/Contact">
                <http:query-params>#[output application/java --- {
                    "query": "SELECT Id, AccountId FROM Contact
                              WHERE Id IN ('"
                        ++ (vars.lookupIds.contactIds joinBy "','") ++ "')"
                }]</http:query-params>
            </http:request>
        </route>
    </scatter-gather>

    <!-- 4. Build lookup maps with groupBy -->
    <ee:transform>
        <ee:variables>
            <ee:set-variable variableName="lookupMaps"><![CDATA[%dw 2.0
output application/java
---
{
    projects: (payload.'0'.payload default []) groupBy $.Project_ID__c,
    contacts: (payload.'1'.payload default []) groupBy $.Id
}]]></ee:set-variable>
        </ee:variables>
    </ee:transform>

    <!-- 5. Restore original batch (scatter-gather replaced payload) -->
    <set-payload value="#[vars.batch]"/>
</sub-flow>
```

**Then in the foreach — zero API calls per iteration:**

```dataweave
var resolvedProject = (vars.lookupMaps.projects[payload.projectId] default [])[0]
---
{
    message: payload ++ { resolvedProject: resolvedProject },
    recordType: "scheduled-entity"
}
```

**Key rules:**

- **Always save-and-restore payload** — `scatter-gather` replaces `payload` with its own result object
- **`distinctBy $`** — deduplicate IDs (same project may appear on 50 records)
- **`filter !isEmpty($)`** — exclude null/empty IDs before building the IN clause
- **`groupBy` for O(1) resolution** — returns an array; take `[0]` for the first match
- **Guard the scatter-gather** — if no IDs exist, skip the bulk fetch entirely (set empty maps)

---

## Flow Complexity Guidelines

| Metric                | Threshold  | Action                  |
| --------------------- | ---------- | ----------------------- |
| Processors per flow   | ≤ 15       | Split into sub-flows    |
| Choice branches       | ≤ 5        | Use DWL lookup pattern  |
| Scatter-gather routes | ≤ 7        | Consolidate or sequence |
| Flow-ref depth        | ≤ 5 levels | Flatten chain           |
| Loggers per flow      | ≤ 5        | Move to DEBUG level     |

---

## Checklist

- [ ] `responseTimeout` set on all HTTP request configs
- [ ] `connectionIdleTimeout >= responseTimeout` (Grizzly rule)
- [ ] Connection pooling configured for HTTP and Database connectors
- [ ] Async scopes have internal error handling
- [ ] Choice blocks have ≤ 5 branches (refactor large ones)
- [ ] Scatter-gather has ≤ 7 routes
- [ ] Reconnection strategies on all outbound connectors
- [ ] Pre-batch bulk lookup used for foreach with 10+ records needing related lookups (Pattern 7)

---

**See also:** [Connector Patterns](connector-patterns.md) · [Error Handling](error-handling.md)
