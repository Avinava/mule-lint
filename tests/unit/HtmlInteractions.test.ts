// @vitest-environment jsdom
import { startReport } from '../../src/formatters/html/client/redesign';
import { buildClientData } from '../../src/formatters/html/reportData';
import { createReportContract } from '../../src/core/ReportContract';
import fixture from '../fixtures/reports/html-characterization.json';
import { ALL_RULES } from '../../src/rules';
import type { LintReport } from '../../src/types/Report';
const report = fixture as LintReport;
const click = (action: string, value?: string) => {
  const buttons = [...document.querySelectorAll<HTMLElement>('[data-action]')];
  const b = buttons.find(
    (b) => b.dataset.action === action && (value === undefined || b.dataset.value === value),
  );
  expect(b, action).toBeDefined();
  b!.click();
};
const setup = (r = report, catalog: Parameters<typeof buildClientData>[1] = []) => {
  document.body.innerHTML =
    '<button data-action="view" data-value="findings">Findings</button><button data-action="view" data-value="files">Files</button><button data-action="view" data-value="architecture">Architecture</button><button data-action="view" data-value="rules">Rules</button><div id="report-app"></div><dialog id="finding-dialog"></dialog>';
  const d = buildClientData(r, catalog, createReportContract(r, catalog));
  window.matchMedia = () => ({ matches: false }) as MediaQueryList;
  HTMLDialogElement.prototype.showModal = function () {
    this.open = true;
  };
  HTMLDialogElement.prototype.close = function () {
    this.open = false;
    this.dispatchEvent(new Event('close'));
  };
  startReport(d);
  return d;
};
// Each setup owns document listeners; isolate tests by resetting the document event methods.
let listeners: [string, EventListenerOrEventListenerObject][];
const original = document.addEventListener.bind(document);
beforeEach(() => {
  listeners = [];
  vi.spyOn(document, 'addEventListener').mockImplementation((name, fn, options) => {
    listeners.push([name, fn]);
    original(name, fn, options);
  });
});
afterEach(() => {
  listeners.forEach(([name, fn]) => {
    document.removeEventListener(name, fn);
  });
  vi.restoreAllMocks();
});
it('combines search and severity filters and resets the entire selection', () => {
  setup();
  click('view', 'findings');
  expect(document.querySelectorAll('.finding')).toHaveLength(2);
  const input = document.getElementById('finding-search') as HTMLInputElement;
  input.value = 'SYNTH-1';
  input.dispatchEvent(new Event('input', { bubbles: true }));
  expect(document.querySelectorAll('.finding')).toHaveLength(1);
  click('toggle', 'warning');
  expect(document.querySelectorAll('.finding')).toHaveLength(0);
  click('reset');
  expect(document.querySelectorAll('.finding')).toHaveLength(2);
});
it('opens escaped source details and restores the opener after closing', () => {
  setup();
  click('view', 'findings');
  const b = document.querySelector<HTMLButtonElement>('.finding')!;
  b.focus();
  b.click();
  const dialog = document.querySelector('dialog')!;
  expect(dialog.open).toBe(true);
  expect(dialog.textContent).toContain('Location');
  expect(dialog.querySelector('img')).toBeNull();
  click('close');
  expect(document.activeElement).toBe(b);
});
it('preserves file parse failures and shows unavailable metrics honestly', () => {
  setup();
  click('view', 'files');
  expect(document.getElementById('report-app')!.textContent).toContain('Not parsed');
  click('view', 'architecture');
  expect(document.getElementById('report-app')!.textContent).toContain('Not available');
});
it('bounds large groups while counts and show-more retain all results', () => {
  const r = structuredClone(report);
  r.files = r.files.slice(0, 1);
  r.files[0].issues = Array.from({ length: 5000 }, (_, i) => ({
    ...r.files[0].issues[0],
    message: `Finding ${i}`,
  }));
  r.files[0].parsed = true;
  setup(r);
  click('view', 'findings');
  expect(document.querySelectorAll('.finding')).toHaveLength(100);
  expect(document.getElementById('report-app')!.textContent).toContain('5000 of 5000');
  click('more');
  expect(document.querySelectorAll('.finding')).toHaveLength(200);
});
it('groups findings by file and preserves search when switching views', () => {
  setup();
  click('view', 'findings');
  click('group', 'file');
  expect(
    document.querySelector('[data-action=group][data-value=file]')?.getAttribute('aria-pressed'),
  ).toBe('true');
  expect(document.getElementById('report-app')?.textContent).toContain('main.xml');
  const search = document.getElementById('finding-search') as HTMLInputElement;
  search.value = 'SYNTH';
  search.dispatchEvent(new Event('input', { bubbles: true }));
  click('view', 'files');
  click('view', 'findings');
  expect((document.getElementById('finding-search') as HTMLInputElement).value).toBe('SYNTH');
});
it.each(['no-files', 'complete'] as const)(
  'distinguishes %s reports with no findings',
  (status) => {
    const r = structuredClone(report);
    r.files =
      status === 'no-files'
        ? []
        : r.files.slice(0, 1).map((f) => ({ ...f, parsed: true, issues: [] }));
    r.summary.totalFiles = r.files.length;
    r.summary.parseErrors = 0;
    setup(r);
    expect(document.getElementById('report-app')?.textContent).toContain(
      status === 'no-files' ? 'No files scanned' : 'No findings reported',
    );
  },
);

it('uses SVG severity chips and segmented grouping with accessible selected states', () => {
  setup();
  click('view', 'findings');
  expect(document.querySelectorAll('.severity-chip svg')).toHaveLength(3);
  expect(document.querySelectorAll('.segmented button')).toHaveLength(4);
  click('group', 'category');
  expect(
    document
      .querySelector('[data-action=group][data-value=category]')
      ?.getAttribute('aria-pressed'),
  ).toBe('true');
  click('toggle', 'error');
  expect(
    document.querySelector('[data-action=toggle][data-value=error]')?.getAttribute('aria-pressed'),
  ).toBe('false');
});
it('filters rules using category pills and provides an honest empty triggered state', () => {
  setup(report, ALL_RULES);
  click('view', 'rules');
  expect(document.querySelectorAll('.category-pill').length).toBeGreaterThan(10);
  click('rule-category', 'security');
  expect(
    document
      .querySelector('[data-action=rule-category][data-value=security]')
      ?.getAttribute('aria-pressed'),
  ).toBe('true');
  expect(document.querySelector('.category-badge-solid')?.textContent).toBe('SC');
  click('hit');
  expect(document.getElementById('report-app')?.textContent).toContain('No rules match.');
});
it('renders file badges, severity counts and compact line-number rows', () => {
  setup();
  click('view', 'files');
  expect(document.querySelector('.file-badge')?.textContent).toBe('XML');
  expect(document.querySelectorAll('.file-counts svg')).toHaveLength(6);
  expect(document.querySelector('.line-number')?.textContent).toBe('—');
  expect(
    [...document.querySelectorAll('.line-number')].some((node) => node.textContent === 'L12'),
  ).toBe(true);
});

it('shows unknown scope and missing metrics without fabricated zero values', () => {
  const r = structuredClone(report);
  delete r.scope;
  delete r.metrics;
  setup(r);
  const facts = [...document.querySelectorAll('.facts>div')];
  expect(
    facts.find((node) => node.textContent.includes('Enabled rules'))?.querySelector('strong')
      ?.textContent,
  ).toBe('—');
  click('view', 'architecture');
  expect(document.getElementById('report-app')?.textContent).toContain('Not available');
  expect(document.querySelectorAll('.metric strong')).toHaveLength(0);
});
it('counts only the displayed rules in a filtered catalog category heading', () => {
  const rules = ALL_RULES.filter((r) => r.category === 'security').slice(0, 2);
  const r = structuredClone(report);
  r.files = [
    {
      filePath: '/synthetic/main.xml',
      relativePath: 'main.xml',
      parsed: true,
      issues: rules.map((rule, index) => ({
        ruleId: rule.id,
        message: `Synthetic ${index}`,
        severity: 'warning',
        line: index + 1,
      })),
    },
  ];
  r.summary.totalFiles = 1;
  r.summary.parseErrors = 0;
  setup(r, rules);
  click('view', 'rules');
  const search = document.getElementById('rule-search') as HTMLInputElement;
  search.value = rules[0].id;
  search.dispatchEvent(new Event('input', { bubbles: true }));
  expect(document.querySelector('.catalog-head')?.textContent).toContain('1 rules · 1 findings');
});
it('orders file findings by their real line numbers and uses that order in the drawer', () => {
  const r = structuredClone(report);
  r.files = r.files.slice(0, 1);
  r.files[0].parsed = true;
  r.files[0].issues = [
    { ruleId: 'SYNTH-A', severity: 'error', line: 40, message: 'Later error' },
    { ruleId: 'SYNTH-B', severity: 'warning', line: 7, message: 'Earlier warning' },
  ];
  r.summary.parseErrors = 0;
  setup(r);
  click('view', 'files');
  expect([...document.querySelectorAll('.line-number')].map((n) => n.textContent)).toEqual([
    'L7',
    'L40',
  ]);
  document.querySelector<HTMLButtonElement>('.finding')?.click();
  expect(document.querySelector('dialog')?.textContent).toContain('Earlier warning');
  click('next');
  expect(document.querySelector('dialog')?.textContent).toContain('Later error');
});
it.each([7, 19])(
  'renders architecture and grades from supplied metrics (%s), not reference scenarios',
  (n) => {
    const r = structuredClone(report);
    r.files = r.files.slice(0, 1).map((f) => ({ ...f, parsed: true }));
    r.summary.totalFiles = 1;
    r.summary.parseErrors = 0;
    r.metrics = {
      flowCount: n,
      subFlowCount: n + 1,
      dwTransformCount: n + 2,
      connectorConfigCount: n + 3,
      httpListenerCount: n + 4,
      connectorTypes: ['synthetic'],
      errorHandlerCount: 0,
      choiceRouterCount: 0,
      apiEndpoints: [{ path: '/synthetic', method: 'POST' }],
      environments: ['synthetic'],
      securityPatterns: [],
      externalServices: [],
      schedulers: [],
      fileComplexity: {},
      flowComplexityData: [
        {
          flowName: 'synthetic',
          file: 'main.xml',
          complexity: n,
          rating: 'moderate',
          breakdown: {},
        },
      ],
      complexity: { total: n, average: n, highest: { flow: 'synthetic', value: n }, rating: 'C' },
      maintainability: {
        technicalDebtMinutes: n,
        technicalDebt: `${n}min`,
        debtRatio: n,
        rating: 'B',
      },
      reliability: { bugs: n, rating: 'D' },
      security: { vulnerabilities: n + 1, hotspots: 0, rating: 'E' },
    };
    setup(r);
    expect(document.querySelector('.facts')?.textContent).toContain(`${n}min`);
    expect([...document.querySelectorAll('.grade')].map((node) => node.textContent)).toEqual([
      'D',
      'E',
      'B',
      'C',
    ]);
    click('view', 'architecture');
    expect(
      [...document.querySelectorAll('.architecture-cards strong')].map((node) => node.textContent),
    ).toEqual([n, n + 1, n + 4, n + 2, n + 3].map(String));
    expect(document.querySelector('.grade-explanations')?.textContent).toContain(
      `${n} bug-type findings`,
    );
    expect(document.querySelector('.grade-explanations')?.textContent).toContain(
      `${n + 1} vulnerabilities`,
    );
    expect(document.querySelector('.grade-explanations')?.textContent).not.toContain('hotspots');
  },
);
it('preserves the actual gate operator, threshold and observed value', () => {
  const r = structuredClone(report);
  r.gate = {
    gate: {
      name: 'Synthetic gate',
      conditions: [{ metric: 'warnings', operator: '>=', threshold: 7, status: 'warn' }],
    },
    conditions: [
      {
        condition: { metric: 'warnings', operator: '>=', threshold: 7, status: 'warn' },
        actualValue: 19,
        passed: false,
      },
    ],
    status: 'warning',
    message: 'Synthetic gate warning',
  };
  setup(r);
  expect(document.querySelector('.gate-conditions')?.textContent).toContain(
    'warnings: 19 · violation when >= 7 (warn)',
  );
});
