import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const css = readFileSync(resolve('src/formatters/html/client/redesign.css'), 'utf8');
function tokens(pattern: RegExp) {
  const result: Record<string, string> = {};
  for (const block of css.matchAll(pattern)) {
    for (const entry of block[1].matchAll(/(--[\w-]+)\s*:\s*([^;]+);/g)) {
      result[entry[1]] = entry[2].replace(/\s/g, '');
    }
  }
  return result;
}
const light = tokens(/:root\s*\{([^}]+)\}/g);
const dark = { ...light, ...tokens(/html\[data-theme=['"]dark['"]\]\s*\{([^}]+)\}/g) };
const referenceLight: Record<string, string> = {
  '--bg': 'oklch(0.975 0.004 200)',
  '--panel': '#fff',
  '--sunk': 'oklch(0.965 0.005 200)',
  '--hover': 'oklch(0.97 0.008 190)',
  '--sel': 'oklch(0.95 0.025 175)',
  '--ink': 'oklch(0.22 0.012 230)',
  '--ink2': 'oklch(0.44 0.012 230)',
  '--ink3': 'oklch(0.58 0.01 230)',
  '--line': 'oklch(0.91 0.006 230)',
  '--line2': 'oklch(0.85 0.008 230)',
  '--accent': 'oklch(0.58 0.12 172)',
  '--accent-ink': 'oklch(0.42 0.09 172)',
  '--accent-soft': 'oklch(0.95 0.03 172)',
  '--err': 'oklch(0.57 0.2 25)',
  '--err-soft': 'oklch(0.96 0.025 25)',
  '--warn': 'oklch(0.74 0.15 72)',
  '--warn-soft': 'oklch(0.97 0.035 80)',
  '--info': 'oklch(0.6 0.12 245)',
  '--info-soft': 'oklch(0.96 0.02 245)',
  '--g-a': 'oklch(0.6 0.13 160)',
  '--g-b': 'oklch(0.68 0.14 125)',
  '--g-c': 'oklch(0.74 0.15 80)',
  '--g-d': 'oklch(0.67 0.16 50)',
  '--g-e': 'oklch(0.57 0.2 25)',
  '--shadow': '0 1px 2px oklch(0.2 0.01 230/0.06)',
};
const referenceDark: Record<string, string> = {
  ...referenceLight,
  '--bg': 'oklch(0.17 0.008 230)',
  '--panel': 'oklch(0.205 0.009 230)',
  '--sunk': 'oklch(0.185 0.008 230)',
  '--hover': 'oklch(0.235 0.01 220)',
  '--sel': 'oklch(0.27 0.035 175)',
  '--ink': 'oklch(0.95 0.005 230)',
  '--ink2': 'oklch(0.76 0.01 230)',
  '--ink3': 'oklch(0.62 0.01 230)',
  '--line': 'oklch(0.28 0.01 230)',
  '--line2': 'oklch(0.34 0.01 230)',
  '--accent': 'oklch(0.72 0.12 172)',
  '--accent-ink': 'oklch(0.8 0.1 172)',
  '--accent-soft': 'oklch(0.27 0.04 172)',
  '--err': 'oklch(0.68 0.18 25)',
  '--err-soft': 'oklch(0.27 0.05 25)',
  '--warn': 'oklch(0.8 0.14 78)',
  '--warn-soft': 'oklch(0.28 0.04 78)',
  '--info': 'oklch(0.72 0.11 245)',
  '--info-soft': 'oklch(0.27 0.04 245)',
  '--shadow': '0 1px 2px #0006',
};
it.each([
  ['light', light, referenceLight],
  ['dark', dark, referenceDark],
] as const)('preserves every approved %s color and shadow token', (_theme, actual, expected) => {
  for (const [token, value] of Object.entries(expected))
    expect(actual[token], token).toBe(value.replace(/\s/g, ''));
});
it('uses semantic colors for all grades and the approved layout dimensions', () => {
  for (const grade of 'ABCDE')
    expect(css).toMatch(
      new RegExp(`\\.grade-${grade}\\s*\\{\\s*background: var\\(--g-${grade.toLowerCase()}\\)`),
    );
  expect(light['--layout-max']).toBe('1240px');
  expect(light['--radius-panel']).toBe('14px');
  expect(light['--radius-card']).toBe('12px');
});
