# Repository guidance

This file is the canonical instruction set for coding agents working in mule-lint.

## Purpose

mule-lint is a Node.js/TypeScript CLI and library for static analysis of Mule 4 projects. It also provides XML formatting, RAML/OpenAPI validation, HTML/SARIF/JSON/CSV output, quality gates, and a local MCP server.

The primary user is often a MuleSoft developer who knows Anypoint Studio, Maven, XML, YAML, and DataWeave better than Node.js. Keep CLI and docs language direct, task-based, and explicit about file writes.

## Architecture

```text
bin/                         CLI and MCP entry points
src/engine/LintEngine.ts     scan orchestration and project pre-scan
src/rules/                   rule implementations and ALL_RULES registry
src/catalog/                 standards, rule definitions, profiles
src/core/                    parsing, scanning, metrics, gates, config
src/formatters/              table/JSON/SARIF/HTML/CSV output
src/formatter/               Mule XML formatting
src/api-contract/            RAML/OpenAPI validation
src/mcp/                     tools, prompts, and resources
tests/unit/                  behavioral and parity tests
docs/                        MkDocs user and contributor documentation
examples/                    safe sample projects used by docs/screenshots
```

Per-file rules extend `BaseRule`. Project-wide checks extend `ProjectRule`. Use the engine’s project context for cross-file facts instead of rescanning from an individual rule.

## Sources of truth

- Runtime registration: `src/rules/index.ts` (`ALL_RULES`)
- Rule metadata/standards/profile mapping: `src/catalog/`
- User-facing executable reference: `docs/best-practices/rules-catalog.md`
- CLI behavior: `bin/mule-lint.ts`
- Public library exports: `src/index.ts`
- MCP surface: `src/mcp/tools/`, `src/mcp/resources/`, and `src/mcp/prompts/`
- Site navigation: `mkdocs.yml`

Do not update only one representation of a public rule. Registry, catalog metadata, profile membership, tests, and docs must agree.

## Public contracts to protect

- Rule IDs and meanings are stable API.
- Profile membership changes are release-visible behavior.
- JSON remains a flat issue array; SARIF and exit codes are automation contracts.
- Config is loaded only with `--config`; unknown keys warn and are ignored.
- Lint is read-only. `format` writes by default; `format --check` is read-only.
- MCP scans default to `recommended` and its documented tool names/inputs are public.
- All 98 registered rule headings must remain in the rules catalog; parity tests enforce this.
- Existing documentation and MCP resource paths should remain stable when possible.

## Safe change workflow

1. Read the implementation, nearby tests, and relevant docs before editing.
2. Make the smallest coherent change; preserve unrelated work in a dirty tree.
3. Add a focused regression test for behavior changes.
4. Update every affected public example and reference page.
5. Run the validation appropriate to the risk.

Never copy a private/customer Mule project, report, endpoint, identifier, payload, comment, or business rule into fixtures, docs, screenshots, tests, or commits. Samples must use synthetic names, reserved domains such as `.invalid`, placeholders, and minimal made-up behavior.

Generated reports can expose paths and source details. Do not commit a report from a private project. Documentation screenshots must come from `examples/sample-orders-system-api`.

## Validation matrix

| Change               | Minimum validation                                                                 |
| -------------------- | ---------------------------------------------------------------------------------- |
| Rule logic           | Focused rule test, registry/parity tests, `npm run build`                          |
| Engine/config/gate   | Focused tests plus CLI behavior check                                              |
| Formatter/HTML       | Formatter tests, build, generate sample report, desktop browser QA                 |
| CLI                  | Build, `--help`, representative exit-code checks                                   |
| MCP                  | MCP unit tests and package smoke check when exports/package behavior changes       |
| Docs/nav             | `mkdocs build --strict`, link/version search, visual site check for layout changes |
| Broad/release change | `npm run check`                                                                    |

Useful commands:

```bash
npm ci
npm run build
npm test
npm run format:check
npm run lint
npm run check
mkdocs build --strict
```

## Rules

Follow `.agent/workflows/add-rule.md`. In particular:

- confirm a new ID does not already exist;
- map the rule to a reviewed standard in `src/catalog/standards.ts`;
- define profile membership intentionally;
- include valid, invalid, edge, and configuration tests;
- add the exact `### RULE-ID: Name` catalog heading;
- avoid an error severity for style-only preferences.

Use `this.select(...)`, `this.getAttribute(...)`, `this.createIssue(...)`, and `this.getOption(...)` rather than duplicating XML plumbing.

## Documentation style

- Lead with the command or outcome a MuleSoft developer needs.
- Explain Node/npm only as the runtime/install mechanism; do not assume JavaScript knowledge.
- Prefer commands run from the Mule project root and explain why.
- Include compact real output from the sample project where it improves understanding.
- Separate what lint verifies from what still requires design, security, test, or operations review.
- Verify changing MuleSoft/tooling claims against primary official documentation.
- Never mention private sources used to inform a synthetic example.

## Screenshot regeneration

1. Build the CLI.
2. Generate HTML from `examples/sample-orders-system-api` with `--profile recommended`.
3. Serve the repository over localhost.
4. Capture desktop dashboard and issues views at 1440×900.
5. Check browser console errors, connector fallbacks, filters, issue detail panel, and both themes.
6. Replace `docs/linter/images/html-report-dashboard.png` and `html-report-issues.png` only after visual QA.

The generated HTML file is temporary and must not be committed.
