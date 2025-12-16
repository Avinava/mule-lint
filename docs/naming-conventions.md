# Naming Conventions

> **Scope:** This document covers naming conventions for the mule-lint codebase itself, not the MuleSoft rules being validated.

---

## File Naming

### Source Files

| Type | Convention | Example |
|------|------------|---------|
| Rule class | PascalCase + `Rule` suffix | `FlowNamingRule.ts` |
| Base class | PascalCase + `Base` prefix | `BaseRule.ts` |
| Utility/Helper | PascalCase + `Helper`/`Utils` | `XPathHelper.ts` |
| Type definitions | PascalCase, singular | `Issue.ts`, `Rule.ts` |
| Constants | PascalCase or SCREAMING_SNAKE | `Defaults.ts`, `NAMESPACES.ts` |
| Index/barrel files | Lowercase `index.ts` | `index.ts` |

### Test Files

| Convention | Example |
|------------|---------|
| Unit test | `{ClassName}.test.ts` | `FlowNamingRule.test.ts` |
| Integration test | `{feature}.integration.test.ts` | `engine.integration.test.ts` |
| Fixture | Descriptive kebab-case | `flow-with-error-handler.xml` |

### Configuration Files

| File | Purpose |
|------|---------|
| `.mulelintrc.json` | User configuration |
| `tsconfig.json` | TypeScript config |
| `jest.config.js` | Test config |
| `.eslintrc.js` | ESLint config |

---

## Code Naming

### Classes

```typescript
// ✅ Good - PascalCase, descriptive
class FlowNamingRule { }
class XPathHelper { }
class SarifFormatter { }

// ❌ Bad - unclear, wrong case
class flowrule { }
class Helper { }  // Too generic
class SARIF { }   // All caps
```

### Interfaces

```typescript
// ✅ Good - PascalCase, noun-based
interface Rule { }
interface ValidationContext { }
interface LintReport { }

// ❌ Bad - I-prefix (not TypeScript convention)
interface IRule { }
interface IRuleInterface { }
```

### Type Aliases

```typescript
// ✅ Good - PascalCase
type Severity = 'error' | 'warning' | 'info';
type RuleCategory = 'naming' | 'security';
type NodeArray = Node[];

// ❌ Bad
type severity = string;
type SEVERITY = string;
```

### Enums

```typescript
// ✅ Good - PascalCase enum, PascalCase members
enum ExitCode {
    Success = 0,
    Error = 1,
    ConfigError = 2,
    CriticalError = 3,
}

// ❌ Bad - SCREAMING_CASE members (C-style)
enum ExitCode {
    SUCCESS = 0,
    ERROR = 1,
}
```

### Constants

```typescript
// ✅ Good - SCREAMING_SNAKE for true constants
const DEFAULT_SEVERITY = 'warning';
const MULE_NAMESPACE = 'http://www.mulesoft.org/schema/mule/core';
const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024;

// ✅ Also acceptable - Object of related constants
const ExitCodes = {
    Success: 0,
    Error: 1,
} as const;

// ❌ Bad
const defaultseverity = 'warning';
const mule_namespace = '...';
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
function shouldSkip(file: string): boolean { }

// ❌ Bad - noun-based, unclear
function configuration(): Config { }
function document(): void { }
```

### Variables

```typescript
// ✅ Good - camelCase, descriptive
const filePath = '/path/to/file.xml';
const errorCount = 0;
const validationResults: Issue[] = [];

// ❌ Bad - single letters (except loops), abbreviations
const f = '/path/to/file.xml';
const ec = 0;
const valRes = [];
```

### Private Members

```typescript
class LintEngine {
    // ✅ Good - no underscore prefix (TypeScript convention)
    private rules: Rule[] = [];
    private config: Config;
    
    // ✅ Good - private methods same as public
    private loadRules(): void { }
    
    // ❌ Bad - underscore prefix (Python/JS legacy)
    private _rules: Rule[] = [];
}
```

---

## Rule Naming

### Rule IDs

| Format | Example | Description |
|--------|---------|-------------|
| `MULE-NNN` | `MULE-001` | Three-digit, zero-padded |

**ID Ranges:**

| Range | Category |
|-------|----------|
| 001-099 | Error Handling |
| 100-199 | Naming Conventions |
| 200-299 | Security |
| 300-399 | Logging |
| 400-499 | Performance |
| 500-599 | Documentation |
| 600-699 | Standards |
| 900-999 | Deprecated |

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
description = 'Flows must end with "-flow" for consistent identification and search';
description = 'Error handlers must set httpStatus variable for proper API responses';

// ❌ Bad - Just what, no why
description = 'Checks flow names';
description = 'Finds missing error handlers';
```

---

## Import Organization

Order imports as follows:

```typescript
// 1. Node.js built-ins
import * as fs from 'fs';
import * as path from 'path';

// 2. External dependencies
import { DOMParser, Document } from '@xmldom/xmldom';
import * as xpath from 'xpath';
import chalk from 'chalk';

// 3. Internal - types first
import { Rule, Issue, ValidationContext } from '@types';

// 4. Internal - utilities
import { XPathHelper } from '@core/XPathHelper';
import { FileScanner } from '@core/FileScanner';

// 5. Internal - local/relative
import { BaseRule } from './BaseRule';
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
| File (class) | PascalCase | `FlowNamingRule.ts` |
| File (test) | {Class}.test.ts | `FlowNamingRule.test.ts` |
| Class | PascalCase | `class FlowNamingRule` |
| Interface | PascalCase | `interface Rule` |
| Type | PascalCase | `type Severity` |
| Constant | SCREAMING_SNAKE | `const MAX_FILES` |
| Function | camelCase, verb | `validateDocument()` |
| Variable | camelCase | `const filePath` |
| Private member | camelCase (no prefix) | `private rules` |
| Rule ID | MULE-NNN | `MULE-001` |
