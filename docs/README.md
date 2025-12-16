# Mule-Lint Documentation

Welcome to the Mule-Lint documentation. This documentation is organized into two sections:

---

## 📘 MuleSoft Best Practices

Comprehensive guidelines for building maintainable, secure, and performant Mule applications. These guidelines cover more than just what the linter validates - they represent industry best practices for MuleSoft development.

| Document | Description |
|----------|-------------|
| [Best Practices Guide](best-practices/mulesoft-best-practices.md) | Complete MuleSoft development best practices |
| [Rules Catalog](best-practices/rules-catalog.md) | All 40 linter rules with examples |

---

## 🔧 Linter Technical Documentation

For contributors and those extending mule-lint.

| Document | Description |
|----------|-------------|
| [Architecture](linter/architecture.md) | System design, patterns, and data flow |
| [Rule Engine](linter/rule-engine.md) | Rule engine internals and interfaces |
| [Extending](linter/extending.md) | How to create custom rules |
| [Folder Structure](linter/folder-structure.md) | Project organization |
| [Naming Conventions](linter/naming-conventions.md) | Code style and naming standards |

---

## Quick Start

### Installation

```bash
npm install -g @sfdxy/mule-lint
```

### Common Commands

```bash
# Scan with human-readable output
mule-lint ./src/main/mule

# Scan with JSON output
mule-lint ./src/main/mule -f json

# Scan with SARIF output for AI agents/IDEs
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
| 1 | Errors found |
| 2 | CLI/Configuration error |
| 3 | Parse errors (malformed XML) |

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

---

## For AI Agents

Use SARIF output format for structured results:

```bash
mule-lint ./src/main/mule -f sarif > report.sarif
```

SARIF output follows the [SARIF 2.1.0 specification](https://sarifweb.azurewebsites.net/) with rule definitions, precise file locations, and fix suggestions.
