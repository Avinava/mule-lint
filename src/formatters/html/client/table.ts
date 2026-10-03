import { TabulatorFull as Tabulator } from 'tabulator-tables';
import type { RowComponent } from 'tabulator-tables';
import type { ReportRuntime } from './types';
import type { ClientIssue } from '../reportData';
import { escapeHtml } from './dom';
export function initTable(context: ReportRuntime): void {
  const ownedIssues = new Map<unknown, ClientIssue>(
    context.allIssues.map((issue) => [issue, issue]),
  );
  // Tabulator's upstream API returns untyped rows. Only our original objects are accepted.
  const knownIssue = (row: RowComponent) => {
    const data: unknown = row.getData();
    const issue = ownedIssues.get(data);
    if (!issue) throw new Error('Unexpected table row');
    return issue;
  };
  const severityOrder: Record<string, number> = { error: 1, warning: 2, info: 3 };
  const table = new Tabulator('#issues-table', {
    data: context.allIssues,
    layout: 'fitColumns',
    height: '100%',
    placeholder: '',
    columns: [
      {
        title: 'Severity',
        field: 'severity',
        width: 100,
        headerFilter: 'list',
        headerFilterParams: { valuesLookup: 'all', multiselect: true, clearable: true },
        headerFilterFunc: 'in',
        sorter: (a: string, b: string) => (severityOrder[a] ?? 3) - (severityOrder[b] ?? 3),
        formatter: (cell) => {
          const val = knownIssue(cell.getRow()).severity;
          const styles = {
            error: 'bg-rose-100 text-rose-700 dark:bg-rose-500/20 dark:text-rose-400',
            warning: 'bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-400',
            info: 'bg-cyan-100 text-cyan-700 dark:bg-cyan-500/20 dark:text-cyan-400',
          };
          return `<span class="inline-flex px-2 py-0.5 text-2xs font-medium uppercase rounded-md ${styles[val]}">${val}</span>`;
        },
      },
      {
        title: 'Rule',
        field: 'ruleName',
        minWidth: 200,
        headerFilter: 'list',
        headerFilterParams: { valuesLookup: 'all', multiselect: true, clearable: true },
        headerFilterFunc: 'in',
        formatter: (cell) => {
          const row = knownIssue(cell.getRow());
          return `<div><button type="button" class="issue-open font-medium text-slate-800 dark:text-slate-200 truncate" aria-label="Open details: ${escapeHtml(row.ruleId)} ${escapeHtml(String(cell.getValue()))}">${escapeHtml(String(cell.getValue()))}</button><div class="text-xs text-slate-400 font-mono">${escapeHtml(row.ruleId)}</div></div>`;
        },
      },
      {
        title: 'Category',
        field: 'category',
        width: 120,
        headerFilter: 'list',
        headerFilterParams: { valuesLookup: 'all', multiselect: true, clearable: true },
        headerFilterFunc: 'in',
        formatter: (cell) =>
          `<span class="capitalize text-slate-600 dark:text-slate-300">${escapeHtml(String(cell.getValue()))}</span>`,
      },
      {
        title: 'Type',
        field: 'issueType',
        width: 110,
        headerFilter: 'list',
        headerFilterParams: { valuesLookup: 'all', multiselect: true, clearable: true },
        headerFilterFunc: 'in',
        formatter: (cell) => {
          const val = knownIssue(cell.getRow()).issueType;
          const typeStyles: Record<
            string,
            {
              bg: string;
              text: string;
              label: string;
            }
          > = {
            diagnostic: {
              bg: 'bg-slate-100 dark:bg-slate-700',
              text: 'text-slate-700 dark:text-slate-200',
              label: 'Diagnostic',
            },
            'code-smell': {
              bg: 'bg-orange-100 dark:bg-orange-500/20',
              text: 'text-orange-700 dark:text-orange-400',
              label: 'Code Smell',
            },
            bug: {
              bg: 'bg-rose-100 dark:bg-rose-500/20',
              text: 'text-rose-700 dark:text-rose-400',
              label: 'Bug',
            },
            vulnerability: {
              bg: 'bg-purple-100 dark:bg-purple-500/20',
              text: 'text-purple-700 dark:text-purple-400',
              label: 'Vulnerability',
            },
          };
          const style = typeStyles[val] || {
            bg: 'bg-orange-100 dark:bg-orange-500/20',
            text: 'text-orange-700 dark:text-orange-400',
            label: 'Code Smell',
          };
          return `<span class="inline-flex px-2 py-0.5 text-2xs font-medium rounded-md ${style.bg} ${style.text}">${style.label}</span>`;
        },
      },
      {
        title: 'File',
        field: 'fileName',
        minWidth: 210,
        headerFilter: 'input',
        headerFilterPlaceholder: 'Filter path...',
        formatter: (cell) => {
          const row = knownIssue(cell.getRow());
          const path = row.fileName;
          const display = path.length > 40 ? '...' + path.slice(-37) : path;
          return `<div><div class="font-mono text-sky-600 dark:text-sky-400 text-xs truncate" title="${escapeHtml(path)}">${escapeHtml(display)}</div><div class="text-xs text-slate-400">${row.line > 0 ? 'Line ' + String(row.line) : row.location.scope === 'file' ? 'File-level finding' : 'Project-level finding'}</div></div>`;
        },
      },
      {
        title: 'Message',
        field: 'message',
        widthGrow: 2,
        minWidth: 320,
        variableHeight: true,
        headerFilter: 'input',
        headerFilterPlaceholder: 'Filter message...',
        formatter: (cell) => {
          const row = knownIssue(cell.getRow());
          let html = `<div class="text-slate-700 dark:text-slate-300">${escapeHtml(String(cell.getValue()))}</div>`;
          if (row.suggestion) {
            html += `<div class="text-xs text-slate-400 mt-1 leading-relaxed">Suggested fix: ${escapeHtml(row.suggestion)}</div>`;
          }
          return html;
        },
      },
    ],
    initialSort: [{ column: 'severity', dir: 'asc' }],
  });
  context.table = {
    getHeaderFilters: () => table.getHeaderFilters(),
    getDataCount: (range) => table.getDataCount(range),
    getData: (range) => table.getRows(range).map(knownIssue),
    clearFilter: (header) => {
      table.clearFilter(header);
    },
    setFilter: (predicate) => {
      table.setFilter((data: unknown) => {
        const issue = ownedIssues.get(data);
        return issue ? predicate(issue) : false;
      });
    },
    redraw: () => {
      table.redraw();
    },
  };
  table.on('rowClick', (_event, row) => {
    context.renderer.openIssue(
      knownIssue(row),
      row.getElement().querySelector<HTMLElement>('.issue-open'),
    );
  });
  // Tabulator emits dataFiltered before committing its active rows.
  table.on('dataFiltered', (_filters, rows) => {
    context.router.sync(rows.length);
  });
  table.on('tableBuilt', () => {
    document.querySelectorAll<HTMLElement>('.tabulator-header-filter input').forEach((input) => {
      const column = input.closest('.tabulator-col');
      input.setAttribute(
        'aria-label',
        'Filter ' + (column?.querySelector('.tabulator-col-title')?.textContent ?? 'column'),
      );
    });
    context.router.sync();
  });
}
