# Rules Catalog

> **Version:** 2.0.0  
> **Total Rules:** 40 implemented across 5 rule families  
> **Last Updated:** December 2025

---

## Quick Navigation

- [Rule Categories](#rule-categories)
- [Error Handling Rules](#error-handling-rules-mule-001-009)
- [Naming Rules](#naming-rules-mule-002-101-102)
- [Security Rules](#security-rules-mule-004-201-202)
- [Logging Rules](#logging-rules-mule-006-301-303)
- [HTTP Rules](#http-rules-mule-401-403)
- [Performance Rules](#performance-rules-mule-501-503)
- [Documentation Rules](#documentation-rules-mule-601-604)
- [Standards Rules](#standards-rules-mule-008-010-701)
- [Complexity Rules](#complexity-rules-mule-801)
- [Structure Rules](#structure-rules-mule-802-804)
- [YAML Rules](#yaml-rules-yaml-001-004)
- [DataWeave Rules](#dataweave-rules-dw-001-003)
- [API-Led Rules](#api-led-rules-api-001-003)
- [Experimental Rules](#experimental-rules-exp-001-003)

---

## Rule Categories

| Family | Prefix | Count | Description |
|--------|--------|-------|-------------|
| Core MuleSoft | MULE-XXX | 29 | Core Mule 4 XML validation |
| YAML Properties | YAML-XXX | 3 | YAML configuration validation |
| DataWeave | DW-XXX | 3 | DataWeave file validation |
| API-Led | API-XXX | 3 | API-Led connectivity patterns |
| Experimental | EXP-XXX | 3 | Beta rules for evaluation |

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

## Error Handling Rules (MULE-001-009)

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

## Naming Rules (MULE-002, 101, 102)

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

## Security Rules (MULE-004, 201, 202)

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

## Logging Rules (MULE-006, 301, 303)

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

## HTTP Rules (MULE-401-403)

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

## Performance Rules (MULE-501-503)

> **Best Practice**: Keep flows simple and focused. Use async processing carefully with proper error handling.

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

## Documentation Rules (MULE-601, 604)

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

## Standards Rules (MULE-008, 010, 701)

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

## Complexity Rules (MULE-801)

> **Best Practice**: Keep cyclomatic complexity below 10. Extract complex logic into sub-flows.

### MULE-801: Flow Complexity

| Property | Value |
|----------|-------|
| **Severity** | Warning |
| **Category** | Complexity |
| **Fixable** | No |

**Description:** Flow cyclomatic complexity should not exceed threshold.

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

## Structure Rules (MULE-802-804)

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

## YAML Rules (YAML-001-004)

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

## DataWeave Rules (DW-001-003)

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

## API-Led Rules (API-001-003)

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

## Experimental Rules (EXP-001-003)

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
| Error | 7 | MULE-001, 003, 004, 201, 202, YAML-004 |
| Warning | 21 | MULE-002, 005, 006, 007, 008, 009, 101, 102, 301, 303, 401, 402, 403, 502, 503, 604, 701, 801, 802, 803, 804 |
| Info | 12 | MULE-010, 501, 601, YAML-001, 003, DW-001, 002, 003, API-001, 002, 003, EXP-001, 002, 003 |

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
