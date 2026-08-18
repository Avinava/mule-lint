# Extending Mule-Lint

Mule-Lint can be extended through its library API. Custom rules must be registered with a
`LintEngine` instance; configuration entries alone do not load executable modules.

## Create a Per-File Rule

Extend `BaseRule` when a rule can decide from one parsed Mule XML document:

```typescript
import { ALL_RULES, BaseRule, Issue, LintEngine, ValidationContext } from '@sfdxy/mule-lint';

export class RequiredCategoryRule extends BaseRule {
  readonly id = 'ACME-001';
  readonly name = 'Required logger category';
  readonly description = 'Requires every logger to declare a category';
  readonly severity = 'warning' as const;
  readonly category = 'logging' as const;

  validate(doc: Document, context: ValidationContext): Issue[] {
    return this.select('//mule:logger[not(@category)]', doc).map((logger) =>
      this.createIssue(logger, 'Logger is missing a category', {
        filePath: context.filePath,
        suggestion: 'Add a stable application-specific category.',
      }),
    );
  }
}

const engine = new LintEngine({
  rules: [...ALL_RULES, new RequiredCategoryRule()],
});

const report = await engine.scan('./my-mule-project');
```

`this.select()` uses the namespace-aware XPath helper. `this.createIssue()` supplies the rule
metadata and source location. Rule-specific options are available with
`this.getOption(context, key, fallback)`.

## Create a Project Rule

Extend `ProjectRule` when validation needs several files, non-XML assets, or project structure:

```typescript
import { Issue, ProjectRule, ValidationContext } from '@sfdxy/mule-lint';

export class OrganizationLayoutRule extends ProjectRule {
  readonly id = 'ACME-002';
  readonly name = 'Organization layout';
  readonly description = 'Checks organization-specific project layout';
  readonly severity = 'warning' as const;
  readonly category = 'structure' as const;

  protected validateProject(context: ValidationContext): Issue[] {
    if (context.files.some((file) => file.relativePath === 'pom.xml')) return [];

    return [
      this.createProjectIssue('Project is missing pom.xml', {
        suggestion: 'Add the Maven project descriptor at the repository root.',
      }),
    ];
  }
}
```

The engine invokes project validation once per scan. A hybrid rule may extend `BaseRule`, implement
normal `validate()` logic, and also provide `runProject(context)` for a cross-file phase.

## Configure a Registered Rule

Once registered, a rule can be disabled, have its severity changed, or receive options:

```typescript
const engine = new LintEngine({
  rules: [...ALL_RULES, new RequiredCategoryRule()],
  config: {
    rules: {
      'ACME-001': {
        enabled: true,
        severity: 'error',
        options: { requiredPrefix: 'com.acme' },
      },
    },
  },
});
```

The CLI configuration supports `extends`, `rules`, `include`, `exclude`, `defaultFormatter`,
`failOnWarning`, and `qualityGate`. `extends` selects one built-in rule profile; explicit per-rule
configuration still wins. The CLI does not dynamically import custom rule files. The reserved keys
`customRulesPath` and `maxIssues` currently warn and have no runtime effect.

## Test the Rule

Tests should cover both valid and invalid input and assert the rule ID, message, severity, and useful
location data. For a per-file rule, parse an XML string and call `validate()`. For project behavior,
prefer an engine scan over a fixture directory so the lifecycle and shared context are exercised.

Before publishing or contributing an extension, run:

```bash
npm run check
```

For built-in rules, also export the class, add exactly one instance to `ALL_RULES`, document it in
the [rules catalog](../best-practices/rules-catalog.md), and add focused regression tests.
