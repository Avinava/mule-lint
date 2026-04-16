# MuleSoft Development Best Practices

> **Purpose:** Comprehensive index to MuleSoft development best practices for building maintainable, secure, and performant Mule 4 applications. Each topic links to a focused guide optimized for both human reading and AI/MCP consumption.
>
> **Version:** April 2026 · **Runtime:** Mule 4.10+ · **Java:** 17

---

## Quick Navigation

### Core Development

| Guide                                       | Description                                                                  | Related Rules                       |
| ------------------------------------------- | ---------------------------------------------------------------------------- | ----------------------------------- |
| [Error Handling](error-handling.md)         | Global error handlers, HTTP vs. event-driven patterns, connector error types | `MULE-001` `MULE-003` `ERR-001–004` |
| [Naming & Variables](variable-contracts.md) | Standard variable contracts, correlation IDs, naming conventions             | `MULE-002` `MULE-102` `STD-001`     |
| [Logging](logging.md)                       | Categories, structured logging, MDC/tracing, PII prevention                  | `MULE-006` `MULE-301` `LOG-001`     |
| [Security](security.md)                     | Secure properties, TLS, credential management, zero-trust                    | `MULE-004` `MULE-201` `SEC-002–010` |
| [Performance](performance.md)               | Timeouts, connection pooling, async patterns, streaming                      | `MULE-501–503` `PERF-002` `RES-001` |

### Architecture & Patterns

| Guide                                             | Description                                                  | Related Rules                  |
| ------------------------------------------------- | ------------------------------------------------------------ | ------------------------------ |
| [Event-Driven Patterns](event-driven-patterns.md) | Platform events, Anypoint MQ, AsyncAPI, deduplication        | `SF-001` `SF-002`              |
| [Connector Patterns](connector-patterns.md)       | Entity config, SF/NS connector gotchas, protocol negotiation | `SEC-007` `PERF-002` `RES-001` |
| [DataWeave Patterns](dataweave-patterns.md)       | Modules, type coercion, lookups, import paths                | `DW-001–005`                   |

### Project & Operations

| Guide                                                 | Description                                           | Related Rules                   |
| ----------------------------------------------------- | ----------------------------------------------------- | ------------------------------- |
| [Folder Structure](folder-structure.md)               | Standard Maven layout, file organization              | `MULE-802–804`                  |
| [Documentation Standards](documentation-standards.md) | Flow docs, README templates, commit messages          | `MULE-601` `MULE-604` `DOC-001` |
| [Testing](testing.md)                                 | MUnit best practices, event-driven testing, coverage  | `EXP-003`                       |
| [CI/CD Integration](ci-cd.md)                         | Pipeline stages, mule-lint integration, quality gates | `PROJ-001` `PROJ-002`           |
| [Deployment & Modernization](deployment-2026.md)      | CloudHub 2.0, Java 17, ACB, API governance            | `OPS-001`                       |
| [Rules Catalog](rules-catalog.md)                     | Complete reference for all 82 lint rules              | All                             |

---

## Quick Reference Card

| Practice           | Do ✅                                     | Don't ❌                                     |
| ------------------ | ----------------------------------------- | -------------------------------------------- |
| **Error Handling** | Use global handler, set `httpStatus`      | Catch `type="ANY"` first, ignore errors      |
| **Logging**        | Use categories, log specific fields       | Log `#[payload]`, log in retry loops         |
| **Security**       | Use `${secure::...}`, encrypt secrets     | Hardcode URLs, passwords, keys               |
| **Performance**    | Set timeouts, handle async errors         | Unlimited retries, huge choice blocks        |
| **Naming**         | kebab-case flows, camelCase vars          | Inconsistent casing, no suffixes             |
| **Structure**      | Separate files by domain                  | Monolithic XML files                         |
| **Config**         | Environment-specific YAML                 | Hardcoded values                             |
| **DataWeave**      | External `.dwl` files, reusable modules   | Large inline transforms                      |
| **Connectors**     | Entity config YAML, full DWL import paths | Hardcoded entity details, short import paths |

---

## API-Led Connectivity

MuleSoft's API-Led Connectivity approach organizes APIs into three layers:

```
┌─────────────────────────────────────────────────────────┐
│                    Experience Layer                      │
│   Channel-specific: Web, Mobile, Partner APIs           │
│   Naming: *-exp-*, *-experience-*                       │
└─────────────────────┬───────────────────────────────────┘
                      │
┌─────────────────────▼───────────────────────────────────┐
│                     Process Layer                        │
│   Orchestration, Business Logic, Event Processing       │
│   Naming: *-proc-*, *-process-*, *-papi                 │
└─────────────────────┬───────────────────────────────────┘
                      │
┌─────────────────────▼───────────────────────────────────┐
│                     System Layer                         │
│   Backend Connectivity: Salesforce, NetSuite, Databases │
│   Naming: *-sys-*, *-system-*, *-sapi                   │
└─────────────────────────────────────────────────────────┘
```

| Layer          | Should Have                                        | Should NOT Have                                |
| -------------- | -------------------------------------------------- | ---------------------------------------------- |
| **Experience** | HTTP listeners, channel-specific transforms        | Direct database access, complex business logic |
| **Process**    | Flow-refs to SAPIs, orchestration, event listeners | Direct system connections                      |
| **System**     | Connector operations, entity CRUD                  | Business logic, data aggregation               |

---

## For AI Agents (MCP)

These best practice guides are exposed via the MuleSoft Lint MCP server as individual resources. AI agents can request specific topics:

```
mule-lint://docs/error-handling        → Error handling guidance
mule-lint://docs/event-driven          → Event-driven patterns
mule-lint://docs/connectors            → Connector configuration
mule-lint://docs/variables             → Variable contracts
mule-lint://docs/dataweave             → DataWeave patterns
mule-lint://docs/security              → Security best practices
mule-lint://docs/logging               → Logging standards
mule-lint://docs/performance           → Performance optimization
mule-lint://docs/testing               → MUnit testing
mule-lint://docs/deployment            → Deployment & modernization
mule-lint://docs/ci-cd                 → CI/CD integration
mule-lint://docs/folder-structure      → Project structure
mule-lint://docs/documentation-standards → Documentation standards
mule-lint://docs/rules-catalog         → Complete rules reference
```

For linter rule details, see the [Rules Catalog](rules-catalog.md).
