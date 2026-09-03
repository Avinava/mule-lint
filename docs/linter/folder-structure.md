# Repository Structure

This repository keeps runtime code, command-line entry points, tests, and documentation separate so
that the published package contains only supported artifacts.

```text
mule-lint/
├── bin/                         # CLI and MCP executable entry points
├── src/
│   ├── core/                    # Configuration, scanning, XML/XPath, and metrics
│   ├── engine/                  # Lint orchestration and report filtering
│   ├── formatter/               # Formatter types and shared contracts
│   ├── formatters/              # Table, JSON, SARIF, HTML, and CSV output
│   ├── mcp/                     # MCP server, handlers, docs, and registration adapter
│   ├── quality/                 # Quality-gate definitions and evaluation
│   ├── rules/                   # 98 built-in rules and their registry
│   │   └── base/                # BaseRule and ProjectRule lifecycle abstractions
│   ├── types/                   # Public interfaces and configuration types
│   └── index.ts                 # Public package exports
├── tests/
│   ├── fixtures/                # Valid and invalid sample projects/files
│   ├── rules/                   # Rule-focused tests
│   ├── unit/                    # Engine, config, formatter, MCP, and utility tests
│   └── tsconfig.json            # Test-only type-checking configuration
├── docs/                        # User and maintainer documentation
├── configs/                     # Shareable lint configuration examples
├── scripts/                     # Package smoke tests and maintenance scripts
├── eslint.config.mjs            # Typed ESLint flat configuration
├── tsconfig.json                # Production TypeScript build
└── vitest.config.mts            # Tests and coverage thresholds
```

## Design Boundaries

- `BaseRule` implementations inspect one parsed XML document at a time.
- `ProjectRule` implementations receive the complete project file set once per scan.
- Hybrid rules can implement both per-file validation and `runProject()` for cross-file analysis.
- `LintEngine` owns scanning, shared project context, configuration, severity overrides, summaries,
  metrics, and quality gates.
- Formatters consume a completed `LintReport`; they do not alter findings or metrics.
- Imports are relative. There are no runtime TypeScript path aliases to translate after compilation.

## Build and Package Layout

`npm run build` cleans and compiles production sources. Runtime modules are emitted under
`dist/src`, while executable entry points are emitted under `dist/bin`. `package.json` maps
`main`, `types`, and `bin` to those compiled paths.

The package smoke test installs the generated tarball in an isolated directory and verifies the
CommonJS API, formatter output, CLI, and bundled MCP documentation.

## Verification

Run the same complete verification used before publishing:

```bash
npm run check
```

This checks formatting, typed linting, production and test type-checking, unused exports, coverage,
package metadata and installation, and the production dependency audit.
