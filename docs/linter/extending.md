# Extending mule-lint

> A guide for adding custom rules to mule-lint

---

## Overview

mule-lint is designed to be easily extensible. You can add new rules by:

1. **Built-in rules**: Adding to the core package (for contributors)
2. **External rules**: Creating a separate npm package
3. **Local rules**: Adding project-specific rules via configuration

---

## Creating a New Rule

### Step 1: Create Rule File

Create a new file in the appropriate category folder:

```bash
# For a naming rule
touch src/rules/naming/ApiNamingRule.ts

# For a security rule
touch src/rules/security/ApiKeyExposureRule.ts
```

### Step 2: Implement the Rule

```typescript
import { Document, Node } from '@xmldom/xmldom';
import { BaseRule, Issue, ValidationContext, Severity, RuleCategory } from '@types';

export class ApiNamingRule extends BaseRule {
    // Required properties
    id = 'MULE-103';
    name = 'API Naming Convention';
    description = 'API implementation flows should follow the pattern: {api-name}-{version}-{operation}';
    severity: Severity = 'warning';
    category: RuleCategory = 'naming';
    
    // Optional: Link to documentation
    docsUrl = 'https://your-wiki/mule-standards#api-naming';
    
    validate(doc: Document, context: ValidationContext): Issue[] {
        const issues: Issue[] = [];
        
        // Your XPath query
        const flows = this.select('//mule:flow', doc);
        
        // Pattern for API flows
        const apiPattern = /^[\w-]+-v\d+-(?:get|post|put|delete|patch)-[\w-]+$/;
        
        for (const flow of flows) {
            const name = this.getAttribute(flow, 'name');
            
            // Only check flows that look like API implementations
            if (name && name.includes('-api') && !apiPattern.test(name)) {
                issues.push(this.createIssue(
                    flow,
                    `API flow "${name}" doesn't follow naming convention: {api-name}-v{N}-{method}-{resource}`,
                    {
                        suggestion: 'Example: orders-api-v1-get-order-by-id'
                    }
                ));
            }
        }
        
        return issues;
    }
}
```

### Step 3: Register the Rule

Add to `src/rules/index.ts`:

```typescript
import { ApiNamingRule } from './naming/ApiNamingRule';

export const RULES: Rule[] = [
    // ... existing rules
    new ApiNamingRule(),
];
```

### Step 4: Write Tests

Create `tests/unit/rules/ApiNamingRule.test.ts`:

```typescript
import { ApiNamingRule } from '../../../src/rules/naming/ApiNamingRule';
import { parseXml } from '../../../src/core/XmlParser';
import { createMockContext } from '../../helpers';

describe('ApiNamingRule', () => {
    const rule = new ApiNamingRule();
    const context = createMockContext('api.xml');
    
    it('should pass for correctly named API flow', () => {
        const xml = `
            <mule xmlns="http://www.mulesoft.org/schema/mule/core">
                <flow name="orders-api-v1-get-order-by-id">
                    <logger message="test"/>
                </flow>
            </mule>
        `;
        const doc = parseXml(xml);
        const issues = rule.validate(doc, context);
        
        expect(issues).toHaveLength(0);
    });
    
    it('should fail for incorrectly named API flow', () => {
        const xml = `
            <mule xmlns="http://www.mulesoft.org/schema/mule/core">
                <flow name="orders-api-getOrders">
                    <logger message="test"/>
                </flow>
            </mule>
        `;
        const doc = parseXml(xml);
        const issues = rule.validate(doc, context);
        
        expect(issues).toHaveLength(1);
        expect(issues[0].ruleId).toBe('MULE-103');
    });
    
    it('should ignore non-API flows', () => {
        const xml = `
            <mule xmlns="http://www.mulesoft.org/schema/mule/core">
                <flow name="utility-flow">
                    <logger message="test"/>
                </flow>
            </mule>
        `;
        const doc = parseXml(xml);
        const issues = rule.validate(doc, context);
        
        expect(issues).toHaveLength(0);
    });
});
```

### Step 5: Document the Rule

Create `docs/rules/MULE-103.md`:

```markdown
# MULE-103: API Naming Convention

## Overview
| Property | Value |
|----------|-------|
| **ID** | MULE-103 |
| **Severity** | Warning |
| **Category** | Naming |
| **Fixable** | No |

## Description
API implementation flows should follow a consistent naming pattern that includes the API name, version, HTTP method, and resource.

## Pattern
```
{api-name}-v{version}-{method}-{resource}
```

## Examples

### ❌ Bad
```xml
<flow name="orders-api-getOrders">
<flow name="OrdersGetFlow">
<flow name="get-orders">
```

### ✅ Good
```xml
<flow name="orders-api-v1-get-orders">
<flow name="orders-api-v1-post-order">
<flow name="orders-api-v1-get-order-by-id">
```

## Configuration
```json
{
  "MULE-103": {
    "enabled": true,
    "options": {
      "pattern": "^[\\w-]+-v\\d+-(?:get|post|put|delete|patch)-[\\w-]+$"
    }
  }
}
```

## Related Rules
- MULE-002: Flow Naming Convention
- MULE-101: Flow Name Casing
```

---

## Creating External Rule Packages

For organization-specific rules, create a separate npm package:

### Package Structure

```
mule-lint-rules-acme/
├── src/
│   ├── rules/
│   │   ├── AcmeLoggingRule.ts
│   │   └── AcmeSecurityRule.ts
│   └── index.ts
├── package.json
└── tsconfig.json
```

### package.json

```json
{
  "name": "@acme/mule-lint-rules",
  "version": "1.0.0",
  "main": "dist/index.js",
  "types": "dist/index.d.ts",
  "peerDependencies": {
    "mule-lint": "^1.0.0"
  },
  "keywords": ["mule-lint", "mule-lint-rules"]
}
```

### Export Rules

```typescript
// src/index.ts
import { Rule } from 'mule-lint';
import { AcmeLoggingRule } from './rules/AcmeLoggingRule';
import { AcmeSecurityRule } from './rules/AcmeSecurityRule';

export const rules: Rule[] = [
    new AcmeLoggingRule(),
    new AcmeSecurityRule(),
];

// Named exports for individual rules
export { AcmeLoggingRule, AcmeSecurityRule };
```

### Configure mule-lint

```json
// .mulelintrc.json
{
  "extends": ["@acme/mule-lint-rules"],
  "rules": {
    "ACME-001": { "enabled": true },
    "ACME-002": { "enabled": true, "severity": "error" }
  }
}
```

---

## Local/Project-Specific Rules

For one-off project rules without creating a package:

### Configuration

```json
// .mulelintrc.json
{
  "customRulesPath": "./lint-rules",
  "rules": {
    "PROJECT-001": { "enabled": true }
  }
}
```

### Local Rule File

```typescript
// lint-rules/ProjectSpecificRule.ts
import { BaseRule, Issue, ValidationContext } from 'mule-lint';
import { Document } from '@xmldom/xmldom';

export class ProjectSpecificRule extends BaseRule {
    id = 'PROJECT-001';
    name = 'Project Specific Check';
    description = 'Custom check for this project';
    severity = 'warning' as const;
    category = 'standards' as const;
    
    validate(doc: Document, context: ValidationContext): Issue[] {
        // Your custom logic
        return [];
    }
}
```

---

## Rule Best Practices

### 1. Be Specific with XPath

```typescript
// ❌ Too broad - may have false positives
const nodes = this.select('//*[@url]', doc);

// ✅ Specific - targets only http:request
const nodes = this.select('//http:request[@url]', doc);
```

### 2. Provide Actionable Messages

```typescript
// ❌ Vague
message: 'Naming violation detected'

// ✅ Specific and actionable
message: `Flow "${name}" should end with "-flow". Rename to "${name}-flow"`
```

### 3. Include Suggestions

```typescript
issues.push(this.createIssue(node, message, {
    suggestion: 'Add category attribute: category="com.acme.integration"'
}));
```

### 4. Support Configuration

```typescript
validate(doc: Document, context: ValidationContext): Issue[] {
    // Read from rule config
    const suffix = context.config.options?.flowSuffix ?? '-flow';
    
    // Use in validation
    if (!name.endsWith(suffix)) {
        // ...
    }
}
```

### 5. Handle Edge Cases

```typescript
validate(doc: Document, context: ValidationContext): Issue[] {
    const flows = this.select('//mule:flow', doc);
    
    for (const flow of flows) {
        const name = this.getAttribute(flow, 'name');
        
        // Guard against missing attributes
        if (!name) continue;
        
        // Skip excluded patterns
        if (this.isExcluded(name, context)) continue;
        
        // Actual validation
        // ...
    }
}
```

---

## VS Code Extension Integration

When building a VS Code extension, import rules directly:

```typescript
import { LintEngine, RULES, Rule, Issue } from 'mule-lint';

class MuleLintDiagnosticProvider {
    private engine: LintEngine;
    
    constructor() {
        this.engine = new LintEngine({
            rules: RULES,
            // Or filter rules
            // rules: RULES.filter(r => r.severity === 'error')
        });
    }
    
    async provideDiagnostics(document: vscode.TextDocument): Promise<vscode.Diagnostic[]> {
        const issues = await this.engine.scanContent(
            document.getText(),
            document.uri.fsPath
        );
        
        return issues.map(issue => this.toDiagnostic(issue));
    }
    
    private toDiagnostic(issue: Issue): vscode.Diagnostic {
        return new vscode.Diagnostic(
            new vscode.Range(issue.line - 1, 0, issue.line - 1, 100),
            `[${issue.ruleId}] ${issue.message}`,
            this.toSeverity(issue.severity)
        );
    }
}
```

---

## Contributing Rules Upstream

To contribute rules to the core mule-lint package:

1. Fork the repository
2. Create a feature branch: `feature/MULE-XXX-rule-name`
3. Implement the rule following this guide
4. Write comprehensive tests
5. Document the rule
6. Submit a Pull Request

See [CONTRIBUTING.md](../CONTRIBUTING.md) for detailed guidelines.
