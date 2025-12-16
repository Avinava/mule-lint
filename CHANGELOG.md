# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.2.0] - 2024-12-16

### Added

#### New Rules (4 rules, 25 total)
- **MULE-402**: HTTP Content-Type - POST/PUT should include Content-Type header
- **MULE-403**: HTTP Timeout - HTTP configs should have responseTimeout
- **MULE-503**: Large Choice Blocks - Choice blocks with >7 when clauses
- **MULE-604**: Missing doc:name - Key components should have doc:name

#### Improved Test Fixtures
- Added `comprehensive-bad.xml` with all anti-patterns for testing
- Updated `proper-flow.xml` with proper Mule 4 patterns

### Changed
- Extended rules index from 21 to 25 rules

---

## [1.1.0] - 2024-12-16

### Added

#### New Rules (11 rules)
- **MULE-101**: Flow Casing - Flow names should follow kebab-case
- **MULE-102**: Variable Naming - Variables should be camelCase
- **MULE-201**: Hardcoded Credentials - Passwords should use `${secure::}`
- **MULE-202**: Insecure TLS - TLS should not have insecure="true"
- **MULE-301**: Logger Payload - Don't log entire payload
- **MULE-303**: Logger in Until-Successful - Avoid loggers in retry loops
- **MULE-401**: HTTP User-Agent - Include User-Agent header
- **MULE-501**: Scatter-Gather Routes - Limit parallel routes
- **MULE-502**: Async Error Handler - Async needs error handling
- **MULE-601**: Flow Description - Flows should have doc:description
- **MULE-701**: Deprecated Components - Detect deprecated Mule elements

#### New Rule Categories
- **HTTP**: Rules for HTTP connector best practices
- **Documentation**: Rules for MuleSoft documentation standards
- **Performance**: Rules for performance anti-patterns

---

## [1.0.0] - 2024-12-16

### Added

#### Core Features
- **LintEngine**: Central orchestration for file scanning, parsing, and rule execution
- **XPathHelper**: Namespace-aware XPath queries with all MuleSoft namespaces
- **XmlParser**: DOM parsing with graceful error handling
- **FileScanner**: Glob-based file discovery

#### 10 MVP Rules
- **MULE-001**: Global Error Handler Exists
- **MULE-002**: Flow Naming Convention
- **MULE-003**: Missing Error Handler in Flows
- **MULE-004**: Hardcoded HTTP URLs
- **MULE-005**: HTTP Status in Error Handler
- **MULE-006**: Logger Category Required
- **MULE-007**: Correlation ID in Error Handler
- **MULE-008**: Choice Anti-Pattern
- **MULE-009**: Generic Error Type
- **MULE-010**: DWL Standards File

#### Output Formatters
- **Table**: Human-readable colorized console output
- **JSON**: Machine-readable for scripting
- **SARIF 2.1.0**: For VS Code, GitHub, and AI agent integration
