<p align="center">
  <img src="docs/assets/logo.svg" alt="mule-lint" width="560" />
</p>

<p align="center">
  <a href="https://www.npmjs.com/package/@sfdxy/mule-lint"><img src="https://img.shields.io/npm/v/@sfdxy/mule-lint?style=flat-square&color=34d399" alt="npm version" /></a>
  <a href="https://github.com/Avinava/mule-lint/actions"><img src="https://img.shields.io/github/actions/workflow/status/Avinava/mule-lint/ci.yml?style=flat-square&color=38bdf8" alt="CI" /></a>
  <a href="https://github.com/Avinava/mule-lint/blob/master/LICENSE"><img src="https://img.shields.io/npm/l/@sfdxy/mule-lint?style=flat-square&color=818cf8" alt="License" /></a>
</p>

<p align="center"><strong>Find Mule 4 problems before deployment—locally, in CI, or with an AI coding agent.</strong></p>

mule-lint scans Mule XML, DataWeave, YAML properties, and project structure. It needs no Anypoint credentials and does not connect to your MuleSoft environments. You need Node.js to run the tool, but you do not need to know JavaScript or Node development.

## Tell your AI agent

**Codex / Claude Code / GitHub Copilot / Gemini / Cursor:**

```text
Fetch and follow https://raw.githubusercontent.com/Avinava/mule-lint/master/docs/agent-setup.md
to set up or update mule-lint in this Mule repository. Detect the agent host and existing
configuration, run a read-only baseline scan, preview any proposed changes, preserve customized
files, and do not modify Mule source or commit unless I approve it.
```

That is enough for the agent to check Node.js, run the pinned CLI, explain the result, and offer only
the MCP, shared policy, or CI integration you need. Prefer the manual first run below when you want
to perform the setup yourself.

## First run

1. Install [Node.js 20 or newer](https://nodejs.org/en/download).
2. Open a terminal in the root of a Mule project—the directory containing `pom.xml`.
3. Run:

```bash
npm install -g @sfdxy/mule-lint
mule-lint . --profile recommended
```

Example summary:

```text
Summary:
  Errors:    1
  Warnings:  5
  Infos:     5
```

Start with errors, then warnings. Info findings are advisory. See the [5-minute guide](docs/getting-started.md) if `node`, `npm`, or `mule-lint` is unfamiliar.

## Useful commands

```bash
# Scan the current Mule project
mule-lint . --profile recommended

# Create an interactive report
mule-lint . --profile recommended --format html --output mule-lint-report.html

# Fail CI when errors or warnings exist
mule-lint . --profile recommended --fail-on-warning

# Validate RAML or OpenAPI
mule-lint api validate ./src/main/resources/api

# Format Mule XML (writes changes)
mule-lint format ./src/main/mule
```

Linting is read-only. The `format` command is the only command above that changes source files; use `format --check` for a read-only preview.

## What a finding means

```text
src/main/mule/orders-api.xml
  31:5  error  Flow "get-order-by-id-flow" is missing an error handler (MULE-003)
```

- `src/main/mule/orders-api.xml` is the file.
- `31:5` is line and column.
- `error` is the severity.
- `MULE-003` is the stable rule ID; look it up in the [rules catalog](docs/best-practices/rules-catalog.md).

The [sample project](examples/sample-orders-system-api) produces the documentation examples and is safe to experiment with.

## Choose an output

| Format         | Command option                         | Best for                      |
| -------------- | -------------------------------------- | ----------------------------- |
| Terminal table | `--format table`                       | A developer fixing a project  |
| HTML           | `--format html --output report.html`   | Exploring and sharing results |
| SARIF          | `--format sarif --output report.sarif` | Pull-request annotations      |
| JSON           | `--format json`                        | Scripts and integrations      |
| CSV            | `--format csv --output report.csv`     | Spreadsheet review            |

See [output formats](docs/output-formats.md) for real examples and exit codes.

## Documentation

- [Getting started](docs/getting-started.md)
- [Common recipes](docs/recipes.md)
- [Troubleshooting](docs/troubleshooting.md)
- [CLI reference](docs/cli-reference.md)
- [Profiles and team rollout](docs/profiles.md)
- [Configuration](docs/configuration.md)
- [MuleSoft practices handbook](docs/best-practices/mulesoft-best-practices.md)
- [MCP setup for coding agents](docs/mcp-design.md)
- [Contributor guide](CONTRIBUTING.md)

The searchable site is at <https://avinava.github.io/mule-lint/>.

## CI example

Pin the package version so local and CI scans use the same rules:

```yaml
- name: Scan Mule project
  run: npx -y @sfdxy/mule-lint@1.29.1 . --profile recommended --fail-on-warning
```

For GitHub annotations, generate SARIF and upload it as shown in [CI/CD integration](docs/best-practices/ci-cd.md).

## AI coding agents

mule-lint includes a local MCP server with tools for full-project analysis, snippet validation, rule explanations, XML formatting, and API contract validation:

```bash
npx -y @sfdxy/mule-lint@1.29.1 mcp
```

It uses standard input/output and needs no credentials. Host-specific setup is in the [MCP guide](docs/mcp-design.md).

## Development

```bash
npm ci
npm run build
npm test
npm run check
```

Contributions are welcome. Read [CONTRIBUTING.md](CONTRIBUTING.md) before changing public behavior, rule metadata, or docs.

## License

[MIT](LICENSE) © 2024–2026 Avi
