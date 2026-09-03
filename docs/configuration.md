# Configuration

Configuration is optional. Without it every registered rule runs at its declared severity, which is a
reasonable default for a first scan.

```bash
mule-lint ./src/main/mule -c .mulelintrc.json
```

**Pass the file explicitly.** The CLI does not search for `.mulelintrc.json` implicitly, so a config
sitting in the project root has no effect until `-c` names it. This surprises people, and it is
deliberate: a scan should do the same thing wherever it is invoked from.

## Example

```json
{
  "rules": {
    "MULE-001": { "enabled": true },
    "MULE-002": {
      "enabled": true,
      "options": {
        "flowSuffix": "-flow",
        "subflowSuffix": "-subflow",
        "excludePatterns": ["*-api-main"]
      }
    },
    "MULE-006": {
      "enabled": true,
      "severity": "error",
      "options": {
        "requiredPrefix": "com.myorg"
      }
    }
  },
  "include": ["src/main/mule/**/*.xml"],
  "exclude": ["**/test/**", "**/*.munit.xml"],
  "defaultFormatter": "table",
  "failOnWarning": false
}
```

## Supported keys

| Key                | Effect                                                                              |
| ------------------ | ----------------------------------------------------------------------------------- |
| `rules`            | Per-rule `enabled`, `severity`, and rule-specific `options`                         |
| `include`          | Glob patterns to scan                                                               |
| `exclude`          | Glob patterns to skip, such as MUnit tests                                          |
| `defaultFormatter` | Format used when `-f` is absent                                                     |
| `failOnWarning`    | Treat warnings as failures                                                          |
| `qualityGate`      | Custom gate conditions — see [Quality gates](quality-gates.md#custom-gates)         |
| `customRulesPath`  | Path to a YAML file of custom XPath rules — see [Custom rules](#custom-xpath-rules) |

An unknown key is reported as a warning on stderr and then ignored. A malformed value — a bad
severity, an unknown formatter — is a validation error and exits with code `2`.

Two keys are accepted for backward compatibility but have no runtime effect, and warn when used:
`extends` and `maxIssues`.

## Custom XPath rules

`customRulesPath` points at a YAML file of rules defined declaratively. The path is resolved
**relative to the configuration file**, not the working directory.

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

`id`, `name`, `description`, `category`, `severity`, `xpath`, and `message` are required;
`suggestion` is optional. `category` must be one of the runtime categories, and `id` must match
`ACME-001` in shape — an organization prefix keeps custom identifiers clear of the built-ins.

Message placeholders are limited to `{name}`, `{nodeName}`, `{filePath}`, and `{line}`. Anything
else is left literal.

Every namespace registered by the linter is available automatically. The optional `namespaces` block
adds prefixes; redefining a built-in prefix is an error, so a custom file can never change how
built-in rules resolve theirs.

A custom rule is an XPath expression and a message — nothing executable. Only local files are read:
URLs are rejected, no module is imported, no environment variable is interpolated. Expressions are
compiled when the configuration loads, so a bad expression or an unbound prefix fails the run with
exit code `2` rather than silently matching nothing.

Custom findings appear in every output format and honour `enabled` and `severity` overrides. They are
excluded from quality-rating denominators, because their issue types are author-declared rather than
modelled.

Library consumers can load the same file directly:

```typescript
import { LintEngine, ALL_RULES, loadCustomXPathRules } from '@sfdxy/mule-lint';

const customRules = loadCustomXPathRules('./custom-rules.yaml');
const engine = new LintEngine({ rules: [...ALL_RULES, ...customRules] });
```

## Precedence

| Priority | Source                                                     |
| -------- | ---------------------------------------------------------- |
| 1        | An explicit `-c` file                                      |
| 2        | Command-line flags such as `-f`, `-q`, `--fail-on-warning` |
| 3        | `defaultFormatter` and `failOnWarning` from the config     |
| 4        | Built-in rule defaults                                     |

A flag beats the config for the same setting, so `-f table` overrides `defaultFormatter` for one run
without editing anything.

## Per-rule options

Options are rule-specific and documented per rule in the
[rules catalog](best-practices/rules-catalog.md). Two common shapes:

```json
{
  "rules": {
    "MULE-002": { "options": { "flowSuffix": "-flow", "excludePatterns": ["*-api-main"] } },
    "MULE-102": { "options": { "convention": "camelCase" } }
  }
}
```

`excludePatterns` is the right tool for generated or framework-imposed names — an APIKit main flow will
never match your naming convention, and disabling the whole rule to accommodate it costs you the check
everywhere else.

## Tuning versus disabling

Prefer lowering a severity to disabling a rule. `{ "severity": "info" }` keeps the finding visible and
out of your gate; `{ "enabled": false }` removes it from the report entirely, and nobody revisits it.

Configuration only tunes rules already registered with the engine. The CLI does not load custom rule
modules — adding your own rules means using the library, which is covered in
[Extending](linter/extending.md).
