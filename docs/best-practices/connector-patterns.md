# Connector Configuration Patterns

> **Applies to:** All (System APIs, Process APIs)  
> **Related Rules:** `SEC-007` · `SEC-008` · `PERF-002` · `RES-001` · `RES-002` · `SF-001` · `SF-002`  
> **Last Updated:** April 2026

## When to Read This

Read this when configuring Salesforce, NetSuite, HTTP, or Database connectors in Mule 4. Covers connector attribute gotchas, the entity-config pattern, and protocol negotiation.

---

## Patterns

### Pattern 1: Entity Configuration (YAML-Driven)

**Use when:** building a System API that supports multiple entity types (Account, Contact, Order, etc.) with consistent CRUD operations.

Instead of hardcoding entity-specific details in flow XML, externalize them to per-entity YAML files:

```
src/main/resources/entity-config/
├── account.yaml
├── contact.yaml
├── opportunity.yaml
└── order.yaml
```

**Entity config structure:**

```yaml
# entity-config/account.yaml
entity:
  account:
    sObjectType: 'Account'
    enabled: true
    externalIdField: 'NetSuite_ID__c'
    queryFields: 'Id, Name, BillingStreet, BillingCity, Phone, Website'
    queryTemplate: 'SELECT {fields} FROM Account WHERE {filter} LIMIT {limit}'
    writeback:
      netSuiteIdField: 'NetSuite_ID__c'
      errorField: 'NetSuite_Error__c'
      lastSyncField: 'Last_NetSuite_Sync__c'
```

**Load in global-config.xml:**

```xml
<configuration-properties doc:name="Account Config"
    file="entity-config/account.yaml"/>
<configuration-properties doc:name="Contact Config"
    file="entity-config/contact.yaml"/>
```

**Benefits:**

- Add a new entity by creating a YAML file — no flow XML changes
- Entity behavior is visible, auditable, and environment-independent
- LLMs can read entity configs to understand available operations

### Pattern 2: Salesforce JWT Connector

**Use when:** authenticating to Salesforce via OAuth 2.0 JWT Bearer flow.

```xml
<salesforce:sfdc-config name="Salesforce_Config">
    <salesforce:jwt-connection
        consumerKey="${secure::salesforce.jwt.consumerKey}"
        keyStore="${salesforce.jwt.keystorePath}"
        storePassword="${secure::salesforce.jwt.storePassword}"
        principal="${salesforce.jwt.principal}"
        tokenEndpoint="${salesforce.jwt.tokenEndpoint}"
        audienceUrl="${salesforce.jwt.audienceUrl}">
        <reconnection>
            <reconnect count="3" frequency="5000"/>
        </reconnection>
    </salesforce:jwt-connection>
</salesforce:sfdc-config>
```

> ⚠️ **Gotchas** (common mistakes that cause runtime failures):
>
> | Incorrect                           | Correct                  | Notes                              |
> | ----------------------------------- | ------------------------ | ---------------------------------- |
> | `salesforce:jwt-connection-config`  | `salesforce:sfdc-config` | Outer config element name          |
> | `keyStorePath="..."`                | `keyStore="..."`         | JWT connection attribute           |
> | `type="Account"` (on upsert)        | `objectType="Account"`   | Upsert operation attribute         |
> | `type="Account"` (on create/update) | `type="Account"`         | Create/Update use `type` (correct) |

### Pattern 3: Protocol Negotiation (Dual-Protocol SAPI)

**Use when:** a System API must support both SOAP and REST protocols to the same backend (e.g., NetSuite).

The calling PAPI sends an `x-integration-protocol` header. The SAPI routes internally:

```xml
<!-- common/netsuite-process-subflow.xml -->
<sub-flow name="netsuite-process-subflow">
    <choice>
        <when expression="#[vars.protocol == 'SOAP']">
            <flow-ref name="netsuite-soap-upsert-subflow"/>
        </when>
        <when expression="#[vars.protocol == 'REST']">
            <flow-ref name="netsuite-rest-upsert-subflow"/>
        </when>
    </choice>
</sub-flow>
```

**Protocol support matrix:**

| Record Type | SOAP | REST           |
| ----------- | ---- | -------------- |
| Customer    | ✅   | ✅             |
| Contact     | ✅   | ✅             |
| Sales Order | ✅   | ❌ (SOAP-only) |
| Credit Memo | ✅   | ❌ (SOAP-only) |

### Pattern 4: HTTP Request Connector (with Pooling)

**Use when:** making outbound HTTP calls to downstream APIs.

```xml
<http:request-config name="SAPI_HTTP_Config"
    responseTimeout="${https.request.responseTimeout}">
    <http:request-connection host="${https.request.host}"
                             port="${https.request.port}"
                             connectionIdleTimeout="${https.connection.idleTimeout}"
                             maxConnections="${https.connection.maxConnections}">
        <reconnection>
            <reconnect frequency="${reconnection.frequency}"
                       count="${reconnection.attempts}"/>
        </reconnection>
    </http:request-connection>
    <!-- Set correlation ID once — applied to every request automatically -->
    <http:default-headers>
        <http:default-header key="X-Correlation-Id" value="#[correlationId]"/>
    </http:default-headers>
</http:request-config>
```

**Rules:**

- Always set `responseTimeout` (avoid hanging connections)
- Set `connectionIdleTimeout >= responseTimeout` (Grizzly kills connections if idle fires first)
- Configure connection pooling for production (`maxConnections`)

### Pattern 5: Reconnection Strategies

**Use when:** configuring any connector that connects to an external system.

| Connector Type                         | Strategy              | Example                            |
| -------------------------------------- | --------------------- | ---------------------------------- |
| **Event listeners** (SF, MQ)           | `reconnect-forever`   | Must auto-recover from disconnects |
| **Outbound connectors** (HTTP, SF, DB) | `reconnect count="3"` | Bounded retries with frequency     |
| **HTTP Listener**                      | `reconnect-forever`   | Server must always be up           |

```xml
<!-- Listener — always reconnect -->
<http:listener-config name="httpListenerConfig">
    <http:listener-connection host="0.0.0.0" port="${http.port}">
        <reconnection>
            <reconnect-forever frequency="5000"/>
        </reconnection>
    </http:listener-connection>
</http:listener-config>

<!-- Outbound — bounded retries -->
<salesforce:sfdc-config name="Salesforce_Config">
    <salesforce:jwt-connection ...>
        <reconnection>
            <reconnect count="3" frequency="5000"/>
        </reconnection>
    </salesforce:jwt-connection>
</salesforce:sfdc-config>
```

### Pattern 6: ObjectStore for Reference Data Caching

**Use when:** frequently-accessed reference data (customer records, config lookups) is fetched repeatedly during batch processing. Cache in ObjectStore with TTL to reduce API calls.

```xml
<!-- global.xml — configure the cache store -->
<os:object-store name="customer-cache-store"
    entryTtl="${customer.cache.ttl}"
    expirationInterval="${customer.cache.expirationInterval}"
    maxEntries="200"/>
```

**Key rules:**

- Set `maxEntries` to prevent unbounded memory growth
- Set `entryTtl` appropriate to data volatility (e.g., 1 hour for customer data, 24 hours for country codes)
- Use `os:contains` + `os:retrieve` to check-then-get, not just `os:retrieve` with default (avoids computing defaults unnecessarily)

---

## DWL Utility Module: `parseAndConvert`

The Salesforce connector requires Java-typed values (DateTime, Date, Boolean) — not strings. Use a shared DWL module for type coercion:

```dataweave
%dw 2.0
// dwl/modules/salesforceUtility.dwl

var dateTimePattern = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{1,3})?(Z|[+-]\d{2}:\d{2})?$/
var dateOnlyPattern = /^\d{4}-\d{2}-\d{2}$/

fun parseAndConvert(obj: Object) =
    obj mapObject ((value, key) ->
        if ((value is String) and ((value as String) matches dateTimePattern))
            (key): (value as String) as DateTime
        else if ((value is String) and ((value as String) matches dateOnlyPattern))
            (key): (value as String) as Date
        else if ((value is String) and ((value as String) == ""))
            (key): null
        else if (value is Object)
            (key): parseAndConvert(value)
        else
            (key): value
    )
```

**Usage in flow XML:**

```xml
<ee:transform>
    <ee:set-payload><![CDATA[%dw 2.0
import dwl::modules::salesforceUtility
output application/java
---
salesforceUtility::parseAndConvert(payload)
]]></ee:set-payload>
</ee:transform>
```

> ⚠️ **DWL import path rule:** Always use the full path prefix `dwl::modules::moduleName`. Short paths like `modules::moduleName` will fail at runtime.

---

## Checklist

- [ ] Entity configs externalized to `entity-config/{entity}.yaml`
- [ ] All connector credentials use `${secure::...}` property placeholders
- [ ] Reconnection strategies configured on all connectors
- [ ] `responseTimeout` explicitly set on HTTP request configs
- [ ] No hardcoded connector attribute values (hosts, ports, keys)
- [ ] DWL modules imported with full `dwl::modules::` path prefix
- [ ] Salesforce payloads pass through `parseAndConvert()` before connector call

---

**See also:** [Security](security.md) · [Performance](performance.md) · [DataWeave Patterns](dataweave-patterns.md)
