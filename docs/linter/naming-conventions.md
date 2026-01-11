# Naming Conventions

> **Scope:** This document covers naming conventions for the mule-lint codebase and the MuleSoft projects being validated.

---

## Rule Naming

### Rule IDs

mule-lint uses multiple rule prefixes to organize rules by domain:

| Prefix | Format | Domain | Example |
|--------|--------|--------|---------|
| `MULE` | `MULE-NNN` | Core MuleSoft XML validation | `MULE-001` |
| `SEC` | `SEC-NNN` | Security best practices | `SEC-002` |
| `LOG` | `LOG-NNN` | Structured logging | `LOG-001` |
| `ERR` | `ERR-NNN` | Error handling best practices | `ERR-001` |
| `PERF` | `PERF-NNN` | Performance optimization | `PERF-002` |
| `OPS` | `OPS-NNN` | Operations/deployment | `OPS-001` |
| `RES` | `RES-NNN` | Resilience patterns | `RES-001` |
| `HYG` | `HYG-NNN` | Code hygiene | `HYG-001` |
| `DOC` | `DOC-NNN` | Documentation requirements | `DOC-001` |
| `PROJ` | `PROJ-NNN` | Project governance | `PROJ-001` |
| `YAML` | `YAML-NNN` | YAML properties validation | `YAML-001` |
| `DW` | `DW-NNN` | DataWeave file validation | `DW-001` |
| `API` | `API-NNN` | API-Led patterns | `API-001` |
| `EXP` | `EXP-NNN` | Experimental rules | `EXP-001` |

### MULE ID Ranges

| Range | Category | Description |
|-------|----------|-------------|
| 001-099 | Error Handling | Error handler configuration and patterns |
| 100-199 | Naming | Naming conventions for flows, variables |
| 200-299 | Security | Security vulnerabilities, hardcoded values |
| 300-399 | Logging | Logging standards and structured logging |
| 400-499 | HTTP | HTTP configuration and headers |
| 500-599 | Performance | Performance anti-patterns |
| 600-699 | Documentation | Documentation requirements |
| 700-799 | Standards | General coding standards |
| 800-899 | Complexity/Structure | Code complexity and project structure |

### Rule Names

```typescript
// ✅ Good - Concise, action-oriented
name = 'Flow Naming Convention';
name = 'Missing Error Handler';
name = 'Hardcoded HTTP URLs';

// ❌ Bad - Too long, passive
name = 'This rule checks if flow names follow the naming convention';
name = 'Error handler is missing from flow';
```

### Rule Descriptions

```typescript
// ✅ Good - What + Why
description = 'Flows must end with "-flow" for consistent identification';
description = 'Error handlers must set httpStatus for proper API responses';

// ❌ Bad - Just what, no why
description = 'Checks flow names';
description = 'Finds missing error handlers';
```

---

## Source File Naming

### Source Files

| Type | Convention | Example |
|------|------------|---------|
| Rule class | PascalCase + `Rule` suffix | `FlowNamingRule.ts` |
| Multi-rule file | Feature + `Rules` suffix | `YamlRules.ts`, `ApiLedRules.ts` |
| Base class | PascalCase + `Base` prefix | `BaseRule.ts` |
| Utility/Helper | PascalCase + `Helper`/`Utils` | `XPathHelper.ts` |
| Type definitions | PascalCase, singular | `Issue.ts`, `Rule.ts` |
| Constants | PascalCase or SCREAMING_SNAKE | `Defaults.ts` |
| Index/barrel files | Lowercase `index.ts` | `index.ts` |

### Test Files

| Convention | Example |
|------------|---------|
| Unit test | `{ClassName}.test.ts` | `FlowNamingRule.test.ts` |
| Integration test | `{feature}.integration.test.ts` | `engine.integration.test.ts` |
| Fixture | Descriptive kebab-case | `flow-with-error-handler.xml` |

---

## Code Naming

### Classes

```typescript
// ✅ Good - PascalCase, descriptive
class FlowNamingRule { }
class XPathHelper { }
class SarifFormatter { }

// ❌ Bad
class flowrule { }
class Helper { }  // Too generic
```

### Interfaces

```typescript
// ✅ Good - PascalCase, noun-based
interface Rule { }
interface ValidationContext { }
interface LintReport { }

// ❌ Bad - I-prefix (not TypeScript convention)
interface IRule { }
```

### Type Aliases

```typescript
// ✅ Good - PascalCase
type Severity = 'error' | 'warning' | 'info';
type RuleCategory = 'naming' | 'security';

// ❌ Bad
type severity = string;
```

### Constants

```typescript
// ✅ Good - SCREAMING_SNAKE for true constants
const DEFAULT_SEVERITY = 'warning';
const MULE_NAMESPACE = 'http://www.mulesoft.org/schema/mule/core';

// ✅ Also acceptable - Object of related constants
const ExitCodes = {
    Success: 0,
    Error: 1,
} as const;
```

### Functions & Methods

```typescript
// ✅ Good - camelCase, verb-based
function validateDocument(doc: Document): Issue[] { }
function getLineNumber(node: Node): number { }
function loadConfiguration(): Config { }

// ✅ Good - boolean getters with is/has/should prefix
function isEnabled(rule: Rule): boolean { }
function hasErrorHandler(flow: Node): boolean { }
```

### Variables

```typescript
// ✅ Good - camelCase, descriptive
const filePath = '/path/to/file.xml';
const errorCount = 0;
const validationResults: Issue[] = [];

// ❌ Bad - single letters, abbreviations
const f = '/path/to/file.xml';
const ec = 0;
```

---

## MuleSoft Project Naming (Validated by Rules)

These are the conventions that mule-lint rules enforce:

### Flow Names (MULE-002, MULE-101)

```xml
<!-- ✅ Good - kebab-case with suffix -->
<flow name="process-order-flow">
<sub-flow name="validate-input-subflow">

<!-- ❌ Bad - no suffix, wrong casing -->
<flow name="processOrder">
<sub-flow name="ValidateInput">
```

### Variable Names (MULE-102)

```xml
<!-- ✅ Good - camelCase -->
<set-variable variableName="orderId" />
<set-variable variableName="customerData" />

<!-- ❌ Bad -->
<set-variable variableName="order_id" />
<set-variable variableName="OrderId" />
```

### YAML Properties (YAML-003)

```yaml
# ✅ Good - category.property format
db.host: localhost
api.timeout: 30000
http.request.port: 8081

# ❌ Bad
DBHOST: localhost
ApiTimeout: 30000
DB_HOST: localhost
```

### DataWeave Files (DW-002)

```
# ✅ Good - kebab-case
transform-order.dwl
validate-input.dwl
common-utils.dwl

# ❌ Bad
transformOrder.dwl
ValidateInput.dwl
COMMON_UTILS.dwl
```

### Connector Configs (EXP-002)

```xml
<!-- ✅ Good - PascalCase with underscores -->
<http:request-config name="HTTP_Request_Config" />
<db:config name="Database_Config" />

<!-- ❌ Bad -->
<http:request-config name="httpConfig" />
<db:config name="db-config" />
```

---

## Documentation Naming

### Files

| Type | Convention | Example |
|------|------------|---------|
| Main docs | lowercase-kebab | `rule-engine.md` |
| Rule docs | Rule ID | `MULE-001.md` |
| Guides | lowercase-kebab | `getting-started.md` |

### Sections

Use sentence case for headers:

```markdown
# Getting started
## How to install
### Running in CI/CD
```

---

## Git Conventions

### Branch Names

```
feature/MULE-001-flow-naming-rule
fix/sarif-output-line-numbers
docs/update-readme
chore/upgrade-dependencies
```

### Commit Messages

Follow Conventional Commits:

```
feat(rules): add MULE-011 API versioning rule
fix(parser): handle malformed XML gracefully
docs: update rule engine documentation
test: add integration tests for SARIF output
chore: upgrade xmldom to 0.9.0
```

---

## Summary Table

| Entity | Convention | Example |
|--------|------------|---------|
| File (rule class) | PascalCase + Rule | `FlowNamingRule.ts` |
| File (multi-rule) | Feature + Rules | `YamlRules.ts` |
| File (test) | {Class}.test.ts | `FlowNamingRule.test.ts` |
| Class | PascalCase | `class FlowNamingRule` |
| Interface | PascalCase | `interface Rule` |
| Type | PascalCase | `type Severity` |
| Constant | SCREAMING_SNAKE | `const MAX_FILES` |
| Function | camelCase, verb | `validateDocument()` |
| Variable | camelCase | `const filePath` |
| Rule ID (MULE) | MULE-NNN | `MULE-001` |
| Rule ID (YAML) | YAML-NNN | `YAML-001` |
| Rule ID (DW) | DW-NNN | `DW-001` |
| Rule ID (API) | API-NNN | `API-001` |
| Rule ID (EXP) | EXP-NNN | `EXP-001` |
