// @vitest-environment jsdom
import fixture from '../fixtures/reports/html-characterization.json';
import { formatHtml } from '../../src/formatters/HtmlFormatter';
import { buildClientData } from '../../src/formatters/html/reportData';
import { createReportContract } from '../../src/core/ReportContract';
import { createReportApp } from '../../src/formatters/html/client/app';
import type { LintReport } from '../../src/types/Report';

const report = fixture as LintReport;
function harness() {
  document.documentElement.innerHTML = formatHtml(report, []);
  const app = createReportApp(buildClientData(report, [], createReportContract(report)));
  const table = {
    getHeaderFilters: vi.fn(() => [{ field: 'message', value: 'missing' }]),
    getDataCount: vi.fn(() => 0),
    getData: vi.fn(() => app.allIssues),
    clearFilter: vi.fn(),
    setFilter: vi.fn(),
    redraw: vi.fn(),
  };
  app.table = table;
  return { app, router: app.router, table, state: app.filters, ui: app.ui };
}
const element = (id: string) => document.getElementById(id)!;

describe('HTML interaction contracts', () => {
  it('clears header filters as well as sidebar, type and search filters', () => {
    const { router, table, state } = harness();
    state.severities = ['warning'];
    state.categories = ['security'];
    state.searchTerm = 'old';
    router.issueTypes = ['bug'];
    router.clearAllFilters();
    expect(table.clearFilter).toHaveBeenCalledWith(true);
    expect(state).toEqual({ severities: [], categories: [], searchTerm: '' });
    expect(router.issueTypes).toEqual([]);
    expect((element('global-search') as HTMLInputElement).value).toBe('');
  });
  it('reports the settled row count and offers reset for header-only filtering', () => {
    const { router } = harness();
    router.sync();
    expect(element('filtered-count').textContent).toBe('0');
    expect(element('clear-filters-btn').classList.contains('hidden')).toBe(false);
    router.sync(2);
    expect(element('filtered-count').textContent).toBe('2');
  });
  it('drills into all bugs independent of category and clears unrelated filters', () => {
    const { app, router, table } = harness();
    table.getHeaderFilters.mockReturnValue([]);
    router.showIssueType('bug');
    expect(table.clearFilter).toHaveBeenCalledWith(true);
    expect(
      router.matches({
        ...app.allIssues[0],
        issueType: 'bug',
        category: 'operations',
        severity: 'error',
      }),
    ).toBe(true);
    expect(
      router.matches({
        ...app.allIssues[0],
        issueType: 'vulnerability',
        category: 'security',
        severity: 'error',
      }),
    ).toBe(false);
  });
  it('updates reset visibility for search-only filtering', () => {
    const { router, table } = harness();
    table.getHeaderFilters.mockReturnValue([]);
    router.setSearchTerm('some rule');
    expect(element('clear-filters-btn').classList.contains('hidden')).toBe(false);
    expect(router.currentView).toBe('issues');
  });
  it('combines severity, category and case-insensitive search and toggles each off', () => {
    const { app, router, table } = harness();
    table.getHeaderFilters.mockReturnValue([]);
    const issue = { ...app.allIssues[0], category: 'security' };
    router.toggleSeverity('warning');
    router.toggleCategory('security');
    router.setSearchTerm('SYNTH');
    expect(router.matches(issue)).toBe(true);
    expect(router.matches({ ...issue, severity: 'error' })).toBe(false);
    expect(router.matches({ ...issue, category: 'naming' })).toBe(false);
    router.toggleSeverity('warning');
    router.toggleCategory('security');
    router.setSearchTerm('');
    expect(router.hasActiveFilters()).toBe(false);
  });
});

describe('HTML visible CSV and source locations', () => {
  it('retains stable rule IDs, positions, suggestions and escapes spreadsheet formulas', () => {
    const { ui } = harness();
    const csv = ui.csv([
      {
        severity: 'warning',
        ruleId: 'TEST-1',
        fileName: '=example.xml',
        line: 0,
        column: 0,
        message: '@command',
        suggestion: 'Use "safe" values\nthen retry',
      },
    ]);
    expect(csv).toContain('Severity,Rule,File,Line,Column,Message,Suggestion\r\n');
    expect(csv).toContain('"TEST-1","\'=example.xml","0","0","\'@command"');
    expect(csv).toContain('"Use ""safe"" values\nthen retry"');
  });
  it('treats line zero as project scope and preserves precise source positions', () => {
    const { ui } = harness();
    expect(ui.location({ fileName: 'Project Structure', line: 0 })).toBe(
      'Project Structure (project-level finding)',
    );
    expect(ui.location({ fileName: 'main.xml', line: 12, column: 3 })).toBe('main.xml:12:3');
    expect(ui.location({ fileName: 'broken.xml', location: { scope: 'file' } })).toBe(
      'broken.xml (file-level finding)',
    );
  });
  it('exports only active table rows and downloads the same CSV from fallback', () => {
    const { app, ui, table, router } = harness();
    const create = vi.fn(() => 'blob:synthetic');
    vi.stubGlobal('URL', { createObjectURL: create, revokeObjectURL: vi.fn() });
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
    ui.downloadCsv();
    expect(table.getData).toHaveBeenCalledWith('active');
    expect(create).toHaveBeenCalledOnce();
    app.table = null;
    router.setSearchTerm('Synthetic finding');
    ui.downloadCsv();
    expect(create).toHaveBeenCalledTimes(2);
    vi.unstubAllGlobals();
  });
});

describe('HTML execution context', () => {
  it.each([false, true])(
    'renders scope (%s), gate and baseline without losing diagnostics',
    (scopeKnown) => {
      const { app, ui } = harness();
      app.report.scan.scopeKnown = scopeKnown;
      app.report.scan.profile = null;
      app.report.scan.enabledRuleIds = [];
      app.report.scan.target = { kind: 'file', path: 'src/main/mule/example.xml' };
      app.report.gate = { status: 'failed', name: 'Review' };
      app.report.selection.quiet = true;
      ui.renderExecution();
      const status = document.querySelector('.execution-status')!.innerHTML;
      expect(status).toContain(
        scopeKnown ? 'Profile: custom · 0 enabled rules' : 'Scan scope not recorded',
      );
      if (scopeKnown) expect(status).toContain('Target: file src/main/mule/example.xml');
      else expect(status).not.toContain('Target:');
      expect(status).toContain('Gate: failed (Review)');
      expect(status).toContain('Errors-only selection');
      expect(status).toContain('Baseline: 1 new, 0 unchanged, 2 fixed');
      expect(status).toContain('Synthetic parse failure');
      expect(element('quality-ratings').style.display).toBe('none');
    },
  );
  it('distinguishes empty, filtered, incomplete and no-file reports', () => {
    const { app, ui, router, table } = harness();
    expect(ui.emptyMessage()).toContain('incomplete');
    app.report.execution.status = 'no-files';
    expect(ui.emptyMessage()).toContain('No files were scanned');
    app.report.execution.status = 'complete';
    table.getHeaderFilters.mockReturnValue([]);
    expect(ui.emptyMessage()).toBe('No findings in the scanned files.');
    router.setSearchTerm('missing');
    expect(ui.emptyMessage()).toContain('No issues match');
  });
});

describe('HTML keyboard, mobile and fallback interactions', () => {
  it('opens escaped fallback details and restores opener focus on Escape', () => {
    const { app, ui } = harness();
    app.table = null;
    app.focus.init();
    app.sidepanel.init();
    app.allIssues[0].message = '<img src=x onerror=alert(1)>';
    ui.renderFallback();
    const opener = document.querySelector<HTMLButtonElement>('.fallback-open')!;
    opener.focus();
    opener.click();
    expect(element('sidepanel').hidden).toBe(false);
    expect(element('sidepanel').querySelector('img')).toBeNull();
    expect(element('sidepanel').textContent).toContain('<img src=x onerror=alert(1)>');
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    expect(element('sidepanel').hidden).toBe(true);
    expect(document.activeElement).toBe(opener);
  });
  it('traps Tab and Shift+Tab within a modal and supports backdrop closing', () => {
    const { app } = harness();
    app.focus.init();
    app.modal.init();
    app.modal.open('complexity');
    const button = document.querySelector<HTMLButtonElement>('.modal-close')!;
    vi.spyOn(button, 'getClientRects').mockReturnValue([{ width: 10 }] as unknown as DOMRectList);
    button.focus();
    for (const shiftKey of [false, true]) {
      const event = new KeyboardEvent('keydown', { key: 'Tab', shiftKey, cancelable: true });
      document.dispatchEvent(event);
      expect(event.defaultPrevented).toBe(true);
      expect(document.activeElement).toBe(button);
    }
    element('modal-overlay').click();
    expect(element('modal-overlay').hidden).toBe(true);
  });
  it('binds mobile navigation, filter actions, expandable inventories and keyboard search', () => {
    const { app, ui } = harness();
    ui.init();
    app.renderer.initKeyboardShortcuts();
    element('sidebar-toggle').click();
    expect(element('sidebar-toggle').getAttribute('aria-expanded')).toBe('true');
    element('nav-issues').click();
    expect(element('sidebar-toggle').getAttribute('aria-expanded')).toBe('false');
    document.querySelector<HTMLElement>('[data-show-severity="warning"]')!.click();
    expect(app.filters.severities).toEqual(['warning']);
    document.querySelector<HTMLElement>('[data-toggle-details="endpoint"]')!.click();
    expect(element('endpoint-details').classList.contains('hidden')).toBe(false);
    document.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'k', ctrlKey: true, cancelable: true }),
    );
    expect(document.activeElement).toBe(element('global-search'));
  });
});
