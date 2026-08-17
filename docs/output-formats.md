# Output formats

Five formats, selected with `-f`, written to stdout unless you pass `-o`.

| Format  | Use it for                             |
| ------- | -------------------------------------- |
| `table` | Reading in a terminal. The default     |
| `json`  | Scripting and custom tooling           |
| `sarif` | GitHub annotations, VS Code, AI agents |
| `html`  | An interactive report to share         |
| `csv`   | Spreadsheets                           |

## Table

Human-readable and colorized:

```text
Mule-Lint Report
Scanned 5 files in 123ms

src/main/mule/impl.xml
  45:0 error   Flow "getOrders" is missing an error handler (MULE-003)
  67:0 warning Logger is missing 'category' attribute (MULE-006)

Summary:
  Errors:     1
  Warnings:   1
  Infos:      0
```

Add `-q` to show only errors. Note that `-q` rebuilds the per-rule and per-file counts rather than only
zeroing the severity totals, so a quiet summary matches what it printed.

## JSON

One object per issue, for scripting:

```json
[
  {
    "filePath": "/path/to/impl.xml",
    "line": 45,
    "message": "Flow \"getOrders\" is missing an error handler",
    "ruleId": "MULE-003",
    "severity": "error"
  }
]
```

## SARIF

[SARIF 2.1.0](https://sarifweb.azurewebsites.net/), the format GitHub code scanning, VS Code, and most
agents understand:

```bash
mule-lint ./src/main/mule -f sarif -o report.sarif
```

```json
{
  "$schema": "https://json.schemastore.org/sarif-2.1.0.json",
  "version": "2.1.0",
  "runs": [
    {
      "tool": { "driver": { "name": "@sfdxy/mule-lint", "version": "1.25.0" } },
      "results": []
    }
  ]
}
```

The output carries rule definitions, precise file locations, and fix suggestions, which is what turns a
scan into inline annotations on a pull request rather than a log nobody opens. Uploading it is shown in
[Quality gates](quality-gates.md#in-a-pipeline).

## HTML

A single-page interactive report:

```bash
mule-lint ./src/main/mule -f html -o report.html
```

- **Dashboard** with summary cards, a severity donut, top violated rules, and issues by category
- **Issues browser** — a searchable table with multiselect filters and frozen headers
- **Export** of the filtered set as CSV
- Responsive, and built with Tailwind CSS, Chart.js, and Tabulator

![HTML report dashboard](linter/images/html-report-dashboard.png)

Values are HTML-escaped at every sink, so a report generated from an untrusted project is safe to open.

## CSV

```csv
Severity,Rule,File,Line,Column,Message
error,MULE-001,src/main/mule/app.xml,10,5,"Global Error Handler missing"
warning,MULE-002,src/main/mule/app.xml,15,4,"Flow name not kebab-case"
```

## Exit codes

The format changes what is printed; the exit code is what a pipeline reads.

| Code | Meaning                                |
| ---- | -------------------------------------- |
| 0    | Success, no errors                     |
| 1    | Errors found, or a quality gate failed |
| 2    | CLI or configuration error             |
| 3    | Parse errors, such as malformed XML    |

Codes 2 and 3 are deliberately distinct from 1: a broken config or an unparseable file is not a clean
bill of health, and collapsing them into "failed" hides the difference between "your code has issues"
and "I could not read your code". Add `--fail-on-warning` to treat warnings as failures.
