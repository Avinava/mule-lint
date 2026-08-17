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

| Key                | Effect                                                                      |
| ------------------ | --------------------------------------------------------------------------- |
| `rules`            | Per-rule `enabled`, `severity`, and rule-specific `options`                 |
| `include`          | Glob patterns to scan                                                       |
| `exclude`          | Glob patterns to skip, such as MUnit tests                                  |
| `defaultFormatter` | Format used when `-f` is absent                                             |
| `failOnWarning`    | Treat warnings as failures                                                  |
| `qualityGate`      | Custom gate conditions — see [Quality gates](quality-gates.md#custom-gates) |

Anything else is rejected. An unknown key exits with code `2` rather than being ignored, because a typo
in a rule identifier that silently does nothing is worse than a failed run.

Three keys are accepted for backward compatibility but have no runtime effect, and warn when used:
`extends`, `customRulesPath`, and `maxIssues`.

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
