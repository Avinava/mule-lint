# mule-lint

MuleSoft static analysis tool — 98 lint rules across 15 runtime categories, TypeScript strict mode.

## Quick Commands

```bash
npm run build          # Compile TypeScript → dist/
npm test              # Run vitest (634 tests)
npm run lint          # ESLint
npm run lint:unused   # knip (dead code detection)
npm run check         # Complete local CI and package verification
```

## Architecture

```
src/
├── engine/LintEngine.ts       # Orchestrator: pre-scan context → per-file rule execution
├── rules/
│   ├── base/BaseRule.ts       # Abstract base for per-file rules
│   ├── base/ProjectRule.ts    # Abstract base for project-level rules (run once)
│   ├── index.ts               # ALL_RULES registry + getRuleById/getRulesByCategory
│   └── {category}/           # Domain-oriented rule directories
├── core/                      # XmlParser, XPathHelper, FileScanner, MetricsAggregator
├── formatters/                # Output: table, json, sarif, html, csv
├── mcp/                       # Model Context Protocol server
├── types/                     # Rule, Issue, ValidationContext, Config interfaces
└── quality/                   # Quality gate definitions
bin/
├── mule-lint.ts              # CLI entry point
└── mule-lint-mcp.ts          # MCP server entry
```

## Adding a Rule

See `.agent/workflows/add-rule.md` for the full template. Summary:

1. Create `src/rules/{category}/{RuleName}Rule.ts` extending `BaseRule` or `ProjectRule`
2. Import and add to `ALL_RULES` array in `src/rules/index.ts`
3. Add test in `tests/unit/{RuleName}.test.ts`
4. Build and run: `npm run build && npm test`

## Rule ID Scheme

| Prefix | Domain               | Prefix | Domain           |
| ------ | -------------------- | ------ | ---------------- |
| MULE   | Core XML validation  | API    | API-Led patterns |
| SEC    | Security             | HYG    | Code hygiene     |
| ERR    | Error handling       | YAML   | YAML properties  |
| LOG    | Logging              | PROJ   | Governance       |
| HTTP   | HTTP configuration   | DOC    | Documentation    |
| PERF   | Performance          | CFG    | Configuration    |
| DW     | DataWeave            | STD    | Coding standards |
| SF     | Salesforce connector | EXP    | Experimental     |
| OPS    | Operations           | RES    | Resilience       |

MULE-prefixed ranges: 001-099=error-handling, 100-199=naming, 200-299=security, 300-399=logging, 400-499=http, 500-599=performance, 600-699=documentation, 700-799=standards, 800-899=complexity/structure.

## Key Patterns

- Rules use `this.select(xpath, doc)` for XPath queries (namespaces pre-configured in XPathHelper)
- Rules use `this.createIssue(node, message, {suggestion})` to report findings
- Rule options via `this.getOption(context, 'key', defaultValue)` — configured in `.mulelintrc.json`
- ProjectRules implement `validateProject(context)` instead of `validate(doc, context)`
- LintEngine pre-scan phase collects cross-file context: `allFlowNames`, `allFlowRefs`, `projectContext`

## Testing

- Framework: vitest
- New tests: `tests/unit/{RuleName}.test.ts`
- Fixtures: `tests/fixtures/valid/` and `tests/fixtures/invalid/`
- Pattern: instantiate rule → parse XML → call `rule.validate(doc, context)` → assert issues

## Code Style

- Conventional Commits (enforced via commitlint)
- Prettier: singleQuote, 100 printWidth, 2 tabWidth
- ESLint: TypeScript strict checked
- Imports use relative paths so compiled CommonJS resolves without alias tooling
- Pre-commit: lefthook runs prettier on staged files

## Configuration

Rules configured via `.mulelintrc.json`:

```json
{
  "rules": {
    "MULE-101": { "enabled": true, "options": { "convention": "camelCase" } },
    "MULE-002": { "enabled": true, "options": { "flowSuffix": "-flow" } }
  }
}
```
