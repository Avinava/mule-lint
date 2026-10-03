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

## Shared analysis policy

This section describes the unreleased shared-service addition; older published versions may
only expose the existing engine API.

For the same explicit configuration, selection, baseline, gate and exit policy as the CLI,
use the additive `analyze()` service:

```typescript
import { analyze, format } from '@sfdxy/mule-lint';

const result = await analyze({
  targetPath: '/absolute/path/to/mule-project',
  profile: 'recommended',
  quiet: false,
  qualityGate: 'default',
  format: 'report-json',
});
console.log(result.contract.execution, result.exitCode);
console.log(format(result.report, result.formatter, result.rules));
```

`configPath` and `baselinePath` are loaded only when explicitly supplied. No configuration
file is discovered automatically. Warning failure retains CLI semantics: either request or
configuration `failOnWarning: true` fails warnings; an explicit false does not negate a true
configuration setting. The service returns messages instead of printing config
warnings; adapters may receive them through `onMessage`. Verbose engine diagnostics retain
the existing stderr behavior. It never writes a report or exits the host process.

Advanced callers can supply `rules` or a preconfigured `engine` as the second argument.
A supplied engine provides its actual enabled rule metadata; do not combine it with separate
rules/config/profile/experimental options. Only scan configuration is inherited; formatter, warning-exit and gate settings remain explicit
service request policy. Config-named gates require an explicit configuration file, so use a
built-in gate with a supplied engine. Existing engine serialization is retained. A complete
file-target execution does not establish whole-project coverage; inspect `contract.scan`.

See the [generated contract reference](generated/report-contract.md) and
[analysis pipeline decision](decisions/analysis-pipeline.md). Existing `LintEngine` and formatter
exports remain available; XML/API formatting and validation are separate capabilities.

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

## Versioned analysis reports

Use `createReportContract(report, rules)` and validate with the exported `reportSchema` for
the same version 1 envelope as CLI `--format report-json` and MCP `structuredContent`.
Check `execution.status` before consuming findings. `scopeKnown: false` identifies legacy
`LintReport` objects without scan scope. `formatJson` stays a flat array and `formatJsonFull`
keeps its existing library report representation. See [output formats](output-formats.md#versioned-report-json).
