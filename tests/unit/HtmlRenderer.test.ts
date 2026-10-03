// @vitest-environment jsdom
import type { ChartConfiguration } from 'chart.js';
import type { CellComponent, RowComponent } from 'tabulator-tables';
import fixture from '../fixtures/reports/html-characterization.json';
import { formatHtml } from '../../src/formatters/HtmlFormatter';
import { buildClientData, type ClientIssue } from '../../src/formatters/html/reportData';
import { createReportContract } from '../../src/core/ReportContract';
import { createReportApp } from '../../src/formatters/html/client/app';
import type { LintReport } from '../../src/types/Report';

interface Column {
  field: string;
  formatter: (cell: CellComponent) => string;
  sorter?: (a: string, b: string) => number;
}
const mocks = vi.hoisted(() => ({
  charts: [] as ChartConfiguration[],
  columns: [] as Column[],
  rows: [] as ClientIssue[],
  handlers: new Map<string, (...args: unknown[]) => void>(),
  failTable: false,
  failChart: false,
}));
vi.mock('chart.js/auto', () => ({
  Chart: class {
    static defaults = { font: { family: '', size: 0 }, color: '' };
    constructor(_canvas: unknown, configuration: ChartConfiguration) {
      if (mocks.failChart) throw new Error('Synthetic canvas failure');
      mocks.charts.push(configuration);
    }
  },
}));
vi.mock('tabulator-tables', () => ({
  TabulatorFull: class {
    constructor(_selector: string, options: { data: ClientIssue[]; columns: Column[] }) {
      if (mocks.failTable) throw new Error('Synthetic table failure');
      mocks.rows = options.data;
      mocks.columns = options.columns;
    }
    on(name: string, handler: (...args: unknown[]) => void) {
      mocks.handlers.set(name, handler);
    }
    getHeaderFilters() {
      return [];
    }
    getDataCount() {
      return mocks.rows.length;
    }
    getRows() {
      return mocks.rows.map((data) => ({ getData: () => data }));
    }
    clearFilter() {
      /* fake table */
    }
    setFilter(predicate: (data: unknown) => boolean) {
      mocks.rows.filter(predicate);
    }
    redraw() {
      /* fake table */
    }
  },
}));

function harness() {
  const report = structuredClone(fixture) as LintReport;
  document.documentElement.innerHTML = formatHtml(report, []);
  const app = createReportApp(buildClientData(report, [], createReportContract(report)));
  app.report.execution.status = 'complete';
  Object.assign(app.report.metrics, {
    flowCount: 2,
    subFlowCount: 1,
    httpListenerCount: 1,
    dwTransformCount: 1,
    connectorConfigCount: 3,
    connectorTypes: ['http', 'mule', 'unknown-synthetic'],
    apiEndpoints: [
      { method: 'GET', path: '/orders' },
      { method: 'CUSTOM', path: '/other' },
    ],
    environments: ['dev', 'unknown'],
    securityPatterns: ['TLS', 'unknown'],
    externalServices: [{ name: 'Example', host: 'example.invalid' }],
    schedulers: [
      { type: 'cron', value: '0 * * * * ?', flow: 'cron-flow' },
      { type: 'fixed', value: '1000', flow: 'poll-flow' },
    ],
    complexity: { rating: 'A', total: 2, average: 1 },
    maintainability: { rating: 'B', technicalDebt: '5min', technicalDebtMinutes: 5, debtRatio: 1 },
    reliability: { rating: 'C', bugs: 1 },
    security: { rating: 'D', vulnerabilities: 2, hotspots: 0 },
    flowComplexityData: [
      {
        flowName: 'a'.repeat(45),
        file: 'main.xml',
        complexity: 2,
        rating: 'low',
        breakdown: { choice: 1 },
      },
      {
        flowName: 'example-flow',
        file: 'main.xml',
        complexity: 1,
        rating: 'moderate',
        breakdown: {},
      },
    ],
  });
  vi.stubGlobal('matchMedia', () => ({ matches: false }));
  mocks.charts.length = 0;
  mocks.handlers.clear();
  mocks.failChart = false;
  mocks.failTable = false;
  return app;
}

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('Typed HTML rendering', () => {
  it('renders all inventories and quality estimates using local icons and escaped values', () => {
    const app = harness();
    app.renderer.renderMetrics();
    expect(document.getElementById('connector-pills')!.textContent).toContain('HTTP');
    expect(document.getElementById('connector-pills')!.querySelector('img')).toBeNull();
    expect(document.getElementById('endpoint-pills')!.textContent).toContain('CUSTOM');
    expect(document.getElementById('scheduler-list')!.textContent).toContain('cron-flow');
    expect(document.getElementById('service-list')!.textContent).toContain('example.invalid');
    expect(document.getElementById('rating-security')!.textContent).toBe('D');
    expect(document.getElementById('tech-debt')!.textContent).toBe('5min');
  });
  it('renders chart datasets, drill-down and complexity tooltip from the same findings', () => {
    const app = harness();
    app.renderer.renderCharts();
    expect(mocks.charts).toHaveLength(4);
    expect(mocks.charts[1].data.datasets[0].data).toEqual([1, 1, 0]);
    const categories = mocks.charts[2];
    const select = categories.options!.onClick!;
    // Chart.js provides these callback arguments at runtime.
    select.call({} as never, {} as never, [{ index: 0 }] as never, {} as never);
    expect(app.filters.categories).toEqual(['General']);
    const tooltip = mocks.charts[3].options!.plugins!.tooltip!.callbacks!.label!;
    expect(tooltip.call({} as never, { dataIndex: 0 } as never)).toEqual([
      'Complexity: 2 (low)',
      'choice: 1',
    ]);
  });
  it('formats table columns, bridges events and exports only owned issue objects', () => {
    const app = harness();
    app.focus.init();
    app.sidepanel.init();
    app.renderer.initTable();
    const issue = app.allIssues[0];
    issue.issueType = 'bug';
    const row = {
      getData: () => issue,
      getElement: () => document.createElement('div'),
    } as unknown as RowComponent;
    for (const column of mocks.columns) {
      const cell = {
        getRow: () => row,
        getValue: () => issue[column.field as keyof ClientIssue],
      } as unknown as CellComponent;
      expect(column.formatter(cell)).toBeTypeOf('string');
      if (column.sorter) expect(column.sorter('error', 'warning')).toBeLessThan(0);
    }
    mocks.handlers.get('tableBuilt')?.();
    mocks.handlers.get('dataFiltered')?.([], [row]);
    expect(document.getElementById('filtered-count')!.textContent).toBe('1');
    mocks.handlers.get('rowClick')?.({}, row);
    expect(document.getElementById('sidepanel')!.hidden).toBe(false);
    expect(app.table!.getData('active')).toEqual(app.allIssues);
    app.table!.setFilter(() => true);
    app.table!.clearFilter(true);
    app.table!.redraw();
    expect(app.table!.getHeaderFilters()).toEqual([]);
  });
  it('initializes the report, theme toggle and predictable empty inventory states', () => {
    const app = harness();
    app.renderer.init();
    document.getElementById('theme-toggle')!.click();
    expect(document.documentElement.classList.contains('dark')).toBe(true);
    app.report.metrics.connectorTypes = [];
    app.renderer.renderMetrics();
    expect(document.getElementById('connector-inventory')!.style.display).toBe('none');
  });
  it('keeps findings usable when the table or charts cannot initialize', () => {
    const app = harness();
    mocks.failTable = true;
    mocks.failChart = true;
    app.renderer.init();
    expect(app.table).toBeNull();
    expect(document.getElementById('issues-fallback')!.hidden).toBe(false);
    expect(document.getElementById('chart-status')!.textContent).toContain(
      'Charts are unavailable',
    );
  });
});
