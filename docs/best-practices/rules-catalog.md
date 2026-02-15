# Rules Catalog

> **Version:** 3.0.0  
> **Total Rules:** 56 implemented across 14 categories  
> **Last Updated:** February 2026

---

## Quick Navigation

- [Rule Categories](#rule-categories)
- [Error Handling Rules](#error-handling-rules)
- [Naming Rules](#naming-rules)
- [Security Rules](#security-rules)
- [Logging Rules](#logging-rules)
- [HTTP Rules](#http-rules)
- [Performance Rules](#performance-rules)
- [Documentation Rules](#documentation-rules)
- [Standards Rules](#standards-rules)
- [Complexity Rules](#complexity-rules)
- [Structure Rules](#structure-rules)
- [YAML Rules](#yaml-rules)
- [DataWeave Rules](#dataweave-rules)
- [API-Led Rules](#api-led-rules)
- [Operations & Hygiene Rules](#operations--hygiene-rules)
- [Governance Rules](#governance-rules)
- [Experimental Rules](#experimental-rules)

---

## Rule Categories

| Family | Prefix | Count | Description |
|--------|--------|-------|-------------|
| Error Handling | MULE-001/003/005/007/009, ERR-001 | 6 | Error handler configuration and best practices |
| Naming | MULE-002/101/102 | 3 | Naming conventions for flows and variables |
| Security | MULE-004/201/202, SEC-002/003/004/006 | 7 | Security vulnerabilities, TLS, rate limiting |
| Logging | MULE-006/301/303, LOG-001/004, HYG-001 | 6 | Logging standards, structured logging, hygiene |
| HTTP | MULE-401/402/403 | 3 | HTTP configuration and headers |
| Performance | MULE-501/502/503, PERF-002, RES-001 | 5 | Performance anti-patterns and resilience |
| Documentation | MULE-601/604, DOC-001 | 3 | Documentation requirements |
| Standards | MULE-008/010/701, OPS-001/002/003, API-005 | 7 | Coding standards and operations |
| Complexity | MULE-801 | 1 | Code complexity |
| Structure | MULE-802/803/804 | 3 | Project structure |
| YAML | YAML-001/003/004 | 3 | YAML configuration validation |
| DataWeave | DW-001/002/003/004 | 4 | DataWeave file validation |
| API-Led | API-001/002/003/004 | 4 | API-Led connectivity patterns |
| Governance | PROJ-001/002 | 2 | POM and Git hygiene |
| Code Hygiene | HYG-002/003 | 2 | Commented code and unused flows |
| Experimental | EXP-001/002/003 | 3 | Beta rules for evaluation |

### MULE Category ID Ranges

| Range | Category | Description |
|-------|----------|-------------|
| 001-099 | Error Handling | Error handler configuration and best practices |
| 100-199 | Naming | Naming conventions for flows, variables, files |
| 200-299 | Security | Security vulnerabilities and hardcoded values |
| 300-399 | Logging | Logging standards and structured logging |
| 400-499 | HTTP | HTTP configuration and headers |
| 500-599 | Performance | Performance anti-patterns |
| 600-699 | Documentation | Documentation requirements |
| 700-799 | Standards | General coding standards |
| 800-899 | Complexity/Structure | Code complexity and project structure |

---

> 📘 **For detailed best practices, see [MuleSoft Best Practices Guide](mulesoft-best-practices.md)**

## Error Handling Rules

> **Best Practice**: Every flow should have explicit error handling. Use a global error handler for consistency, but override specific handlers where needed.

### MULE-001: Global Error Handler Exists

| Property | Value |
|----------|-------|
| **Severity** | Error |
| **Category** | Error Handling |
| **Fixable** | No |

**Description:** Every Mule project should have a global error handler file with a reusable error-handler configuration.

**Check Logic:**
1. Verify file exists: `src/main/mule/global-error-handler.xml`
2. Verify contains: `<error-handler name="global-error-handler">`

**Why This Matters:** A global error handler ensures consistent error responses across all flows and reduces code duplication.

---

### MULE-003: Missing Error Handler

| Property | Value |
|----------|-------|
| **Severity** | Error |
| **Category** | Error Handling |
| **Fixable** | No |

**Description:** Every flow should have an error handler or reference the global one.

**XPath:**
```xpath
//mule:flow[not(mule:error-handler) and not(contains(@name, 'api-main'))]
```

---

### MULE-005: HTTP Status in Error Handler

| Property | Value |
|----------|-------|
| **Severity** | Warning |
| **Category** | Error Handling |
| **Fixable** | No |

**Description:** Error handlers should set an `httpStatus` variable for proper API responses.

**Best Practice:** Always set httpStatus in error handlers to return appropriate HTTP codes (400, 404, 500, etc.).

---

### MULE-007: Correlation ID in Error Handler

| Property | Value |
|----------|-------|
| **Severity** | Warning |
| **Category** | Error Handling |
| **Fixable** | No |

**Description:** Error handlers should reference `correlationId` for traceability across distributed systems.

---

### MULE-009: Generic Error Type

| Property | Value |
|----------|-------|
| **Severity** | Warning |
| **Category** | Error Handling |
| **Fixable** | No |

**Description:** Avoid catching `type="ANY"` in error handlers. Be specific about error types.

**Why This Matters:** Catching `ANY` can mask important errors and make debugging difficult.

---

### ERR-001: Try Scope Best Practice

| Property | Value |
|----------|-------|
| **Severity** | Info |
| **Category** | Error Handling |
| **Issue Type** | Bug |
| **Fixable** | No |

**Description:** Complex operations (DB calls, HTTP requests) should use Try scope for granular error isolation and handling.

**Check Logic:** Flags flows that have 2+ external calls (HTTP requests, DB operations) without any Try scope wrapping them.

**Example:**
```xml
<!-- ❌ Bad - multiple calls without Try -->
<flow name="process-order-flow">
    <http:request config-ref="API"/>
    <db:insert config-ref="Database"/>
</flow>

<!-- ✅ Good - risky operations isolated -->
<flow name="process-order-flow">
    <try>
        <http:request config-ref="API"/>
        <error-handler>...</error-handler>
    </try>
    <try>
        <db:insert config-ref="Database"/>
        <error-handler>...</error-handler>
    </try>
</flow>
```

---

## Naming Rules

> **Best Practice**: Consistent naming conventions improve readability and maintainability. Use kebab-case for flows and camelCase for variables.

### MULE-002: Flow Naming Convention

| Property | Value |
|----------|-------|
| **Severity** | Warning |
| **Category** | Naming |
| **Fixable** | Yes |

**Description:** Flows must end with `-flow` suffix, sub-flows with `-subflow`.

**Examples:**
```xml
<!-- ✅ Good -->
<flow name="process-order-flow">
<sub-flow name="validate-input-subflow">

<!-- ❌ Bad -->
<flow name="processOrder">
<sub-flow name="validateInput">
```

---

### MULE-101: Flow Name Casing

| Property | Value |
|----------|-------|
| **Severity** | Warning |
| **Category** | Naming |
| **Fixable** | No |

**Description:** Flow names should follow consistent casing (kebab-case recommended).

**Options:**
- `kebab-case`: `my-flow-name` (recommended)
- `camelCase`: `myFlowName`
- `snake_case`: `my_flow_name`

---

### MULE-102: Variable Naming Convention

| Property | Value |
|----------|-------|
| **Severity** | Warning |
| **Category** | Naming |
| **Fixable** | No |

**Description:** Variables set via `set-variable` should follow camelCase naming.

---

## Security Rules

> **Best Practice**: Never commit secrets to source control. Use secure properties files with encryption or external secrets management.

### MULE-004: Hardcoded HTTP URLs

| Property | Value |
|----------|-------|
| **Severity** | Error |
| **Category** | Security |
| **Fixable** | No |

**Description:** HTTP/HTTPS URLs should use property placeholders, not hardcoded values.

**Examples:**
```xml
<!-- ❌ Bad -->
<http:request url="https://api.example.com/orders" />

<!-- ✅ Good -->
<http:request url="${api.orders.url}" />
```

---

### MULE-201: Hardcoded Credentials

| Property | Value |
|----------|-------|
| **Severity** | Error |
| **Category** | Security |
| **Fixable** | No |

**Description:** Passwords and secrets should never be hardcoded. Use secure properties.

**Best Practice:** Use MuleSoft Secure Properties module with encrypted values `![encrypted.value]`.

---

### MULE-202: Insecure TLS Configuration

| Property | Value |
|----------|-------|
| **Severity** | Error |
| **Category** | Security |
| **Fixable** | No |

**Description:** TLS configurations should not use insecure protocols or disable certificate verification.

---

### SEC-002: TLS Version Check

| Property | Value |
|----------|-------|
| **Severity** | Error |
| **Category** | Security |
| **Issue Type** | Vulnerability |
| **Fixable** | No |

**Description:** Detect use of deprecated TLS versions (< 1.2). TLS 1.0 and 1.1 are deprecated and should not be used per current security standards.

**Deprecated Protocols:** `TLSv1`, `TLSv1.0`, `TLSv1.1`, `SSLv3`, `SSLv2`

**Example:**
```xml
<!-- ❌ Bad - deprecated protocol -->
<tls:context enabledProtocols="TLSv1.1,TLSv1.2">

<!-- ✅ Good -->
<tls:context enabledProtocols="TLSv1.2,TLSv1.3">
```

---

### SEC-003: Rate Limiting Policy

| Property | Value |
|----------|-------|
| **Severity** | Warning |
| **Category** | Security |
| **Issue Type** | Vulnerability |
| **Fixable** | No |

**Description:** APIs should have rate limiting or throttling configured to prevent DoS attacks and manage API consumption.

**Check Logic:** Scans API interface files for HTTP listeners without associated rate limiting, throttling, or spike control policies.

**Best Practice:** Configure rate limiting via API Manager policies or add `throttling:config` to protect against abuse.

---

### SEC-004: Input Validation

| Property | Value |
|----------|-------|
| **Severity** | Warning |
| **Category** | Security |
| **Issue Type** | Vulnerability |
| **Fixable** | No |

**Description:** Incoming payloads should be validated using JSON or XML schema validation to prevent injection attacks and malformed data processing.

**Check Logic:** Flags flows accepting POST/PUT/PATCH requests that have no schema validation or DataWeave validation patterns.

**Example:**
```xml
<!-- ✅ Good - schema validation -->
<flow name="post:\orders:api-config">
    <json:validate-schema schema="schemas/order.json"/>
    ...
</flow>
```

---

### SEC-006: Encryption Key in Logs

| Property | Value |
|----------|-------|
| **Severity** | Error |
| **Category** | Security |
| **Fixable** | No |

**Description:** Encryption keys, passwords, and sensitive credentials should not appear in log statements.

**Detected Patterns:** `encrypt.*key`, `password`, `credentials`, `api_key`, `secret.*key`, `mule.key`, `secure::.*key`

**Example:**
```xml
<!-- ❌ Bad -->
<logger message="Key: #[vars.encryptionKey]"/>

<!-- ✅ Good -->
<logger message="Processing completed for order #[vars.orderId]"/>
```

---

## Logging Rules

> **Best Practice**: Use structured logging with categories. Never log full payloads in production - they may contain PII or be excessively large.

### MULE-006: Logger Category Required

| Property | Value |
|----------|-------|
| **Severity** | Warning |
| **Category** | Logging |
| **Fixable** | Yes |

**Description:** All loggers must have a `category` attribute for proper log filtering.

**Example:**
```xml
<!-- ✅ Good -->
<logger category="com.myorg.orders" message="Processing order" level="INFO"/>
```

---

### MULE-301: Logger Payload Reference

| Property | Value |
|----------|-------|
| **Severity** | Warning |
| **Category** | Logging |
| **Fixable** | No |

**Description:** Loggers should not directly reference `#[payload]` as it may log sensitive data and cause performance issues.

**Examples:**
```xml
<!-- ❌ Bad - logs entire payload -->
<logger message="#[payload]" />

<!-- ✅ Good - logs specific fields -->
<logger message="#['Order ID: ' ++ payload.orderId]" />
```

---

### MULE-303: Logger in Until-Successful

| Property | Value |
|----------|-------|
| **Severity** | Warning |
| **Category** | Logging |
| **Fixable** | No |

**Description:** Having a logger inside `until-successful` may flood logs on retries.

---

### LOG-001: Structured Logging

| Property | Value |
|----------|-------|
| **Severity** | Info |
| **Category** | Logging |
| **Fixable** | No |

**Description:** Recommend JSON logger format over plain text for production applications to enable better log parsing and analysis.

**Check Logic:** Flags global/config files that use standard loggers without JSON Logger Module configuration.

**Best Practice:** Use JSON Logger Module for structured log output in production environments. This enables better log aggregation and analysis with tools like Splunk, ELK, or Anypoint Monitoring.

---

### LOG-004: Sensitive Data in Logs

| Property | Value |
|----------|-------|
| **Severity** | Error |
| **Category** | Logging |
| **Fixable** | No |

**Description:** Log statements should not contain sensitive data values (passwords, tokens, SSNs, PII).

**Detected Patterns:** Variable references like `vars.password`, `payload.token`, `${secure::*}`, concatenated sensitive values.

**Example:**
```xml
<!-- ❌ Bad - logs sensitive variable value -->
<logger message="#['Token: ' ++ vars.accessToken]"/>

<!-- ✅ Good -->
<logger message="Authentication successful for user #[vars.userId]"/>
```

---

### HYG-001: Excessive Loggers

| Property | Value |
|----------|-------|
| **Severity** | Warning |
| **Category** | Logging |
| **Fixable** | No |

**Description:** Flows should not have too many loggers, which can impact performance.

**Configuration:**
```json
{
  "HYG-001": {
    "options": {
      "maxLoggers": 5
    }
  }
}
```

**Best Practice:** Keep logger count per flow ≤ 5. Move detailed logging to DEBUG level.

---

## HTTP Rules

> **Best Practice**: Configure explicit timeouts, include identifying headers, and handle all HTTP response codes appropriately.

### MULE-401: HTTP Request Missing User-Agent

| Property | Value |
|----------|-------|
| **Severity** | Warning |
| **Category** | HTTP |
| **Fixable** | No |

**Description:** All HTTP requests should include a `User-Agent` header for API identification.

---

### MULE-402: HTTP Request Missing Content-Type

| Property | Value |
|----------|-------|
| **Severity** | Warning |
| **Category** | HTTP |
| **Fixable** | No |

**Description:** POST/PUT HTTP requests should include a `Content-Type` header.

---

### MULE-403: HTTP Request Timeout

| Property | Value |
|----------|-------|
| **Severity** | Warning |
| **Category** | HTTP |
| **Fixable** | No |

**Description:** HTTP requests should have explicit timeout configuration.

**Best Practice:** Always set `responseTimeout` to avoid hanging connections.

---

## Performance Rules

> **Best Practice**: Keep flows simple and focused. Use async processing carefully with proper error handling. Configure connection pooling and reconnection for production resilience.

### MULE-501: Scatter-Gather Routes

| Property | Value |
|----------|-------|
| **Severity** | Info |
| **Category** | Performance |
| **Fixable** | No |

**Description:** Scatter-gather with many routes may cause memory issues. Consider limiting routes.

---

### MULE-502: Async Without Error Handler

| Property | Value |
|----------|-------|
| **Severity** | Warning |
| **Category** | Performance |
| **Fixable** | No |

**Description:** Async scopes should have their own error handling since they don't propagate errors to the parent flow.

**Why This Matters:** Errors in async scopes are silently swallowed without explicit handling.

---

### MULE-503: Large Choice Blocks

| Property | Value |
|----------|-------|
| **Severity** | Warning |
| **Category** | Performance |
| **Fixable** | No |

**Description:** Choice blocks with many when clauses should be refactored to DataWeave lookups or routing slip pattern.

---

### PERF-002: Connection Pooling

| Property | Value |
|----------|-------|
| **Severity** | Warning |
| **Category** | Performance |
| **Fixable** | No |

**Description:** DB and HTTP connectors should configure connection pools for optimal performance and resource management.

**Check Logic:** Flags HTTP request configs missing `maxConnections`/`connectionIdleTimeout` and DB configs missing `pooling-profile`.

**Example:**
```xml
<!-- ✅ Good - HTTP with pooling -->
<http:request-config name="API_Config" maxConnections="20" connectionIdleTimeout="30000"/>

<!-- ✅ Good - DB with pooling -->
<db:config name="Database_Config">
    <db:pooling-profile maxPoolSize="10" minPoolSize="2"/>
</db:config>
```

---

### RES-001: Reconnection Strategy

| Property | Value |
|----------|-------|
| **Severity** | Warning |
| **Category** | Performance |
| **Fixable** | No |

**Description:** Connectors should have reconnection strategies configured for resilience.

**Checked Connectors:** HTTP Request, HTTP Listener, JMS, AMQP, SFTP, FTP, VM, Database

**Example:**
```xml
<!-- ✅ Good -->
<http:request-config name="API_Config">
    <http:request-connection>
        <reconnection>
            <reconnect count="3" frequency="2000"/>
        </reconnection>
    </http:request-connection>
</http:request-config>
```

---

## Documentation Rules

> **Best Practice**: Well-documented flows are easier to maintain. Use meaningful names that describe business purpose.

### MULE-601: Flow Missing Description

| Property | Value |
|----------|-------|
| **Severity** | Info |
| **Category** | Documentation |
| **Fixable** | No |

**Description:** Flows should have a `doc:description` attribute for documentation.

---

### MULE-604: Missing doc:name

| Property | Value |
|----------|-------|
| **Severity** | Warning |
| **Category** | Documentation |
| **Fixable** | No |

**Description:** Key components (logger, set-variable, transform, etc.) should have `doc:name` for Anypoint Studio visibility.

---

### DOC-001: Display Name Enforcement

| Property | Value |
|----------|-------|
| **Severity** | Info |
| **Category** | Documentation |
| **Fixable** | No |

**Description:** Key components should have meaningful `doc:name` attributes, not default/generic names.

**Flagged Defaults:** `Set Payload`, `Set Variable`, `Transform Message`, `Flow Reference`, `Logger`, `Choice`

**Example:**
```xml
<!-- ❌ Bad - generic default name -->
<set-payload doc:name="Set Payload" value="#[output application/json --- {}]"/>

<!-- ✅ Good - descriptive name -->
<set-payload doc:name="Build Order Response" value="#[output application/json --- {}]"/>
```

---

## Standards Rules

### MULE-008: Choice Anti-Pattern

| Property | Value |
|----------|-------|
| **Severity** | Warning |
| **Category** | Standards |
| **Fixable** | No |

**Description:** Avoid using `raise-error` directly inside `choice/otherwise`. Use a more descriptive error type.

---

### MULE-010: DWL Standards File

| Property | Value |
|----------|-------|
| **Severity** | Info |
| **Category** | Standards |
| **Fixable** | No |

**Description:** Project should have a standard error DataWeave file at `src/main/resources/dwl/standard-error.dwl`.

---

### MULE-701: Deprecated Component Usage

| Property | Value |
|----------|-------|
| **Severity** | Warning |
| **Category** | Standards |
| **Fixable** | No |

**Description:** Detect usage of deprecated Mule components.

---

### OPS-001: Auto-Discovery Configuration

| Property | Value |
|----------|-------|
| **Severity** | Info |
| **Category** | Standards |
| **Fixable** | No |

**Description:** APIs should have auto-discovery configured for API Manager integration.

**Check Logic:** Flags API projects (those with APIKit router) that are missing `<api-gateway:autodiscovery>`. Also verifies that `apiId` uses a property placeholder.

**Example:**
```xml
<!-- ✅ Good -->
<api-gateway:autodiscovery apiId="${api.id}" flowRef="api-main"/>
```

---

### OPS-002: HTTP Port Placeholder

| Property | Value |
|----------|-------|
| **Severity** | Warning |
| **Category** | Standards |
| **Fixable** | No |

**Description:** HTTP listener ports should use property placeholders, not hardcoded values.

**Example:**
```xml
<!-- ❌ Bad -->
<http:listener-config port="8081"/>

<!-- ✅ Good -->
<http:listener-config port="${http.port}"/>
```

---

### OPS-003: Externalized Cron Expression

| Property | Value |
|----------|-------|
| **Severity** | Warning |
| **Category** | Standards |
| **Fixable** | No |

**Description:** Cron expressions in schedulers should use property placeholders to allow environment-specific scheduling.

**Example:**
```xml
<!-- ❌ Bad -->
<scheduling-strategy>
    <cron expression="0 0 3 * * ?"/>
</scheduling-strategy>

<!-- ✅ Good -->
<scheduling-strategy>
    <cron expression="${scheduler.cron}"/>
</scheduling-strategy>
```

---

### API-005: APIKit Validation

| Property | Value |
|----------|-------|
| **Severity** | Info |
| **Category** | Standards |
| **Fixable** | No |

**Description:** APIs should use APIKit for auto-generated implementation interfaces.

**Check Logic:** Flags API projects (those with HTTP listeners and main flows) that don't use an APIKit router.

**Best Practice:** APIKit provides consistent API implementation patterns and automatic input validation based on the RAML/OAS spec.

---

## Complexity Rules

> **Best Practice**: Keep cyclomatic complexity below 10. Extract complex logic into sub-flows.

### MULE-801: Flow Complexity

| Property | Value |
|----------|-------|
| **Severity** | Warning |
| **Category** | Complexity |
| **Fixable** | No |

**Description:** Flow cyclomatic complexity should not exceed threshold.

**Decision Points Tracked:**
| Element | Description |
|---------|-------------|
| `<choice>/<when>` | Each when clause adds 1 |
| `<until-successful>` | Retry logic |
| `<foreach>` | Iteration |
| `<parallel-foreach>` | Parallel iteration |
| `<scatter-gather>` | Parallel execution |
| `<async>` | Parallel execution path |
| `<try>` | Exception handling |
| `<first-successful>` | Fallback routing |
| `<round-robin>` | Load balancing |
| `<on-error-*>` | Error handlers |

**Configuration:**
```json
{
  "MULE-801": {
    "options": {
      "warnThreshold": 10,
      "errorThreshold": 20
    }
  }
}
```

---

## Structure Rules

> **Best Practice**: Follow standard MuleSoft project structure. Keep XML files focused - one flow per file for complex flows.

### MULE-802: Project Structure

| Property | Value |
|----------|-------|
| **Severity** | Warning |
| **Category** | Structure |
| **Fixable** | No |

**Description:** Validate standard MuleSoft project folder structure.

**Required Directories:**
- `src/main/mule`
- `src/main/resources`

**Recommended Directories:**
- `src/main/resources/dwl`
- `src/main/resources/api`
- `src/test/munit`

---

### MULE-803: Global Config File

| Property | Value |
|----------|-------|
| **Severity** | Warning |
| **Category** | Structure |
| **Fixable** | No |

**Description:** Project should have `global.xml` with shared configurations (HTTP listeners, error handlers, etc.).

---

### MULE-804: Monolithic XML File

| Property | Value |
|----------|-------|
| **Severity** | Warning |
| **Category** | Structure |
| **Fixable** | No |

**Description:** XML files should not exceed 10 flows/sub-flows. Split large files by domain.

---

## YAML Rules

> **Best Practice**: Use environment-specific YAML files (dev.yaml, qa.yaml, prod.yaml). Encrypt sensitive properties.

### YAML-001: Environment Properties Files

| Property | Value |
|----------|-------|
| **Severity** | Warning |
| **Category** | Standards |
| **Fixable** | No |

**Description:** Environment-specific YAML property files should exist for each environment.

**Expected Files:**
- `dev.yaml` or `config-dev.yaml`
- `qa.yaml` or `config-qa.yaml`
- `prod.yaml` or `config-prod.yaml`

---

### YAML-003: Property Naming Convention

| Property | Value |
|----------|-------|
| **Severity** | Info |
| **Category** | Standards |
| **Fixable** | No |

**Description:** Property keys should follow `category.property` format.

**Examples:**
```yaml
# ✅ Good
db.host: localhost
api.timeout: 30000

# ❌ Bad
DBHOST: localhost
ApiTimeout: 30000
```

---

### YAML-004: No Plaintext Secrets

| Property | Value |
|----------|-------|
| **Severity** | Error |
| **Category** | Security |
| **Fixable** | No |

**Description:** Sensitive properties (passwords, keys, secrets) should be encrypted with `![...]` syntax.

**Example:**
```yaml
# ❌ Bad - plaintext secret
db.password: mySecretPassword

# ✅ Good - encrypted
db.password: "![encryptedValue]"
```

---

## DataWeave Rules

> **Best Practice**: Externalize complex transformations to .dwl files. Create reusable modules for common functions.

### DW-001: External DWL for Complex Transforms

| Property | Value |
|----------|-------|
| **Severity** | Warning |
| **Category** | DataWeave |
| **Fixable** | No |

**Description:** Complex DataWeave (10+ lines) should be externalized to `.dwl` files.

---

### DW-002: DWL File Naming

| Property | Value |
|----------|-------|
| **Severity** | Info |
| **Category** | DataWeave |
| **Fixable** | No |

**Description:** DataWeave files should use kebab-case naming (`my-transform.dwl`).

---

### DW-003: DWL Modules

| Property | Value |
|----------|-------|
| **Severity** | Info |
| **Category** | DataWeave |
| **Fixable** | No |

**Description:** Project should have common reusable DataWeave modules (`common.dwl`, `utils.dwl`).

---

### DW-004: Java 17 DataWeave Error Handling

| Property | Value |
|----------|-------|
| **Severity** | Error |
| **Category** | DataWeave |
| **Fixable** | No |

**Description:** Enforces DataWeave error handling patterns compatible with Java 17 encapsulation. Detects restricted property access patterns that fail at runtime on Java 17.

**Forbidden Patterns & Replacements:**

| Forbidden | Replacement |
|-----------|-------------|
| `error.description` | `error.detailedDescription` |
| `error.errorType.asString` | `error.errorType.namespace ++ ":" ++ error.errorType.identifier` |
| `error.muleMessage` | `error.errorMessage` |
| `error.errors` | `error.childErrors` |

**Example:**
```dataweave
// ❌ Bad - restricted in Java 17
error.description
error.errorType.asString()

// ✅ Good - Java 17 compatible
error.detailedDescription
error.errorType.namespace ++ ":" ++ error.errorType.identifier
```

---

## API-Led Rules

> **Best Practice**: Follow API-Led Connectivity architecture with clear layer separation:
> - **Experience Layer**: Channel-specific APIs (web, mobile)
> - **Process Layer**: Orchestration and business logic
> - **System Layer**: Backend system connectivity

### API-001: Experience Layer Pattern

| Property | Value |
|----------|-------|
| **Severity** | Info |
| **Category** | API-Led |
| **Fixable** | No |

**Description:** Experience layer APIs (with `-exp-` in name) should have HTTP listeners as entry points.

---

### API-002: Process Layer Pattern

| Property | Value |
|----------|-------|
| **Severity** | Info |
| **Category** | API-Led |
| **Fixable** | No |

**Description:** Process layer APIs (with `-proc-` in name) should orchestrate other APIs via flow-refs or HTTP requests.

---

### API-003: System Layer Pattern

| Property | Value |
|----------|-------|
| **Severity** | Info |
| **Category** | API-Led |
| **Fixable** | No |

**Description:** System layer APIs (with `-sys-` in name) should connect to external systems (databases, HTTP services).

---

### API-004: Single System Per SAPI

| Property | Value |
|----------|-------|
| **Severity** | Warning |
| **Category** | API-Led |
| **Fixable** | No |

**Description:** System API should integrate with only one backend system. This promotes clear separation of concerns, easier maintenance, better reusability, and simplified error handling.

**Check Logic:** Scans all Mule XML files in a SAPI project (identified by `-sapi`, `-sys-`, or `-system-` in the project name) for connector namespace declarations. If multiple distinct external system connectors are found (e.g., Salesforce + Database), the rule flags it.

**Recognized Connectors:** Salesforce, NetSuite, Database, SAP, Workday, ServiceNow, JMS, AMQP, Kafka, SFTP, FTP, MongoDB, Redis, and more.

---

## Operations & Hygiene Rules

### HYG-002: Commented Code Detection

| Property | Value |
|----------|-------|
| **Severity** | Info |
| **Category** | Standards |
| **Fixable** | No |

**Description:** Detects potentially commented-out code blocks in Mule configurations.

**Detected Patterns:** XML comments containing `<flow `, `<sub-flow `, `<logger `, `<set-variable `, `<set-payload `, `<choice>`, `<transform `, `<flow-ref `, `<try>`, `<db:`.

**Best Practice:** Remove commented code or convert to proper documentation comments. Use version control instead.

---

### HYG-003: Unused Flow Detection

| Property | Value |
|----------|-------|
| **Severity** | Warning |
| **Category** | Standards |
| **Fixable** | No |

**Description:** Detects flows and sub-flows that are never referenced by `flow-ref` within the same file.

**Check Logic:**
- **Sub-flows**: Always expected to be referenced; flagged if no `flow-ref` points to them.
- **Flows without triggers**: Flows that have no HTTP listener, scheduler, or VM listener and aren't referenced are flagged.
- **Exclusions**: Flows matching common external patterns (`-main`, `-api`, `api-`, `-console`, `-error-handler`, `global`) are excluded.

---

## Governance Rules

### PROJ-001: POM Validation

| Property | Value |
|----------|-------|
| **Severity** | Error |
| **Category** | Structure |
| **Fixable** | No |

**Description:** Validates `pom.xml` existence and critical plugins.

**Checks:**
1. `pom.xml` exists in project root
2. Contains `mule-maven-plugin` in build configuration
3. Contains `munit-maven-plugin` if test files exist

---

### PROJ-002: Git Hygiene

| Property | Value |
|----------|-------|
| **Severity** | Warning |
| **Category** | Structure |
| **Fixable** | No |

**Description:** Validates `.gitignore` existence and standard entries in git repositories.

**Required Entries:** `target/`, `.project`, `.classpath`, `.tooling-project`

---

## Experimental Rules

> ⚠️ These rules are in beta and may have false positives. Use for guidance only.

### EXP-001: Flow Reference Depth

| Property | Value |
|----------|-------|
| **Severity** | Info |
| **Category** | Experimental |
| **Fixable** | No |

**Description:** Limit the number of flow-refs in a single flow to avoid deep call chains.

---

### EXP-002: Connector Config Naming

| Property | Value |
|----------|-------|
| **Severity** | Info |
| **Category** | Experimental |
| **Fixable** | No |

**Description:** Connector configurations should follow `Convention_Type` pattern (e.g., `HTTP_Request_Config`).

---

### EXP-003: MUnit Coverage

| Property | Value |
|----------|-------|
| **Severity** | Info |
| **Category** | Experimental |
| **Fixable** | No |

**Description:** Flows should have corresponding MUnit tests in `src/test/munit`.

---

## Rule Priority Matrix

| Severity | Count | Rules |
|----------|-------|-------|
| Error | 10 | MULE-001, 003, 004, 201, 202, SEC-002, SEC-006, LOG-004, DW-004, YAML-004, PROJ-001 |
| Warning | 25 | MULE-002, 005, 006, 007, 008, 009, 101, 102, 301, 303, 401, 402, 403, 502, 503, 604, 701, 801, 802, 803, 804, SEC-003, SEC-004, PERF-002, RES-001, OPS-002, OPS-003, HYG-001, HYG-003, API-004, PROJ-002 |
| Info | 21 | MULE-010, 501, 601, YAML-001, 003, DW-001, 002, 003, API-001, 002, 003, 005, EXP-001, 002, 003, ERR-001, LOG-001, OPS-001, DOC-001, HYG-002 |

---

## Configuration

See [Extending mule-lint](../linter/extending.md) for instructions on adding organization-specific rules and customizing rule behavior.

### Disabling Rules

```json
{
  "rules": {
    "MULE-002": { "enabled": false },
    "MULE-801": { "options": { "warnThreshold": 15 } }
  }
}
```
