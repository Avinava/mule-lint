<p align="center">
  <img src="docs/assets/logo.svg" alt="Mule-Lint" width="600" />
</p>

<p align="center">
  <a href="https://www.npmjs.com/package/@sfdxy/mule-lint"><img src="https://img.shields.io/npm/v/@sfdxy/mule-lint?style=flat-square&color=34d399" alt="npm version" /></a>
  <a href="https://github.com/Avinava/mule-lint/actions"><img src="https://img.shields.io/github/actions/workflow/status/Avinava/mule-lint/ci.yml?style=flat-square&color=38bdf8" alt="CI" /></a>
  <a href="https://github.com/Avinava/mule-lint/blob/master/LICENSE"><img src="https://img.shields.io/npm/l/@sfdxy/mule-lint?style=flat-square&color=818cf8" alt="License" /></a>
  <a href="https://www.npmjs.com/package/@sfdxy/mule-lint"><img src="https://img.shields.io/npm/dm/@sfdxy/mule-lint?style=flat-square&color=fbbf24" alt="Downloads" /></a>
</p>

<p align="center">
  <strong>Static analysis for MuleSoft Mule 4 applications — for humans, AI agents, and CI pipelines.</strong>
</p>

<p align="center">
  <a href="https://avinava.github.io/mule-lint/">Documentation</a> •
  <a href="#install">Install</a> •
  <a href="#rules">Rules</a> •
  <a href="#quality-gates">Quality gates</a> •
  <a href="#ai-agent-integration-mcp">MCP</a> •
  <a href="#ecosystem">Ecosystem</a>
</p>

---

98 rules across Mule XML, DataWeave, YAML properties, and project structure. Five output formats
including SARIF, so findings land as pull-request annotations instead of scrolling past in a log. No
credentials, no platform access, nothing to configure to get a first result.

- **Cross-file analysis** — unused flows, missing flow-ref targets, and properties referenced in XML but
  absent from YAML are found by pre-scanning the whole project, not one file at a time
- **Project-layer detection** — System, Process, and Experience APIs, libraries, and batch applications
  are classified automatically, and rules use it
- **Parsed once** — a document cache means a file is parsed a single time no matter how many rules read
  it
- **Typed throughout**, so the engine is usable directly from an editor extension or a script

**Full documentation, with search: <https://avinava.github.io/mule-lint/>**

## Install

```bash
# global
npm install -g @sfdxy/mule-lint

# or as a dev dependency
npm install --save-dev @sfdxy/mule-lint
```

Requires Node.js `>=20.0.0`.

## Quick start

```bash
# scan a directory
mule-lint ./src/main/mule

# a single file
mule-lint ./src/main/mule/implementation.xml

# machine-readable, for scripting
mule-lint ./src/main/mule -f json

# SARIF, for GitHub, VS Code, and agents
mule-lint ./src/main/mule -f sarif -o report.sarif

# an interactive HTML report
mule-lint ./src/main/mule -f html -o report.html
```

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

### CLI options

| Option                      | Description                                              |
| --------------------------- | -------------------------------------------------------- |
| `-f, --format <type>`       | `table`, `json`, `sarif`, `html`, `csv`. Default `table` |
| `-o, --output <file>`       | Write to a file instead of stdout                        |
| `-c, --config <file>`       | Path to a configuration file. Not discovered implicitly  |
| `-q, --quiet`               | Errors only                                              |
| `-e, --experimental`        | Enable experimental rules. Opt-in                        |
| `-g, --quality-gate <name>` | `default`, `strict`, or `config`                         |
| `--fail-on-warning`         | Exit non-zero when warnings are present                  |
| `-v, --verbose`             | Verbose output                                           |

Exit codes: `0` clean, `1` errors or a failed gate, `2` CLI or configuration error, `3` parse errors.
The last two are deliberately distinct from `1` — "I could not read your code" is not the same finding
as "your code has issues". Details in
[output formats](https://avinava.github.io/mule-lint/output-formats/).

## Rules

98 rules across 15 runtime categories and 18 identifier prefixes.

| Prefix | Count | Covers                                                       |
| ------ | ----- | ------------------------------------------------------------ |
| `MULE` | 30    | Core Mule 4 XML validation                                   |
| `SEC`  | 14    | Secure properties, TLS, transport, authentication evidence   |
| `API`  | 11    | API-Led, APIKit, specification and interface conventions     |
| `DW`   | 5     | DataWeave files                                              |
| `HYG`  | 5     | Code hygiene, unused flows and variables                     |
| `ERR`  | 4     | Error handler structure and coverage                         |
| `OPS`  | 4     | Auto-discovery, ports, schedules and scheduler mode          |
| `CFG`  | 3     | Configuration properties, environment parity, config secrets |
| `YAML` | 3     | YAML property configuration                                  |
| `LOG`  | 3     | Structured logging, sensitive data, flow logging             |
| `RES`  | 3     | Reconnection, listener resilience, messaging idempotency     |
| `EXP`  | 3     | Experimental, opt-in                                         |
| `HTTP` | 2     | HTTP connector and listener response configuration           |
| `PERF` | 2     | Connection pooling and batch resources                       |
| `PROJ` | 2     | POM and Git hygiene                                          |
| `SF`   | 2     | Salesforce and event connector rules                         |
| `DOC`  | 1     | Display names and documentation                              |
| `STD`  | 1     | Coding and API standards                                     |

The **[rules catalog](https://avinava.github.io/mule-lint/best-practices/rules-catalog/)** documents
every rule with severity, options, and before-and-after examples. It is the single source of truth —
a test asserts it matches the registry exactly, so it cannot drift from the code.

## Quality gates

A gate turns a report into a pass or fail decision, exiting `1` when it fails.

```bash
mule-lint ./src/main/mule -g default   # errors, or complexity above 20
mule-lint ./src/main/mule -g strict    # errors, warnings, vulnerabilities, complexity above 10
mule-lint ./src/main/mule -g config -c .mulelintrc.json
```

The HTML report also rates complexity, maintainability, reliability, and security from A to E. Custom
conditions, the rating formulas, and pipeline examples are in
[quality gates](https://avinava.github.io/mule-lint/quality-gates/).

## Configuration

Optional. Every rule runs at its declared severity without it.

```json
{
  "rules": {
    "MULE-002": {
      "enabled": true,
      "options": { "flowSuffix": "-flow", "excludePatterns": ["*-api-main"] }
    },
    "MULE-006": { "severity": "error", "options": { "requiredPrefix": "com.myorg" } }
  },
  "include": ["src/main/mule/**/*.xml"],
  "exclude": ["**/test/**", "**/*.munit.xml"]
}
```

Pass it with `-c`; it is not discovered implicitly. Unknown keys exit `2` rather than being ignored,
because a typo that silently does nothing is worse than a failed run. Supported keys and precedence are
in [configuration](https://avinava.github.io/mule-lint/configuration/).

## Continuous integration

```yaml
- name: Lint Mule sources
  run: npx -y @sfdxy/mule-lint@1.25.0 ./src/main/mule -g strict -f sarif -o mule-lint.sarif

- name: Upload SARIF
  uses: github/codeql-action/upload-sarif@v3
  with:
    sarif_file: mule-lint.sarif
```

The gate decides pass or fail; the SARIF upload puts each finding inline on the pull request.

## AI Agent Integration (MCP)

An MCP server lets an agent discover rules, scan a project, and explain violations. No credentials.

```bash
npx -y @sfdxy/mule-lint mcp
```

- **Tools:** `run_lint_analysis`, `get_rule_details`, `validate_snippet`
- **Resources:** `mule-lint://rules`, and every best-practice guide under `mule-lint://docs/{slug}`
- **Prompts:** `analyze-project`, `explain-rule`, `fix-issue`

### Setup by host

Every host runs the same command; only the file and the wrapping key differ.

| Host                                   | Where it goes                    | Wrapping key                      |
| -------------------------------------- | -------------------------------- | --------------------------------- |
| Claude Code                            | `.mcp.json`, or `claude mcp add` | `mcpServers`                      |
| Claude Desktop                         | `claude_desktop_config.json`     | `mcpServers`                      |
| Codex                                  | `.codex/config.toml`             | `[mcp_servers.mule-lint]`         |
| VS Code, Copilot Chat                  | `.vscode/mcp.json`               | `servers`, plus `"type": "stdio"` |
| Copilot CLI, Gemini, other MCP clients | `.mcp.json`                      | `mcpServers`                      |

```json
{
  "mcpServers": {
    "mule-lint": {
      "command": "npx",
      "args": ["-y", "@sfdxy/mule-lint@1.25.0", "mcp"]
    }
  }
}
```

VS Code wraps the same entry in `servers` with `"type": "stdio"`; Codex uses a
`[mcp_servers.mule-lint]` TOML table. Pin the version in shared configuration so every machine gets the
same rule set. Verify with `codex mcp list`, `copilot mcp list`, `/mcp` in Claude Code, or a window
reload in VS Code.

## Using as a library

```typescript
import { LintEngine, ALL_RULES, formatSarif } from '@sfdxy/mule-lint';

const engine = new LintEngine({
  rules: ALL_RULES,
  config: { include: ['src/main/mule/**/*.xml'] },
});

const report = await engine.scan('./my-mule-project');
console.log(formatSarif(report));

// scan content directly, useful for editor integrations
const issues = engine.scanContent(xmlContent, 'file.xml');
```

Custom rules extend `BaseRule` and are passed to the engine; the CLI does not load rule modules
dynamically. See [extending](https://avinava.github.io/mule-lint/linter/extending/).

## Documentation

Published at **<https://avinava.github.io/mule-lint/>** with search.

| Page                                                             | Contents                                           |
| ---------------------------------------------------------------- | -------------------------------------------------- |
| [Rules catalog](docs/best-practices/rules-catalog.md)            | All 98 rules with options and examples             |
| [Quality gates](docs/quality-gates.md)                           | Gates, custom conditions, A–E ratings              |
| [Configuration](docs/configuration.md)                           | `.mulelintrc.json` keys and precedence             |
| [Output formats](docs/output-formats.md)                         | Table, JSON, SARIF, HTML, CSV, exit codes          |
| [Best practices](docs/best-practices/mulesoft-best-practices.md) | Fifteen MuleSoft guides the rules are derived from |
| [Architecture](docs/linter/architecture.md)                      | Engine design and data flow                        |
| [Extending](docs/linter/extending.md)                            | Writing custom rules                               |
| [MCP design](docs/mcp-design.md)                                 | Tools, resources, prompts                          |

## Troubleshooting

| Symptom                                   | Cause and fix                                                                                       |
| ----------------------------------------- | --------------------------------------------------------------------------------------------------- |
| No issues on a project you expect to fail | The path points at the wrong directory. Pass the folder holding Mule XML, usually `./src/main/mule` |
| Exit code 2                               | Configuration error, not a lint failure. Invalid JSON or an unknown key; the message names the file |
| Exit code 3                               | A file could not be parsed. Malformed XML is reported rather than skipped                           |
| A rule you disabled still fires           | The config was not loaded — it needs `-c`, it is not discovered                                     |
| Cross-file rules report nothing           | Rules such as unused-flow detection need the whole project, not one file                            |
| MCP server missing in the host            | Wrong wrapping key, or the host was not reloaded. See [setup by host](#setup-by-host)               |
| First MCP call seems to hang              | `npx` is downloading the package. Cached afterwards                                                 |

## Ecosystem

One of four MuleSoft tools that work together, and each is useful alone.

| Project                                                           | Role                                                                |
| ----------------------------------------------------------------- | ------------------------------------------------------------------- |
| `mule-lint`                                                       | Static analysis of Mule XML, DataWeave, YAML, and project structure |
| [`mule-build`](https://github.com/Avinava/mule-build)             | Validate, test, package, run locally, and release                   |
| [`anypoint-connect`](https://github.com/Avinava/anypoint-connect) | Authorized Anypoint runtime evidence and lifecycle operations       |
| [`mule-skills`](https://github.com/Avinava/mule-skills)           | Agent workflows that drive all three                                |

Installing [`mule-skills`](https://avinava.github.io/mule-skills/) gives you `mule-lint` preconfigured
as a pinned MCP server. Details on the [ecosystem page](docs/ecosystem.md).

## Development

```bash
npm install
npm run build
npm test
npm run check   # format, lint, typecheck, knip, coverage, package checks
```

Contributions welcome — see the [contributing guide](CONTRIBUTING.md). Adding a rule means registering
it in `ALL_RULES`, documenting it in the rules catalog, and adding a test; the parity test fails if the
catalog and registry disagree.

## Credits

Inspired by [mule-lint/mule-lint](https://github.com/mule-lint/mule-lint), the original Groovy-based
MuleSoft linter with a DSL for rule definitions. This TypeScript implementation exists to make editor
integration, SARIF output for agents, npm distribution, and CI wiring straightforward.

Built with AI assistance from Antigravity (Google DeepMind) and GitHub Copilot.

## License

[MIT](LICENSE) © 2024–2026 Avi
