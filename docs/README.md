# Mule-Lint Documentation

Welcome to the Mule-Lint documentation. Use this guide to understand the tool's architecture, rules, and how to extend it.

## Documentation Index

### For Users

| Document | Description |
|----------|-------------|
| [Rules Catalog](rules-catalog.md) | Complete list of all available rules with examples |

### For Contributors

| Document | Description |
|----------|-------------|
| [Architecture](architecture.md) | System design, patterns, and data flow |
| [Extending](extending.md) | How to create custom rules |
| [Naming Conventions](naming-conventions.md) | Code style and naming standards |
| [Folder Structure](folder-structure.md) | Project organization |

### For AI Agents

This tool is designed to work with AI coding assistants. Use SARIF output format for structured results:

```bash
mule-lint ./src/main/mule -f sarif > report.sarif
```

The SARIF output follows the [SARIF 2.1.0 specification](https://sarifweb.azurewebsites.net/) and includes:
- Rule definitions with severity and category
- Precise file locations (line/column)
- Fix suggestions

## Quick Reference

### Common Commands

```bash
# Scan with human-readable output
mule-lint ./src/main/mule

# Scan with JSON output
mule-lint ./src/main/mule -f json

# Scan with SARIF output for AI agents
mule-lint ./src/main/mule -f sarif

# Use config file
mule-lint ./src/main/mule -c .mulelintrc.json

# CI/CD: fail on warnings
mule-lint ./src/main/mule --fail-on-warning
```

### Rule Categories

- **error-handling**: Error handler presence and configuration
- **naming**: Flow and sub-flow naming conventions
- **security**: Hardcoded values and security concerns
- **logging**: Logger configuration
- **standards**: Best practices and anti-patterns

### Exit Codes

| Code | Meaning |
|------|---------|
| 0 | Success (no errors) |
| 1 | Errors found (or warnings with `--fail-on-warning`) |
| 2 | CLI error (invalid arguments) |
| 3 | Parse errors (malformed XML) |
