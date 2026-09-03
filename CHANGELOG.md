# Changelog

## [1.30.0] - 2026-09-03

Rule coverage release. 82 rules become 98, two existing rules widen, custom XPath rules become
usable from the CLI, and every dependency advisory is cleared.

**Issue counts and quality scores will move on upgrade** — sixteen rules arrive enabled at once, and
`ERR-003` and `DW-001` report cases they previously skipped. Measured against eight real Mule
projects, the increase was roughly 4% more findings. To upgrade with no change in output, disable the
sixteen new rule IDs listed at the end of this entry; a test asserts that reproduces the previous
result.

### Added

- **Secrets in `.properties` files are now checked** (`CFG-003`). `YAML-004` covered `.yaml`, but
  nothing read `.properties` at all — they were globbed only to guess an environment name from the
  filename. The finding names the key and the line and never the value, so a report can be shared
  without leaking what it found.
- **Transport security rules.** `SEC-012` reports literal plaintext HTTP on outbound connections,
  both `protocol="HTTP"` and absolute `http://` URLs; `SEC-013` requires a TLS context when a
  connection declares HTTPS. Neither existed: `MULE-004` flagged hardcoded URLs as a _hardcoding_
  problem and nothing looked at the transport. A dynamic protocol such as `${http.protocol}` is
  unknown at lint time and passes rather than being reported as plaintext.
- **`SEC-011`** reports a project holding sensitive configuration keys with no Secure Configuration
  Properties module. Encrypted `![...]` values still require it, because Mule needs the module to
  decrypt them.
- **`SEC-014`** reports Basic Authentication as a warning, not an error — it is sometimes a
  deliberate compatibility choice, and `allowedConnectors` records that decision.
- **Evidence rules for controls that often live outside the repository** (`SEC-015` CORS,
  `SEC-016` inbound authentication). Both report that no evidence was _detected_ and say the control
  may come from a gateway policy; neither claims an API is insecure, because static analysis cannot
  know. `SEC-015` stays silent unless `browserFacing` is set or an OPTIONS flow exists.
- **API interface controls.** `API-009` (specification present, identified by content so a plain
  configuration YAML is not mistaken for a contract), `API-010` (versioned path, resolving the
  listener `basePath` and `path` together), `API-011` (health endpoint), and `HTTP-005` (listener
  response content type, the inbound counterpart to `MULE-402`). `API-009` complements the AMF
  contract validator added in 1.28: that validates a specification, this reports having none.
- **Runtime practice rules.** `LOG-005` (flow contains a logger), `PERF-003` (batch job declares
  `blockSize` or `maxConcurrency`), `OPS-004` (scheduler mode), `RES-003` (messaging idempotency
  evidence), and `MULE-805` (oversized sequential flow). `MULE-805` complements `MULE-801` rather
  than duplicating it: a 25-step straight-line flow scores a cyclomatic complexity of 1.
- **`customRulesPath` now works.** It was accepted by the schema, warned about as reserved, and then
  ignored. It loads a YAML file of declarative XPath rules, resolved relative to the configuration
  file. A custom rule is an expression and a message template and nothing executable — no URLs, no
  module imports, no environment interpolation. Expressions compile at load time, so a bad
  expression or an unbound prefix fails the run with exit code `2` instead of silently matching
  nothing. `loadCustomXPathRules` is exported for library consumers.
- **Project rules can report against the file responsible.** `Issue` gained optional `filePath` and
  `relativePath`, and the engine groups project findings into real file results. A secret in
  `config.properties` now points at that file and line in SARIF instead of at `mule-artifact.json`.

### Changed

- **`ERR-003` also reports an error handler that produces no response payload**, which in an HTTP
  application returns the inbound payload to the caller instead of a described error. Gated on
  project HTTP context, so non-HTTP handlers are unaffected; blocks delegating through `raise-error`
  or an external DWL resource still pass.
- **`DW-001` now inspects inline `ee:set-variable` bodies**, not only `set-payload`, skips bodies
  already referencing an external resource, and reports once per DataWeave body.
- Secret-key classification moved into one shared `SensitiveKeys` module that `YamlParser` delegates
  to, so a key `YAML-004` flags is a key `CFG-003` flags.
- The configuration error for an invalid enum value now lists the accepted values, so
  `defaultFormatter: "xml"` reports `expected one of "table"|"json"|"sarif"|"html"|"csv"`.

### Fixed

- **SARIF emitted `startLine: 0` for project-level findings**, which is invalid per the specification
  and can be rejected on upload. The region is now omitted when a finding refers to the project
  rather than a line.
- **The MCP category-to-documentation map had no entry for the `api-design` or `testing` categories**,
  so `get_rule_details` fell through to a default for them. It is typed by `RuleCategory` now, making
  an unmapped category a compile error, and every value is asserted to name a registered resource.
- **The rule priority matrix had drifted**, claiming 14 errors while listing 16. It and the
  per-family table are regenerated from the registry.

### Dependencies

`npm audit` reported three advisories and now reports zero for both the production and dev trees.

- **Security fixes within the declared ranges** — `@xmldom/xmldom` 0.8.15, `fast-uri` 3.1.7 and `qs`
  6.16.0 through the MCP SDK, and `@humanfs/node` 0.16.8 through eslint. The `@xmldom/xmldom` range
  is tightened to `^0.8.15` so a fresh install cannot resolve a vulnerable 0.8.13 or 0.8.14.
- **Major upgrades**, each verified against the full gate: TypeScript 5 → 6, ESLint 9 → 10, zod 3 →
  4, js-yaml 4 → 5, commander 11 → 14, vitest 3 → 4, knip 5 → 6, lefthook 1 → 2, lint-staged 15 → 16,
  and commitlint 19 → 20. `@types/js-yaml` was removed because js-yaml 5 ships its own types.
- `vitest.config.ts` became `vitest.config.mts`; Vite warned that the config used ESM syntax in a
  file loaded as CommonJS, which its next major stops accepting.
- Node support is unchanged at `>=20`, and CI still tests 20 and 22. Packages held below their latest
  major, and why, are recorded under **Dependency ceilings** in `CONTRIBUTING.md`.

### Quality

- 653 tests across 46 test files, up from 474 across 38.
- The new rules were measured against eight representative Mule projects before release. Two
  false-positive classes were found and excluded by default: `LOG-005` flagged APIKit-generated
  `*-main` and `*-console` router flows, and `API-010` flagged the generated `/console/*` path.
  APIKit **route** flows remain checked, and correctly caught routes missing the logger their
  siblings have.
- A compatibility suite asserts that disabling the new rules reproduces the previous result, that no
  secret value reaches any of the five output formats, that project findings are attributed to the
  real file in SARIF, and that repeated scans are byte-identical.

New rule IDs: `CFG-003`, `SEC-011`, `SEC-012`, `SEC-013`, `SEC-014`, `SEC-015`, `SEC-016`,
`API-009`, `API-010`, `API-011`, `HTTP-005`, `LOG-005`, `PERF-003`, `OPS-004`, `RES-003`,
`MULE-805`.

## [1.29.1] - 2026-08-26

### Added

- A host-neutral setup runbook and one copyable prompt for Codex, Claude Code, GitHub Copilot,
  Gemini, Cursor, and similar coding agents. The workflow detects existing configuration, runs a
  read-only baseline, previews changes, preserves customized files, and adds only the integration
  the user selects.

### Changed

- Agent onboarding coordinates with Mule Skills when it is already installed and distinguishes
  local MCP configuration from GitHub-hosted agents.

## [1.29.0] - 2026-08-26

### Added

- A task-oriented documentation experience for MuleSoft developers who do not routinely use
  Node.js, with a guided first scan, recipes, CLI and library references, troubleshooting, and
  clearer configuration, profile, output, quality-gate, formatting, and MCP guidance.
- A sample Mule project with copyable commands, representative lint findings, and
  screenshots of the generated HTML dashboard and issue workflow.
- Canonical repository guidance for contributors and coding agents.

### Changed

- The HTML report now uses a cleaner MuleSoft-focused visual system, clearer summary language,
  more readable issue tables, and a row detail panel that exposes the complete finding and
  suggestion.
- The root README, contributor guide, agent workflows, and best-practice pages are shorter,
  task-oriented, and explicit about what commands read or write.

### Fixed

- HTML report project names are escaped in document chrome.
- Source-file totals no longer include synthetic report rows, connector icons use the configured
  Exchange base URL, and Tabulator row selection uses the supported event API.

## [1.28.0] - 2026-08-20

### Added

- Separate AMF-backed RAML and OpenAPI contract validation API, CLI command, and MCP tool.
- Local-only dependency loading, deterministic main-file detection, JSON/SARIF reports, and the `MSTD-API-002` standard.
- An optional, portable AMF governance baseline ruleset.

All notable changes to this project will be documented in this file.

## [1.27.0] - 2026-08-19

### Added

- `MSTD-TEST-001` defines behavior-focused Mule testing through caller-faithful events, boundary
  mocks, observable outcomes, error and state evidence, and risk-based scenarios rather than a
  universal coverage percentage.

### Changed

- The testing guide served through `mule-lint://docs/testing` now uses the same behavior-ledger,
  fidelity, mock, assertion, failure-classification, and privacy model as the standard.

### Fixed

- `EXP-003` now detects at least one non-ignored `munit:test` in the exact MUnit namespace under
  `src/test/munit`. Empty, malformed, wrong-namespace, ignored-only, and missing suites no longer
  satisfy the rule merely because a coverage-report setting exists.

## [1.26.0] - 2026-08-18

### Added

- A typed standards catalog maps every rule category to a stable standard ID, classification,
  applicability, source references, guide, and verification date.
- `baseline`, `recommended`, and `strict` rule profiles are selectable through `--profile`, config
  `extends`, and MCP lint calls. Explicit rule configuration remains the final override.
- MCP resources now expose structured standards and per-ID rule and standard records for agents.
- SARIF rule metadata links to the maintained rule documentation.

### Changed

- `mule-lint` is the canonical home for cross-project Mule standards, guides, executable checks, and
  rule profiles. The `mule-skills` site owns the ecosystem compatibility and setup hub.
- MCP scans default to `recommended`; direct library use without a configured profile keeps its
  historical all-registered-rules behavior.

## [1.25.0] - 2026-08-18

Documentation release. No rule, engine, or CLI behavior changed.

### Added

- **A published documentation site** at <https://avinava.github.io/mule-lint/>, built with MkDocs
  Material from the existing `docs/` tree and deployed by GitHub Actions. `docs/` remains the single
  source and still reads correctly on GitHub. CI builds it with `--strict`, so a broken cross-link or
  a page missing from the navigation now fails a pull request.
- **MCP setup for every host.** Only Claude Desktop and `.vscode/mcp.json` were documented; Claude
  Code, Codex, Copilot CLI, and Gemini were not, even though the same command works for all of them.
- **A continuous-integration section** with a SARIF upload example and the exit-code table, which
  previously existed only in `docs/README.md`.
- **A troubleshooting section** covering the failure modes that look like bugs but are not: scanning
  the wrong path, exit code 2 versus 3, configuration precedence, and cross-file rules needing the
  whole project.
- An ecosystem page and README section placing `mule-lint` alongside `mule-build`,
  `anypoint-connect`, and `mule-skills`.

### Fixed

- **A four-backtick code fence in the rules catalog was closed with three**, so everything from
  `ERR-004` through `MULE-002` — including the `Naming Rules` heading — rendered as one code block on
  GitHub. Caught by the strict site build.
- **The rule-family table in `docs/README.md` was wrong**: 13 families summing to 75 against a stated
  total of 82, with `PERF` and `DOC` missing entirely and three counts understated. Replaced with all
  18 identifier prefixes, counted from the registry.
- Backfilled the missing 1.22.0, 1.23.0, and 1.24.0 entries below; all three were tagged and
  published with no changelog record.
- `CLAUDE.md` listed 16 rule prefixes; `OPS` and `RES` were absent.
- `CONTRIBUTING.md` pointed at `docs/naming-conventions.md`, which does not exist.
- README rule groups were labeled with the release that introduced them and had stopped being true
  three releases ago. They are grouped by theme now, with the changelog as the release record.
- Removed a stale `Version: 1.0.0` stamp from the rule-engine document and a leftover HTML comment
  from the README.

### Changed

- `package.json` homepage points at the documentation site.
- CI actions moved off Node 20, which is deprecated: `actions/checkout` and `actions/setup-node` to
  `v7`.

## [1.24.1] - 2026-08-11

### Fixed

- Corrected project-rule lifecycle handling so project validation runs once per scan and remains
  repeatable when an engine instance is reused.
- Fixed cross-file APIKit, autodiscovery, DataWeave, YAML, structure, and unused-flow analysis.
- Corrected summary counts, quiet-mode metrics, severity overrides, security quality metrics, and
  quality-gate status derivation.
- Added validated CLI configuration loading with explicit formatter precedence and warnings for
  unsupported compatibility settings.
- Updated MCP registration to the supported SDK API and fixed snippet validation and bundled
  documentation resolution.
- Corrected package entry points and release ordering so a failed npm publish cannot create a
  successful GitHub release.

### Quality

- Enabled strict TypeScript checks and zero-warning typed ESLint across source, CLI, MCP, and tests.
- Added coverage thresholds, registry invariants, dead-code checks, isolated package installation
  smoke tests, production dependency auditing, and Node 20/22 CI coverage.
- Updated dependencies and resolved all production audit findings.
- Reconciled user, contributor, architecture, extension, QA, and release documentation with the
  implemented behavior.

**Total: 457 tests across 37 test files.**

## [1.24.0] - 2026-05-29

### Fixed

- Removed a duplicate no-op XPath expression in `ApikitStatusCodeVariableRule`.
- `--quiet` now rebuilds `byRule` and `filesWithIssues` rather than only zeroing `bySeverity`, so
  summary counts match the filtered report.
- HTML reports escape untrusted values at every `innerHTML` sink — dashboard pills and the Tabulator
  formatters for file path, message, and suggestion — closing an XSS vector when a report is opened
  from an untrusted project.

## [1.23.0] - 2026-05-02

### Added

- `CLAUDE.md` for AI-agent onboarding.
- `FlowCasingRule` convention is configurable: `kebab-case`, `camelCase`, or `any`.
- Rule-authoring guidance covering every rule prefix and the `BaseRule` versus `ProjectRule` choice.

### Fixed

- Missing `HTTP`, `SF`, `CFG`, and `STD` prefixes added to the naming-conventions reference.
- Renamed `NewLoggingRules.ts` to `LoggingPatternRules.ts`; a file named for its novelty stops being
  accurate on the next release.

## [1.22.0] - 2026-04-16

### Added

- Advanced integration-pattern coverage in the best-practice guides, restructured for agent
  consumption, with the MCP resource list expanded to match.

### Changed

- The `review-best-practices` prompt points at the advanced patterns, and batch-project reviews
  recommend the event-driven and performance guides.

## [1.21.0] - 2026-04-15

### Highlights

- **82 rules** (up from 56) — 20+ new rules added across security, error handling, API-led, connectors, and code hygiene
- **442 tests** (up from 302) — comprehensive coverage for all new and enhanced rules
- **Document cache** — XML documents parsed once during pre-scan and reused, eliminating redundant parsing
- **Project layer detection** — Automatic SAPI/PAPI/EAPI/library/batch classification via heuristics
- **False positive fixes** — 6 rules fixed based on analysis of real-world MuleSoft accelerator projects

### Added

#### New Security & Integrity Rules (P0)

- **SEC-007** (`ConnectorCredentialsSecuredRule`): Connector configurations must use `${secure::...}` for credentials
- **SEC-008** (`SecurePropertiesKeyRule`): Secure properties file encryption key must be externalized (not hardcoded)
- **SEC-009** (`TlsKeystorePasswordRule`): TLS keystore/truststore passwords must use secure property placeholders
- **SEC-010** (`SecurePropertiesEncryptionRule`): Secure properties must use strong encryption algorithms (AES/Blowfish)
- **HYG-004** (`FlowRefTargetExistsRule`): Every `flow-ref` must point to an existing flow or sub-flow (cross-file validation via `allFlowNames`)

#### New Error Handling & Resilience Rules (P1)

- **ERR-002** (`ErrorHandlerTypeCoverageRule`): APIKit flows should handle common HTTP error types (400, 404, 405, 500, etc.)
- **ERR-003** (`ErrorResponseStructureRule`): Error handlers should set both `httpStatus` variable and a response body
- **ERR-004** (`CatchAllLastRule`): `type="ANY"` on-error block must be the last handler in the chain
- **RES-002** (`ListenerReconnectForeverRule`): Listener connectors (HTTP, JMS, AMQP, VM) should use `reconnect-forever`
- **CFG-001** (`ConfigPropertiesOrderingRule`): Configuration properties should follow a consistent ordering pattern

#### New API-Led & Connector Rules (P2)

- **API-006** (`ApikitMainFlowStructureRule`): APIKit main flow should follow the standard router + error-handler structure
- **API-007** (`ApikitStatusCodeVariableRule`): APIKit route implementations should set `httpStatus` variable
- **API-008** (`ApikitConsoleProductionRule`): APIKit console endpoint should be disabled in production configs
- **SF-001** (`ReplayChannelConfigRule`): Salesforce Streaming/Platform Events replay channel should have proper config
- **HTTP-004** (`ConnectionIdleTimeoutRule`): HTTP request configurations should set connection idle timeout

#### New Code Hygiene Rules (P3)

- **DW-005** (`DuplicateTransformLogicRule`): Detect duplicated DataWeave transform expressions within a file
- **HYG-005** (`UnusedVariableRule`): Detect `set-variable` values never referenced elsewhere in the project
- **CFG-002** (`MissingEnvPropertiesDeclarationRule`): Properties referenced in XML (`${...}`) should exist in YAML config files
- **STD-001** (`ApikitRouteVariableConsistencyRule`): APIKit route variable names should be consistent across routes
- **SF-002** (`EventListenerNullGuardRule`): Event-driven listeners (Salesforce, JMS, etc.) should guard against null payloads

#### Engine Improvements

- **Document Cache**: `LintEngine` now caches parsed XML `Document` objects during `preScanFiles()` and reuses them in `processFile()`, eliminating double XML parsing. Cache is cleared after each scan to free memory.
- **Project Layer Detection**: New `detectProjectLayer()` method classifies projects as `sapi`, `papi`, `eapi`, `library`, `batch`, or `unknown` using directory name patterns, flow name patterns, and connector presence heuristics. Available to rules via `context.projectContext?.projectLayer`.
- **`allFlowNames`**: New `Set<string>` on `ValidationContext` tracking all flow/sub-flow definitions across the project, enabling cross-file validation (used by HYG-004).
- **Namespace Registry**: Added `netsuite`, `sap`, `anypoint-mq`, and `oauth` namespaces to `MULE_NAMESPACES` in `XPathHelper`.

### Fixed (False Positives)

- **MULE-001** (`GlobalErrorHandlerRule`): Converted from per-file to `ProjectRule` — no longer reports false positives when the global error handler is defined in a separate XML file
- **HYG-003** (`UnusedFlowRule`): Now recognizes APIKit-generated flows (e.g., `get:\resource:api-config`) and flows with external triggers (Salesforce CDC, JMS, AMQP, VM, Anypoint MQ, Kafka, and 14+ connector patterns)
- **YAML-001, DW-002, DW-003**: Converted from per-file to `ProjectRule` — filesystem-based checks now run once per scan instead of once per XML file
- **YAML-003** (`PropertyNamingRule`): Relaxed regex to accept valid vendor-specific property naming conventions
- **MULE-301** (`LoggerPayloadRule`): Enhanced to detect `write(payload,...)` and `--- payload` DataWeave patterns in logger messages
- **LintEngine**: Added `instanceof ProjectRule` guard to prevent project-level rules from running per-file

### Enhanced (Existing Rules)

- **ERR-001** (`TryScopeRule`): Now also checks sub-flows containing `http:request` without Try scope; added WSC (Web Service Consumer) detection via `countRiskyOperations()`
- **RES-001** (`ReconnectionStrategyRule`): Split listener vs request configurations with different suggestions — `reconnect-forever` for listeners, bounded `reconnect count="3"` for requests; added Salesforce config detection
- **MULE-201** (`HardcodedCredentialsRule`): Added 8 new sensitive attributes: `consumerKey`, `consumerSecret`, `storePassword`, `tokenId`, `tokenSecret`, `tokenKey`, `keyPassword`, `keystorePassword`
- **MULE-009** (`GenericErrorRule`): Now skips `type="ANY"` when it is the last `on-error` block in the chain — this is an accepted MuleSoft catch-all pattern per accelerator best practices

### Tests

- `tests/unit/P0SecurityRules.test.ts`: 25 tests for HYG-004, SEC-007, SEC-008, SEC-009, SEC-010
- `tests/unit/P1ErrorResilienceRules.test.ts`: 25 tests for ERR-002, ERR-003, ERR-004, RES-002, CFG-001
- `tests/unit/P2ApiConnectorRules.test.ts`: 25 tests for API-006, API-007, API-008, SF-001, HTTP-004
- `tests/unit/P3CodeHygieneRules.test.ts`: 25 tests for DW-005, HYG-005, CFG-002, STD-001, SF-002
- `tests/unit/ExistingRuleEnhancements.test.ts`: 26 tests for ERR-001, RES-001, MULE-201, MULE-009 enhancements
- `tests/unit/EngineImprovements.test.ts`: 9 tests for document cache, project layer detection, namespace registry
- Updated `tests/unit/ErrorHandlingRules.test.ts` for MULE-009 catch-all behavior change

**Total: 442 tests (up from 302)**

---

## [1.20.0] - 2026-04-14

### Fixed

- **PERF-002** (`ConnectionPoolingRule`): `maxConnections`/`connectionIdleTimeout` now checked on both `<http:request-config>` and its nested `<http:request-connection>` child. Previously only checking the top-level element caused SAXParseException on XSD-valid projects.
- **RES-001** (`ReconnectionStrategyRule`): Improved suggestion text to clarify XSD-correct nesting of `<reconnection>` inside `<http:request-connection>`. Added `reconnect-forever` and nested-config test coverage.
- **DW-002** (`DwlNamingRule`): Added `exemptPaths` option to skip naming convention enforcement for DataWeave module directories. Hyphens are invalid in DW module identifiers so `camelCase` is the only valid choice for module files.
- **MULE-402** (`HttpContentTypeRule`): Now detects Content-Type in three patterns — static `<http:header>` elements (A), CDATA DataWeave blocks inside `<http:headers>` (B), and inline DW expressions on the `value=` attribute (C). When headers are set via a DataWeave expression but Content-Type is not statically visible, the issue is downgraded to `info`.
- **MULE-007** (`CorrelationIdRule`): Now follows `resource="..."` references on `ee:set-payload` and similar elements. The referenced `.dwl` file is read from `src/main/resources/<resourcePath>` and checked for correlationId patterns. Unresolvable resource references are downgraded to `info` to avoid false positives.
- **MULE-001** (`GlobalErrorHandlerRule`): Removed `context.relativePath.includes('global')` guard that restricted the check to files named "global". The rule now fires on any flow file (containing `<flow>` or `<sub-flow>`) that lacks both a named `<error-handler>` element and the expected global error handler file. Pure configuration files (no flows) are skipped.
- **MULE-005** (`HttpStatusRule`): Added `projectContext` detection — the rule is now automatically skipped for non-HTTP projects (those with no `http:listener` or `apikit:router`). Prevents false positives in event-driven and batch Mule applications.
- **HYG-003** (`UnusedFlowRule`): Upgraded to cross-file reference detection. `LintEngine` now runs a pre-scan phase that collects all `<flow-ref name="...">` targets across all XML files before executing rules. The collected set is passed as `context.allFlowRefs` so sub-flows and flows referenced in other files are no longer incorrectly flagged.
- **MULE-802** (`ProjectStructureRule`): Removed `src/main/resources/api` from the default recommended directories. Many Mule 4 projects reference their API spec from Anypoint Exchange and do not bundle it locally. The full recommended dirs list is now configurable via the `recommendedDirs` option.

### Added

- **`ValidationContext.allFlowRefs`** (`src/types/Rule.ts`): Optional `Set<string>` populated by `LintEngine` pre-scan with all `<flow-ref>` targets across the project.
- **`ValidationContext.projectContext`** (`src/types/Rule.ts`): Optional `ProjectContext` object with `hasHttpListener` and `hasApikitRouter` flags, populated during pre-scan.
- **`LintEngine` pre-scan phase**: Before per-file rule execution, the engine now scans all XML files to populate `allFlowRefs` and `projectContext`.
- **`tests/unit/YamlRules.test.ts`**: New test file (12 tests) covering `EnvironmentFilesRule` (YAML-001) with configurable environments, naming patterns, and filesystem layouts; plus `PropertyNamingRule` (YAML-003) and `PlaintextSecretsRule` (YAML-004).

### Improved

- **YAML-001** (`EnvironmentFilesRule`): Configurable environments via `getOption(context, 'environments', ['dev', 'qa', 'prod'])` was already in place; now has full test coverage and documentation.
- **MULE-002** (`FlowNamingRule`): Sub-flow naming enforcement was already implemented; added 4 explicit tests and updated documentation to document the `subflowSuffix` and `excludePatterns` options.

### Tests

- `tests/unit/PerformanceRules.test.ts`: +3 tests for PERF-002 and RES-001
- `tests/unit/OperationsRules.test.ts`: +2 cross-file tests for HYG-003
- `tests/unit/DataWeaveRules.test.ts`: Rewritten with filesystem-based tests for DW-002 `exemptPaths`
- `tests/unit/HttpRules.test.ts`: +4 tests for MULE-402 patterns B, C, and dynamic-unverified
- `tests/unit/ErrorHandlingRules.test.ts`: +7 tests for MULE-001, +3 tests for MULE-005 projectContext, +4 tests for MULE-007 resource references
- `tests/unit/StructureRules.test.ts`: +5 tests for MULE-802 configurable recommended dirs
- `tests/unit/FlowNamingRule.test.ts`: +4 tests for MULE-002 sub-flow enforcement
- `tests/unit/YamlRules.test.ts`: New file, 12 tests

**Total: 302 tests (up from 270)**

---

### Added

- **Centralized Quality Scoring System** (`src/quality/` module)
  - `types.ts` - Core interfaces for rating grades and thresholds
  - `thresholds.ts` - Single source of truth for A-E rating boundaries
  - `calculator.ts` - Centralized rating calculation functions
- **Issue Type Classification** (`issueType` field on all rules)
  - `vulnerability` - All security rules
  - `bug` - All error-handling rules
  - `code-smell` - Default for all other rules
- **MCP Server Enhancements**
  - `run_lint_analysis` now returns quality metrics (complexity, maintainability, reliability, security)
  - All issues include `issueType` field in responses
  - Rules list includes `issueType` for each rule

### Improved

- **HTML Report**
  - Aligned badge font sizes (Severity and Type columns now consistent)
  - Fixed rating card navigation (Complexity/Maintainability → all issues)
  - `MetricsAggregator` now uses rule `issueType` instead of hardcoded patterns

### Documentation

- Updated `docs/linter/architecture.md` with issueType and quality module
- Updated `docs/linter/rule-engine.md` with IssueType interface
- Updated README with accurate reliability/security rating docs
- Fixed VS Code MCP JSON syntax error in README

---

## [1.12.0] - 2026-01-10

### Added

- **ProjectRule Base Class**: New abstract base class for project-level rules with run-once semantics
- **156 Unit Tests**: Comprehensive test coverage (up from 43 tests - 3.6x increase)
  - Error Handling: MULE-003, -005, -007, -009, ERR-001
  - HTTP: MULE-401, -402, -403
  - Security: MULE-004, -201, -202, SEC-002
  - Logging: MULE-006, -301, -303, LOG-004
  - DataWeave: DW-001, -002, -003
  - Naming: MULE-101, -102
  - Standards: MULE-008
  - Performance: MULE-501, -502, -503, PERF-002
  - API-Led: API-001, -002, -003
  - Documentation: MULE-601, -604
  - Complexity: MULE-801
  - Structure: MULE-804
  - Experimental: EXP-001, -002

### Improved

- **DW-002**: Configurable naming convention (kebab-case/camelCase/any)
- **MULE-401**: Demoted to `info` severity, added `excludeConfigs` option

---

## [1.10.0] - 2026-01-10

### Documentation

- Updated README.md with correct VS Code MCP configuration instructions

## [1.9.0] - 2026-01-10

### Added

- **7 New Rules** based on 2025-2026 MuleSoft best practices (total 48 rules):
  - **SEC-002**: TLS Version Check - Detect deprecated TLS versions (< 1.2)
  - **SEC-003**: Rate Limiting - APIs should have rate limiting configured
  - **SEC-004**: Input Validation - Incoming payloads should be validated
  - **LOG-001**: Structured Logging - Recommend JSON logger format
  - **LOG-004**: Sensitive Data Logging - Detect PII/secrets in log statements
  - **ERR-001**: Try Scope Best Practice - Complex operations should use Try scope
  - **PERF-002**: Connection Pooling - DB/HTTP should configure connection pools

### Validated

- **MCP Server**: Confirmed all tools and resources working correctly
- **QA Testing**: All new rules validated against real MuleSoft project

---

## [1.8.3] - 2026-01-10

### Validated

- **MCP Server**: Full validation of MCP server implementation
  - All 3 tools working: `run_lint_analysis`, `get_rule_details`, `validate_snippet`
  - All 8 resources working: rules list and 7 documentation endpoints
- **CLI Scan**: Verified on real MuleSoft project
- **All Tests Passing**: 43 tests passing

### Fixed

- **MCP Version Sync**: Updated MCP server version to match package.json

---

## [1.8.2] - 2026-01-09

### Fixed

- **MCP Tool Registration**: Fixed deprecation warning for `server.tool` by migrating to `releaseTool`
- **Documentation**: Added Best Practices and improved Folder Structure docs
- **Theme Standardization**: Improved consistency across all themes
- **Flags Documentation**: Verified and updated CLI flags documentation

## [1.7.2] - 2024-12-16

### Fixed

- **False Positives**: Significantly improved accuracy based on field QA validation
- **MULE-002**: Excluded `*-main` and APIKit auto-generated flow names
- **MULE-003/101**: Excluded APIKit flows from error handling and casing rules
- **MULE-201**: Allowed regular property placeholders (`${...}`) not just `${secure::...}`
- **MULE-008**: Allowed `raise-error` inside `until-successful` (valid retry pattern)
- **MULE-001**: Lowered severity to Warning to support modular error handling patterns
- **YAML-001**: Added `properties/` to environment file search paths
- **YAML-003**: Relaxed regex to allow hyphens in categories and underscores in properties

## [1.7.1] - 2024-12-16

### Fixed

- Corrected GitHub URL in HTML report header

---

## [1.7.0] - 2024-12-16

### Fixed

- **YAML-004 False Positives**: Updated sensitive key detection to use word-boundary matching
  - No longer flags `http.private.port`, `authorizationUrl`, or company names
  - Still correctly catches `password`, `secret`, `clientSecret`, `tokenSecret`, etc.

### Improved

- **Dashboard Charts**: Added subtitles to all chart sections for better context
- **Category Chart**: Each category now has a distinct color instead of uniform gray
- **Dynamic Version**: Report now displays actual package version instead of hardcoded value

---

## [1.6.0] - 2024-12-16

### Added

- **Modern HTML Report**: Completely rewritten interactive dashboard
  - Dashboard with summary cards and Chart.js charts (severity donut, top rules bar, categories bar)
  - Tabulator-based issues table with multiselect column filters
  - Frozen table header for better navigation
  - Full-width expandable layout
  - Global search and CSV export
  - Built with Tailwind CSS, Chart.js, and Tabulator

### Changed

- Updated README architecture diagram to include HTML formatter stack
- Enhanced HTML output documentation

---

## [1.4.0] - 2024-12-16

### Added

- **MULE-802 Fix**: Smart detection for standalone files (skips structure validation)
- **Developer Experience**: Added Prettier and EditorConfig support
- **Maintenance**: Updated dependencies

---

## [1.3.0] - 2024-12-16

### Added

#### New Features

- **YAML Properties Linting** - Lint MuleSoft YAML configuration files
- **Cyclomatic Complexity Analysis** - Detect complex flows that need refactoring

#### New Rules (4 rules, 29 total)

- **MULE-801**: Flow Complexity - Warns if flow complexity exceeds threshold
- **YAML-001**: Environment Files - Check for dev/qa/prod YAML files
- **YAML-003**: Property Naming - Keys should be `category.property` format
- **YAML-004**: Plaintext Secrets - Detect unencrypted sensitive values

#### New Dependencies

- `js-yaml` - YAML parsing for properties files

#### Core Utilities

- `YamlParser` - Parse and analyze YAML configuration files
- `ComplexityCalculator` - Calculate cyclomatic complexity for flows

---

## [1.2.0] - 2024-12-16

### Added

- MULE-402: HTTP Content-Type
- MULE-403: HTTP Timeout
- MULE-503: Large Choice Blocks
- MULE-604: Missing doc:name
- Comprehensive test fixtures

---

## [1.1.0] - 2024-12-16

### Added

- 11 extended rules for security, logging, naming, HTTP, performance
- New categories: HTTP, Documentation, Performance

---

## [1.0.0] - 2024-12-16

### Added

- Core MVP with 10 rules
- CLI with table, JSON, SARIF output
- XPath-based rule engine
