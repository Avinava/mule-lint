# Deployment & Modernization (2026)

> **Applies to:** All  
> **Related Rules:** `OPS-001` · `PROJ-001` · `PROJ-002`  
> **Last Updated:** April 2026

## When to Read This

Read this when planning deployments, migrating to Java 17, adopting CloudHub 2.0, or modernizing tooling.

---

## Development Tooling (2026)

### Anypoint Code Builder (ACB)

ACB (VS Code-based) is the recommended IDE for 2026+, replacing Anypoint Studio for new projects:

- **AI-assisted development** via MuleSoft Vibes
- **AsyncAPI 2.6 support** for event-driven API design
- **Native API Governance** validation during design
- **Integrated Exchange** publishing

### MuleSoft CLI Tools

```bash
# Lint analysis (CI/CD and local)
npx @sfdxy/mule-lint . -c .mulelintrc.json -f json

# Build + test
mvn clean test -Dmule.env=dev -Dsecure.key=test

# Package
mvn clean package -DskipTests
```

---

## Java 17 Migration

Mule 4.9+ **mandates Java 17**. Migration checklist:

- [ ] Update `pom.xml` compiler settings and runtime version
- [ ] Run `jdeps` to identify dependencies on removed Java APIs
- [ ] Audit connector compatibility (most modern connectors are Java 17 compatible)
- [ ] Recompile custom connectors and Java modules
- [ ] Test DataWeave patterns — `DateTime` coercion is stricter in Java 17
- [ ] Update `log4j2.xml` for Java 17 module system changes
- [ ] Performance test in staging — JIT compiler and GC behavior differ

---

## Deployment Models

### CloudHub 2.0 (Kubernetes-based)

| Feature            | CloudHub 1.0         | CloudHub 2.0                      |
| ------------------ | -------------------- | --------------------------------- |
| **Infrastructure** | VM-based workers     | Kubernetes pods                   |
| **Scaling**        | vCore-based          | Pod replicas + HPA                |
| **Networking**     | Shared Load Balancer | Ingress / private networking      |
| **Persistence**    | Object Store V1      | Object Store V2 (pod-local)       |
| **Monitoring**     | Anypoint Monitoring  | Anypoint Monitoring + K8s metrics |

### Runtime Fabric (RTF)

For hybrid or private cloud deployments:

- Self-managed Kubernetes clusters
- Air-gapped environments
- Regulatory compliance (data residency)

---

## Environment Promotion

```
Development → QA → Staging → Production
    ↓           ↓       ↓          ↓
  dev.yaml   qa.yaml  stg.yaml  prod.yaml
```

### Deployment Checklist

| Item                     | Description                   |
| ------------------------ | ----------------------------- |
| ✅ All tests pass        | MUnit and integration tests   |
| ✅ Lint checks pass      | No errors from mule-lint      |
| ✅ Properties configured | Environment YAML verified     |
| ✅ Secrets encrypted     | No plaintext credentials      |
| ✅ API Manager policies  | Authentication, rate limiting |
| ✅ Monitoring configured | Dashboards and alerts ready   |
| ✅ Java 17 verified      | Runtime compatible            |

---

## API Governance at Design Time

Before publishing to Exchange, validate API specifications against organizational rulesets:

1. Define governance rulesets in API Governance
2. Validate RAML/OAS/AsyncAPI specs during design in ACB
3. Block publishing to Exchange if governance rules fail
4. Automate governance checks in CI/CD pipeline

---

## API Versioning

### URL-Based Versioning (Recommended)

```
/api/v1/orders
/api/v2/orders
```

### Deprecation Strategy

1. Announce deprecation timeline to consumers
2. Return `Deprecation` and `Sunset` headers
3. Monitor v1 vs v2 adoption
4. Sunset after consumer migration

```xml
<set-variable variableName="outboundHeaders" value="#[{
    'Deprecation': 'true',
    'Sunset': 'Sat, 01 Jan 2027 00:00:00 GMT',
    'Link': '</api/v2/orders>; rel=\"successor-version\"'
}]"/>
```

---

## Monitoring & Observability

### Three Pillars

| Pillar      | Tool                                | Purpose               |
| ----------- | ----------------------------------- | --------------------- |
| **Logs**    | Anypoint Monitoring, Splunk, ELK    | Debug, audit trail    |
| **Metrics** | Anypoint Monitoring, Grafana        | Performance, health   |
| **Traces**  | Anypoint Monitoring, Tracing module | Request flow, latency |

### Key Metrics to Monitor

```
Application Health:
├── Response time (p50, p95, p99)
├── Error rate (%)
├── Throughput (requests/sec)
├── Active connections
└── Worker CPU/Memory usage

Business Metrics:
├── Records processed per hour
├── Failed transactions
├── API calls by consumer
└── Integration latency by backend
```

### Alerting

| Level        | Condition                       | Response                |
| ------------ | ------------------------------- | ----------------------- |
| **Critical** | Error rate > 10%, App down      | Immediate on-call       |
| **Warning**  | Error rate > 5%, Latency > 5s   | Investigate within 1h   |
| **Info**     | Resource > 70%, unusual pattern | Review in daily standup |

---

**See also:** [CI/CD Integration](ci-cd.md) · [Security](security.md) · [Testing](testing.md)
