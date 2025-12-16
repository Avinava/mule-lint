# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - 2024-12-16

### Added

#### Core Features
- **LintEngine**: Central orchestration for file scanning, parsing, and rule execution
- **XPathHelper**: Namespace-aware XPath queries with all MuleSoft namespaces pre-configured
- **XmlParser**: DOM parsing with graceful error handling
- **FileScanner**: Glob-based file discovery

#### 10 MVP Rules
- **MULE-001**: Global Error Handler Exists
- **MULE-002**: Flow Naming Convention (flows end with `-flow`, sub-flows with `-subflow`)
- **MULE-003**: Missing Error Handler in Flows
- **MULE-004**: Hardcoded HTTP URLs (use property placeholders)
- **MULE-005**: HTTP Status in Error Handler
- **MULE-006**: Logger Category Required
- **MULE-007**: Correlation ID in Error Handler
- **MULE-008**: Choice Anti-Pattern (avoid raise-error in otherwise)
- **MULE-009**: Generic Error Type (avoid type="ANY")
- **MULE-010**: DWL Standards File

#### Output Formatters
- **Table**: Human-readable colorized console output
- **JSON**: Machine-readable for scripting
- **SARIF 2.1.0**: For VS Code, GitHub, and AI agent integration

#### CLI
- Path arguments for files or directories
- `-f, --format`: Output format selection
- `-o, --output`: Write to file
- `-c, --config`: Custom config file
- `--fail-on-warning`: CI/CD mode
- `-q, --quiet`: Errors only

#### Configuration
- `.mulelintrc.json` configuration file support
- Per-rule configuration options
- Include/exclude patterns

#### Documentation
- Comprehensive README
- Rules catalog with examples
- Architecture documentation
- Contributing guide
- Agent workflows for adding rules and releasing

### Technical Details
- TypeScript 5.x with strict mode
- Jest for testing (25 tests)
- ESLint for code quality
- xmldom for XML parsing
- xpath for XPath queries
- commander for CLI
