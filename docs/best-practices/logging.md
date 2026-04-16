# Logging Best Practices

> **Applies to:** All  
> **Related Rules:** `MULE-006` · `MULE-301` · `MULE-303` · `LOG-001` · `LOG-004` · `HYG-001` · `SEC-006`  
> **Last Updated:** April 2026

## When to Read This

Read this when adding loggers, configuring log4j2, or reviewing logging practices for production readiness.

---

## Key Principles

1. **Always use categories** — enable log filtering in production
2. **Never log full payloads** — may contain PII and cause performance issues
3. **Include correlation IDs** — enable request tracing across distributed systems
4. **Use structured logging** — JSON format for log aggregation tools
5. **Keep logger count manageable** — max 5 loggers per flow

---

## Patterns

### Pattern 1: Logger Category Convention

Use hierarchical category names following reverse-domain convention:

```xml
<!-- ✅ Good — hierarchical categories -->
<logger category="com.myorg.sf.sapi" level="INFO"
        message='#["[" ++ vars.correlationId ++ "] Processing order"]'/>

<!-- ❌ Bad — no category (defaults to root logger) -->
<logger message="#['Processing order']"/>
```

**Category naming convention:**

| Pattern                                | Example                        | Use For               |
| -------------------------------------- | ------------------------------ | --------------------- |
| `com.{org}.{system}.{layer}`           | `com.rsm.sf.sapi`              | Main flow logs        |
| `com.{org}.{system}.{layer}.{feature}` | `com.rsm.sf.papi.notification` | Feature-specific logs |

### Pattern 2: Structured Logging (JSON)

For production applications, configure JSON Logger Module for structured log output:

```xml
<logger category="com.myorg.audit" level="INFO">
    <message><![CDATA[#[%dw 2.0
output application/json
---
{
    correlationId: vars.correlationId,
    event: "ORDER_CREATED",
    orderId: payload.orderId,
    timestamp: now()
}]]]></message>
</logger>
```

This enables better log parsing with tools like Splunk, ELK, and Anypoint Monitoring.

### Pattern 3: Log Level Usage

| Level   | Use For                                         | Production?       |
| ------- | ----------------------------------------------- | ----------------- |
| `ERROR` | Critical failures requiring immediate attention | ✅ Always on      |
| `WARN`  | Unexpected events that don't stop processing    | ✅ Always on      |
| `INFO`  | Essential milestones, operation status          | ✅ Always on      |
| `DEBUG` | Verbose diagnostics for troubleshooting         | ❌ Off by default |

### Pattern 4: Avoid Payload Logging

```xml
<!-- ❌ Bad — logs entire payload (PII risk + performance) -->
<logger message="#[payload]"/>
<logger message="#[write(payload, 'application/json')]"/>

<!-- ✅ Good — logs specific, non-sensitive fields -->
<logger category="com.myorg" level="INFO"
        message='#["Order " ++ payload.orderId ++ " for customer " ++ payload.customerId]'/>
```

### Pattern 5: Avoid Loggers in Retry Loops

```xml
<!-- ❌ Bad — logger inside until-successful (floods logs on retries) -->
<until-successful maxRetries="5">
    <logger message="Attempting..."/>
    <http:request config-ref="HTTP_Config" path="/api"/>
</until-successful>

<!-- ✅ Good — log before and after -->
<logger category="com.myorg" message="Starting retry operation"/>
<until-successful maxRetries="5">
    <http:request config-ref="HTTP_Config" path="/api"/>
</until-successful>
<logger category="com.myorg" message="Operation completed"/>
```

---

## MDC / Tracing Module (2026+)

For distributed tracing, use the Mule Tracing module or Mapped Diagnostic Context (MDC):

```xml
<!-- Inject correlation ID into MDC for log4j2 automatic inclusion -->
<tracing:set-logging-variable variableName="correlationId"
    value="#[vars.correlationId]"/>
```

With MDC configured, log4j2 can automatically include the correlation ID in every log line without explicit `#[vars.correlationId]` in each logger message.

---

## log4j2.xml Configuration

```xml
<!-- src/main/resources/log4j2.xml -->
<Configuration>
    <Appenders>
        <RollingFile name="file"
            fileName="${sys:mule.home}/logs/app.log"
            filePattern="${sys:mule.home}/logs/app-%d{yyyy-MM-dd}.log.gz">
            <PatternLayout pattern="%d{ISO8601} %-5p [%t] %c - %m%n"/>
            <Policies>
                <TimeBasedTriggeringPolicy/>
                <SizeBasedTriggeringPolicy size="10 MB"/>
            </Policies>
        </RollingFile>
    </Appenders>
    <Loggers>
        <!-- Application loggers -->
        <Logger name="com.myorg" level="INFO"/>
        <!-- Suppress noisy connectors -->
        <Logger name="com.mulesoft.extension.salesforce" level="WARN"/>
        <Logger name="org.mule.extension.http" level="WARN"/>
        <Root level="INFO">
            <AppenderRef ref="file"/>
        </Root>
    </Loggers>
</Configuration>
```

---

## Checklist

- [ ] All loggers have a `category` attribute
- [ ] No `#[payload]` in logger messages
- [ ] Correlation ID included in all log messages
- [ ] No loggers inside `until-successful` or retry scopes
- [ ] Max 5 loggers per flow
- [ ] No sensitive data (passwords, tokens, PII) in log messages
- [ ] `log4j2.xml` configured with appropriate log levels for production
- [ ] Noisy connector loggers suppressed to WARN

---

**See also:** [Variable Contracts](variable-contracts.md) · [Security](security.md) · [Error Handling](error-handling.md)
