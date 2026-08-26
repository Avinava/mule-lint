# Library API

Most MuleSoft developers should use the CLI. Use the TypeScript/JavaScript library when building an editor integration, internal portal, or custom automation.

## Install

```bash
npm install @sfdxy/mule-lint
```

## Scan a project

```typescript
import { ALL_RULES, LintEngine, formatSarif } from '@sfdxy/mule-lint';

const engine = new LintEngine({
  rules: ALL_RULES,
  config: { extends: 'mule-lint:recommended' },
});

const report = await engine.scan('/absolute/path/to/mule-project');
console.log(report.summary);

const sarif = formatSarif(report);
```

Use an absolute project path in long-running integrations so the result does not depend on the process working directory.

## Validate XML content in memory

```typescript
const issues = engine.scanContent(xmlSource, 'orders-api.xml');
```

Snippet validation cannot run project-level or cross-file checks. Use `scan()` whenever you have a project directory.

## Format XML content

```typescript
import { formatXmlContent } from '@sfdxy/mule-lint';

const result = await formatXmlContent(xmlSource, {
  tabWidth: 4,
  printWidth: 140,
});

console.log(result.formatted);
```

## Validate an API contract

```typescript
import { validateApiContract } from '@sfdxy/mule-lint';

const report = await validateApiContract({
  projectPath: '/absolute/path/to/api-project',
  mainFile: 'api.raml',
});
```

## Public contracts

The package exports types, engine/core APIs, registered rules, formatters, quality calculators, catalogs/profiles, XML formatting, and API contract validation from its root entry point.

For a custom rule, extend `BaseRule`, give it stable metadata, and pass it into your own `LintEngine`. The CLI does not dynamically load arbitrary rule modules. See [Extending mule-lint](linter/extending.md).
