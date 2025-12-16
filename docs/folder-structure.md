# Folder Structure

> **Rationale:** This structure follows Node.js/TypeScript best practices and ensures clear separation of concerns.

## Overview

```
mule-lint/
├── bin/                      # CLI entry points
│   └── mule-lint.ts         # Main CLI executable
├── src/                      # Source code
│   ├── core/                # Core utilities
│   │   ├── XmlParser.ts     # XML parsing with error handling
│   │   ├── XPathHelper.ts   # Namespace-aware XPath utilities
│   │   └── FileScanner.ts   # File discovery with glob patterns
│   ├── engine/              # Lint engine
│   │   ├── LintEngine.ts    # Main orchestrator
│   │   ├── RuleLoader.ts    # Dynamic rule loading
│   │   └── types.ts         # Engine-specific types
│   ├── rules/               # Rule implementations
│   │   ├── index.ts         # Rule registry/exports
│   │   ├── base/            # Base classes for rules
│   │   │   └── BaseRule.ts  # Abstract rule with utilities
│   │   ├── naming/          # Naming convention rules
│   │   │   ├── FlowNamingRule.ts
│   │   │   └── SubflowNamingRule.ts
│   │   ├── error-handling/  # Error handling rules
│   │   │   ├── GlobalErrorHandlerRule.ts
│   │   │   ├── MissingErrorHandlerRule.ts
│   │   │   ├── GenericErrorRule.ts
│   │   │   ├── HttpStatusRule.ts
│   │   │   └── CorrelationIdRule.ts
│   │   ├── security/        # Security rules
│   │   │   └── HardcodedHttpRule.ts
│   │   ├── logging/         # Logging rules
│   │   │   └── LoggerCategoryRule.ts
│   │   └── standards/       # Standards/best practices
│   │       ├── DwlStandardsRule.ts
│   │       └── ChoiceAntiPatternRule.ts
│   ├── formatters/          # Output formatters
│   │   ├── index.ts         # Formatter factory
│   │   ├── TableFormatter.ts
│   │   ├── JsonFormatter.ts
│   │   └── SarifFormatter.ts
│   ├── config/              # Configuration handling
│   │   ├── ConfigLoader.ts  # Load .mulelintrc.json
│   │   ├── defaults.ts      # Default configuration
│   │   └── schema.ts        # Config validation schema
│   └── types/               # Shared type definitions
│       ├── index.ts         # Re-exports
│       ├── Rule.ts          # Rule interface
│       ├── Issue.ts         # Issue/violation types
│       ├── Config.ts        # Configuration types
│       └── Report.ts        # Report types
├── tests/                    # Test suite
│   ├── fixtures/            # Test XML files
│   │   ├── valid/           # Valid Mule configurations
│   │   │   ├── proper-flow.xml
│   │   │   └── with-error-handler.xml
│   │   ├── invalid/         # Invalid configurations (should fail)
│   │   │   ├── bad-naming.xml
│   │   │   └── hardcoded-urls.xml
│   │   └── edge-cases/      # Edge case scenarios
│   │       └── empty-flow.xml
│   ├── unit/                # Unit tests
│   │   ├── rules/           # Rule-specific tests
│   │   └── core/            # Core utility tests
│   ├── integration/         # Integration tests
│   │   └── engine.test.ts
│   └── setup.ts             # Test configuration
├── docs/                     # Documentation
│   ├── architecture.md
│   ├── folder-structure.md
│   ├── naming-conventions.md
│   ├── rule-engine.md
│   ├── rules/               # Per-rule documentation
│   │   └── MULE-001.md
│   └── extending.md
├── examples/                 # Usage examples
│   ├── sample-project/      # Sample Mule project for testing
│   └── ci-integration/      # CI/CD integration examples
├── .mulelintrc.json         # Default configuration
├── package.json
├── tsconfig.json
├── jest.config.js
├── .eslintrc.js
├── .prettierrc
├── CHANGELOG.md
├── LICENSE
└── README.md
```

---

## Directory Details

### `/bin`

**Purpose:** CLI entry points that get installed globally via npm.

```json
// package.json
{
  "bin": {
    "mule-lint": "./dist/bin/mule-lint.js"
  }
}
```

### `/src/core`

**Purpose:** Low-level utilities that don't depend on business logic.

| File | Responsibility |
|------|----------------|
| `XmlParser.ts` | Parse XML string to DOM, handle errors gracefully |
| `XPathHelper.ts` | Namespace-aware XPath queries |
| `FileScanner.ts` | Discover `.xml` files using glob patterns |

### `/src/rules`

**Purpose:** All validation rules, organized by category.

**Categories:**
- `naming/` - Naming convention violations
- `error-handling/` - Error handler checks
- `security/` - Security concerns (hardcoded secrets, HTTP)
- `logging/` - Logging best practices
- `standards/` - General coding standards

**Convention:** Each rule file exports a single class implementing `Rule`.

### `/src/formatters`

**Purpose:** Transform `LintReport` to various output formats.

### `/src/config`

**Purpose:** Handle `.mulelintrc.json` loading and validation.

### `/tests/fixtures`

**Purpose:** Sample XML files for testing rules.

**Naming Convention:**
- Prefix with rule ID: `MULE-001-global-error-handler.xml`
- Or use descriptive names: `flow-with-missing-category.xml`

---

## Import Paths

Use TypeScript path aliases for clean imports:

```json
// tsconfig.json
{
  "compilerOptions": {
    "baseUrl": "./src",
    "paths": {
      "@core/*": ["core/*"],
      "@rules/*": ["rules/*"],
      "@formatters/*": ["formatters/*"],
      "@types/*": ["types/*"]
    }
  }
}
```

**Example Usage:**

```typescript
import { Rule } from '@types/Rule';
import { XPathHelper } from '@core/XPathHelper';
```

---

## File Naming

| Type | Convention | Example |
|------|------------|---------|
| Rule class | PascalCase + `Rule` suffix | `FlowNamingRule.ts` |
| Utility class | PascalCase | `XPathHelper.ts` |
| Type definition | PascalCase | `Issue.ts` |
| Test file | Match source + `.test.ts` | `FlowNamingRule.test.ts` |
| Config | lowercase with dots | `jest.config.js` |

---

## Distribution

After build, the `/dist` folder mirrors `/src`:

```
dist/
├── bin/
│   └── mule-lint.js
├── core/
├── engine/
├── rules/
├── formatters/
└── types/
```

Only `/dist` is published to npm (configured in `package.json` files array).
