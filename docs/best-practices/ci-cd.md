# CI/CD Integration

> **Applies to:** All  
> **Related Rules:** `PROJ-001` · `PROJ-002`  
> **Last Updated:** April 2026

## When to Read This

Read this when setting up CI/CD pipelines, integrating mule-lint into builds, or configuring quality gates.

---

## Pipeline Stages

```
┌──────────┐    ┌──────────┐    ┌──────────┐    ┌──────────┐    ┌──────────┐
│  Build   │ →  │  Lint    │ →  │  Test    │ →  │  Package │ →  │  Deploy  │
│          │    │          │    │          │    │          │    │          │
│ mvn      │    │ mule-    │    │ mvn test │    │ mvn      │    │ anypoint │
│ compile  │    │ lint     │    │          │    │ package  │    │ deploy   │
└──────────┘    └──────────┘    └──────────┘    └──────────┘    └──────────┘
```

---

## mule-lint Integration

### Quality Gate Configuration

```json
// .mulelintrc.json
{
  "include": ["src/main/mule/**/*.xml"],
  "exclude": ["src/test/munit/**/*.xml"],
  "qualityGate": {
    "name": "Project Quality Gate",
    "conditions": [
      { "metric": "errors", "operator": ">", "threshold": 0, "status": "fail" },
      { "metric": "warnings", "operator": ">", "threshold": 10, "status": "warn" }
    ]
  },
  "rules": {
    "MULE-001": {
      "enabled": false,
      "reason": "Global error handler in non-standard location — documented exception"
    }
  }
}
```

**Rule suppression:** When disabling a rule, always include a `reason` or `comment` field explaining why. This documents the engineering decision for future reviewers.

### Output Formats

| Format   | Use Case                        | Command                              |
| -------- | ------------------------------- | ------------------------------------ |
| `pretty` | Local development               | `mule-lint . -f pretty`              |
| `json`   | CI/CD parsing                   | `mule-lint . -f json`                |
| `sarif`  | GitHub Code Scanning, AI agents | `mule-lint . -f sarif -o lint.sarif` |
| `html`   | Human review reports            | `mule-lint . -f html -o report.html` |

---

## GitHub Actions Example

```yaml
name: Mule CI/CD

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

jobs:
  build-and-test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Set up JDK 17
        uses: actions/setup-java@v4
        with:
          java-version: '17'
          distribution: 'temurin'

      - name: Cache Maven packages
        uses: actions/cache@v4
        with:
          path: ~/.m2
          key: ${{ runner.os }}-m2-${{ hashFiles('**/pom.xml') }}

      - name: Build
        run: mvn -B clean compile

      - name: Run mule-lint
        run: npx @sfdxy/mule-lint . -c .mulelintrc.json -f sarif -o lint.sarif

      - name: Upload SARIF results
        uses: github/codeql-action/upload-sarif@v3
        with:
          sarif_file: lint.sarif

      - name: Run MUnit tests
        run: mvn -B test -Dmule.env=dev -Dsecure.key=test
```

---

## Git Branch Strategy

| Branch      | Purpose               | Deployment Target |
| ----------- | --------------------- | ----------------- |
| `main`      | Production-ready code | Production        |
| `develop`   | Integration branch    | QA/Staging        |
| `feature/*` | New features          | Development       |
| `hotfix/*`  | Production fixes      | Production        |

---

## Commit Messages

Follow [Conventional Commits](https://www.conventionalcommits.org/):

```
feat: add new order processing logic
fix: resolve null pointer in mapping
docs: update README with deployment steps
chore: upgrade mule maven plugin
refactor: extract common DWL functions to module
```

---

**See also:** [Testing](testing.md) · [Deployment & Modernization](deployment-2026.md) · [Folder Structure](folder-structure.md)
