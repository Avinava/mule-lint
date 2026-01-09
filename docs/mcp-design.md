# Mule Lint MCP Server Design

## Executive Summary
This document outlines the strategy for exposing `mule-lint` capabilities via the Model Context Protocol (MCP). By wrapping the linter in an MCP server, we enable AI agents (like Claude, IDE assistants, etc.) to autonomously discover linting rules, validate MuleSoft projects, and retrieve detailed rule documentation without needing to shell out or parse CLI text output.

## Architecture Decision: Monorepo vs. Separate Repo
**Recommendation: Same Repo (Monorepo)**

We should implement the MCP server directly in the `mule-lint` repository, likely under `src/mcp` or as a separate package if this was a workspace.
*   **Pros**: Direct access to `src/core`, `src/rules`, and types without publishing/installing packages. Easier to keep rule definitions and agent-exposed descriptions in sync.
*   **Cons**: Adds a dependency on `@modelcontextprotocol/sdk` to the main repo (or requires a build split).

## Features & Capabilities

### 1. Tools
Tools allow the agent to perform actions.

| Tool Name | Arguments | Description |
| :--- | :--- | :--- |
| `run_lint_analysis` | `projectPath` (string) | Runs the scanning engine on a specified directory. Returns a JSON summary of errors, warnings, and code references. |
| `validate_snippet` | `code` (string), `type` (xml/dwl) | quickly validates a small chunk of code without a full project structure. Useful for agents generating code on the fly. |
| `get_rule_details` | `ruleId` (string) | Returns the full documentation, examples, and rationale for a specific rule (e.g., `MULE-001`). |

### 2. Resources
Resources allow the agent to read context.

| Resource URI | Description |
| :--- | :--- |
| `mule-lint://rules` | A JSON list of all registered rules, their categories, and severity levels. |
| `mule-lint://config/schema` | The JSON schema for `.mule-lintrc` to help agents author valid configurations. |

### 3. Prompts
Pre-defined prompts to help users interacting with the agent.

| Prompt Name | Description |
| :--- | :--- |
| `analyze_current_project` | "Run a comprehensive analysis on this project and summarize the top 3 critical issues." |
| `explain_violation` | "Here is an error I found: {{ErrorString}}. Explain why this is bad and how to fix it using `get_rule_details`." |

## Implementation Phases

### Phase 1: Foundation (The "Reader" Agent)
> [!NOTE]
> **Status**: Completed. Available on NPM as `@sfdxy/mule-lint`.

*Goal: Allow an agent to see what rules exist and run a scan.*
- [x] Install `@modelcontextprotocol/sdk`.
- [x] Create `McpServer` class in `src/mcp/index.ts`.
- [x] Implement `mule-lint://rules` resource.
- [x] Implement `run_lint_analysis` tool (wrapping `LintEngine`).
- [x] Add `stdio` transport for local running.

### Phase 2: Interactive Context (The "Helper" Agent)
> [!NOTE]
> **Status**: Completed.

*Goal: Allow the agent to understand *why* things failed.*
- [x] Implement `get_rule_details` tool.
- [x] Expose internal documentation of rules via MCP.
- [x] Add `validate_snippet` for real-time code generation checks.

### Phase 3: Remediation (The "Fixer" Agent)
> [!NOTE]
> **Status**: Partially Completed. `apply_fix` deferred. Enhanced reporting added.

*Goal: Allow the agent to automatically fix issues.*
- [ ] Implement `apply_fix` tool (Deferred: requires AST write support).
- [x] Enhanced error reporting with precise range/location data (Added column/suggestion).

## Libraries & Dependencies
*   **Core**: `@modelcontextprotocol/sdk`
*   **Transport**: Stdio (standard input/output) for local CLI integration.
*   **Runtime**: Node.js (uses existing project runtime).

## Agent Workflow Example
1.  **Discovery**: Agent connects and reads `mule-lint://rules` to know what it is looking for.
2.  **Action**: User asks "Check my code". Agent calls `run_lint_analysis(cwd)`.
3.  **Context**: Agent sees error `DW-004`. Agent calls `get_rule_details("DW-004")` to read the "Java 17 DataWeave" docs.
4.  **Result**: Agent explains the error to the user with specific context from the official rule definitions.
