import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const require = createRequire(path.join(root, 'package.json'));
const { z } = require('zod');
const prettier = require('prettier');
const { reportSchema } = require('./dist/src/core/ReportContract.js');
const schema = z.toJSONSchema(reportSchema, { io: 'input' });
const { ALL_RULES } = require('./dist/src/rules/index.js');
const { RULE_PROFILES, isRuleEnabledInProfile } = require('./dist/src/catalog/index.js');
const categories = [...new Set(ALL_RULES.map((rule) => rule.category))].sort();
const ruleSummary = {
  registeredRules: ALL_RULES.length,
  categories: categories.map((category) => ({
    category,
    count: ALL_RULES.filter((rule) => rule.category === category).length,
  })),
  profiles: RULE_PROFILES.map((profile) => ({
    name: profile.name,
    count: ALL_RULES.filter((rule) => isRuleEnabledInProfile(rule, profile.name)).length,
  })),
};
const ruleReference = `# Rule registry reference

Generated from \`ALL_RULES\` and the runtime profile membership function. Do not copy these
counts into architecture or ecosystem documents. Rule meanings and reviewed explanations
remain in the [canonical rules catalog](../best-practices/rules-catalog.md).

Registered rules: **${ruleSummary.registeredRules}**.

| Runtime category | Registered rules |
| --- | --- |
${ruleSummary.categories.map((entry) => `| \`${entry.category}\` | ${entry.count} |`).join('\n')}

| Built-in profile | Enabled rules |
| --- | --- |
${ruleSummary.profiles.map((entry) => `| \`${entry.name}\` | ${entry.count} |`).join('\n')}

Explicit rule settings and experimental opt-in can change effective scan selection. Always
inspect a report's enabled rule IDs; registry/profile counts are not execution evidence.

[Machine-readable summary](rule-summary.json). Regenerate/check with the contract-reference script.
`;

const rows = Object.entries(schema.properties)
  .map(
    ([name, value]) =>
      `| \`${name}\` | ${value.type ?? (value.anyOf ? 'union' : 'value')} | ${schema.required.includes(name) ? 'yes' : 'no'} |`,
  )
  .join('\n');
const reference = `# Report contract reference

Generated from the exported \`reportSchema\`. Do not edit the schema or field table by hand.
Run \`npm run build && node scripts/generate-contract-reference.mjs\` after an intentional
contract change; \`--check\` rejects drift without writing.

The [machine-readable JSON Schema](report-v1.schema.json) validates the known version-1 fields while allowing additive fields for forward-compatible
consumers. The live MCP output schema describes the current producer shape; do not use an
older closed producer schema to reject a newer additive version-1 report.
Fatal tool errors may contain error text without a report. Consumers must separately check
execution completeness, known scan scope, and gate outcomes before interpreting findings.
This reference does not claim that an older installed package supports report-v1.

| Top-level field | JSON type | Required |
| --- | --- | --- |
${rows}

- Schema version: \`${schema.properties.schemaVersion.const}\`
- Execution states: ${schema.properties.execution.properties.status.enum.map((value) => `\`${value}\``).join(', ')}
- Gate states: ${schema.properties.gate.properties.status.enum.map((value) => `\`${value}\``).join(', ')}
- Fingerprint version: \`${schema.properties.findings.items.properties.fingerprintVersion.const}\`

See [output formats](../output-formats.md#versioned-report-json) for semantics and examples,
[the library API](../library.md) for the shared service, and
[the architecture decision](../decisions/analysis-pipeline.md) for compatibility boundaries.
`;
const outputs = new Map([
  ['docs/generated/rule-summary.json', JSON.stringify(ruleSummary, null, 2) + '\n'],
  ['docs/generated/rule-reference.md', ruleReference],
  ['docs/generated/report-v1.schema.json', JSON.stringify(schema, null, 2) + '\n'],
  ['docs/generated/report-contract.md', reference],
]);
let drift = false;
for (const [relative, content] of outputs) {
  const destination = path.join(root, relative);
  const formatted = await prettier.format(content, {
    ...(await prettier.resolveConfig(destination)),
    filepath: destination,
  });
  if (process.argv.includes('--check')) {
    if (!fs.existsSync(destination) || fs.readFileSync(destination, 'utf8') !== formatted) {
      console.error(`Generated contract reference is stale: ${relative}`);
      drift = true;
    }
  } else {
    fs.mkdirSync(path.dirname(destination), { recursive: true });
    fs.writeFileSync(destination, formatted);
  }
}
if (drift) process.exitCode = 1;
else
  console.log(
    process.argv.includes('--check')
      ? 'Contract reference: current'
      : 'Contract reference: generated',
  );
