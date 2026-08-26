---
description: Add or change a mule-lint rule without breaking registry, catalog, profile, or docs parity
---

# Add a lint rule

## 1. Define the engineering outcome

Before code, write down:

- the failure/risk the rule detects;
- where it applies and known exceptions;
- evidence that it can be decided statically;
- why the chosen severity is appropriate;
- the standard it supports.

Do not add a rule only because a pattern differs from personal style. Prefer high-confidence checks with a clear Mule runtime, security, correctness, resilience, or maintainability outcome.

## 2. Choose identity and placement

Search first:

```bash
rg "RULE-ID|candidate rule name" src tests docs
```

Use the existing prefixes/ranges in `docs/linter/naming-conventions.md`. Put the implementation in the closest `src/rules/{category}/` directory.

- Extend `BaseRule` for a check evaluated per XML document.
- Extend `ProjectRule` for a check that should run once per scan.
- Use `context.projectContext` for cross-file facts already collected by the engine.

## 3. Implement with shared helpers

Use `this.select`, `this.getAttribute`, `this.getDocName`, `this.createIssue`, and `this.getOption`. Provide a specific message and actionable suggestion. Avoid filesystem scans inside a per-file rule.

## 4. Register every public representation

Update all applicable files:

1. `src/rules/index.ts` — export and instantiate in `ALL_RULES`.
2. `src/catalog/standards.ts` — add/reuse the reviewed engineering standard.
3. `src/catalog/rules.ts` — map the rule to standards, docs, and resource URI.
4. `src/catalog/profiles.ts` — choose `baseline`, `recommended`, `strict`, or experimental membership intentionally.
5. `docs/best-practices/rules-catalog.md` — add the exact heading `### RULE-ID: Rule Name`, applicability, bad/good example, and options.
6. Relevant practice guide — update only when the new rule changes its executable coverage.

Profile membership is release-visible behavior. A new experimental rule does not belong in stable profiles until reviewed.

## 5. Test behavior and boundaries

Add focused tests covering:

- a valid pattern with zero findings;
- an invalid pattern with exact rule ID/severity/message location expectations;
- important namespace, path, or framework-generated exceptions;
- rule options and exclusions;
- project/cross-file behavior when applicable.

Use synthetic fixtures only. Never turn a private Mule project into a committed fixture.

## 6. Validate parity

```bash
npm run build
npx vitest run tests/unit/RuleRegistry.test.ts
npx vitest run tests/unit/McpResources.test.ts
npx vitest run tests/unit/<RelevantRuleTest>.test.ts
npm run format:check
npm run lint
mkdocs build --strict
```

Run `npm run check` before a pull request. If the change affects CLI/MCP output or profiles, add a compatibility note to the changelog/release notes as appropriate.
