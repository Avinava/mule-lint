import * as fs from 'fs';
import * as path from 'path';
import { LintEngine } from '../../src/engine/LintEngine';
import { ALL_RULES } from '../../src/rules';

/**
 * The docs quote the sample project's summary. This fails when a rule change
 * moves the numbers, so the quoted output is refreshed in the same change.
 */
describe('sample project documentation', () => {
  it('quotes the current recommended-profile summary', async () => {
    const engine = new LintEngine({
      rules: ALL_RULES.filter((rule) => rule.category !== 'experimental'),
      config: { extends: 'mule-lint:recommended' },
    });
    const { summary } = await engine.scan(path.resolve('examples/sample-orders-system-api'));
    const expected = [
      `  Errors:    ${summary.bySeverity.error}`,
      `  Warnings:  ${summary.bySeverity.warning}`,
      `  Infos:     ${summary.bySeverity.info}`,
    ].join('\n');

    for (const file of [
      'README.md',
      'docs/getting-started.md',
      'docs/output-formats.md',
      'examples/sample-orders-system-api/README.md',
    ]) {
      expect(fs.readFileSync(file, 'utf-8'), file).toContain(expected);
    }
  });
});
