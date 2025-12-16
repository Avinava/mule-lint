# MuleSoft Development Best Practices

> **Purpose:** Comprehensive guide for building maintainable, secure, and performant Mule applications. This guide covers both practices enforced by mule-lint and general development guidelines for MuleSoft developers.

---

## Table of Contents

### Linter-Enforced Practices
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

### General Developer Guidelines
- [Testing with MUnit](#testing-with-munit)
- [CI/CD Integration](#cicd-integration)
- [API Versioning](#api-versioning)
- [Deployment Practices](#deployment-practices)
- [Monitoring and Observability](#monitoring-and-observability)

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

---

# General Developer Guidelines

> The following sections cover general MuleSoft development best practices that are not enforced by the linter but are important for building production-ready applications.

---

## Testing with MUnit

MUnit is MuleSoft's native testing framework. Comprehensive testing is essential for reliable integrations.

### Test Coverage Goals

| Test Type | Coverage Target | Purpose |
|-----------|-----------------|---------|
| Unit Tests | 80%+ flow coverage | Validate individual flow logic |
| Integration Tests | All critical paths | Validate end-to-end scenarios |
| Error Scenario Tests | All error handlers | Validate error responses |

### MUnit Best Practices

```xml
<!-- test/munit/orders-api-test-suite.xml -->
<munit:test name="create-order-success-test"
            description="Validates successful order creation">
    
    <!-- Mock external dependencies -->
    <munit:behavior>
        <munit-tools:mock-when processor="http:request">
            <munit-tools:with-attributes>
                <munit-tools:with-attribute attributeName="config-ref" 
                                            whereValue="Orders_HTTP_Config"/>
            </munit-tools:with-attributes>
            <munit-tools:then-return>
                <munit-tools:payload value='{"orderId": "12345"}'/>
            </munit-tools:then-return>
        </munit-tools:mock-when>
    </munit:behavior>
    
    <!-- Execute -->
    <munit:execution>
        <flow-ref name="create-order-flow"/>
    </munit:execution>
    
    <!-- Assert -->
    <munit:validation>
        <munit-tools:assert-that expression="#[payload.orderId]" 
                                  is="#[MunitTools::notNullValue()]"/>
    </munit:validation>
</munit:test>
```

### Test Organization

```
src/test/munit/
├── orders-api-test-suite.xml      # API endpoint tests
├── orders-flows-test-suite.xml    # Business logic tests
├── error-handling-test-suite.xml  # Error scenario tests
└── common-test-resources.xml      # Shared mocks and utilities
```

### Key Principles

1. **Mock external dependencies** - Don't call real systems in unit tests
2. **Test error scenarios** - Verify all error handlers work correctly
3. **Use descriptive test names** - Names should describe the scenario
4. **Isolate tests** - Each test should be independent

---

## CI/CD Integration

Automate build, test, and deployment for consistent, reliable releases.

### Recommended Pipeline Stages

```
┌──────────┐    ┌──────────┐    ┌──────────┐    ┌──────────┐    ┌──────────┐
│  Build   │ → │  Lint    │ → │  Test    │ → │  Package │ → │  Deploy  │
│          │    │          │    │          │    │          │    │          │
│ mvn      │    │ mule-    │    │ mvn test │    │ mvn      │    │ anypoint │
│ compile  │    │ lint     │    │          │    │ package  │    │ deploy   │
└──────────┘    └──────────┘    └──────────┘    └──────────┘    └──────────┘
```

### GitHub Actions Example

```yaml
# .github/workflows/mule-ci.yml
name: Mule CI/CD

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

jobs:
  build-and-test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - name: Set up JDK 11
        uses: actions/setup-java@v3
        with:
          java-version: '11'
          distribution: 'adopt'
          
      - name: Cache Maven packages
        uses: actions/cache@v3
        with:
          path: ~/.m2
          key: ${{ runner.os }}-m2-${{ hashFiles('**/pom.xml') }}
          
      - name: Build with Maven
        run: mvn -B clean compile
        
      - name: Run mule-lint
        run: npx @sfdxy/mule-lint ./src/main/mule -f sarif -o lint-results.sarif
        
      - name: Run MUnit tests
        run: mvn -B test
        
      - name: Upload SARIF results
        uses: github/codeql-action/upload-sarif@v2
        with:
          sarif_file: lint-results.sarif
```

### Git Branch Strategy

| Branch | Purpose | Deployment Target |
|--------|---------|-------------------|
| `main` | Production-ready code | Production |
| `develop` | Integration branch | QA/Staging |
| `feature/*` | New features | Development |
| `hotfix/*` | Production fixes | Production |

---

## API Versioning

Plan for API evolution from the start.

### URL-Based Versioning (Recommended)

```
/api/v1/orders
/api/v2/orders
```

### Implementation Pattern

```xml
<!-- src/main/mule/orders-api-v1.xml -->
<flow name="orders-api-v1-main-flow">
    <http:listener config-ref="HTTPS_Listener" path="/api/v1/orders/*"/>
    <apikit:router config-ref="orders-v1-config"/>
</flow>

<!-- src/main/mule/orders-api-v2.xml -->
<flow name="orders-api-v2-main-flow">
    <http:listener config-ref="HTTPS_Listener" path="/api/v2/orders/*"/>
    <apikit:router config-ref="orders-v2-config"/>
</flow>
```

### Version Deprecation Strategy

1. **Announce deprecation** - Communicate timeline to consumers
2. **Add deprecation headers** - Return `Deprecation` header in responses
3. **Monitor usage** - Track v1 vs v2 adoption
4. **Sunset gracefully** - Remove only after consumer migration

```xml
<!-- Add deprecation warning -->
<set-variable variableName="outboundHeaders" value="#[{
    'Deprecation': 'true',
    'Sunset': 'Sat, 01 Jan 2025 00:00:00 GMT',
    'Link': '&lt;/api/v2/orders&gt;; rel="successor-version"'
}]"/>
```

---

## Deployment Practices

Deploy safely and consistently across environments.

### Environment Promotion

```
Development → QA → Staging → Production
    ↓           ↓       ↓          ↓
  dev.yaml   qa.yaml  stg.yaml  prod.yaml
```

### Deployment Checklist

| Item | Description |
|------|-------------|
| ✅ All tests pass | MUnit and integration tests |
| ✅ Lint checks pass | No errors from mule-lint |
| ✅ Properties configured | Environment YAML verified |
| ✅ Secrets encrypted | No plaintext credentials |
| ✅ API Manager policies | Authentication, rate limiting |
| ✅ Monitoring configured | Dashboards and alerts ready |

### Blue-Green Deployment

For zero-downtime deployments:

1. Deploy new version to "green" workers
2. Run smoke tests against green
3. Switch load balancer to green
4. Monitor for issues
5. Decommission "blue" workers (or keep for rollback)

### Rollback Strategy

```bash
# Anypoint CLI rollback example
anypoint-cli runtime-mgr cloudhub-application modify \
  --environment Production \
  --applicationName orders-api \
  --runtime 4.4.0 \
  --artifact-id orders-api-1.2.0.jar
```

---

## Monitoring and Observability

Production applications need comprehensive monitoring.

### The Three Pillars

| Pillar | Tool | Purpose |
|--------|------|---------|
| **Logs** | Anypoint Monitoring, Splunk, ELK | Debug issues, audit trail |
| **Metrics** | Anypoint Monitoring, Grafana | Performance, health status |
| **Traces** | Anypoint Monitoring, Jaeger | Request flow, latency analysis |

### Key Metrics to Monitor

```
Application Health:
├── Response time (p50, p95, p99)
├── Error rate (%)
├── Throughput (requests/sec)
├── Active connections
└── Worker CPU/Memory usage

Business Metrics:
├── Orders processed per hour
├── Failed transactions
├── API calls by consumer
└── Integration latency by backend
```

### Alerting Best Practices

| Alert Level | Condition | Response |
|-------------|-----------|----------|
| **Critical** | Error rate > 10%, App down | Immediate on-call response |
| **Warning** | Error rate > 5%, Latency > 5s | Investigate within 1 hour |
| **Info** | Unusual patterns, Resource > 70% | Review in daily standup |

### Correlation ID Pattern

Ensure correlation IDs flow through all systems:

```xml
<!-- Set correlation ID at entry point -->
<set-variable variableName="correlationId" 
              value="#[correlationId default uuid()]"/>

<!-- Include in all outbound requests -->
<http:request config-ref="HTTP_Config" path="/downstream">
    <http:headers><![CDATA[#[{
        'X-Correlation-ID': vars.correlationId
    }]]]></http:headers>
</http:request>

<!-- Include in all log messages -->
<logger category="com.myorg" 
        message="#['[' ++ vars.correlationId ++ '] Processing request...']"/>
```

### Health Check Endpoint

Expose a health endpoint for load balancers and monitoring:

```xml
<flow name="health-check-flow">
    <http:listener config-ref="HTTPS_Listener" path="/health"/>
    <set-payload value='#[%dw 2.0
output application/json
---
{
    status: "UP",
    timestamp: now(),
    version: p("app.version"),
    environment: p("mule.env")
}]'/>
</flow>
```

---

## Summary

This guide covers both linter-enforced practices and general developer guidelines:

| Category | Linter Enforced | General Guidelines |
|----------|-----------------|-------------------|
| Code Quality | ✅ Naming, Structure, Complexity | Testing, Code Review |
| Security | ✅ Hardcoded secrets, TLS | Secrets Management, IAM |
| Operations | ✅ Error handling, Logging | CI/CD, Monitoring, Deployment |
| Architecture | ✅ API-Led patterns | Versioning, Documentation |

For linter rule details, see the [Rules Catalog](rules-catalog.md).

