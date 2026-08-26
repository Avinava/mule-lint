# Rules Catalog

> **Version:** 1.29.0
> **Total Rules:** 82 implemented across 16 runtime categories
> **Last Updated:** August 2026

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
- [Connector Rules](#connector-rules)
- [Operations and Hygiene Rules](#operations-and-hygiene-rules)
- [Governance Rules](#governance-rules)
- [Experimental Rules](#experimental-rules)

---

## Rule Categories

The catalog uses documentation families for navigation; several families share the same runtime
`RuleCategory` value.

| Family         | Prefix                                                       | Count | Description                                    |
| -------------- | ------------------------------------------------------------ | ----- | ---------------------------------------------- |
| Error Handling | MULE-001/003/005/007/009, ERR-001–004                        | 9     | Error handler configuration and best practices |
| Naming         | MULE-002/101/102                                             | 3     | Naming conventions for flows and variables     |
| Security       | MULE-004/201/202, SEC-002–004/006–010                        | 11    | Security vulnerabilities, TLS, credentials     |
| Logging        | MULE-006/301/303, LOG-001/004, HYG-001                       | 6     | Logging standards, structured logging, hygiene |
| HTTP           | MULE-401/402/403, HTTP-004                                   | 4     | HTTP configuration and headers                 |
| Performance    | MULE-501/502/503, PERF-002, RES-001/002                      | 6     | Performance anti-patterns and resilience       |
| Documentation  | MULE-601/604, DOC-001                                        | 3     | Documentation requirements                     |
| Standards      | MULE-008/010/701, OPS-001–003, API-005, CFG-001/002, STD-001 | 10    | Coding standards and operations                |
| Complexity     | MULE-801                                                     | 1     | Code complexity                                |
| Structure      | MULE-802/803/804                                             | 3     | Project structure                              |
| YAML           | YAML-001/003/004                                             | 3     | YAML configuration validation                  |
| DataWeave      | DW-001/002/003/004/005                                       | 5     | DataWeave file validation                      |
| API-Led        | API-001–004/006–008                                          | 7     | API-Led connectivity patterns                  |
| Connectors     | SF-001/002                                                   | 2     | Salesforce and event connector rules           |
| Governance     | PROJ-001/002                                                 | 2     | POM and Git hygiene                            |
| Code Hygiene   | HYG-002–005                                                  | 4     | Commented code, unused flows/variables         |
| Experimental   | EXP-001/002/003                                              | 3     | Beta rules for evaluation                      |

### MULE Category ID Ranges

| Range   | Category             | Description                                    |
| ------- | -------------------- | ---------------------------------------------- |
| 001-099 | Error Handling       | Error handler configuration and best practices |
| 100-199 | Naming               | Naming conventions for flows, variables, files |
| 200-299 | Security             | Security vulnerabilities and hardcoded values  |
| 300-399 | Logging              | Logging standards and structured logging       |
| 400-499 | HTTP                 | HTTP configuration and headers                 |
| 500-599 | Performance          | Performance anti-patterns                      |
| 600-699 | Documentation        | Documentation requirements                     |
| 700-799 | Standards            | General coding standards                       |
| 800-899 | Complexity/Structure | Code complexity and project structure          |

---

> 📘 **For detailed best practices, see [MuleSoft Best Practices Guide](mulesoft-best-practices.md)**

## Error Handling Rules

> **Best Practice**: Every flow should have explicit error handling. Use a global error handler for consistency, but override specific handlers where needed.

### MULE-001: Global Error Handler Exists

| Property     | Value          |
| ------------ | -------------- |
| **Severity** | Warning        |
| **Category** | Error Handling |
| **Fixable**  | No             |

**Description:** Every Mule project should have a global error handler — either a dedicated file (`src/main/mule/global-error-handler.xml` by default) **or** any XML flow file that contains a named `<error-handler>` element.

**Check Logic:**

1. If the expected file exists (`src/main/mule/global-error-handler.xml`), the rule passes.
2. Otherwise, checks each flow file for a named `<error-handler name="...">` or `<error-handler ref="...">` element.
3. If neither is found in a flow file (a file containing `<flow>` or `<sub-flow>` elements), a warning is reported.
4. Pure configuration files (no flows) are skipped to reduce noise.

**Options:**

| Option     | Default                                  | Description                    |
| ---------- | ---------------------------------------- | ------------------------------ |
| `filePath` | `src/main/mule/global-error-handler.xml` | Relative path to expected file |

**Why This Matters:** A global error handler ensures consistent error responses across all flows and reduces code duplication.

---

### MULE-003: Missing Error Handler

| Property     | Value          |
| ------------ | -------------- |
| **Severity** | Error          |
| **Category** | Error Handling |
| **Fixable**  | No             |

**Description:** Every flow should have an error handler or reference the global one.

**XPath:**

```xpath
//mule:flow[not(mule:error-handler) and not(contains(@name, 'api-main'))]
```

---

### MULE-005: HTTP Status in Error Handler

| Property     | Value          |
| ------------ | -------------- |
| **Severity** | Warning        |
| **Category** | Error Handling |
| **Fixable**  | No             |

**Description:** Error handlers should set an `httpStatus` variable for proper API responses.

**Project Detection:** This rule is automatically skipped for non-HTTP projects. When `mule-lint` scans a project, it detects whether any `http:listener` or `apikit:router` element is present. If neither is found, the rule is suppressed to avoid false positives in event-driven or batch Mule applications.

**Options:**

| Option         | Default      | Description                 |
| -------------- | ------------ | --------------------------- |
| `variableName` | `httpStatus` | Name of the variable to set |

**Best Practice:** Always set httpStatus in error handlers to return appropriate HTTP codes (400, 404, 500, etc.).

---

### MULE-007: Correlation ID in Error Handler

| Property     | Value          |
| ------------ | -------------- |
| **Severity** | Warning        |
| **Category** | Error Handling |
| **Fixable**  | No             |

**Description:** Error handlers should reference `correlationId` for traceability across distributed systems.

**Check Logic:**

1. Checks inline XML text and attributes for correlation ID patterns (`correlationId`, `correlation_id`, `x-correlation-id`, `x-request-id`, etc.)
2. For `ee:set-payload` elements with a `resource="..."` attribute, reads the referenced `.dwl` file from `src/main/resources/<resourcePath>` and checks its content.
3. If a resource file is referenced but cannot be read (e.g. not yet generated), downgrades to `info` severity to avoid false positives.

**Example (inline):**

```xml
<on-error-continue>
  <ee:transform>
    <ee:set-payload resource="classpath:dwl/error-response.dwl"/>
  </ee:transform>
</on-error-continue>
```

The DWL file at `src/main/resources/dwl/error-response.dwl` will be checked for `correlationId` usage.

---

### MULE-009: Generic Error Type

| Property     | Value          |
| ------------ | -------------- |
| **Severity** | Warning        |
| **Category** | Error Handling |
| **Fixable**  | No             |

**Description:** Avoid catching `type="ANY"` in error handlers. Be specific about error types.

**Why This Matters:** Catching `ANY` can mask important errors and make debugging difficult.

> **Note (v1.21):** The rule now skips `type="ANY"` when it is the **last** `on-error` block in the chain. Using `type="ANY"` as a catch-all fallback (returning HTTP 500) is an accepted MuleSoft pattern per accelerator best practices.

---

### ERR-001: Try Scope Best Practice

| Property       | Value          |
| -------------- | -------------- |
| **Severity**   | Info           |
| **Category**   | Error Handling |
| **Issue Type** | Bug            |
| **Fixable**    | No             |

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

### ERR-002: Error Handler Type Coverage

| Property       | Value          |
| -------------- | -------------- |
| **Severity**   | Warning        |
| **Category**   | Error Handling |
| **Issue Type** | Bug            |
| **Fixable**    | No             |

**Description:** APIKit-based flows should handle common HTTP error types. Error handlers should cover at least the standard set: `APIKIT:BAD_REQUEST`, `APIKIT:NOT_FOUND`, `APIKIT:METHOD_NOT_ALLOWED`, and `APIKIT:NOT_ACCEPTABLE`.

**Example:**

```xml
<!-- ✅ Good - covers common error types -->
<error-handler>
    <on-error-propagate type="APIKIT:BAD_REQUEST">...</on-error-propagate>
    <on-error-propagate type="APIKIT:NOT_FOUND">...</on-error-propagate>
    <on-error-propagate type="APIKIT:METHOD_NOT_ALLOWED">...</on-error-propagate>
    <on-error-propagate type="ANY">...</on-error-propagate>
</error-handler>
```

---

### ERR-003: Error Response Structure

| Property       | Value          |
| -------------- | -------------- |
| **Severity**   | Warning        |
| **Category**   | Error Handling |
| **Issue Type** | Bug            |
| **Fixable**    | No             |

**Description:** Error handlers should set both an `httpStatus` variable and a response body (via `set-payload` or `ee:set-payload`). Missing either results in incomplete error responses to API consumers.

---

### ERR-004: Catch-All Must Be Last

| Property       | Value          |
| -------------- | -------------- |
| **Severity**   | Error          |
| **Category**   | Error Handling |
| **Issue Type** | Bug            |
| **Fixable**    | No             |

**Description:** An `on-error-propagate` or `on-error-continue` with `type="ANY"` must be the **last** handler in the `error-handler` block. Placing it before specific error type handlers would shadow those handlers.

**Example:**

```xml
<!-- ❌ Bad - ANY shadows subsequent handlers -->
<error-handler>
    <on-error-propagate type="ANY">...</on-error-propagate>
    <on-error-propagate type="HTTP:CONNECTIVITY">...</on-error-propagate>
</error-handler>

<!-- ✅ Good - ANY is last -->
<error-handler>
    <on-error-propagate type="HTTP:CONNECTIVITY">...</on-error-propagate>
    <on-error-propagate type="ANY">...</on-error-propagate>
</error-handler>
```

---

## Naming Rules

> **Best Practice**: Consistent naming conventions improve readability and maintainability. Use kebab-case for flows and camelCase for variables.

### MULE-002: Flow Naming Convention

| Property     | Value   |
| ------------ | ------- |
| **Severity** | Warning |
| **Category** | Naming  |
| **Fixable**  | Yes     |

**Description:** Flows must end with `-flow` suffix, sub-flows with `-subflow`. Both flow and sub-flow naming are enforced by this rule.

**Examples:**

```xml
<!-- ✅ Good -->
<flow name="process-order-flow">
<sub-flow name="validate-input-subflow">

<!-- ❌ Bad -->
<flow name="processOrder">
<sub-flow name="validateInput">
```

**Options:**

| Option            | Default                                            | Description                               |
| ----------------- | -------------------------------------------------- | ----------------------------------------- |
| `flowSuffix`      | `-flow`                                            | Required suffix for `<flow>` elements     |
| `subflowSuffix`   | `-subflow`                                         | Required suffix for `<sub-flow>` elements |
| `excludePatterns` | `['*-api-main', '*-main', 'get:*', 'post:*', ...]` | Glob patterns to skip                     |

---

### MULE-101: Flow Name Casing

| Property     | Value   |
| ------------ | ------- |
| **Severity** | Warning |
| **Category** | Naming  |
| **Fixable**  | No      |

**Description:** Flow names should follow consistent casing (kebab-case recommended).

**Options:**

- `kebab-case`: `my-flow-name` (recommended)
- `camelCase`: `myFlowName`
- `snake_case`: `my_flow_name`

---

### MULE-102: Variable Naming Convention

| Property     | Value   |
| ------------ | ------- |
| **Severity** | Warning |
| **Category** | Naming  |
| **Fixable**  | No      |

**Description:** Variables set via `set-variable` should follow camelCase naming.

---

## Security Rules

> **Best Practice**: Never commit secrets to source control. Use secure properties files with encryption or external secrets management.

### MULE-004: Hardcoded HTTP URLs

| Property     | Value    |
| ------------ | -------- |
| **Severity** | Error    |
| **Category** | Security |
| **Fixable**  | No       |

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

| Property     | Value    |
| ------------ | -------- |
| **Severity** | Error    |
| **Category** | Security |
| **Fixable**  | No       |

**Description:** Passwords and secrets should never be hardcoded. Use secure properties.

**Best Practice:** Use MuleSoft Secure Properties module with encrypted values `![encrypted.value]`.

---

### MULE-202: Insecure TLS Configuration

| Property     | Value    |
| ------------ | -------- |
| **Severity** | Error    |
| **Category** | Security |
| **Fixable**  | No       |

**Description:** TLS configurations should not use insecure protocols or disable certificate verification.

---

### SEC-002: TLS Version Check

| Property       | Value         |
| -------------- | ------------- |
| **Severity**   | Error         |
| **Category**   | Security      |
| **Issue Type** | Vulnerability |
| **Fixable**    | No            |

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

| Property       | Value         |
| -------------- | ------------- |
| **Severity**   | Warning       |
| **Category**   | Security      |
| **Issue Type** | Vulnerability |
| **Fixable**    | No            |

**Description:** APIs should have rate limiting or throttling configured to prevent DoS attacks and manage API consumption.

**Check Logic:** Scans API interface files for HTTP listeners without associated rate limiting, throttling, or spike control policies.

**Best Practice:** Configure rate limiting via API Manager policies or add `throttling:config` to protect against abuse.

---

### SEC-004: Input Validation

| Property       | Value         |
| -------------- | ------------- |
| **Severity**   | Warning       |
| **Category**   | Security      |
| **Issue Type** | Vulnerability |
| **Fixable**    | No            |

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

| Property     | Value    |
| ------------ | -------- |
| **Severity** | Error    |
| **Category** | Security |
| **Fixable**  | No       |

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

### SEC-007: Connector Credentials Secured

| Property       | Value         |
| -------------- | ------------- |
| **Severity**   | Error         |
| **Category**   | Security      |
| **Issue Type** | Vulnerability |
| **Fixable**    | No            |

**Description:** Connector configurations (Salesforce, Database, HTTP, etc.) must use `${secure::...}` property placeholders for credential attributes like `username`, `password`, `clientId`, and `clientSecret`. Plain `${...}` placeholders are accepted but `${secure::...}` is recommended.

---

### SEC-008: Secure Properties Key

| Property       | Value         |
| -------------- | ------------- |
| **Severity**   | Error         |
| **Category**   | Security      |
| **Issue Type** | Vulnerability |
| **Fixable**    | No            |

**Description:** The `secure-properties:config` element's encryption `key` attribute must use a property placeholder (`${...}`), not a hardcoded value. Hardcoding the encryption key defeats the purpose of encrypted properties.

**Example:**

```xml
<!-- ❌ Bad - hardcoded key -->
<secure-properties:config key="mySecretKey123" file="secure.yaml"/>

<!-- ✅ Good - externalized key -->
<secure-properties:config key="${mule.key}" file="secure.yaml"/>
```

---

### SEC-009: TLS Keystore Password

| Property       | Value         |
| -------------- | ------------- |
| **Severity**   | Error         |
| **Category**   | Security      |
| **Issue Type** | Vulnerability |
| **Fixable**    | No            |

**Description:** TLS keystore and truststore passwords must use secure property placeholders, not hardcoded values.

---

### SEC-010: Secure Properties Encryption

| Property       | Value         |
| -------------- | ------------- |
| **Severity**   | Warning       |
| **Category**   | Security      |
| **Issue Type** | Vulnerability |
| **Fixable**    | No            |

**Description:** Secure properties configuration should use a strong encryption algorithm. DES is considered weak; AES or Blowfish are recommended.

---

## Logging Rules

> **Best Practice**: Use structured logging with categories. Never log full payloads in production - they may contain PII or be excessively large.

### MULE-006: Logger Category Required

| Property     | Value   |
| ------------ | ------- |
| **Severity** | Warning |
| **Category** | Logging |
| **Fixable**  | Yes     |

**Description:** All loggers must have a `category` attribute for proper log filtering.

**Example:**

```xml
<!-- ✅ Good -->
<logger category="com.myorg.orders" message="Processing order" level="INFO"/>
```

---

### MULE-301: Logger Payload Reference

| Property     | Value   |
| ------------ | ------- |
| **Severity** | Warning |
| **Category** | Logging |
| **Fixable**  | No      |

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

| Property     | Value   |
| ------------ | ------- |
| **Severity** | Warning |
| **Category** | Logging |
| **Fixable**  | No      |

**Description:** Having a logger inside `until-successful` may flood logs on retries.

---

### LOG-001: Structured Logging

| Property     | Value   |
| ------------ | ------- |
| **Severity** | Info    |
| **Category** | Logging |
| **Fixable**  | No      |

**Description:** Recommend JSON logger format over plain text for production applications to enable better log parsing and analysis.

**Check Logic:** Flags global/config files that use standard loggers without JSON Logger Module configuration.

**Best Practice:** Use JSON Logger Module for structured log output in production environments. This enables better log aggregation and analysis with tools like Splunk, ELK, or Anypoint Monitoring.

---

### LOG-004: Sensitive Data in Logs

| Property     | Value   |
| ------------ | ------- |
| **Severity** | Error   |
| **Category** | Logging |
| **Fixable**  | No      |

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

| Property     | Value   |
| ------------ | ------- |
| **Severity** | Warning |
| **Category** | Logging |
| **Fixable**  | No      |

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

| Property     | Value   |
| ------------ | ------- |
| **Severity** | Warning |
| **Category** | HTTP    |
| **Fixable**  | No      |

**Description:** All HTTP requests should include a `User-Agent` header for API identification.

---

### MULE-402: HTTP Request Missing Content-Type

| Property     | Value   |
| ------------ | ------- |
| **Severity** | Warning |
| **Category** | HTTP    |
| **Fixable**  | No      |

**Description:** POST/PUT HTTP requests should include a `Content-Type` header.

**Detection Patterns:**

| Pattern                   | Description                                                                                       |
| ------------------------- | ------------------------------------------------------------------------------------------------- |
| A — Static header         | `<http:header headerName="Content-Type" value="..."/>` inside `<http:headers>`                    |
| B — CDATA DataWeave block | `<http:headers><![CDATA[#[output application/java --- {"Content-Type": "..."}]]]></http:headers>` |
| C — Inline DW expression  | `<http:headers value='#[{"Content-Type": "..."}]'/>`                                              |

When headers are set via a DataWeave expression (patterns B/C) but `Content-Type` is not visible in the expression text, the issue is downgraded to **info** severity to acknowledge the static analysis limitation of evaluating dynamic expressions.

---

### MULE-403: HTTP Request Timeout

| Property     | Value   |
| ------------ | ------- |
| **Severity** | Warning |
| **Category** | HTTP    |
| **Fixable**  | No      |

**Description:** HTTP requests should have explicit timeout configuration.

**Best Practice:** Always set `responseTimeout` to avoid hanging connections.

---

## Performance Rules

> **Best Practice**: Keep flows simple and focused. Use async processing carefully with proper error handling. Configure connection pooling and reconnection for production resilience.

### MULE-501: Scatter-Gather Routes

| Property     | Value       |
| ------------ | ----------- |
| **Severity** | Info        |
| **Category** | Performance |
| **Fixable**  | No          |

**Description:** Scatter-gather with many routes may cause memory issues. Consider limiting routes.

---

### MULE-502: Async Without Error Handler

| Property     | Value       |
| ------------ | ----------- |
| **Severity** | Warning     |
| **Category** | Performance |
| **Fixable**  | No          |

**Description:** Async scopes should have their own error handling since they don't propagate errors to the parent flow.

**Why This Matters:** Errors in async scopes are silently swallowed without explicit handling.

---

### MULE-503: Large Choice Blocks

| Property     | Value       |
| ------------ | ----------- |
| **Severity** | Warning     |
| **Category** | Performance |
| **Fixable**  | No          |

**Description:** Choice blocks with many when clauses should be refactored to DataWeave lookups or routing slip pattern.

---

### PERF-002: Connection Pooling

| Property     | Value       |
| ------------ | ----------- |
| **Severity** | Warning     |
| **Category** | Performance |
| **Fixable**  | No          |

**Description:** DB and HTTP connectors should configure connection pools for optimal performance and resource management.

**Check Logic:** Flags HTTP `request-config` elements missing `maxConnections`/`connectionIdleTimeout` — checks both the `<http:request-config>` element and its nested `<http:request-connection>` child (XSD-correct placement). Also flags DB configs missing `pooling-profile`.

**Example:**

```xml
<!-- ✅ Good - HTTP with pooling on request-connection (XSD-correct) -->
<http:request-config name="API_Config">
  <http:request-connection>
    <http:client-socket-properties>
      <http:tcp-client-socket-properties connectionTimeout="30000"/>
    </http:client-socket-properties>
  </http:request-connection>
</http:request-config>
<!-- maxConnections on http:request-connection avoids SAXParseException -->

<!-- ✅ Good - DB with pooling -->
<db:config name="Database_Config">
    <db:pooling-profile maxPoolSize="10" minPoolSize="2"/>
</db:config>
```

---

### RES-001: Reconnection Strategy

| Property     | Value       |
| ------------ | ----------- |
| **Severity** | Warning     |
| **Category** | Performance |
| **Fixable**  | No          |

**Description:** Connectors should have reconnection strategies configured for resilience.

**Checked Connectors:** HTTP Request, HTTP Listener, JMS, AMQP, SFTP, FTP, VM, Database, Salesforce

> **Note (v1.21):** The rule now differentiates between listener and request configurations. Listeners are recommended to use `reconnect-forever`, while requests should use bounded reconnect with `count` and `frequency`.

**Example:**

```xml
<!-- ✅ Good - bounded reconnect for requests -->
<http:request-config name="API_Config">
    <http:request-connection>
        <reconnection>
            <reconnect count="3" frequency="2000"/>
        </reconnection>
    </http:request-connection>
</http:request-config>

<!-- ✅ Good - reconnect-forever for listeners -->
<http:listener-config name="Listener_Config">
    <http:listener-connection>
        <reconnection>
            <reconnect-forever frequency="5000"/>
        </reconnection>
    </http:listener-connection>
</http:listener-config>
```

---

### RES-002: Listener Reconnect-Forever

| Property     | Value       |
| ------------ | ----------- |
| **Severity** | Warning     |
| **Category** | Performance |
| **Fixable**  | No          |

**Description:** Listener connectors (HTTP Listener, JMS, AMQP, VM) should use `reconnect-forever` strategy rather than bounded reconnection. Listeners are critical entry points — if they stop reconnecting after N attempts, the application becomes unreachable.

---

## Documentation Rules

> **Best Practice**: Well-documented flows are easier to maintain. Use meaningful names that describe business purpose.

### MULE-601: Flow Missing Description

| Property     | Value         |
| ------------ | ------------- |
| **Severity** | Info          |
| **Category** | Documentation |
| **Fixable**  | No            |

**Description:** Flows should have a `doc:description` attribute for documentation.

---

### MULE-604: Missing doc:name

| Property     | Value         |
| ------------ | ------------- |
| **Severity** | Warning       |
| **Category** | Documentation |
| **Fixable**  | No            |

**Description:** Key components (logger, set-variable, transform, etc.) should have `doc:name` for Anypoint Studio visibility.

---

### DOC-001: Display Name Enforcement

| Property     | Value         |
| ------------ | ------------- |
| **Severity** | Info          |
| **Category** | Documentation |
| **Fixable**  | No            |

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

| Property     | Value     |
| ------------ | --------- |
| **Severity** | Warning   |
| **Category** | Standards |
| **Fixable**  | No        |

**Description:** Avoid using `raise-error` directly inside `choice/otherwise`. Use a more descriptive error type.

---

### MULE-010: DWL Standards File

| Property     | Value     |
| ------------ | --------- |
| **Severity** | Info      |
| **Category** | Standards |
| **Fixable**  | No        |

**Description:** Project should have a standard error DataWeave file at `src/main/resources/dwl/standard-error.dwl`.

---

### MULE-701: Deprecated Component Usage

| Property     | Value     |
| ------------ | --------- |
| **Severity** | Warning   |
| **Category** | Standards |
| **Fixable**  | No        |

**Description:** Detect usage of deprecated Mule components.

---

### OPS-001: Auto-Discovery Configuration

| Property     | Value     |
| ------------ | --------- |
| **Severity** | Info      |
| **Category** | Standards |
| **Fixable**  | No        |

**Description:** APIs should have auto-discovery configured for API Manager integration.

**Check Logic:** Flags API projects (those with APIKit router) that are missing `<api-gateway:autodiscovery>`. Also verifies that `apiId` uses a property placeholder.

**Example:**

```xml
<!-- ✅ Good -->
<api-gateway:autodiscovery apiId="${api.id}" flowRef="api-main"/>
```

---

### OPS-002: HTTP Port Placeholder

| Property     | Value     |
| ------------ | --------- |
| **Severity** | Warning   |
| **Category** | Standards |
| **Fixable**  | No        |

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

| Property     | Value     |
| ------------ | --------- |
| **Severity** | Warning   |
| **Category** | Standards |
| **Fixable**  | No        |

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

| Property     | Value     |
| ------------ | --------- |
| **Severity** | Info      |
| **Category** | Standards |
| **Fixable**  | No        |

**Description:** APIs should use APIKit for auto-generated implementation interfaces.

**Check Logic:** Flags API projects (those with HTTP listeners and main flows) that don't use an APIKit router.

**Best Practice:** APIKit provides consistent API implementation patterns and automatic input validation based on the RAML/OAS spec.

---

### CFG-001: Config Properties Ordering

| Property     | Value     |
| ------------ | --------- |
| **Severity** | Info      |
| **Category** | Standards |
| **Fixable**  | No        |

**Description:** Configuration property elements (`secure-properties:config`, `configuration-properties`, HTTP configs) should follow a consistent ordering at the top of Mule configuration files. This improves readability and makes it easier to locate configurations.

---

### CFG-002: Missing Env Properties Declaration

| Property     | Value     |
| ------------ | --------- |
| **Severity** | Warning   |
| **Category** | Standards |
| **Fixable**  | No        |

**Description:** Property placeholders referenced in XML files (`${property.name}`) should have corresponding entries in the project's YAML configuration files. Detects potential runtime failures from missing property definitions.

---

### STD-001: APIKit Route Variable Consistency

| Property     | Value     |
| ------------ | --------- |
| **Severity** | Info      |
| **Category** | Standards |
| **Fixable**  | No        |

**Description:** APIKit route implementation flows should use consistent variable naming patterns. For example, if some routes set `httpStatus` and others set `http_status`, this rule flags the inconsistency.

---

## Complexity Rules

> **Best Practice**: Keep cyclomatic complexity below 10. Extract complex logic into sub-flows.

### MULE-801: Flow Complexity

| Property     | Value      |
| ------------ | ---------- |
| **Severity** | Warning    |
| **Category** | Complexity |
| **Fixable**  | No         |

**Description:** Flow cyclomatic complexity should not exceed threshold.

**Decision Points Tracked:**

| Element              | Description             |
| -------------------- | ----------------------- |
| `<choice>/<when>`    | Each when clause adds 1 |
| `<until-successful>` | Retry logic             |
| `<foreach>`          | Iteration               |
| `<parallel-foreach>` | Parallel iteration      |
| `<scatter-gather>`   | Parallel execution      |
| `<async>`            | Parallel execution path |
| `<try>`              | Exception handling      |
| `<first-successful>` | Fallback routing        |
| `<round-robin>`      | Load balancing          |
| `<on-error-*>`       | Error handlers          |

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

| Property     | Value     |
| ------------ | --------- |
| **Severity** | Warning   |
| **Category** | Structure |
| **Fixable**  | No        |

**Description:** Validate standard MuleSoft project folder structure.

**Required Directories:**

- `src/main/mule`
- `src/main/resources`

**Recommended Directories** (configurable via `recommendedDirs` option):

- `src/main/resources/dwl`
- `src/test/munit`

> **Note:** `src/main/resources/api` was removed from the default recommended list in v1.20.0. Many Mule 4 projects reference their API specification from Anypoint Exchange and do not bundle it locally. To restore this check, configure the rule explicitly:
>
> ```json
> "MULE-802": { "enabled": true, "options": { "recommendedDirs": ["src/main/resources/dwl", "src/main/resources/api", "src/test/munit"] } }
> ```

---

### MULE-803: Global Config File

| Property     | Value     |
| ------------ | --------- |
| **Severity** | Warning   |
| **Category** | Structure |
| **Fixable**  | No        |

**Description:** Project should have `global.xml` with shared configurations (HTTP listeners, error handlers, etc.).

---

### MULE-804: Monolithic XML File

| Property     | Value     |
| ------------ | --------- |
| **Severity** | Warning   |
| **Category** | Structure |
| **Fixable**  | No        |

**Description:** XML files should not exceed 10 flows/sub-flows. Split large files by domain.

---

## YAML Rules

> **Best Practice**: Use environment-specific YAML files (dev.yaml, qa.yaml, prod.yaml). Encrypt sensitive properties.

### YAML-001: Environment Properties Files

| Property     | Value     |
| ------------ | --------- |
| **Severity** | Warning   |
| **Category** | Standards |
| **Fixable**  | No        |

**Description:** Environment-specific YAML property files should exist for each environment.

**Expected Files** (default environments: `dev`, `qa`, `prod`):

- `dev.yaml` or `config-dev.yaml`
- `qa.yaml` or `config-qa.yaml`
- `prod.yaml` or `config-prod.yaml`

Files can also live in `src/main/resources/config/` or `src/main/resources/properties/` subdirectories.

**Options:**

| Option         | Default                 | Description                        |
| -------------- | ----------------------- | ---------------------------------- |
| `environments` | `["dev", "qa", "prod"]` | List of required environment names |

**Example configuration** to add `staging` or change defaults:

```json
"YAML-001": { "enabled": true, "options": { "environments": ["dev", "staging", "prod"] } }
```

---

### YAML-003: Property Naming Convention

| Property     | Value     |
| ------------ | --------- |
| **Severity** | Info      |
| **Category** | Standards |
| **Fixable**  | No        |

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

| Property     | Value    |
| ------------ | -------- |
| **Severity** | Error    |
| **Category** | Security |
| **Fixable**  | No       |

**Description:** Sensitive properties (passwords, keys, secrets) should be encrypted with `![...]` syntax.

**Example:**

```yaml
# ❌ Bad - plaintext secret
db.password: mySecretPassword

# ✅ Good - encrypted
db.password: '![encryptedValue]'
```

---

## DataWeave Rules

> **Best Practice**: Externalize complex transformations to .dwl files. Create reusable modules for common functions.

### DW-001: External DWL for Complex Transforms

| Property     | Value     |
| ------------ | --------- |
| **Severity** | Warning   |
| **Category** | DataWeave |
| **Fixable**  | No        |

**Description:** Complex DataWeave (10+ lines) should be externalized to `.dwl` files.

---

### DW-002: DWL File Naming

| Property     | Value     |
| ------------ | --------- |
| **Severity** | Info      |
| **Category** | DataWeave |
| **Fixable**  | No        |

**Description:** DataWeave files should use kebab-case naming (`my-transform.dwl`).

> **Note on DataWeave module directories:** DataWeave module files **must** use camelCase because hyphens (`-`) are invalid in DataWeave module identifiers (importing `my-module` would be a compile error). Use the `exemptPaths` option to exclude module directories from kebab-case enforcement.

**Options:**

| Option        | Default      | Description                                                |
| ------------- | ------------ | ---------------------------------------------------------- |
| `convention`  | `kebab-case` | Naming convention: `kebab-case`, `camelCase`, or `any`     |
| `exemptPaths` | `[]`         | Glob patterns for paths to skip (e.g. `["**/modules/**"]`) |

**Example configuration** to exempt a modules directory:

```json
"DW-002": { "enabled": true, "options": { "exemptPaths": ["**/modules/**", "**/lib/**"] } }
```

---

### DW-003: DWL Modules

| Property     | Value     |
| ------------ | --------- |
| **Severity** | Info      |
| **Category** | DataWeave |
| **Fixable**  | No        |

**Description:** Project should have common reusable DataWeave modules (`common.dwl`, `utils.dwl`).

---

### DW-004: Java 17 DataWeave Error Handling

| Property     | Value     |
| ------------ | --------- |
| **Severity** | Error     |
| **Category** | DataWeave |
| **Fixable**  | No        |

**Description:** Enforces DataWeave error handling patterns compatible with Java 17 encapsulation. Detects restricted property access patterns that fail at runtime on Java 17.

**Forbidden Patterns & Replacements:**

| Forbidden                  | Replacement                                                      |
| -------------------------- | ---------------------------------------------------------------- |
| `error.description`        | `error.detailedDescription`                                      |
| `error.errorType.asString` | `error.errorType.namespace ++ ":" ++ error.errorType.identifier` |
| `error.muleMessage`        | `error.errorMessage`                                             |
| `error.errors`             | `error.childErrors`                                              |

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

### DW-005: Duplicate Transform Logic

| Property     | Value     |
| ------------ | --------- |
| **Severity** | Warning   |
| **Category** | DataWeave |
| **Fixable**  | No        |

**Description:** Detects duplicated DataWeave transform expressions within a single file. If the same `ee:set-payload` or `ee:set-variable` CDATA content appears multiple times, this suggests extracting it into a reusable `.dwl` module.

---

## API-Led Rules

> **Best Practice**: Follow API-Led Connectivity architecture with clear layer separation:
>
> - **Experience Layer**: Channel-specific APIs (web, mobile)
> - **Process Layer**: Orchestration and business logic
> - **System Layer**: Backend system connectivity

### API-001: Experience Layer Pattern

| Property     | Value   |
| ------------ | ------- |
| **Severity** | Info    |
| **Category** | API-Led |
| **Fixable**  | No      |

**Description:** Experience layer APIs (with `-exp-` in name) should have HTTP listeners as entry points.

---

### API-002: Process Layer Pattern

| Property     | Value   |
| ------------ | ------- |
| **Severity** | Info    |
| **Category** | API-Led |
| **Fixable**  | No      |

**Description:** Process layer APIs (with `-proc-` in name) should orchestrate other APIs via flow-refs or HTTP requests.

---

### API-003: System Layer Pattern

| Property     | Value   |
| ------------ | ------- |
| **Severity** | Info    |
| **Category** | API-Led |
| **Fixable**  | No      |

**Description:** System layer APIs (with `-sys-` in name) should connect to external systems (databases, HTTP services).

---

### API-004: Single System Per SAPI

| Property     | Value   |
| ------------ | ------- |
| **Severity** | Warning |
| **Category** | API-Led |
| **Fixable**  | No      |

**Description:** System API should integrate with only one backend system. This promotes clear separation of concerns, easier maintenance, better reusability, and simplified error handling.

**Check Logic:** Scans all Mule XML files in a SAPI project (identified by `-sapi`, `-sys-`, or `-system-` in the project name) for connector namespace declarations. If multiple distinct external system connectors are found (e.g., Salesforce + Database), the rule flags it.

**Recognized Connectors:** Salesforce, NetSuite, Database, SAP, Workday, ServiceNow, JMS, AMQP, Kafka, SFTP, FTP, MongoDB, Redis, and more.

---

### API-006: APIKit Main Flow Structure

| Property     | Value   |
| ------------ | ------- |
| **Severity** | Warning |
| **Category** | API-Led |
| **Fixable**  | No      |

**Description:** APIKit main flow (the flow containing the `apikit:router`) should follow the standard structure: HTTP listener followed by APIKit router, with an error handler referencing the APIKit error handler.

---

### API-007: APIKit Status Code Variable

| Property     | Value   |
| ------------ | ------- |
| **Severity** | Warning |
| **Category** | API-Led |
| **Fixable**  | No      |

**Description:** APIKit route implementation flows (e.g., `get:\resource:api-config`) should set an `httpStatus` variable to ensure correct HTTP response codes are returned.

---

### API-008: APIKit Console in Production

| Property     | Value   |
| ------------ | ------- |
| **Severity** | Warning |
| **Category** | API-Led |
| **Fixable**  | No      |

**Description:** The APIKit console endpoint (`apikit:console`) should be disabled or removed in production configurations. Exposing the console in production is a security risk.

---

## Connector Rules

### SF-001: Salesforce Replay Channel Config

| Property     | Value     |
| ------------ | --------- |
| **Severity** | Warning   |
| **Category** | Connector |
| **Fixable**  | No        |

**Description:** Salesforce Streaming and Platform Event subscriptions should configure a replay channel with proper `replayOption` and `resumeOffset` settings to avoid missing events after restarts.

---

### SF-002: Event Listener Null Guard

| Property     | Value     |
| ------------ | --------- |
| **Severity** | Warning   |
| **Category** | Connector |
| **Fixable**  | No        |

**Description:** Event-driven listeners (Salesforce CDC, JMS, Anypoint MQ, etc.) should guard against null payloads. A null check or validation step should occur early in the flow to prevent `NullPointerException` in downstream processing.

---

### HTTP-004: Connection Idle Timeout

| Property     | Value   |
| ------------ | ------- |
| **Severity** | Warning |
| **Category** | HTTP    |
| **Fixable**  | No      |

**Description:** HTTP request configurations should set `connectionIdleTimeout` to release idle connections and prevent resource exhaustion under load.

---

## Operations and Hygiene Rules

### HYG-002: Commented Code Detection

| Property     | Value     |
| ------------ | --------- |
| **Severity** | Info      |
| **Category** | Standards |
| **Fixable**  | No        |

**Description:** Detects potentially commented-out code blocks in Mule configurations.

**Detected Patterns:** XML comments containing `<flow `, `<sub-flow `, `<logger `, `<set-variable `, `<set-payload `, `<choice>`, `<transform `, `<flow-ref `, `<try>`, `<db:`.

**Best Practice:** Remove commented code or convert to proper documentation comments. Use version control instead.

---

### HYG-003: Unused Flow Detection

| Property     | Value     |
| ------------ | --------- |
| **Severity** | Warning   |
| **Category** | Standards |
| **Fixable**  | No        |

**Description:** Detects flows and sub-flows that are never referenced by `flow-ref` across the entire project.

**Check Logic:**

- **Cross-file detection**: The engine pre-scans all XML files to collect every `<flow-ref name="...">` target before running rules. A sub-flow or flow is only flagged if it is not referenced in _any_ file in the project.
- **Sub-flows**: Always expected to be referenced; flagged if no `flow-ref` points to them anywhere in the project.
- **Flows without triggers**: Flows that have no HTTP listener, scheduler, or VM listener and aren't referenced are flagged.
- **Exclusions**: Flows matching common external patterns (`-main`, `-api`, `api-`, `-console`, `-error-handler`, `global`) are excluded.

> **Note (v1.21):** The rule now also recognizes APIKit-generated flows (e.g., `get:\resource:api-config`) and flows with external triggers (Salesforce CDC, JMS, AMQP, VM, Anypoint MQ, Kafka, and 14+ connector patterns).

---

### HYG-004: Flow-Ref Target Exists

| Property     | Value     |
| ------------ | --------- |
| **Severity** | Error     |
| **Category** | Standards |
| **Fixable**  | No        |

**Description:** Every `<flow-ref name="...">` must point to an existing flow or sub-flow in the project. This rule uses cross-file validation via the `allFlowNames` set populated during the engine's pre-scan phase.

**Why This Matters:** Broken flow references cause runtime errors. Catching them during static analysis prevents deployment failures.

---

### HYG-005: Unused Variable Detection

| Property     | Value     |
| ------------ | --------- |
| **Severity** | Warning   |
| **Category** | Standards |
| **Fixable**  | No        |

**Description:** Detects `set-variable` values that are never referenced elsewhere in the project (via `vars.variableName`, `#[vars.variableName]`, or `variableName` in DataWeave expressions).

**Best Practice:** Remove unused variables to reduce clutter and improve maintainability.

---

## Governance Rules

### PROJ-001: POM Validation

| Property     | Value     |
| ------------ | --------- |
| **Severity** | Error     |
| **Category** | Structure |
| **Fixable**  | No        |

**Description:** Validates `pom.xml` existence and critical plugins.

**Checks:**

1. `pom.xml` exists in project root
2. Contains `mule-maven-plugin` in build configuration
3. Contains `munit-maven-plugin` if test files exist

---

### PROJ-002: Git Hygiene

| Property     | Value     |
| ------------ | --------- |
| **Severity** | Warning   |
| **Category** | Structure |
| **Fixable**  | No        |

**Description:** Validates `.gitignore` existence and standard entries in git repositories.

**Required Entries:** `target/`, `.project`, `.classpath`, `.tooling-project`

---

## Experimental Rules

> ⚠️ These rules are in beta and may have false positives. Use for guidance only.

### EXP-001: Flow Reference Depth

| Property     | Value        |
| ------------ | ------------ |
| **Severity** | Info         |
| **Category** | Experimental |
| **Fixable**  | No           |

**Description:** Limit the number of flow-refs in a single flow to avoid deep call chains.

---

### EXP-002: Connector Config Naming

| Property     | Value        |
| ------------ | ------------ |
| **Severity** | Info         |
| **Category** | Experimental |
| **Fixable**  | No           |

**Description:** Connector configurations should follow `Convention_Type` pattern (e.g., `HTTP_Request_Config`).

---

### EXP-003: MUnit Executable Test Presence

| Property     | Value        |
| ------------ | ------------ |
| **Severity** | Info         |
| **Category** | Experimental |
| **Fixable**  | No           |

**Description:** Projects with production flows should contain at least one executable,
non-ignored MUnit test in `src/test/munit`. Empty directories, malformed suites, wrong XML
namespaces, and ignored-only suites do not satisfy the check.

---

## Rule Priority Matrix

| Severity | Count | Rules                                                                                                                                                                                                                                                                                                                       |
| -------- | ----- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Error    | 14    | MULE-001, 003, 004, 201, 202, SEC-002, SEC-006, SEC-007, SEC-008, SEC-009, LOG-004, DW-004, YAML-004, ERR-004, HYG-004, PROJ-001                                                                                                                                                                                            |
| Warning  | 37    | MULE-002, 005, 006, 007, 008, 009, 101, 102, 301, 303, 401, 402, 403, 502, 503, 604, 701, 801, 802, 803, 804, SEC-003, SEC-004, SEC-010, PERF-002, RES-001, RES-002, OPS-002, OPS-003, HYG-001, HYG-003, HYG-005, API-004, API-006, API-007, API-008, ERR-002, ERR-003, SF-001, SF-002, HTTP-004, CFG-002, DW-005, PROJ-002 |
| Info     | 27    | MULE-010, 501, 601, YAML-001, 003, DW-001, 002, 003, API-001, 002, 003, 005, EXP-001, 002, 003, ERR-001, LOG-001, OPS-001, DOC-001, HYG-002, CFG-001, STD-001                                                                                                                                                               |

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
