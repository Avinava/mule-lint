# CI/CD integration

## Outcome

Every pull request gets the same scan as local development, the pipeline makes an explicit pass/fail decision, and developers can see findings at the affected file and line.

## Before adding a gate

1. Run `recommended` on the full project locally.
2. Review repeated findings with the team.
3. Add documented, narrow config exceptions.
4. Pin the mule-lint version in CI.
5. Choose whether warnings should inform or fail.

## Minimal pipeline step

```yaml
- name: Scan Mule project
  run: npx -y @sfdxy/mule-lint@1.29.0 . --profile recommended --fail-on-warning
```

This is enough when terminal logs are the desired output.

## GitHub Actions with SARIF

Generate SARIF even when findings exist, upload it, then enforce the gate in a separate step:

```yaml
name: Mule lint

on:
  pull_request:
  push:
    branches: [main]

jobs:
  lint:
    runs-on: ubuntu-latest
    permissions:
      contents: read
      security-events: write

    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: 22

      - name: Generate SARIF
        continue-on-error: true
        run: >-
          npx -y @sfdxy/mule-lint@1.29.0 .
          --profile recommended
          --format sarif
          --output mule-lint.sarif

      - name: Upload SARIF
        uses: github/codeql-action/upload-sarif@v3
        with:
          sarif_file: mule-lint.sarif

      - name: Enforce quality gate
        run: >-
          npx -y @sfdxy/mule-lint@1.29.0 .
          --profile recommended
          --quality-gate default
```

The first scan is allowed to return a finding exit code so the upload still runs. The final scan owns the pipeline decision.

## Use a shared config

```json
{
  "extends": "mule-lint:recommended",
  "exclude": ["src/test/munit/**/*.xml"],
  "qualityGate": {
    "name": "Project Gate",
    "conditions": [
      { "metric": "errors", "operator": ">", "threshold": 0, "status": "fail" },
      { "metric": "warnings", "operator": ">", "threshold": 10, "status": "warn" }
    ]
  }
}
```

```bash
mule-lint . --config .mulelintrc.json --quality-gate config
```

Config does not support free-form `reason` or `comment` keys. Put the reason for an exception in the pull request, an adjacent project document, or a JSON-compatible naming convention outside the config object.

## What to store

- Commit `.mulelintrc.json` and the pinned CI command.
- Keep SARIF/HTML/CSV as short-lived build artifacts unless your retention policy requires otherwise.
- Never commit a report generated from a customer project if file paths, hostnames, payload fragments, or business names could be sensitive.

## What static analysis cannot approve

CI still needs Maven/MUnit tests, contract tests, dependency/security checks, environment-specific configuration validation, and deployment controls. mule-lint complements those steps; it does not deploy or connect to Anypoint Platform.

See [profiles](../profiles.md), [quality gates](../quality-gates.md), and [output formats](../output-formats.md).
