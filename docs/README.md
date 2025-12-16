# Mule-Lint Documentation

Welcome to the Mule-Lint documentation. This documentation is organized into two sections:

1. **MuleSoft Best Practices** - Development guidelines and patterns
2. **Linter Technical Documentation** - How mule-lint works internally

---

## MuleSoft Best Practices

Guidelines for building maintainable, secure, and performant Mule applications.

| Document | Description |
|----------|-------------|
| [Best Practices Guide](mulesoft-best-practices.md) | Comprehensive MuleSoft development best practices |
| [Rules Catalog](rules-catalog.md) | All 40 rules with examples and configuration |

### Quick Reference: Rule Categories

| Category | Focus Area |
|----------|------------|
| Error Handling | Global handlers, HTTP status, correlation IDs |
| Naming | Flow suffixes, variable casing, kebab-case |
| Security | No hardcoded secrets, encrypted properties |
| Logging | Categories, no payload logging, structured format |
| HTTP | Timeouts, headers, content types |
| Performance | Async error handling, choice limits, timeouts |
| Documentation | doc:name, flow descriptions |
| Structure | Project layout, file organization |
| API-Led | Experience/Process/System layer patterns |
| DataWeave | External DWL files, naming, modules |

---

## Linter Technical Documentation

For contributors and those extending mule-lint.

| Document | Description |
|----------|-------------|
| [Architecture](architecture.md) | System design, patterns, and data flow |
| [Rule Engine](rule-engine.md) | Rule engine internals and interfaces |
| [Extending](extending.md) | How to create custom rules |
| [Folder Structure](folder-structure.md) | Project organization |
| [Naming Conventions](naming-conventions.md) | Code style and naming standards |

---

## Quick Start

### Common Commands

```bash
# Scan with human-readable output
mule-lint ./src/main/mule

# Scan with JSON output
mule-lint ./src/main/mule -f json

# Scan with SARIF output for AI agents
mule-lint ./src/main/mule -f sarif

# Generate HTML report
mule-lint ./src/main/mule -f html -o report.html

# Use config file
mule-lint ./src/main/mule -c .mulelintrc.json

# CI/CD: fail on warnings
mule-lint ./src/main/mule --fail-on-warning
```

### Exit Codes

| Code | Meaning |
|------|---------|
| 0 | Success (no errors) |
| 1 | Errors found (or warnings with `--fail-on-warning`) |
| 2 | CLI error (invalid arguments) |
| 3 | Parse errors (malformed XML) |

---

## For AI Agents

This tool is designed to work with AI coding assistants. Use SARIF output format for structured results:

```bash
mule-lint ./src/main/mule -f sarif > report.sarif
```

The SARIF output follows the [SARIF 2.1.0 specification](https://sarifweb.azurewebsites.net/) and includes:
- Rule definitions with severity and category
- Precise file locations (line/column)
- Fix suggestions

---

## Rule Families

| Family | Prefix | Count | Description |
|--------|--------|-------|-------------|
| Core MuleSoft | MULE-XXX | 29 | Core Mule 4 XML validation |
| YAML Properties | YAML-XXX | 3 | YAML configuration validation |
| DataWeave | DW-XXX | 3 | DataWeave file validation |
| API-Led | API-XXX | 3 | API-Led connectivity patterns |
| Experimental | EXP-XXX | 3 | Beta rules for evaluation |

**Total: 40 rules**
