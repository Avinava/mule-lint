# Changelog

All notable changes to this project will be documented in this file.

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
- **CLI Scan**: Verified on real MuleSoft project (private-client-external-sapi)
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
