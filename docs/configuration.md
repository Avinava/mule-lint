# Configuration

You do not need a config file for the first scan. Add one when the team has reviewed the `recommended` profile and wants shared exceptions or a custom quality gate.

## Load the file explicitly

```bash
mule-lint . --config .mulelintrc.json
```

mule-lint does not search for `.mulelintrc.json` automatically. A file in the project root has no effect until `--config` or `-c` names it.

## A practical starting config

```json
{
  "extends": "mule-lint:recommended",
  "rules": {
    "MULE-002": {
      "enabled": true,
      "options": {
        "flowSuffix": "-flow",
        "subflowSuffix": "-subflow",
        "excludePatterns": ["*-api-main"]
      }
    },
    "MULE-006": {
      "severity": "info",
      "options": { "requiredPrefix": "com.example" }
    }
  },
  "include": ["src/main/mule/**/*.xml"],
  "exclude": ["**/*.munit.xml"],
  "defaultFormatter": "table",
  "failOnWarning": false
}
```

## Supported keys

| Key                | What it controls                                                                  |
| ------------------ | --------------------------------------------------------------------------------- |
| `extends`          | One profile: `mule-lint:baseline`, `mule-lint:recommended`, or `mule-lint:strict` |
| `rules`            | Per-rule `enabled`, `severity`, and rule-specific `options`                       |
| `include`          | File globs to include                                                             |
| `exclude`          | File globs to skip                                                                |
| `defaultFormatter` | Format used when `--format` is absent                                             |
| `failOnWarning`    | Whether warnings exit non-zero                                                    |
| `qualityGate`      | Conditions used with `--quality-gate config`                                      |
| `customRulesPath`  | YAML file of custom XPath rules — see [Custom XPath rules](#custom-xpath-rules)   |

Unknown keys produce a warning and are ignored. Treat that warning as a configuration defect: a misspelled setting did not take effect.

`maxIssues` is accepted for backward compatibility but has no runtime effect and produces a warning.

## Custom XPath rules

`customRulesPath` points at a YAML file of rules defined declaratively, for checks specific to your
organization that do not warrant writing TypeScript. The path resolves **relative to the
configuration file**, not the working directory.

```json
{
  "customRulesPath": ".mule-lint/custom-rules.yaml"
}
```

```yaml
namespaces:
  acme: https://schemas.example.com/mule/acme
rules:
  - id: ACME-001
    name: Standard flow error handler
    description: Organization flows must declare an error handler.
    category: error-handling
    severity: warning
    xpath: //mule:flow[not(mule:error-handler)]
    message: 'Flow "{name}" does not declare an error handler.'
    suggestion: Add an error-handler or an approved global error-handler reference.
```

`id`, `name`, `description`, `category`, `severity`, `xpath` and `message` are required;
`suggestion` is optional. `category` must be one of the runtime categories, and `id` must look like
`ACME-001` — an organization prefix keeps custom identifiers clear of the built-ins.

Message placeholders are limited to `{name}`, `{nodeName}`, `{filePath}` and `{line}`. Anything else
is left literal.

Every namespace the linter registers is available automatically. The optional `namespaces` block
adds prefixes; redefining a built-in prefix is an error, so a custom file cannot change how built-in
rules resolve theirs.

A custom rule is an XPath expression and a message — nothing executable. Only local files are read:
URLs are rejected, no module is imported, and no environment variable is interpolated. Expressions
compile when the configuration loads, so a bad expression or an unbound prefix fails the run with
exit code `2` rather than silently matching nothing.

Custom findings appear in every output format and honour `enabled` and `severity` overrides. They
are excluded from quality-rating denominators, because their issue types are author-declared rather
than modelled.

Library consumers can load the same file directly:

```typescript
import { LintEngine, ALL_RULES, loadCustomXPathRules } from '@sfdxy/mule-lint';

const customRules = loadCustomXPathRules('./custom-rules.yaml');
const engine = new LintEngine({ rules: [...ALL_RULES, ...customRules] });
```

## Override one rule

```json
{
  "extends": "mule-lint:recommended",
  "rules": {
    "MULE-006": { "severity": "info" },
    "SEC-003": { "enabled": false }
  }
}
```

Use a narrow exception and leave a code-review note explaining why it is appropriate. Prefer changing a finding to `info` over disabling it; the team can still see and revisit it.

Rule-specific options are listed in the [rules catalog](best-practices/rules-catalog.md).

## Which setting wins?

In practical terms:

1. explicit settings for a rule are most specific;
2. command-line flags override the corresponding config choice for that run;
3. the config’s `extends` profile supplies rule membership;
4. built-in defaults fill anything not configured.

For example, `--profile strict` replaces the config’s selected profile for one run, while an explicit `MULE-006` entry still tunes that rule.

## Configuration is not a gate

A profile/config decides what runs and at what severity. A quality gate decides whether the result passes. See [profiles](profiles.md) and [quality gates](quality-gates.md) before enabling CI enforcement.
