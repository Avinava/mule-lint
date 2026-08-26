# Security Best Practices

> **Applies to:** All  
> **Related Rules:** `MULE-004` · `MULE-201` · `MULE-202` · `SEC-002` – `SEC-010` · `YAML-004` · `LOG-004`  
> **Last Updated:** April 2026

## When to Read This

Read this when handling credentials, configuring TLS, securing API endpoints, or reviewing a project for security compliance.

---

## Key Principles

1. **Never hardcode secrets** — use `${secure::...}` property placeholders
2. **Never hardcode URLs** — all hosts, ports, and paths go in YAML config
3. **Encrypt sensitive properties** — AES/CBC with externalized key
4. **Use TLS 1.2+ only** — TLS 1.0/1.1 and SSLv3 are deprecated
5. **Shift-left security** — validate security in design phase, not after deployment

---

## Patterns

### Pattern 1: Secure Properties Configuration

```xml
<!-- Load secure properties with externalized encryption key -->
<secure-properties:config name="Secure_Properties_Config"
    file="config/secure-${mule.env}.yaml"
    key="${secure.key}">
    <secure-properties:encrypt algorithm="AES" mode="CBC"/>
</secure-properties:config>
```

```yaml
# config/secure-dev.yaml (encrypted values)
salesforce:
  jwt:
    consumerKey: '![encrypted-value]'
    storePassword: '![encrypted-value]'
```

**Rules:**

- `key` attribute MUST be a property placeholder (`${secure.key}`) — never hardcoded
- Use `AES` or `Blowfish` — `DES` is considered weak
- Encrypt using Anypoint Secure Properties Tool with runtime property `secure.key`

### Pattern 2: Connector Credential Security

```xml
<!-- ❌ Bad — plaintext credentials -->
<http:request-config username="admin" password="secret123"/>

<!-- ❌ Bad — non-secure property -->
<http:request-config username="${api.username}" password="${api.password}"/>

<!-- ✅ Good — secure property reference -->
<http:request-config
    username="${api.username}"
    password="${secure::api.password}"/>
```

Credential attributes that must use `${secure::...}`:

- `password`, `storePassword`
- `clientId`, `clientSecret`, `consumerKey`, `consumerSecret`
- `token`, `tokenSecret`, `tokenId`

### Pattern 3: TLS Configuration

```xml
<!-- ❌ Bad — insecure TLS -->
<tls:context name="Insecure_TLS">
    <tls:trust-store insecure="true"/>
</tls:context>

<!-- ❌ Bad — deprecated protocol -->
<tls:context enabledProtocols="TLSv1.1,TLSv1.2">

<!-- ✅ Good — proper certificate validation -->
<tls:context name="Secure_TLS" enabledProtocols="TLSv1.2,TLSv1.3">
    <tls:trust-store path="${tls.truststore.path}"
                     password="${secure::tls.truststore.password}"/>
</tls:context>
```

### Pattern 4: Never Log Sensitive Data

```xml
<!-- ❌ Bad — logs sensitive values -->
<logger message="#['Token: ' ++ vars.accessToken]"/>
<logger message="#[payload]"/>  <!-- May contain PII -->

<!-- ✅ Good — logs only identifiers -->
<logger message="#['Auth successful for user: ' ++ vars.userId]"/>
<logger message="#['Processing order: ' ++ payload.orderId]"/>
```

**Detected patterns** (flagged by `SEC-006` and `LOG-004`):
`encrypt.*key`, `password`, `credentials`, `api_key`, `secret.*key`, `accessToken`, `SSN`, `creditCard`

### Pattern 5: API Rate Limiting

For CloudHub-deployed APIs, rate limiting is applied via **API Manager policies** — not inline XML:

```yaml
# dev.yaml — populate for API Manager autodiscovery
api:
  id: '12345678' # API Manager API instance ID
```

For self-managed deployments, configure inline:

```xml
<throttling:config name="Rate_Limit_Config" maxRequestsPerPeriod="100" timePeriodInMilliseconds="60000"/>
```

### Pattern 6: Input Validation

```xml
<!-- ✅ Good — validate incoming payload against schema -->
<flow name="post:\orders:api-config">
    <json:validate-schema schema="schemas/order-request.json"/>
    <!-- Process only after validation passes -->
</flow>
```

For APIs using APIKit with RAML, schema validation is handled by the APIKit router based on the RAML type definitions.

---

## Layered API security

Apply controls at multiple layers; no single connector or policy covers the full threat model:

| Layer             | Control                              | Implementation                           |
| ----------------- | ------------------------------------ | ---------------------------------------- |
| **Network**       | mTLS between services                | TLS context with client certificates     |
| **Identity**      | OAuth 2.0 / JWT verified per request | API Manager policies + Flex Gateway      |
| **Authorization** | Scoped permissions per API consumer  | Client ID enforcement + scope validation |
| **Data**          | Encrypt at rest and in transit       | Secure properties + TLS 1.3              |
| **Observability** | Audit all access                     | Correlation IDs + structured logging     |

---

## Environment Property Separation

```
config/
├── global.yaml              # Shared defaults (timeouts, paths)
├── dev.yaml                 # Dev-specific non-sensitive config
├── prod.yaml                # Prod-specific non-sensitive config
├── secure-dev.yaml          # Dev encrypted credentials
└── secure-prod.yaml         # Prod encrypted credentials
```

**Never store:**

- Plaintext passwords in any YAML file
- API keys or tokens in non-secure YAML files
- Encryption keys inline in XML

---

## Checklist

- [ ] All credentials use `${secure::...}` property placeholders
- [ ] Secure properties encryption key is externalized (`${secure.key}`)
- [ ] Encryption algorithm is AES or Blowfish (not DES)
- [ ] TLS contexts use TLSv1.2+ only — no SSLv3, TLSv1.0, TLSv1.1
- [ ] No `insecure="true"` on trust-stores
- [ ] No hardcoded URLs, hosts, or ports in XML
- [ ] No sensitive data in logger messages
- [ ] Input validation configured for all POST/PUT/PATCH endpoints
- [ ] API Manager `api.id` populated in environment YAML

---

**See also:** [Connector Patterns](connector-patterns.md) · [Logging](logging.md) · [Configuration Management](variable-contracts.md)
