# MuleSoft practices handbook

Use this handbook to understand the engineering intent behind a lint finding. It is broader than the executable rule set: mule-lint can identify code patterns, but it cannot decide whether an integration design fits your business, operations, or data-governance needs.

## Start with the outcome you need

| If you are working on…                     | Read                                               | Typical lint coverage                                   |
| ------------------------------------------ | -------------------------------------------------- | ------------------------------------------------------- |
| Flow failures and API error responses      | [Error handling](error-handling.md)                | `MULE-001`, `MULE-003`, `MULE-005`, `MULE-007`, `ERR-*` |
| Flow/variable contracts and naming         | [Variable contracts](variable-contracts.md)        | `MULE-002`, `MULE-102`, `STD-001`                       |
| Traceable, safe logs                       | [Logging](logging.md)                              | `MULE-006`, `MULE-301`, `LOG-*`                         |
| Secrets, TLS, and exposed endpoints        | [Security](security.md)                            | `MULE-004`, `MULE-201`, `MULE-202`, `SEC-*`, `YAML-004` |
| Timeouts, retries, pooling, and complexity | [Performance](performance.md)                      | `MULE-501–503`, `PERF-002`, `RES-*`, `MULE-801`         |
| RAML/OpenAPI quality                       | [API contracts](api-contracts.md)                  | Separate `api validate` command                         |
| DataWeave organization                     | [DataWeave patterns](dataweave-patterns.md)        | `DW-*`                                                  |
| Connector-specific resilience              | [Connector patterns](connector-patterns.md)        | `SEC-007`, `PERF-002`, `RES-001`                        |
| Events, queues, and replay behavior        | [Event-driven patterns](event-driven-patterns.md)  | `SF-*` and selected connector rules                     |
| Maven and source layout                    | [Folder structure](folder-structure.md)            | `MULE-802–804`, `PROJ-*`                                |
| MUnit strategy                             | [Testing](testing.md)                              | Limited static coverage; human review is essential      |
| Pipeline adoption                          | [CI/CD](ci-cd.md)                                  | Profiles, output, gates, and exit codes                 |
| Runtime/deployment planning                | [Deployment and modernization](deployment-2026.md) | Selected project/operations rules                       |

For exact options and examples for every check, use the [rules catalog](rules-catalog.md). For the reviewed outcome-to-rule mapping and source classification, use the [standards catalog](standards-catalog.md).

## The working model

Each guide separates three questions:

1. **What outcome do we want?** Example: every API failure returns a predictable status and correlation ID.
2. **What can static analysis verify?** Example: an error handler exists and references `httpStatus`.
3. **What still needs a human?** Example: whether the selected HTTP status and retry policy are correct for the consumer contract.

Do not treat a clean lint report as deployment approval. Combine it with contract review, MUnit/integration tests, security controls, environment validation, and operational readiness.

## API-led layers in plain language

| Layer      | Main responsibility                               | Review carefully for                                     |
| ---------- | ------------------------------------------------- | -------------------------------------------------------- |
| Experience | Shape data and behavior for a channel or consumer | Consumer-specific contracts leaking into lower layers    |
| Process    | Orchestrate systems and business process steps    | Direct system coupling and overly complex flows          |
| System     | Provide stable access to a backend capability     | Business orchestration or aggregation that belongs above |

mule-lint infers a likely layer from project naming and structure for selected rules. That inference is a hint, not architecture truth; use configuration when a project intentionally differs.

## A practical review order

1. Security and credential findings
2. Parse failures and missing error handling
3. Contract and cross-file correctness
4. Resilience: timeouts, reconnection, and pooling
5. Logging and observability
6. Maintainability, naming, and documentation

The `recommended` profile is a good starting point for this review. Add a gate only after the team agrees on the baseline.

## For coding agents

The same handbook is exposed as MCP resources such as:

```text
mule-lint://docs/error-handling
mule-lint://docs/security
mule-lint://docs/dataweave
mule-lint://docs/ci-cd
mule-lint://docs/rules-catalog
```

Ask an agent to cite the rule ID, explain applicability, and validate the project again after a change. See [MCP setup](../mcp-design.md).
