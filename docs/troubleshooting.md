# Troubleshooting

## `node` or `npm` is not recognized

Install Node.js 20 or newer from [nodejs.org](https://nodejs.org/en/download), close the terminal, and open a new one. Then run:

```bash
node --version
npm --version
```

## `mule-lint` is not recognized

The global npm command directory is not on your `PATH`, or the install did not finish. The quickest workaround is:

```bash
npx -y @sfdxy/mule-lint@1.29.1 . --profile recommended
```

You can also locate npm’s global prefix with `npm prefix -g` and ask your workstation administrator to add its executable directory to `PATH`.

## npm reports a permission error

Do not use an administrator shell just to install the tool. Use the `npx` command above, install Node with your organization’s supported version manager, or ask for the global npm directory to be configured for your user.

## The scan misses project-level findings

Run from the directory containing `pom.xml` and pass `.`:

```bash
mule-lint . --profile recommended
```

Scanning only `src/main/mule` omits YAML, DataWeave resources, POM checks, and some cross-file context.

## A config file has no effect

Config is not discovered automatically. Name it explicitly:

```bash
mule-lint . --config .mulelintrc.json
```

Unknown configuration keys are warned about and ignored. Fix the warning because a misspelled key does not apply the setting you intended.

## Exit code 1, 2, or 3

| Code | Meaning                               | What to do                                                      |
| ---- | ------------------------------------- | --------------------------------------------------------------- |
| `1`  | Lint errors or a failed quality gate  | Review the printed findings                                     |
| `2`  | Command/configuration problem         | Read the error above the summary and correct the option or file |
| `3`  | One or more files could not be parsed | Open the reported XML/YAML and fix its syntax                   |

Warnings do not fail a normal run unless `--fail-on-warning` or a gate says they should.

## The first scan is too noisy

Use the `recommended` profile and scan the whole project first:

```bash
mule-lint . --profile recommended
```

Group findings by rule in the HTML report. Fix genuine errors, then review repeated warnings as a team. Prefer changing severity to `info` for a deliberate exception; disable a rule only when it cannot apply to the project.

## HTML opens without charts or a table

The report loads Tailwind CSS, Chart.js, Tabulator, and fonts from public CDNs. Allow browser network access, then reload. The lint data itself is embedded in the HTML file and is not uploaded by mule-lint.

## The MCP server appears to hang on first use

When a host runs `npx`, npm may download the pinned package before the server starts. Run the exact command once in a terminal to confirm it starts, then stop it with Ctrl+C:

```bash
npx -y @sfdxy/mule-lint@1.29.1 mcp
```

If the host still cannot see it, restart the host and verify its MCP configuration key in the [MCP guide](mcp-design.md).

## I disagree with a finding

Use the rule ID to open the [rules catalog](best-practices/rules-catalog.md). Check applicability and examples before changing code. If the rule is valid in general but not for your project, document a narrow configuration exception rather than disabling an entire profile.
