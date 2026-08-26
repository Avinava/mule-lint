# Getting started in 5 minutes

This guide assumes you know MuleSoft and Anypoint Studio but may rarely use Node.js or a terminal.

## Before you start

You need:

- a Mule 4 project on your computer;
- Node.js 20 or newer;
- a terminal: Terminal on macOS/Linux, or PowerShell/Windows Terminal on Windows.

You do **not** need Anypoint credentials. Lint scans are read-only and stay on your machine.

## 1. Check Node.js

```bash
node --version
npm --version
```

`node --version` must print `v20` or newer. `npm` is the installer included with Node.js. If either command is missing, install the current LTS release from [nodejs.org](https://nodejs.org/en/download) and reopen the terminal.

## 2. Install mule-lint

```bash
npm install -g @sfdxy/mule-lint
mule-lint --version
```

`-g` means “make this command available from any project.” It does not add files to your Mule application.

If your company does not allow global npm installs, skip installation and use:

```bash
npx -y @sfdxy/mule-lint@1.29.0 . --profile recommended
```

## 3. Open the Mule project root

Run the scan from the directory that contains `pom.xml`:

```text
sample-orders-system-api/
├── pom.xml                 ← run from here
├── mule-artifact.json
└── src/
    └── main/
        ├── mule/
        └── resources/
```

In a terminal, change directory with `cd`:

```bash
cd path/to/sample-orders-system-api
```

Running from the project root lets cross-file and project-structure rules see the whole application. Passing only `src/main/mule` is useful for a narrow check, but it hides YAML, POM, and resource context.

## 4. Run the scan

```bash
mule-lint . --profile recommended
```

`.` means “the current directory.” `recommended` is the reviewed profile intended for normal team use.

The bundled sample produces:

```text
Mule-Lint Report
Scanned 3 files

src/main/mule/orders-api.xml
  31:5  error  Flow "get-order-by-id-flow" is missing an error handler (MULE-003)

Summary:
  Errors:    1
  Warnings:  5
  Infos:     5
```

Your numbers will be different. A non-zero exit status is expected when errors are found.

## 5. Read and fix a finding

For `31:5 error ... (MULE-003)`:

- open the named file;
- go to line 31, column 5;
- read the message and rule ID;
- check [MULE-003 in the rules catalog](best-practices/rules-catalog.md#mule-003-missing-error-handler);
- make the Mule change and run the same command again.

Fix errors first. Review warnings next. Info findings are advice and do not make a normal lint run fail.

## 6. Create a visual report

```bash
mule-lint . --profile recommended --format html --output mule-lint-report.html
```

Open `mule-lint-report.html` in a browser. The report lets you filter issues, inspect the complete suggested fix, switch themes, and export CSV.

## Next steps

- Try the [common recipes](recipes.md).
- Choose a [profile](profiles.md) for your team.
- Learn [profiles versus quality gates](profiles.md#profiles-do-not-decide-the-exit-code).
- If installation fails, use [troubleshooting](troubleshooting.md).
