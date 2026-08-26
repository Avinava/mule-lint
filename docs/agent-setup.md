# Agent setup runbook

> **Instructions for AI coding agents.** Follow this runbook from the root of the Mule repository
> the user wants to scan. Inspect first, preserve existing work, and ask only for a decision you
> cannot derive safely.

## Safety rules

- Treat existing files and uncommitted changes as user-owned. Do not overwrite or reformat them.
- Do not change Mule XML, DataWeave, YAML, RAML, OpenAPI, Maven, or test files during setup.
- Do not create a Node project just to run mule-lint. `npx` can run the pinned package without a
  local `package.json`.
- Read an existing `.mulelintrc.json`, MCP configuration, workflow, or agent instruction before
  proposing a change. Merge narrowly; never replace a whole configuration file.
- Never put credentials, private endpoints, customer payloads, generated reports, or source excerpts
  in prompts, configuration, screenshots, or commits.
- Preview proposed repository changes and get approval before applying them. Commit or push only
  when explicitly requested.

## 1. Inspect the repository and runtime

Confirm the working directory is a Mule 4 project and see what is already configured:

```bash
pwd
git status --short
test -f pom.xml && test -f mule-artifact.json && echo "Mule project detected"
node --version
npm --version
ls -a .mulelintrc.json .mcp.json .codex .vscode .github 2>/dev/null
rg -n "@sfdxy/mule-lint|mule-lint" \
  .mulelintrc.json .mcp.json .codex .vscode .github package.json 2>/dev/null
```

Stop and explain what is missing if `pom.xml` or `mule-artifact.json` is absent. Node.js must be 20
or newer. Recommend the current Node.js LTS release if installation or an upgrade is needed; do not
install system software without approval.

If `.agents/skills/.mule-skills-version` exists, Mule Skills may already manage the MCP entry. Update
that installation instead of creating a second, competing configuration.

## 2. Prove the CLI works without changing the project

Run the exact published version:

```bash
npx -y @sfdxy/mule-lint@1.29.1 --version
npx -y @sfdxy/mule-lint@1.29.1 . --profile recommended
```

The scan is read-only. Exit code `1` normally means lint findings were found; it does not mean setup
failed. Exit code `2` means an invalid command, path, or configuration, and `3` means source parsing
failed. Report the counts by severity and the highest-priority rule IDs. Do not fix findings unless
the user asks.

Do not recommend a global install when the pinned `npx` command works. A globally installed older
version can shadow `npx` on some systems; when diagnosing a version mismatch, use a clean local
installation or the explicit binary under `node_modules/.bin`.

## 3. Offer only the integrations the user needs

The successful scan completes basic setup. Before editing the repository, show a concise preview and
ask which durable integration the user wants:

1. **No repository files:** keep using the pinned `npx` command.
2. **Shared lint policy:** add or reconcile `.mulelintrc.json` after the team reviews the baseline.
3. **AI-agent tools:** merge the local MCP server into the host the repository already uses.
4. **CI:** add a pinned, read-only scan first; make it blocking only after the baseline is understood.

Do not add all four by default.

## 4. Merge MCP configuration for the detected host

Use this command for every host:

```text
npx -y @sfdxy/mule-lint@1.29.1 mcp
```

Merge only a missing `mule-lint` entry. If one exists, preserve its other settings and propose only
the version change.

| Host                                     | Repository configuration | Shape                                               |
| ---------------------------------------- | ------------------------ | --------------------------------------------------- |
| Codex                                    | `.codex/config.toml`     | `[mcp_servers.mule-lint]` with `command` and `args` |
| Claude Code, Copilot CLI, Cursor, Gemini | `.mcp.json`              | `mcpServers` object                                 |
| GitHub Copilot in VS Code                | `.vscode/mcp.json`       | `servers` object with `"type": "stdio"`             |

Codex configuration:

```toml
[mcp_servers.mule-lint]
command = "npx"
args = ["-y", "@sfdxy/mule-lint@1.29.1", "mcp"]
```

Claude Code, Copilot CLI, Cursor, or Gemini configuration:

```json
{
  "mcpServers": {
    "mule-lint": {
      "command": "npx",
      "args": ["-y", "@sfdxy/mule-lint@1.29.1", "mcp"]
    }
  }
}
```

VS Code configuration:

```json
{
  "servers": {
    "mule-lint": {
      "type": "stdio",
      "command": "npx",
      "args": ["-y", "@sfdxy/mule-lint@1.29.1", "mcp"]
    }
  }
}
```

Local MCP files do not configure GitHub-hosted Copilot agents. Do not claim they do.

After an approved edit, reload the host and use its MCP status view. For Codex, run
`codex mcp list`; for Claude Code or Copilot CLI, use the corresponding MCP list/status command.
Then ask the agent to run a recommended project scan without changing files.

## 5. Add team policy only after reviewing the baseline

If the user wants a shared configuration, start small:

```json
{
  "extends": "mule-lint:recommended"
}
```

The file is not discovered automatically, so commands must include:

```bash
npx -y @sfdxy/mule-lint@1.29.1 . --config .mulelintrc.json
```

Preserve existing rule choices. Do not disable a rule merely to make the first scan green; explain
the finding and ask whether the exception is intentional.

For CI, pin `1.29.1`, begin with report generation or a reviewed profile, and explain the exit-code
effect before adding `--fail-on-warning` or a quality gate. Follow the maintained
[CI/CD guide](best-practices/ci-cd.md) for SARIF permissions and upload steps.

## 6. Validate and report

After approved changes:

```bash
git diff --check
git diff
npx -y @sfdxy/mule-lint@1.29.1 . --profile recommended
```

Also validate the selected host's MCP configuration or CI syntax. Report:

- the detected Mule project and Node.js version;
- the mule-lint version and scan counts;
- integrations added or updated;
- files deliberately left unchanged;
- validation results and remaining findings.

Do not commit the HTML report; it can contain local paths and source details. Commit setup changes
only when the user authorizes it, and never push without an explicit request.
