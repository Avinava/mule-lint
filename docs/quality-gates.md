# Quality gates

A profile chooses which rules run. A quality gate decides whether the resulting report passes.

## Built-in gates

```bash
mule-lint . --profile recommended --quality-gate default
mule-lint . --profile recommended --quality-gate strict
```

| Gate      | Fails on                                                          | Warns on                                             |
| --------- | ----------------------------------------------------------------- | ---------------------------------------------------- |
| `default` | Any error, or average complexity above 20                         | More than 10 warnings, or any security vulnerability |
| `strict`  | Any error, warning, vulnerability, or average complexity above 10 | Nothing; conditions fail directly                    |

For an existing project, begin with the profile alone. Add `default` after the team understands its baseline. `strict` is usually better for a new application or a deliberately remediated codebase.

## The simple warning gate

If you only need warnings to fail:

```bash
mule-lint . --profile recommended --fail-on-warning
```

## Custom gate

Add conditions to `.mulelintrc.json`:

```json
{
  "extends": "mule-lint:recommended",
  "qualityGate": {
    "name": "Team Gate",
    "conditions": [
      { "metric": "errors", "operator": ">", "threshold": 0, "status": "fail" },
      { "metric": "warnings", "operator": ">", "threshold": 5, "status": "warn" },
      { "metric": "complexity_max", "operator": ">", "threshold": 15, "status": "fail" }
    ]
  }
}
```

Then run:

```bash
mule-lint . --config .mulelintrc.json --quality-gate config
```

A `warn` condition is reported but does not fail the command. Use it to observe a metric before enforcing it.

## HTML quality ratings

The HTML report shows descriptive A–E ratings. They help compare scans; they are not gate conditions by themselves.

| Rating          | Based on                                            | Read it as                                 |
| --------------- | --------------------------------------------------- | ------------------------------------------ |
| Complexity      | Average cyclomatic complexity of flows              | How hard control flow is to follow         |
| Maintainability | Weighted finding debt versus estimated project size | A trend indicator, not a delivery estimate |
| Reliability     | Count of bug-type findings                          | Potential runtime/error-handling risk      |
| Security        | Count of vulnerability findings                     | Security review priority                   |

The formulas and thresholds are implemented in `src/quality/`. Because averages can hide one unusually complex flow, use `complexity_max` in a gate when that matters.

## Pipeline example

```yaml
- name: Scan Mule project
  run: npx -y @sfdxy/mule-lint@1.29.1 . --profile recommended --quality-gate default
```

Generate SARIF as a separate or combined step when you also want inline annotations. See [CI/CD integration](best-practices/ci-cd.md).
