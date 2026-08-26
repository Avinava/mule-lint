# Contributing

Thanks for helping improve mule-lint. Start by reading [AGENTS.md](AGENTS.md), which defines architecture, public contracts, safety rules, and the validation matrix.

## Set up

Requires Node.js 20 or newer.

```bash
git clone https://github.com/your-name/mule-lint.git
cd mule-lint
npm ci
npm run build
npm test
```

Use `npm ci` for a reproducible install that matches `package-lock.json`.

## Make a change

1. Create a focused branch.
2. Read the implementation, nearby tests, and relevant docs.
3. Add or update a regression test with the code change.
4. Update public examples/contracts when behavior changes.
5. Run the focused test, then broader checks appropriate to the change.

```bash
npx vitest run tests/unit/Formatters.test.ts
npm run build
npm run format:check
npm run lint
```

Before opening a pull request, run:

```bash
npm run check
```

For documentation/navigation changes, also run:

```bash
python -m pip install -r requirements-docs.txt
mkdocs build --strict
```

## Adding or changing a rule

Follow [.agent/workflows/add-rule.md](.agent/workflows/add-rule.md). A rule change is complete only when implementation, `ALL_RULES`, catalog metadata/standards, profile membership, tests, and the rules catalog agree.

Rule IDs are public API. Do not reuse or casually rename them. Keep style preferences out of error severity and test false-positive boundaries.

## Samples and reports

Use synthetic fixtures and reserved domains such as `.invalid`. Never copy private/customer project names, endpoints, identifiers, payloads, credentials, comments, or business logic into the repository.

HTML/JSON/SARIF/CSV reports can contain source paths and details. Do not commit reports from a private project. Documentation screenshots must be generated from `examples/sample-orders-system-api`.

## Pull requests

Include:

- the user-visible problem and outcome;
- tests run and their result;
- compatibility impact on rule IDs, profiles, config, output, exit codes, library exports, or MCP;
- screenshots for HTML/site layout changes;
- links to primary sources for new time-sensitive technical claims.

Use [Conventional Commits](https://www.conventionalcommits.org/) for commit messages (`feat:`, `fix:`, `docs:`, `test:`, `refactor:`, `chore:`). Commit hooks enforce the format.

## Releases

Maintainers follow semantic versioning and the tag-triggered process in [.agent/workflows/release.md](.agent/workflows/release.md). Do not publish or create release tags from a contributor branch.
