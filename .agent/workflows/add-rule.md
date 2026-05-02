---
description: How to add a new lint rule to mule-lint
---

# Adding a New Rule

Follow these steps to add a new lint rule to mule-lint.

## 1. Choose Rule ID and Category

### Rule ID Prefixes

| Prefix | Domain                       | Example    |
| ------ | ---------------------------- | ---------- |
| `MULE` | Core MuleSoft XML validation | `MULE-011` |
| `SEC`  | Security best practices      | `SEC-011`  |
| `ERR`  | Error handling patterns      | `ERR-005`  |
| `LOG`  | Structured logging           | `LOG-005`  |
| `HTTP` | HTTP configuration           | `HTTP-005` |
| `PERF` | Performance optimization     | `PERF-003` |
| `DW`   | DataWeave file validation    | `DW-006`   |
| `API`  | API-Led patterns             | `API-009`  |
| `HYG`  | Code hygiene                 | `HYG-006`  |
| `YAML` | YAML properties validation   | `YAML-005` |
| `PROJ` | Project governance           | `PROJ-003` |
| `DOC`  | Documentation requirements   | `DOC-002`  |
| `CFG`  | Configuration patterns       | `CFG-003`  |
| `STD`  | Coding standards             | `STD-002`  |
| `SF`   | Salesforce connector         | `SF-003`   |
| `EXP`  | Experimental rules           | `EXP-004`  |

For MULE-prefixed rules, see `docs/linter/naming-conventions.md` for range allocation (001-099=error-handling, 100-199=naming, 200-299=security, etc.).

### Categories

`error-handling`, `naming`, `security`, `logging`, `http`, `performance`, `documentation`, `standards`, `complexity`, `dataweave`, `structure`, `api-led`, `governance`, `operations`, `experimental`, `connector`

### BaseRule vs ProjectRule

- **BaseRule** — runs once per XML file. Use when validating elements within a single file (flows, loggers, connectors).
- **ProjectRule** — runs once per scan. Use when validating cross-file concerns (global error handler exists, DWL file naming, environment files).

## 2. Create the Rule File

Create a new TypeScript file in the appropriate category folder:

```bash
# Example: adding a logging rule
touch src/rules/logging/MyNewRule.ts
```

## 3. Implement the Rule

Use this template:

```typescript
import { ValidationContext, Issue } from '../../types';
import { BaseRule } from '../base/BaseRule';

/**
 * MULE-XXX: Rule Name
 *
 * Description of what this rule checks.
 */
export class MyNewRule extends BaseRule {
  id = 'MULE-XXX';
  name = 'My New Rule';
  description = 'What this rule enforces';
  severity = 'warning' as const; // 'error' | 'warning' | 'info'
  category = 'logging' as const;

  validate(doc: Document, context: ValidationContext): Issue[] {
    const issues: Issue[] = [];

    // XPath query to find elements
    const elements = this.select('//mule:logger', doc);

    for (const element of elements) {
      // Check your condition
      if (!this.hasAttribute(element, 'category')) {
        issues.push(
          this.createIssue(element, `Logger is missing category attribute`, {
            suggestion: 'Add a category attribute for log filtering',
          }),
        );
      }
    }

    return issues;
  }
}
```

## 4. Register the Rule

Add to `src/rules/index.ts`:

```typescript
// Add import
import { MyNewRule } from './logging/MyNewRule';

// Add export
export { MyNewRule } from './logging/MyNewRule';

// Add to ALL_RULES array
export const ALL_RULES: Rule[] = [
  // ... existing rules
  new MyNewRule(),
];
```

## 5. Write Unit Tests

Create `tests/unit/MyNewRule.test.ts`:

```typescript
import { MyNewRule } from '../../src/rules/logging/MyNewRule';
import { parseXml } from '../../src/core/XmlParser';
import { ValidationContext } from '../../src/types';

describe('MyNewRule', () => {
  const rule = new MyNewRule();

  const createContext = (): ValidationContext => ({
    filePath: 'test.xml',
    relativePath: 'test.xml',
    projectRoot: '/project',
    config: { enabled: true },
  });

  it('should pass for valid case', () => {
    const xml = `
            <mule xmlns="http://www.mulesoft.org/schema/mule/core">
                <flow name="test-flow">
                    <logger message="test" category="com.myorg"/>
                </flow>
            </mule>
        `;
    const result = parseXml(xml);
    const issues = rule.validate(result.document!, createContext());
    expect(issues).toHaveLength(0);
  });

  it('should fail for invalid case', () => {
    const xml = `
            <mule xmlns="http://www.mulesoft.org/schema/mule/core">
                <flow name="test-flow">
                    <logger message="test"/>
                </flow>
            </mule>
        `;
    const result = parseXml(xml);
    const issues = rule.validate(result.document!, createContext());
    expect(issues).toHaveLength(1);
    expect(issues[0].ruleId).toBe('MULE-XXX');
  });
});
```

## 6. Update Documentation

Add the rule to `docs/rules-catalog.md`:

```markdown
### MULE-XXX: My New Rule

**Severity**: Warning
**Category**: Logging

**Description**: What this rule enforces...

**Example (Bad)**:
\`\`\`xml

<!-- Missing category -->
<logger message="test"/>
\`\`\`

**Example (Good)**:
\`\`\`xml
<logger message="test" category="com.myorg.app"/>
\`\`\`
```

## 7. Build and Test

```bash
# Build
npm run build

# Run all tests
npm test

# Run specific test
npm test -- MyNewRule

# Lint
npm run lint
```

## 8. Test Manually

```bash
# Test against a real file
node dist/bin/mule-lint.js tests/fixtures/invalid/bad-naming.xml
```

## XPath Reference

Common XPath patterns for Mule XML:

| Pattern                         | Description               |
| ------------------------------- | ------------------------- |
| `//mule:flow`                   | All flows                 |
| `//mule:sub-flow`               | All sub-flows             |
| `//mule:logger`                 | All loggers               |
| `//mule:error-handler`          | All error handlers        |
| `//mule:http:request`           | All HTTP requests         |
| `//mule:flow[@name]`            | Flows with name attribute |
| `//mule:logger[not(@category)]` | Loggers without category  |

## BaseRule Utility Methods

| Method                                     | Description                   |
| ------------------------------------------ | ----------------------------- |
| `this.select(xpath, doc)`                  | Execute XPath, return nodes   |
| `this.selectFirst(xpath, doc)`             | Get first matching node       |
| `this.exists(xpath, doc)`                  | Check if any nodes match      |
| `this.count(xpath, doc)`                   | Count matching nodes          |
| `this.getAttribute(node, name)`            | Get attribute value           |
| `this.hasAttribute(node, name)`            | Check if attribute exists     |
| `this.getNameAttribute(node)`              | Get `name` attribute          |
| `this.getDocName(node)`                    | Get `doc:name` attribute      |
| `this.createIssue(node, message, options)` | Create issue with line number |
| `this.getOption(context, key, default)`    | Get config option             |
