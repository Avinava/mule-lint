import { findingsCsv } from '../../src/formatters/html/client/csv';
it('quotes multiline CSV values and neutralizes spreadsheet formulas', () => {
  const csv = findingsCsv([{ message: '=1+1', suggestion: 'one,"two"\nthree', fileName: '@file' }]);
  expect(csv).toContain('"\'=1+1"');
  expect(csv).toContain('"\'@file"');
  expect(csv).toContain('"one,""two""\nthree"');
});
