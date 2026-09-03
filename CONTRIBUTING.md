# Contributing to Mule-Lint

Thank you for your interest in contributing to Mule-Lint! This document provides guidelines and information for contributors.

## Getting Started

1. Fork the repository
2. Clone your fork: `git clone https://github.com/your-username/mule-lint.git`
3. Install dependencies: `npm install`
4. Create a branch: `git checkout -b feature/your-feature`

## Development Workflow

```bash
# Build the project
npm run build

# Run tests
npm test

# Run linter
npm run lint

# Fix lint issues
npm run lint:fix

# Build and test
npm run build && npm test

# Run the complete CI-equivalent verification
npm run check
```

## Project Structure

```
mule-lint/
├── src/
│   ├── types/          # TypeScript interfaces
│   ├── core/           # XPath, XML parsing, file scanning
│   ├── engine/         # LintEngine orchestration
│   ├── rules/          # All lint rules (82 total)
│   │   ├── base/       # BaseRule abstract class
│   │   ├── api-led/
│   │   ├── complexity/
│   │   ├── dataweave/
│   │   ├── documentation/
│   │   ├── error-handling/
│   │   ├── experimental/
│   │   ├── governance/
│   │   ├── http/
│   │   ├── logging/
│   │   ├── naming/
│   │   ├── operations/
│   │   ├── performance/
│   │   ├── security/
│   │   ├── standards/
│   │   ├── structure/
│   │   └── yaml/
│   └── formatters/     # Output formatters
├── bin/                # CLI entry point
├── tests/
│   ├── fixtures/       # XML test files
│   └── unit/           # Unit tests
└── docs/               # Documentation
```

## Adding a New Rule

1. **Choose a Rule ID**: Follow the format `MULE-XXX` for core rules or use a prefix for custom rules
2. **Create the Rule File**: Add to the appropriate category folder in `src/rules/`
3. **Extend BaseRule**: Use the provided utilities for XPath queries
4. **Register the Rule**: Add to `src/rules/index.ts`
5. **Write Tests**: Create test file in `tests/unit/`
6. **Update Documentation**: Add to `docs/best-practices/rules-catalog.md`

### Rule Template

```typescript
import { ValidationContext, Issue } from '../../types';
import { BaseRule } from '../base/BaseRule';

export class MyNewRule extends BaseRule {
  id = 'MULE-XXX';
  name = 'My New Rule';
  description = 'Description of what this rule checks';
  severity = 'warning' as const; // 'error' | 'warning' | 'info'
  category = 'standards' as const;

  validate(doc: Document, context: ValidationContext): Issue[] {
    const issues: Issue[] = [];

    // Use XPath to find elements
    const elements = this.select('//mule:flow', doc);

    for (const element of elements) {
      // Check condition
      if (!this.hasAttribute(element, 'name')) {
        issues.push(
          this.createIssue(element, 'Flow is missing name attribute', {
            suggestion: 'Add a name attribute to the flow',
          }),
        );
      }
    }

    return issues;
  }
}
```

## Commit Guidelines

Use conventional commits:

- `feat:` New features
- `fix:` Bug fixes
- `docs:` Documentation changes
- `refactor:` Code refactoring
- `test:` Adding tests
- `chore:` Maintenance tasks

Examples:

```
feat: add MULE-011 rule for database connection pooling
fix: correct XPath query in FlowNamingRule
docs: update rules catalog with new examples
```

## Pull Request Process

1. Ensure all tests pass: `npm test`
2. Ensure lint passes: `npm run lint`
3. Update documentation if needed
4. Create a pull request with a clear description
5. Link any related issues

## Code Style

- Use TypeScript strict mode
- Follow existing naming conventions (see `docs/linter/naming-conventions.md`)
- Add JSDoc comments for public APIs
- Keep functions focused and small

## Testing Guidelines

- Write unit tests for all new rules
- Write XML test data inline in the test as a template literal, parsed with `parseXml()`. The files
  under `tests/fixtures/` back the CLI smoke tests in CI and are not used by unit tests
- For project-level rules, build a throwaway project with `fs.mkdtempSync()` and run `engine.scan()`,
  so the pre-scan and shared context are exercised
- Test both positive (should pass) and negative (should fail) cases
- Test edge cases and configuration options

## Dependency ceilings

Some dependencies are deliberately held below their latest major. Each is a
constraint, not neglect — please do not bump them without addressing the reason.

| Package                         | Held at | Why                                                                                                                                                                                                                                           |
| ------------------------------- | ------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `chalk`                         | 4       | Pure ESM from v5. This package is CommonJS, so v4 is the last usable release.                                                                                                                                                                 |
| `commander`                     | 14      | v15 is pure ESM and requires Node 22.                                                                                                                                                                                                         |
| `vitest`, `@vitest/coverage-v8` | 4       | v5 requires Node 22.12+, which would drop the Node 20 CI job.                                                                                                                                                                                 |
| `@commitlint/*`                 | 20      | v21 requires Node 22.12+.                                                                                                                                                                                                                     |
| `typescript`                    | 6       | No `typescript-eslint` release supports v7 — its peer range caps at `<6.1.0`.                                                                                                                                                                 |
| `@types/node`                   | 20      | Should track the oldest supported Node, which `engines.node` sets to 20.                                                                                                                                                                      |
| `@xmldom/xmldom`                | 0.8     | v0.9 ships its own `Document`/`Node` types that are incompatible with the `lib.dom` types the public `Rule.validate(doc: Document)` signature exposes. Moving would be a breaking API change. The 0.8 line still receives security backports. |

Raising the Node floor to 22 would unlock `chalk`, `commander`, `vitest`, and
`@commitlint/*` together. That is a breaking change for consumers and belongs in
a major release, not a minor one.

## Releasing

Maintainers follow semantic versioning:

- **MAJOR**: Breaking changes
- **MINOR**: New features (backward compatible)
- **PATCH**: Bug fixes

## Questions?

Open an issue for any questions or discussions.

---

Thank you for contributing! 🎉
