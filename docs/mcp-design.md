# MCP server for coding agents

The MCP server gives a coding agent controlled access to mule-lint’s project scan, rule catalog, XML formatter, and API contract validator. It runs locally over standard input/output and requires no credentials.

## Before configuring a host

Run this once in a terminal:

```bash
npx -y @sfdxy/mule-lint@1.29.0 mcp
```

The process waits silently for an MCP client. That means startup succeeded; stop it with Ctrl+C. The first run can take longer while npm downloads the pinned package.

Pin the version in shared configuration. Otherwise different developers may receive different rule sets after a release.

## Codex

Add the server with the Codex CLI:

```bash
codex mcp add mule-lint -- npx -y @sfdxy/mule-lint@1.29.0 mcp
codex mcp list
```

Restart Codex after changing MCP configuration. Codex configuration is documented in the [official Codex documentation](https://developers.openai.com/codex/).

## Claude Code or Claude Desktop

Use this server entry under the host’s `mcpServers` key:

```json
{
  "mcpServers": {
    "mule-lint": {
      "command": "npx",
      "args": ["-y", "@sfdxy/mule-lint@1.29.0", "mcp"]
    }
  }
}
```

For Claude Code, a CLI alternative is:

```bash
claude mcp add mule-lint -- npx -y @sfdxy/mule-lint@1.29.0 mcp
```

Reload the host, then use its MCP status view to confirm that `mule-lint` connected.

## VS Code

In `.vscode/mcp.json`, VS Code uses a `servers` key and an explicit stdio type:

```json
{
  "servers": {
    "mule-lint": {
      "type": "stdio",
      "command": "npx",
      "args": ["-y", "@sfdxy/mule-lint@1.29.0", "mcp"]
    }
  }
}
```

Reload the VS Code window after saving the file.

## Available tools

| Tool                    | Use it for                                    | Important behavior                                           |
| ----------------------- | --------------------------------------------- | ------------------------------------------------------------ |
| `run_lint_analysis`     | Scan a complete Mule project                  | Requires an absolute project path; defaults to `recommended` |
| `validate_snippet`      | Check generated Mule XML before suggesting it | XML only; no project-wide context                            |
| `get_rule_details`      | Explain a rule ID and related standard        | Read-only catalog lookup                                     |
| `format_mule_xml`       | Format a project, file, or XML string         | File/project mode writes unless `check: true`                |
| `validate_api_contract` | Validate a local RAML/OpenAPI project         | Remote references are never fetched                          |

The server also exposes standards, rules, and practice guides as MCP resources, plus prompts for project analysis, rule explanation, and fixing an issue.

## A good agent request

```text
Scan this Mule project with the recommended profile. Group the result by rule,
explain the errors first, and propose changes without editing files yet.
```

For an implementation request:

```text
Scan this Mule project, fix only MULE-003 findings, validate the changed XML,
then run the project scan again. Do not change unrelated formatting.
```

## Safety and scope

- Give the agent the project directory you intend it to inspect.
- Lint and catalog tools are read-only.
- Formatting can write XML; ask for `check: true` when you only want a preview.
- Review agent changes as a normal source-control diff.
- Do not place customer reports, credentials, or raw production payloads in prompts or committed fixtures.

## Troubleshooting

If the server does not appear:

1. run the pinned `npx ... mcp` command directly;
2. confirm the host uses `mcpServers` or `servers` as shown above;
3. make sure the project path supplied to scan tools is absolute;
4. restart or reload the host;
5. check the host’s MCP logs for npm/PATH errors.

See [general troubleshooting](troubleshooting.md#the-mcp-server-appears-to-hang-on-first-use) for installation issues.
