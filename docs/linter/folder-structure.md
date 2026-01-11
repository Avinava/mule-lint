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
│   │   ├── YamlParser.ts    # YAML parsing utilities
│   │   ├── FileScanner.ts   # File discovery with glob patterns
│   │   └── ComplexityCalculator.ts
│   ├── engine/              # Lint engine
│   │   ├── LintEngine.ts    # Main orchestrator
│   │   └── types.ts         # Engine-specific types
│   ├── rules/               # Rule implementations (56 rules)
│   │   ├── index.ts         # Rule registry/exports
│   │   ├── base/            # Base classes for rules
│   │   │   └── BaseRule.ts  # Abstract rule with utilities
│   │   ├── api-led/         # API-Led connectivity patterns
│   │   │   └── ApiLedRules.ts (API-001, 002, 003)
│   │   ├── complexity/      # Complexity analysis
│   │   │   └── FlowComplexityRule.ts (MULE-801)
│   │   ├── dataweave/       # DataWeave file validation
│   │   │   └── DataWeaveRules.ts (DW-001, 002, 003)
│   │   ├── documentation/   # Documentation requirements
│   │   │   ├── FlowDescriptionRule.ts (MULE-601)
│   │   │   └── MissingDocNameRule.ts (MULE-604)
│   │   ├── error-handling/  # Error handling rules
│   │   │   ├── GlobalErrorHandlerRule.ts (MULE-001)
│   │   │   ├── MissingErrorHandlerRule.ts (MULE-003)
│   │   │   ├── HttpStatusRule.ts (MULE-005)
│   │   │   ├── CorrelationIdRule.ts (MULE-007)
│   │   │   └── GenericErrorRule.ts (MULE-009)
│   │   ├── experimental/    # Beta rules
│   │   │   └── ExperimentalRules.ts (EXP-001, 002, 003)
│   │   ├── http/            # HTTP configuration
│   │   │   ├── HttpUserAgentRule.ts (MULE-401)
│   │   │   ├── HttpContentTypeRule.ts (MULE-402)
│   │   │   └── HttpTimeoutRule.ts (MULE-403)
│   │   ├── logging/         # Logging rules
│   │   │   ├── LoggerCategoryRule.ts (MULE-006)
│   │   │   ├── LoggerPayloadRule.ts (MULE-301)
│   │   │   └── LoggerInUntilSuccessfulRule.ts (MULE-303)
│   │   ├── naming/          # Naming conventions
│   │   │   ├── FlowNamingRule.ts (MULE-002)
│   │   │   ├── FlowCasingRule.ts (MULE-101)
│   │   │   └── VariableNamingRule.ts (MULE-102)
│   │   ├── performance/     # Performance anti-patterns
│   │   │   ├── ScatterGatherRoutesRule.ts (MULE-501)
│   │   │   ├── AsyncErrorHandlerRule.ts (MULE-502)
│   │   │   └── LargeChoiceBlockRule.ts (MULE-503)
│   │   ├── security/        # Security rules
│   │   │   ├── HardcodedHttpRule.ts (MULE-004)
│   │   │   ├── HardcodedCredentialsRule.ts (MULE-201)
│   │   │   └── InsecureTlsRule.ts (MULE-202)
│   │   ├── standards/       # Best practices
│   │   │   ├── ChoiceAntiPatternRule.ts (MULE-008)
│   │   │   ├── DwlStandardsRule.ts (MULE-010)
│   │   │   └── DeprecatedComponentRule.ts (MULE-701)
│   │   ├── structure/       # Project structure
│   │   │   └── StructureRules.ts (MULE-802, 803, 804)
│   │   └── yaml/            # YAML validation
│   │       └── YamlRules.ts (YAML-001, 003, 004)
│   ├── formatters/          # Output formatters
│   │   ├── index.ts         # Formatter factory
│   │   ├── TableFormatter.ts
│   │   ├── JsonFormatter.ts
│   │   ├── SarifFormatter.ts
│   │   └── HtmlFormatter.ts
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
│   │   ├── invalid/         # Invalid configurations
│   │   └── edge-cases/      # Edge case scenarios
│   ├── unit/                # Unit tests
│   │   ├── rules/           # Rule-specific tests
│   │   └── core/            # Core utility tests
│   ├── integration/         # Integration tests
│   └── setup.ts             # Test configuration
├── docs/                     # Documentation
│   ├── README.md            # Documentation index
│   ├── architecture.md      # System design
│   ├── folder-structure.md  # This file
│   ├── naming-conventions.md
│   ├── rule-engine.md       # Rule engine internals
│   ├── rules-catalog.md     # All rules documented
│   └── extending.md         # Custom rules guide
├── .mulelintrc.json         # Default configuration
├── package.json
├── tsconfig.json
├── jest.config.js
├── .eslintrc.js
├── .prettierrc
├── CHANGELOG.md
├── CONTRIBUTING.md
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
| `YamlParser.ts` | Parse YAML files, detect sensitive keys |
| `FileScanner.ts` | Discover `.xml` and `.yaml` files using glob patterns |
| `ComplexityCalculator.ts` | Calculate cyclomatic complexity of flows |

### `/src/rules`

**Purpose:** All validation rules, organized by category.

**Rule Families (56 total):**

| Family | Directory | Rules |
|--------|-----------|-------|
| API-Led | `api-led/` | API-001, 002, 003, 004, 005 |
| Complexity | `complexity/` | MULE-801 |
| DataWeave | `dataweave/` | DW-001, 002, 003, 004 |
| Documentation | `documentation/` | MULE-601, 604 |
| Error Handling | `error-handling/` | MULE-001, 003, 005, 007, 009, ERR-001 |
| Experimental | `experimental/` | EXP-001, 002, 003 |
| Governance | `governance/` | PROJ-001, 002 |
| HTTP | `http/` | MULE-401, 402, 403 |
| Logging | `logging/` | MULE-006, 301, 303, LOG-001, 004 |
| Naming | `naming/` | MULE-002, 101, 102 |
| Operations | `operations/` | RES-001, OPS-001, 002, 003, HYG-001, 002, 003, DOC-001, API-005 |
| Performance | `performance/` | MULE-501, 502, 503, PERF-002 |
| Security | `security/` | MULE-004, 201, 202, SEC-002, 003, 004, 006 |
| Standards | `standards/` | MULE-008, 010, 701 |
| Structure | `structure/` | MULE-802, 803, 804 |
| YAML | `yaml/` | YAML-001, 003, 004 |

**Convention:** Each rule file exports one or more classes implementing `Rule`.

### `/src/formatters`

**Purpose:** Transform `LintReport` to various output formats.

| Formatter | Use Case |
|-----------|----------|
| `TableFormatter.ts` | Human-readable CLI output |
| `JsonFormatter.ts` | Script/automation consumption |
| `SarifFormatter.ts` | AI agents and IDE integration |
| `HtmlFormatter.ts` | Standalone HTML reports |

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
| Multi-rule file | Feature + `Rules` suffix | `YamlRules.ts` |
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
