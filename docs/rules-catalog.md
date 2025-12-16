# Rules Catalog

> **Version:** 1.0.0  
> **Status:** Core MVP rules (MULE-001 through MULE-010) implemented.  
> Extended rules documented for future implementation.  
> Inspired by [mule-lint/mule-lint](https://github.com/mule-lint/mule-lint)

---

## Rule Categories

| Category | ID Range | Description |
|----------|----------|-------------|
| Error Handling | 001-099 | Error handler configuration and best practices |
| Naming | 100-199 | Naming conventions for flows, variables, files |
| Security | 200-299 | Security vulnerabilities and hardcoded values |
| Logging | 300-399 | Logging standards and structured logging |
| HTTP | 400-499 | HTTP configuration and headers |
| Performance | 500-599 | Performance anti-patterns |
| Documentation | 600-699 | Documentation requirements |
| Standards | 700-799 | General coding standards |
| Deprecated | 900-999 | Deprecated rules |

---

## Core Rules (From Research)

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

**XPath:**
```xpath
count(//mule:error-handler[@name='global-error-handler']) > 0
```

---

### MULE-002: Flow Naming Convention

| Property | Value |
|----------|-------|
| **Severity** | Warning |
| **Category** | Naming |
| **Fixable** | Yes |

**Description:** Flows must end with `-flow` suffix, sub-flows with `-subflow`.

**XPath:**
```xpath
//mule:flow[not(ends-with(@name, '-flow'))]
//mule:sub-flow[not(ends-with(@name, '-subflow'))]
```

**Configuration Options:**
```json
{
  "flowSuffix": "-flow",
  "subflowSuffix": "-subflow",
  "excludePatterns": ["*-api-main"]
}
```

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

### MULE-004: Hardcoded HTTP URLs

| Property | Value |
|----------|-------|
| **Severity** | Error |
| **Category** | Security |
| **Fixable** | No |

**Description:** HTTP/HTTPS URLs should use property placeholders, not hardcoded values.

**XPath:**
```xpath
//*[@*[starts-with(., 'http://') or starts-with(., 'https://')]]
```

**Exceptions:**
- Values containing `${...}` (property placeholders)
- Values containing `#[...]` (DataWeave expressions)

---

### MULE-005: HTTP Status in Error Handler

| Property | Value |
|----------|-------|
| **Severity** | Warning |
| **Category** | Error Handling |
| **Fixable** | No |

**Description:** Error handlers should set an `httpStatus` variable for proper API responses.

**XPath:**
```xpath
//mule:error-handler[not(.//mule:set-variable[@variableName='httpStatus'])]
```

---

### MULE-006: Logger Category Required

| Property | Value |
|----------|-------|
| **Severity** | Warning |
| **Category** | Logging |
| **Fixable** | Yes |

**Description:** All loggers must have a `category` attribute for proper log filtering.

**XPath:**
```xpath
//mule:logger[not(@category)]
```

---

### MULE-007: Correlation ID in Error Handler

| Property | Value |
|----------|-------|
| **Severity** | Warning |
| **Category** | Error Handling |
| **Fixable** | No |

**Description:** Error handlers should reference `correlationId` for traceability.

**XPath:**
```xpath
//mule:error-handler[not(contains(., 'correlationId'))]
```

---

### MULE-008: Choice Anti-Pattern

| Property | Value |
|----------|-------|
| **Severity** | Warning |
| **Category** | Standards |
| **Fixable** | No |

**Description:** Avoid using `raise-error` directly inside `choice/otherwise`. Use a more descriptive error type.

**XPath:**
```xpath
//mule:choice/mule:otherwise/mule:raise-error
```

---

### MULE-009: Generic Error Type

| Property | Value |
|----------|-------|
| **Severity** | Warning |
| **Category** | Error Handling |
| **Fixable** | No |

**Description:** Avoid catching `type="ANY"` in error handlers. Be specific about error types.

**XPath:**
```xpath
//mule:on-error-continue[@type='ANY'] | //mule:on-error-propagate[@type='ANY']
```

---

### MULE-010: DWL Standards File

| Property | Value |
|----------|-------|
| **Severity** | Info |
| **Category** | Standards |
| **Fixable** | No |

**Description:** Project should have a standard error DataWeave file.

**Check Logic:**
```typescript
fs.existsSync('src/main/resources/dwl/standard-error.dwl')
```

---

## Extended Rules (From mule-lint/mule-lint)

These rules are inspired by the existing open-source mule-lint project and address common enterprise concerns.

### MULE-301: Logger Message Contains Payload Reference

| Property | Value |
|----------|-------|
| **Severity** | Warning |
| **Category** | Logging |
| **Fixable** | No |

**Description:** Loggers should not directly reference `#[payload]` as it may log sensitive data and cause performance issues with large payloads.

**XPath:**
```xpath
//mule:logger[contains(@message, '#[payload]')]
```

**Better Alternative:**
```xml
<!-- Bad -->
<logger message="#[payload]" />

<!-- Good - Log specific fields -->
<logger message="#[payload.orderId ++ ' processed']" />
```

---

### MULE-302: Logger Missing Transaction ID

| Property | Value |
|----------|-------|
| **Severity** | Warning |
| **Category** | Logging |
| **Fixable** | No |

**Description:** Loggers should include a transaction/correlation ID for traceability.

**XPath:**
```xpath
//mule:logger[not(contains(@message, 'transactionId')) and not(contains(@message, 'correlationId'))]
```

---

### MULE-303: Structured Logging Format

| Property | Value |
|----------|-------|
| **Severity** | Info |
| **Category** | Logging |
| **Fixable** | No |

**Description:** Logger messages should follow a structured JSON format for log aggregation tools.

**Check Logic:** Verify logger message starts with `{` or contains JSON-like structure.

---

### MULE-401: HTTP Request Missing User-Agent

| Property | Value |
|----------|-------|
| **Severity** | Warning |
| **Category** | HTTP |
| **Fixable** | No |

**Description:** All HTTP requests should include a `User-Agent` header for proper API identification.

**XPath:**
```xpath
//http:request[not(.//http:header[@headerName='User-Agent'])]
```

---

### MULE-402: HTTP Request Missing Content-Type

| Property | Value |
|----------|-------|
| **Severity** | Warning |
| **Category** | HTTP |
| **Fixable** | No |

**Description:** POST/PUT HTTP requests should include a `Content-Type` header.

**XPath:**
```xpath
//http:request[@method='POST' or @method='PUT'][not(.//http:header[@headerName='Content-Type'])]
```

---

### MULE-403: HTTP Request Missing Custom Headers

| Property | Value |
|----------|-------|
| **Severity** | Info |
| **Category** | HTTP |
| **Fixable** | No |

**Description:** HTTP requests should include organization-specific headers (e.g., `X-Correlation-ID`).

**Configuration:**
```json
{
  "requiredHeaders": ["X-Correlation-ID", "X-Request-ID"]
}
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
- `kebab-case`: `my-flow-name`
- `camelCase`: `myFlowName`
- `PascalCase`: `MyFlowName`
- `snake_case`: `my_flow_name`

**XPath + Regex:** Match against configured pattern.

---

### MULE-102: Variable Naming Convention

| Property | Value |
|----------|-------|
| **Severity** | Warning |
| **Category** | Naming |
| **Fixable** | No |

**Description:** Variables set via `set-variable` should follow camelCase naming.

**XPath:**
```xpath
//mule:set-variable[not(matches(@variableName, '^[a-z][a-zA-Z0-9]*$'))]
```

---

### MULE-501: Logger Inside Until-Successful

| Property | Value |
|----------|-------|
| **Severity** | Warning |
| **Category** | Performance |
| **Fixable** | No |

**Description:** Having a logger inside `until-successful` may flood logs on retries.

**XPath:**
```xpath
//mule:until-successful//mule:logger
```

---

### MULE-502: Large Payload in Scatter-Gather

| Property | Value |
|----------|-------|
| **Severity** | Info |
| **Category** | Performance |
| **Fixable** | No |

**Description:** Scatter-gather with many routes may cause memory issues. Consider limiting routes or using batch.

**XPath:**
```xpath
//mule:scatter-gather[count(mule:route) > 5]
```

---

### MULE-601: Flow Missing Description

| Property | Value |
|----------|-------|
| **Severity** | Info |
| **Category** | Documentation |
| **Fixable** | No |

**Description:** Flows should have a `doc:description` attribute for documentation.

**XPath:**
```xpath
//mule:flow[not(@doc:description) or @doc:description='']
```

---

### MULE-201: Hardcoded Credentials

| Property | Value |
|----------|-------|
| **Severity** | Error |
| **Category** | Security |
| **Fixable** | No |

**Description:** Passwords and secrets should never be hardcoded. Use secure properties.

**XPath:**
```xpath
//*[@password and not(contains(@password, '${'))]
//*[contains(local-name(), 'password') and not(contains(., '${'))]
```

---

### MULE-202: Insecure TLS Configuration

| Property | Value |
|----------|-------|
| **Severity** | Error |
| **Category** | Security |
| **Fixable** | No |

**Description:** TLS configurations should not use insecure protocols or disable certificate verification.

**XPath:**
```xpath
//tls:context[.//tls:trust-store[@insecure='true']]
```

---

### MULE-701: Deprecated Component Usage

| Property | Value |
|----------|-------|
| **Severity** | Warning |
| **Category** | Standards |
| **Fixable** | No |

**Description:** Detect usage of deprecated Mule components.

**Deprecated Elements:**
- `component` (use Java module instead)
- `transactional` (use try scope)

---

### MULE-702: Async Scope Without Error Handling

| Property | Value |
|----------|-------|
| **Severity** | Warning |
| **Category** | Standards |
| **Fixable** | No |

**Description:** Async scopes should have their own error handling since they don't propagate errors to the parent flow.

**XPath:**
```xpath
//mule:async[not(mule:error-handler)]
```

---

## Rule Priority Matrix

| Severity | Count | Examples |
|----------|-------|----------|
| Error | 6 | MULE-001, MULE-003, MULE-004, MULE-201, MULE-202 |
| Warning | 14 | MULE-002, MULE-005, MULE-006, MULE-007, MULE-008, MULE-009, MULE-101, MULE-102, MULE-301, MULE-302, MULE-401, MULE-402, MULE-501, MULE-701, MULE-702 |
| Info | 5 | MULE-010, MULE-303, MULE-403, MULE-502, MULE-601 |

---

## Implementation Priority

### Phase 1 (MVP)
Core 10 rules from research: MULE-001 through MULE-010

### Phase 2 (Enhancement)
Logging rules: MULE-301, MULE-302, MULE-303

### Phase 3 (HTTP)
HTTP rules: MULE-401, MULE-402, MULE-403

### Phase 4 (Full)
Remaining rules: Security, Performance, Documentation, Standards

---

## Adding Custom Rules

See [Extending mule-lint](./extending.md) for instructions on adding organization-specific rules.
