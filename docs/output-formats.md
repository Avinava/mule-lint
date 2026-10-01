# Output formats

Choose an output for the person or system consuming the result. The rules and findings do not change with the format.

| Format         | Option              | Best for                             |
| -------------- | ------------------- | ------------------------------------ |
| Terminal table | `--format table`    | Local developer work                 |
| HTML           | `--format html`     | Visual review and sharing            |
| SARIF          | `--format sarif`    | Pull-request and editor annotations  |
| JSON           | `--format json`     | Scripts and integrations             |
| CSV            | `--format csv`      | Spreadsheet review                   |
| Markdown       | `--format markdown` | Pull-request comments, job summaries |
| GitHub         | `--format github`   | Inline annotations in GitHub Actions |
| JUnit XML      | `--format junit`    | Generic CI test-report viewers       |

Only the report is written to standard output. Quality-gate results, `--verbose` details, and the
"Report written to" message go to standard error, so `--format json | jq` and piped SARIF stay valid.
An unknown `--format` stops with exit code `2` before the scan runs.

## Terminal table

```bash
mule-lint . --profile recommended
```

```text
Mule-Lint Report
Scanned 3 files in 46ms

src/main/mule/orders-api.xml
  31:5  error  Flow "get-order-by-id-flow" is missing an error handler (MULE-003)

Project Structure
  0:0   warning  Missing environment properties file for "qa" (YAML-001)

Summary:
  Errors:    1
  Warnings:  10
  Infos:     9
```

Add `--quiet` to print only errors.

## HTML

```bash
mule-lint . --profile recommended --format html --output mule-lint-report.html
```

The report provides:

- project metrics and quality ratings;
- charts for severity, categories, and frequently violated rules;
- an issue table with search and column filters;
- a complete issue-detail panel when you select a row;
- CSV export and light/dark themes.

![HTML report dashboard generated from the sample project](linter/images/html-report-dashboard.png)

![HTML report issues view generated from the sample project](linter/images/html-report-issues.png)

The lint data is embedded in the file. Interactive styling, charts, fonts, and the issue table load from public CDNs, so the browser needs network access. A fully offline report is planned for a later release.

`--format html` without `--output` writes `report.html` in the current directory. Missing output directories are created. Files that fail to parse appear in the issue table as `PARSE-ERROR`.

## JSON

JSON is a flat array with one object per finding:

```bash
mule-lint . --profile recommended --format json --output mule-lint-report.json
```

```json
[
  {
    "filePath": "/home/dev/orders-api/src/main/mule/orders-api.xml",
    "relativePath": "src/main/mule/orders-api.xml",
    "line": 32,
    "column": 5,
    "message": "Flow \"get-order-by-id-flow\" is missing an error handler",
    "ruleId": "MULE-003",
    "severity": "error"
  }
]
```

`filePath` is absolute and `relativePath` is relative to the scanned project. Entries can also carry `suggestion` and `codeSnippet`. Do not expect a top-level summary object in this format.

### Baseline: report only new issues

Save a JSON report once, then pass it back to see only what changed:

```bash
mule-lint . --profile recommended --format json --output baseline.json
mule-lint . --profile recommended --baseline baseline.json
```

Issues are matched by rule, file, and message, so moving code up or down a file does not make an
old issue look new. The command prints `Baseline: N new, N unchanged, N fixed` to standard error.
The report, quality gate, and exit code then consider only new issues. Commit `baseline.json` to
adopt mule-lint on an existing project without fixing everything first.

## SARIF

```bash
mule-lint . --profile recommended --format sarif --output mule-lint.sarif
```

SARIF 2.1.0 includes rule metadata with a link to each rule's catalog entry, locations, a stable
fingerprint per result so code scanning can de-duplicate alerts across runs, and the fix suggestion in
each result's `properties.suggestion`. Project-level findings, such as a missing file, have no
location. Use it for GitHub code scanning, compatible editors, and agent tooling. See [CI/CD integration](best-practices/ci-cd.md).

## CSV

```bash
mule-lint . --profile recommended --format csv --output mule-lint.csv
```

```csv
Severity,Rule,File,Line,Column,Message
error,MULE-003,src/main/mule/orders-api.xml,31,5,"Flow ""get-order-by-id-flow"" is missing an error handler"
```

Cells that begin with `=`, `+`, `-`, `@`, a tab, or a carriage return are prefixed with `'` so
spreadsheet applications do not evaluate them as formulas.

## Markdown, GitHub annotations, and JUnit

```bash
mule-lint . --profile recommended --format markdown >> "$GITHUB_STEP_SUMMARY"
mule-lint . --profile recommended --format github
mule-lint . --profile recommended --format junit --output mule-lint-junit.xml
```

- **Markdown** prints a summary line and a table of up to 100 issues, errors first.
- **GitHub** prints `::error`, `::warning`, and `::notice` workflow commands that Actions turns into annotations on the pull-request diff.
- **JUnit** writes one test suite per file. Errors and warnings are failed test cases; info findings are passing cases.

## Exit codes

The format controls what is printed. The exit code controls automation.

| Code | Meaning                                                           |
| ---- | ----------------------------------------------------------------- |
| `0`  | No errors and no failed gate                                      |
| `1`  | Errors found, warnings configured to fail, or quality gate failed |
| `2`  | Command or configuration problem                                  |
| `3`  | Source parse error                                                |

Warnings and info findings are visible without failing a normal run. See [quality gates](quality-gates.md) to change the pass/fail policy.
