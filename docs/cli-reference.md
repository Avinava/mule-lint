# CLI reference

The main pattern is:

```bash
mule-lint [path] [options]
```

`path` can be one XML file or a directory. For a complete project analysis, run from the directory containing `pom.xml` and use `.`.

## Lint options

| Option                      | Meaning                                          |
| --------------------------- | ------------------------------------------------ |
| `-p, --profile <name>`      | Use `baseline`, `recommended`, or `strict`       |
| `-c, --config <file>`       | Load an explicit JSON configuration file         |
| `-f, --format <type>`       | Print `table`, `json`, `sarif`, `html`, or `csv` |
| `-o, --output <file>`       | Write output to a file instead of the terminal   |
| `-q, --quiet`               | Show errors only                                 |
| `--fail-on-warning`         | Exit `1` when a warning exists                   |
| `-g, --quality-gate <name>` | Apply `default`, `strict`, or `config` gate      |
| `-e, --experimental`        | Include experimental rules                       |
| `-v, --verbose`             | Print more execution detail                      |
| `-V, --version`             | Print the installed version                      |
| `-h, --help`                | Print help                                       |

Examples:

```bash
mule-lint . --profile recommended
mule-lint src/main/mule/orders-api.xml --quiet
mule-lint . --config .mulelintrc.json --format html --output report.html
```

## Subcommands

### `api validate`

```bash
mule-lint api validate <project-directory> [options]
```

| Option                     | Meaning                                                             |
| -------------------------- | ------------------------------------------------------------------- |
| `--main <file>`            | Choose the main RAML/OpenAPI file relative to the project directory |
| `--ruleset <file>`         | Apply a local AMF Validation Profile; repeat as needed              |
| `--dependency-root <path>` | Allow another local dependency root; repeat as needed               |
| `--format <type>`          | `table`, `json`, or `sarif`                                         |

Remote contract references are not fetched. See [API contract validation](best-practices/api-contracts.md).

### `format`

```bash
mule-lint format <file-or-project> [options]
```

Formatting writes changed XML by default. Add `--check` for a read-only CI check.

| Option                           | Meaning                                                      |
| -------------------------------- | ------------------------------------------------------------ |
| `--check`                        | Report files that need formatting and exit `1`; do not write |
| `--tab-width <n>`                | Spaces per indentation level; default `4`                    |
| `--print-width <n>`              | Preferred wrap width; default `140`                          |
| `--xml-quote-attributes <style>` | `preserve`, `single`, or `double`                            |

See [XML formatting](formatting.md).

### `mcp`

```bash
mule-lint mcp
```

Starts the local MCP server over standard input/output. It is normally launched by an MCP host, not typed for an interactive session. See [MCP setup](mcp-design.md).

## Exit codes

| Code | Lint meaning                                               |
| ---- | ---------------------------------------------------------- |
| `0`  | No failing finding or gate condition                       |
| `1`  | Errors found, warnings configured to fail, or gate failed  |
| `2`  | Invalid command, configuration, path, or execution failure |
| `3`  | Source parse error                                         |

`format --check` also uses `1` when formatting would change a file. `api validate` uses `0` for conformant, `1` for findings, and `2` for configuration/execution failure.
