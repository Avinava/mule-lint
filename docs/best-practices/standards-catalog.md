# Standards catalog

This is the canonical classification layer behind mule-lint's guides and executable rules. A
standard states the engineering outcome; one or more rules provide automation for it. Agent skills
should read these records instead of embedding a separate copy of the guidance.

| ID                | Standard                                  | Classification         | Rule category    | Guide                                                 |
| ----------------- | ----------------------------------------- | ---------------------- | ---------------- | ----------------------------------------------------- |
| `MSTD-ERR-001`    | Reliable error handling                   | Vendor requirement     | `error-handling` | [Error handling](error-handling.md)                   |
| `MSTD-NAM-001`    | Consistent project naming                 | Opinionated convention | `naming`         | [Documentation standards](documentation-standards.md) |
| `MSTD-SEC-001`    | Secure Mule configuration                 | Vendor requirement     | `security`       | [Security](security.md)                               |
| `MSTD-LOG-001`    | Operationally useful logging              | Recommended practice   | `logging`        | [Logging](logging.md)                                 |
| `MSTD-HTTP-001`   | Bounded HTTP behavior                     | Recommended practice   | `http`           | [Connector patterns](connector-patterns.md)           |
| `MSTD-PERF-001`   | Bounded resource usage                    | Recommended practice   | `performance`    | [Performance](performance.md)                         |
| `MSTD-DOC-001`    | Maintainable implementation documentation | Recommended practice   | `documentation`  | [Documentation standards](documentation-standards.md) |
| `MSTD-STD-001`    | Mule implementation standards             | Recommended practice   | `standards`      | [Best-practices index](mulesoft-best-practices.md)    |
| `MSTD-CPLX-001`   | Reviewable flow complexity                | Opinionated convention | `complexity`     | [Performance](performance.md)                         |
| `MSTD-DW-001`     | Explicit DataWeave contracts              | Recommended practice   | `dataweave`      | [DataWeave patterns](dataweave-patterns.md)           |
| `MSTD-STRUCT-001` | Conventional Mule project structure       | Recommended practice   | `structure`      | [Folder structure](folder-structure.md)               |
| `MSTD-API-001`    | Consistent API-led implementation         | Recommended practice   | `api-led`        | [Best-practices index](mulesoft-best-practices.md)    |
| `MSTD-API-002`    | Consumer-centered API contracts           | Recommended practice   | `api-design`     | [API contract validation](api-contracts.md)           |
| `MSTD-GOV-001`    | Reproducible project governance           | Recommended practice   | `governance`     | [CI/CD](ci-cd.md)                                     |
| `MSTD-OPS-001`    | Operationally safe Mule applications      | Recommended practice   | `operations`     | [Deployment](deployment-2026.md)                      |
| `MSTD-TEST-001`   | Behavior-focused Mule testing             | Recommended practice   | `testing`        | [Testing](testing.md)                                 |
| `MSTD-EXP-001`    | Experimental quality heuristics           | Opinionated convention | `experimental`   | [Rules catalog](rules-catalog.md)                     |

## Classification

- **Vendor requirement** identifies behavior directly required for correctness or security by the
  Mule runtime or a supported platform capability.
- **Recommended practice** is the project's reviewed default for reliable, maintainable Mule work.
- **Opinionated convention** improves consistency but may reasonably vary by organization.

The structured source includes applicability, status, source URLs, and a verification date. Read it
through `mule-lint://standards`, then use `mule-lint://standards/{id}` and the linked guide for detail.
Rule-to-standard mappings and profile membership are available from `mule-lint://rules`.
