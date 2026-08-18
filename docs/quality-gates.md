# Quality gates

A quality gate turns a report into a pass or fail decision. When a gate fails, the CLI exits with code
`1`, which is what makes it usable as a pipeline step rather than something a human has to read.

```bash
mule-lint ./src/main/mule -g default
mule-lint ./src/main/mule -g strict
mule-lint ./src/main/mule -g config -c .mulelintrc.json
```

## Built-in gates

| Gate      | Fails on                                                                           | Warns on                                             |
| --------- | ---------------------------------------------------------------------------------- | ---------------------------------------------------- |
| `default` | Any error, or average complexity above 20                                          | More than 10 warnings, or any security vulnerability |
| `strict`  | Any error, any warning, any security vulnerability, or average complexity above 10 | —                                                    |

Start with `default` on an existing codebase and `strict` on a new one. Turning `strict` on over a
mature project usually produces a number nobody will act on, and a gate that is always red is a gate
everybody learns to ignore.

## Custom gates

Define your own conditions in `.mulelintrc.json` and select them with `-g config`:

```json
{
  "qualityGate": {
    "name": "Custom Gate",
    "conditions": [
      { "metric": "errors", "operator": ">", "threshold": 0, "status": "fail" },
      { "metric": "warnings", "operator": ">", "threshold": 5, "status": "warn" },
      { "metric": "complexity_max", "operator": ">", "threshold": 15, "status": "fail" }
    ]
  }
}
```

Each condition names a metric, a comparison, a threshold, and whether breaching it fails the build or
only warns. A gate with only `warn` conditions never fails, which is a useful first step when you want
the numbers visible before you enforce them.

## Quality ratings

The HTML report rates four dimensions from A to E. These follow industry-standard methodology adapted
for MuleSoft, and they are descriptive rather than gate conditions — a rating tells you where the debt
is, the gate decides whether the build proceeds.

### Complexity

Average cyclomatic complexity across all flows. Decision points counted per flow are `choice/when`,
`foreach`, `try`, `scatter-gather`, `async`, `until-successful`, and error handlers; base complexity is
`1 + decision points`.

| Rating | Threshold    | Interpretation                            |
| ------ | ------------ | ----------------------------------------- |
| A      | Average ≤ 5  | Simple, easy to test                      |
| B      | Average ≤ 10 | Moderate complexity                       |
| C      | Average ≤ 15 | Complex, consider splitting               |
| D      | Average ≤ 20 | High complexity, refactor recommended     |
| E      | Average > 20 | Very complex, critical refactoring needed |

Averaging hides a single monstrous flow inside an otherwise simple project, which is why
`complexity_max` exists as a separate gate metric.

### Maintainability

Technical debt as a percentage of estimated development time. Debt is `(code smells × 5min) +
(bugs × 15min) + (vulnerabilities × 30min)`; the development estimate is
`(flows × 10min) + (subflows × 5min)`, floored at 60 minutes.

| Rating | Debt ratio | Interpretation                         |
| ------ | ---------- | -------------------------------------- |
| A      | ≤ 5%       | Excellent maintainability              |
| B      | ≤ 10%      | Good maintainability                   |
| C      | ≤ 20%      | Moderate technical debt                |
| D      | ≤ 50%      | High debt, plan remediation            |
| E      | > 50%      | Critical debt, immediate action needed |

The minute values are conventional estimates, not measurements of your team. Treat the ratio as a
trend line across scans rather than as an hours figure to put in a plan.

### Reliability

Counts bug-type issues. Every rule in the `error-handling` category is classified as a bug, including
missing error handlers (`MULE-003`), missing correlation ID (`MULE-007`), generic error handling
(`MULE-009`), HTTP status in error handlers (`MULE-005`), global error handler (`MULE-001`), and try
scope usage (`ERR-001`).

| Rating | Bug count | Interpretation              |
| ------ | --------- | --------------------------- |
| A      | 0         | No reliability issues       |
| B      | 1–2       | Minor reliability concerns  |
| C      | 3–5       | Moderate reliability risk   |
| D      | 6–10      | High reliability risk       |
| E      | > 10      | Critical reliability issues |

### Security

Counts security vulnerabilities. Every rule in the `security` category is classified as a
vulnerability, including hardcoded credentials (`MULE-201`), insecure TLS (`MULE-202`), plaintext
secrets (`YAML-004`), hardcoded URLs (`MULE-004`), TLS version (`SEC-002`), rate limiting (`SEC-003`),
and input validation (`SEC-004`). Hotspots are reserved for externally enriched reports.

| Rating | Vulnerabilities | Interpretation                |
| ------ | --------------- | ----------------------------- |
| A      | 0               | Secure configuration          |
| B      | 1               | Minor security finding        |
| C      | 2–3             | Security review needed        |
| D      | 4–5             | Security remediation required |
| E      | > 5             | Critical security issues      |

## In a pipeline

```yaml
- run: npx -y @sfdxy/mule-lint@1.26.0 ./src/main/mule -g strict -f sarif -o mule-lint.sarif
- uses: github/codeql-action/upload-sarif@v3
  with:
    sarif_file: mule-lint.sarif
```

Uploading SARIF puts findings on the pull request as annotations, so the gate decides pass or fail
while the annotations show where. Exit codes are listed in
[Output formats](output-formats.md#exit-codes).
