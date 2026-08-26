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

Unknown keys produce a warning and are ignored. Treat that warning as a configuration defect: a misspelled setting did not take effect.

`customRulesPath` and `maxIssues` are accepted for backward compatibility but have no runtime effect and produce warnings.

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
