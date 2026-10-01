import { LintReport } from '../types/Report';

/** Escape text for XML, dropping characters XML 1.0 cannot represent. */
function xml(value: string): string {
  return value
    .replace(/[^\u0009\u000A\u000D -퟿-�]/gu, '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/**
 * Format a lint report as JUnit XML. One test suite per scanned file; each
 * error or warning is a failed test case, info issues are passing cases.
 */
export function formatJunit(report: LintReport): string {
  const suites: string[] = [];
  let totalTests = 0;
  let totalFailures = 0;

  for (const file of report.files) {
    const cases: string[] = [];
    let failures = 0;

    if (!file.parsed) {
      failures++;
      cases.push(
        `    <testcase classname="${xml(file.relativePath)}" name="PARSE-ERROR">\n` +
          `      <failure type="error" message="${xml(file.parseError ?? 'Failed to parse file')}"/>\n` +
          `    </testcase>`,
      );
    }
    for (const issue of file.issues) {
      const name = `${issue.ruleId}${issue.line > 0 ? `:${issue.line}` : ''}`;
      if (issue.severity === 'info') {
        cases.push(`    <testcase classname="${xml(file.relativePath)}" name="${xml(name)}"/>`);
        continue;
      }
      failures++;
      cases.push(
        `    <testcase classname="${xml(file.relativePath)}" name="${xml(name)}">\n` +
          `      <failure type="${issue.severity}" message="${xml(issue.message)}">${xml(`${issue.ruleId} ${file.relativePath}:${issue.line}\n${issue.message}`)}</failure>\n` +
          `    </testcase>`,
      );
    }

    if (cases.length === 0) continue;
    totalTests += cases.length;
    totalFailures += failures;
    suites.push(
      `  <testsuite name="${xml(file.relativePath)}" tests="${cases.length}" failures="${failures}">\n${cases.join('\n')}\n  </testsuite>`,
    );
  }

  return (
    `<?xml version="1.0" encoding="UTF-8"?>\n` +
    `<testsuites name="mule-lint" tests="${totalTests}" failures="${totalFailures}">\n` +
    (suites.length > 0 ? `${suites.join('\n')}\n` : '') +
    `</testsuites>`
  );
}
