# MuleSoft Development Best Practices

> **Purpose:** This guide documents MuleSoft development best practices that mule-lint enforces. Use this as a reference for building maintainable, secure, and performant Mule applications.

---

## Table of Contents

- [API-Led Connectivity](#api-led-connectivity)
- [Error Handling](#error-handling)
- [Logging Standards](#logging-standards)
- [Security Guidelines](#security-guidelines)
- [Performance Patterns](#performance-patterns)
- [Project Structure](#project-structure)
- [Naming Conventions](#naming-conventions)
- [Configuration Management](#configuration-management)
- [DataWeave Best Practices](#dataweave-best-practices)
- [Documentation Standards](#documentation-standards)

---

## API-Led Connectivity

MuleSoft's API-Led Connectivity approach organizes APIs into three layers, each with distinct responsibilities.

### The Three Layers

```
┌─────────────────────────────────────────────────────────┐
│                    Experience Layer                      │
│   (Channel-specific: Web, Mobile, Partner APIs)         │
│   Naming: *-exp-*, *-experience-*                       │
└─────────────────────┬───────────────────────────────────┘
                      │
┌─────────────────────▼───────────────────────────────────┐
│                     Process Layer                        │
│   (Orchestration, Business Logic, Aggregation)          │
│   Naming: *-proc-*, *-process-*                         │
└─────────────────────┬───────────────────────────────────┘
                      │
┌─────────────────────▼───────────────────────────────────┐
│                     System Layer                         │
│   (Backend Connectivity: SAP, Salesforce, Databases)    │
│   Naming: *-sys-*, *-system-*                           │
└─────────────────────────────────────────────────────────┘
```

### Layer Guidelines

| Layer | Should Have | Should NOT Have |
|-------|-------------|-----------------|
| **Experience** | HTTP listeners, channel-specific transformations | Direct database access, complex business logic |
| **Process** | Flow-refs to other APIs, orchestration logic | Direct system connections, database queries |
| **System** | Database operations, HTTP requests to backends | Business logic, data aggregation |

### Example Flow Structure

```xml
<!-- Experience Layer: User-facing API -->
<flow name="orders-exp-get-order-flow">
    <http:listener config-ref="HTTPS_Listener" path="/orders/{orderId}"/>
    <flow-ref name="orders-proc-get-order-subflow"/>
    <ee:transform><!-- Channel-specific response format --></ee:transform>
</flow>

<!-- Process Layer: Orchestration -->
<sub-flow name="orders-proc-get-order-subflow">
    <flow-ref name="orders-sys-get-order-subflow"/>
    <flow-ref name="customers-sys-get-customer-subflow"/>
    <!-- Aggregate data from multiple sources -->
</sub-flow>

<!-- System Layer: Database access -->
<sub-flow name="orders-sys-get-order-subflow">
    <db:select config-ref="Database_Config">
        <db:sql>SELECT * FROM orders WHERE id = :orderId</db:sql>
    </db:select>
</sub-flow>
```

**Related Rules:** `API-001`, `API-002`, `API-003`

---

## Error Handling

Proper error handling ensures consistent API responses and easier debugging.

### Key Principles

1. **Every flow needs error handling** - Either explicit or via global handler
2. **Set HTTP status codes** - Always set `httpStatus` variable for API responses
3. **Include correlation ID** - Enable distributed tracing
4. **Be specific about error types** - Avoid catching `type="ANY"`

### Global Error Handler Pattern

Create a reusable global error handler:

```xml
<!-- src/main/mule/global-error-handler.xml -->
<error-handler name="global-error-handler">
    <on-error-propagate type="APIKIT:BAD_REQUEST">
        <set-variable variableName="httpStatus" value="400"/>
        <ee:transform>
            <ee:set-payload><![CDATA[%dw 2.0
output application/json
---
{
    correlationId: correlationId,
    error: "Bad Request",
    message: error.description
}]]></ee:set-payload>
        </ee:transform>
    </on-error-propagate>
    
    <on-error-propagate type="APIKIT:NOT_FOUND">
        <set-variable variableName="httpStatus" value="404"/>
        <!-- ... -->
    </on-error-propagate>
    
    <!-- Catch-all for unexpected errors -->
    <on-error-propagate>
        <set-variable variableName="httpStatus" value="500"/>
        <logger category="com.myorg.errors" level="ERROR" 
                message="#['Error: ' ++ error.description ++ ' | CorrelationId: ' ++ correlationId]"/>
        <!-- ... -->
    </on-error-propagate>
</error-handler>
```

### Flow Error Handler Reference

```xml
<flow name="my-api-flow">
    <http:listener config-ref="HTTPS_Listener" path="/resource"/>
    <!-- Flow logic -->
    <error-handler ref="global-error-handler"/>
</flow>
```

**Related Rules:** `MULE-001`, `MULE-003`, `MULE-005`, `MULE-007`, `MULE-009`

---

## Logging Standards

Effective logging enables debugging and monitoring without compromising security or performance.

### Key Principles

1. **Always use categories** - Enable log filtering in production
2. **Never log full payloads** - May contain PII and cause performance issues
3. **Include correlation IDs** - Enable request tracing
4. **Use structured logging** - JSON format for log aggregation tools

### Logger Category Convention

Use hierarchical category names:

```xml
<!-- ✅ Good - Hierarchical categories -->
<logger category="com.myorg.orders.api" level="INFO" 
        message="#['Processing order: ' ++ vars.orderId]"/>

<logger category="com.myorg.orders.db" level="DEBUG" 
        message="#['Query executed in ' ++ vars.queryTime ++ 'ms']"/>
```

### Avoid Payload Logging

```xml
<!-- ❌ Bad - Logs entire payload -->
<logger message="#[payload]"/>

<!-- ✅ Good - Logs specific fields -->
<logger category="com.myorg.orders" level="INFO"
        message="#['Order ' ++ payload.orderId ++ ' received for customer ' ++ payload.customerId]"/>
```

### Structured Logging Format

```xml
<logger category="com.myorg.audit" level="INFO">
    <message><![CDATA[#[%dw 2.0
output application/json
---
{
    correlationId: correlationId,
    event: "ORDER_CREATED",
    orderId: payload.orderId,
    timestamp: now()
}]]]></message>
</logger>
```

### Avoid Logging in Retry Loops

```xml
<!-- ❌ Bad - Logger inside until-successful floods logs -->
<until-successful maxRetries="5">
    <logger message="Attempting..."/>  <!-- Will log 5 times on failure -->
    <http:request config-ref="HTTP_Config" path="/api"/>
</until-successful>

<!-- ✅ Good - Log before and after -->
<logger category="com.myorg" message="Starting retry operation"/>
<until-successful maxRetries="5">
    <http:request config-ref="HTTP_Config" path="/api"/>
</until-successful>
<logger category="com.myorg" message="Operation completed"/>
```

**Related Rules:** `MULE-006`, `MULE-301`, `MULE-303`

---

## Security Guidelines

Protect sensitive data and follow secure development practices.

### Never Hardcode Secrets

```xml
<!-- ❌ Bad - Hardcoded credentials -->
<http:request-config host="api.example.com"
                     username="admin" 
                     password="secret123"/>

<!-- ✅ Good - Property placeholders -->
<http:request-config host="${api.host}"
                     username="${api.username}" 
                     password="${secure::api.password}"/>
```

### Never Hardcode URLs

```xml
<!-- ❌ Bad -->
<http:request url="https://api.production.example.com/orders"/>

<!-- ✅ Good -->
<http:request url="${api.orders.baseUrl}/orders"/>
```

### Encrypt Sensitive Properties

Use MuleSoft Secure Properties:

```yaml
# secure.yaml (encrypted)
api:
  password: "![encryptedValue]"
  clientSecret: "![encryptedValue]"
```

### TLS Configuration

```xml
<!-- ❌ Bad - Insecure TLS -->
<tls:context name="Insecure_TLS">
    <tls:trust-store insecure="true"/>
</tls:context>

<!-- ✅ Good - Proper certificate validation -->
<tls:context name="Secure_TLS">
    <tls:trust-store path="${tls.truststore.path}" 
                     password="${secure::tls.truststore.password}"/>
</tls:context>
```

**Related Rules:** `MULE-004`, `MULE-201`, `MULE-202`, `YAML-004`

---

## Performance Patterns

Avoid common performance anti-patterns.

### Async Scope Error Handling

Async scopes don't propagate errors to parent flows:

```xml
<!-- ❌ Bad - Errors silently swallowed -->
<async>
    <http:request config-ref="HTTP_Config" path="/webhook"/>
</async>

<!-- ✅ Good - Explicit error handling -->
<async>
    <try>
        <http:request config-ref="HTTP_Config" path="/webhook"/>
        <error-handler>
            <on-error-continue>
                <logger category="com.myorg.async" level="ERROR" 
                        message="#['Async failed: ' ++ error.description]"/>
            </on-error-continue>
        </error-handler>
    </try>
</async>
```

### Limit Choice Complexity

```xml
<!-- ❌ Bad - Too many when clauses -->
<choice>
    <when expression="#[vars.status == 'NEW']">...</when>
    <when expression="#[vars.status == 'PENDING']">...</when>
    <when expression="#[vars.status == 'APPROVED']">...</when>
    <!-- 10+ more conditions -->
    <otherwise>...</otherwise>
</choice>

<!-- ✅ Good - Use DataWeave lookup -->
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

### HTTP Timeout Configuration

```xml
<!-- ✅ Always set explicit timeouts -->
<http:request-config name="HTTP_Request_Config" 
                     responseTimeout="30000">
    <http:request-connection host="${api.host}" 
                              port="${api.port}"/>
</http:request-config>
```

### Scatter-Gather Limits

Limit parallel routes to avoid memory pressure:

```xml
<!-- Keep scatter-gather routes manageable (< 5-7) -->
<scatter-gather>
    <route><flow-ref name="service1-subflow"/></route>
    <route><flow-ref name="service2-subflow"/></route>
    <route><flow-ref name="service3-subflow"/></route>
</scatter-gather>
```

**Related Rules:** `MULE-403`, `MULE-501`, `MULE-502`, `MULE-503`, `MULE-801`

---

## Project Structure

Follow standard MuleSoft project organization.

### Required Structure

```
my-mule-project/
├── src/
│   ├── main/
│   │   ├── mule/                    # Mule configuration files
│   │   │   ├── global.xml           # Shared configs (listeners, error handlers)
│   │   │   ├── global-error-handler.xml
│   │   │   ├── orders-api.xml       # API implementation
│   │   │   └── orders-flows.xml     # Business flows
│   │   └── resources/
│   │       ├── api/                 # RAML/OAS specifications
│   │       ├── dwl/                 # External DataWeave files
│   │       │   ├── common.dwl       # Reusable functions
│   │       │   └── transform-order.dwl
│   │       ├── dev.yaml             # Environment configs
│   │       ├── qa.yaml
│   │       └── prod.yaml
│   └── test/
│       └── munit/                   # MUnit test files
├── pom.xml
└── mule-artifact.json
```

### File Organization Guidelines

| Guideline | Recommendation |
|-----------|----------------|
| Flows per file | Max 10 flows/sub-flows per XML file |
| File responsibility | One domain/feature per file |
| Global configs | Centralize in `global.xml` |
| Error handling | Separate `global-error-handler.xml` |

**Related Rules:** `MULE-802`, `MULE-803`, `MULE-804`

---

## Naming Conventions

Consistent naming improves readability and maintainability.

### Flows and Sub-flows

```xml
<!-- Use kebab-case with suffixes -->
<flow name="orders-api-get-order-flow">
<sub-flow name="validate-order-input-subflow">
```

### Variables

```xml
<!-- Use camelCase -->
<set-variable variableName="orderId"/>
<set-variable variableName="customerData"/>
```

### Connector Configurations

```xml
<!-- Use descriptive names -->
<http:request-config name="Orders_API_Config"/>
<db:config name="Orders_Database_Config"/>
```

**Related Rules:** `MULE-002`, `MULE-101`, `MULE-102`, `EXP-002`

---

## Configuration Management

Externalize environment-specific values.

### Environment Files

Create separate files for each environment:

```yaml
# dev.yaml
http:
  host: "0.0.0.0"
  port: "8081"

api:
  orders:
    baseUrl: "http://localhost:8082/api"
    timeout: "30000"

db:
  host: "localhost"
  port: "5432"
```

### Property Naming

Use hierarchical, lowercase naming:

```yaml
# ✅ Good
db.host: localhost
api.orders.baseUrl: http://example.com
http.request.timeout: 30000

# ❌ Bad
DBHOST: localhost
ApiOrdersUrl: http://example.com
HTTP_TIMEOUT: 30000
```

**Related Rules:** `YAML-001`, `YAML-003`

---

## DataWeave Best Practices

Write maintainable and reusable DataWeave code.

### Externalize Complex Transforms

```xml
<!-- ❌ Bad - Large inline transform -->
<ee:transform>
    <ee:set-payload><![CDATA[%dw 2.0
    <!-- 50+ lines of DataWeave -->
    ]]></ee:set-payload>
</ee:transform>

<!-- ✅ Good - External file -->
<ee:transform>
    <ee:set-payload resource="dwl/transform-order-response.dwl"/>
</ee:transform>
```

### Create Reusable Modules

```dataweave
// src/main/resources/dwl/common.dwl
%dw 2.0

fun formatDate(date: DateTime) = 
    date as String {format: "yyyy-MM-dd"}

fun maskPII(value: String) = 
    value[0 to 2] ++ "****" ++ value[-2 to -1]

fun toErrorResponse(error, correlationId: String) = {
    correlationId: correlationId,
    timestamp: now(),
    error: error.errorType.identifier,
    message: error.description
}
```

### File Naming

Use kebab-case for DWL files:
- `transform-order.dwl`
- `validate-input.dwl`
- `common-utils.dwl`

**Related Rules:** `DW-001`, `DW-002`, `DW-003`

---

## Documentation Standards

Document for maintainability.

### Flow Documentation

```xml
<flow name="orders-api-create-order-flow" 
      doc:name="Create Order" 
      doc:description="Creates a new order in the system. Validates input, checks inventory, and persists to database.">
```

### Component Documentation

```xml
<logger doc:name="Log Order Received" 
        category="com.myorg.orders" 
        message="#['Order received: ' ++ payload.orderId]"/>

<ee:transform doc:name="Transform to Database Format">
    <!-- ... -->
</ee:transform>
```

**Related Rules:** `MULE-601`, `MULE-604`

---

## Quick Reference Card

| Practice | Do | Don't |
|----------|-----|-------|
| **Error Handling** | Use global handler, set httpStatus | Catch `type="ANY"`, ignore errors |
| **Logging** | Use categories, log specific fields | Log `#[payload]`, log in retry loops |
| **Security** | Use `${property}`, encrypt secrets | Hardcode URLs, passwords, keys |
| **Performance** | Set timeouts, handle async errors | Unlimited retries, huge choice blocks |
| **Naming** | kebab-case flows, camelCase vars | Inconsistent casing, no suffixes |
| **Structure** | Separate files by domain | Monolithic XML files |
| **Config** | Environment-specific YAML files | Hardcoded values |
| **DataWeave** | External .dwl files, reusable modules | Large inline transforms |
