import { renderMetrics, renderQualityRatings } from './metrics';
import { renderCharts } from './charts';
import { initTable } from './table';
import type { ReportRuntime, Renderer } from './types';
import { escapeHtml, element } from './dom';
export function createRenderer(context: ReportRuntime): Renderer {
  const renderer: Renderer = {
    init() {
      this.renderSidebar();
      this.renderMetrics();
      this.initTheme();
      this.initKeyboardShortcuts();
      try {
        this.initTable();
      } catch {
        context.table = null;
        element('table-status').hidden = false;
        element('issues-table').hidden = true;
        context.ui.renderFallback();
      }
      context.ui.init();
      try {
        if (!context.allIssues.length) throw new Error('Charts unavailable');
        this.renderCharts();
      } catch {
        element('complexity-chart-container').hidden = true;
        document
          .querySelectorAll<HTMLElement>('.finding-chart')
          .forEach((el) => (el.hidden = true));
        const status = element('chart-status');
        status.hidden = false;
        status.textContent = context.allIssues.length
          ? 'Charts are unavailable. All findings, filters and CSV export remain available in Issues.'
          : 'No findings to chart.';
      }
    },
    renderMetrics() {
      renderMetrics(context);
    },
    renderQualityRatings,
    renderSidebar() {
      // Severity links
      const severityNav = element('sidebar-severity');
      const severities = [
        {
          key: 'error',
          label: 'Errors',
          count: context.report.summary.bySeverity.error,
          color: 'bg-rose-500',
        },
        {
          key: 'warning',
          label: 'Warnings',
          count: context.report.summary.bySeverity.warning,
          color: 'bg-amber-500',
        },
        {
          key: 'info',
          label: 'Info',
          count: context.report.summary.bySeverity.info,
          color: 'bg-cyan-500',
        },
      ];
      severityNav.innerHTML = severities
        .filter((s) => s.count > 0)
        .map(
          (s) => `
                    <a href="#"
                        data-filter-severity="${s.key}"
                        class="sidebar-link flex items-center gap-2.5 px-3 py-2 text-sm text-slate-600 dark:text-slate-300 rounded-r-md">
                        <span class="w-2.5 h-2.5 rounded-full ${s.color}"></span>
                        ${s.label}
                        <span class="ml-auto text-xs font-bold text-slate-400 dark:text-slate-500">${s.count}</span>
                    </a>
                `,
        )
        .join('');
      // Category links
      const catNav = element('sidebar-categories');
      const catCounts: Record<string, number> = {};
      context.allIssues.forEach((i) => (catCounts[i.category] = (catCounts[i.category] || 0) + 1));
      const sortedCats = Object.entries(catCounts).sort((a, b) => b[1] - a[1]);
      catNav.innerHTML = sortedCats
        .map(
          ([cat, count]) => `
                    <a href="#" data-filter-category="${escapeHtml(cat)}"
                        class="sidebar-link flex items-center gap-2.5 px-3 py-2 text-sm text-slate-600 dark:text-slate-300 rounded-r-md">
                        <span class="capitalize truncate">${escapeHtml(cat)}</span>
                        <span class="ml-auto text-xs font-bold text-slate-400 dark:text-slate-500">${count}</span>
                    </a>
                `,
        )
        .join('');
    },
    renderCharts() {
      renderCharts(context);
    },
    initTable() {
      initTable(context);
    },
    openIssue(issue, opener) {
      const location = escapeHtml(context.ui.location(issue));
      const suggestion = issue.suggestion
        ? '<div class="mt-5"><div class="text-2xs font-semibold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 mb-2">Suggested fix</div><p class="text-sm leading-relaxed text-slate-700 dark:text-slate-300">' +
          escapeHtml(issue.suggestion) +
          '</p></div>'
        : '';
      const snippet = issue.codeSnippet
        ? '<div class="mt-5"><div class="text-2xs font-semibold uppercase tracking-wider text-slate-500 mb-2">Code</div><pre class="p-3 rounded-lg bg-slate-100 dark:bg-slate-900 overflow-x-auto text-xs"><code>' +
          escapeHtml(issue.codeSnippet) +
          '</code></pre></div>'
        : '';
      context.sidepanel.open(
        issue.ruleId + ' · ' + issue.ruleName,
        '<div class="flex items-center gap-2 mb-4"><span class="text-2xs font-semibold uppercase rounded-md px-2 py-1 bg-slate-100 dark:bg-slate-700">' +
          escapeHtml(issue.severity) +
          '</span><span class="text-2xs text-slate-500 capitalize">' +
          escapeHtml(issue.category) +
          '</span></div>' +
          '<p class="text-sm leading-relaxed text-slate-800 dark:text-slate-200">' +
          escapeHtml(issue.message) +
          '</p>' +
          '<div class="mt-5"><div class="text-2xs font-semibold uppercase tracking-wider text-slate-500 mb-2">Location</div><code class="text-xs text-cyan-700 dark:text-cyan-300 break-all">' +
          location +
          '</code></div>' +
          suggestion +
          snippet,
        opener,
      );
    },
    initTheme() {
      const toggle = element('theme-toggle');
      const html = document.documentElement;
      const lightIcon = element('theme-toggle-light-icon');
      const darkIcon = element('theme-toggle-dark-icon');
      // Function to update icon visibility
      const updateIcons = () => {
        if (html.classList.contains('dark')) {
          lightIcon.classList.remove('hidden');
          darkIcon.classList.add('hidden');
        } else {
          lightIcon.classList.add('hidden');
          darkIcon.classList.remove('hidden');
        }
      };
      // Check local storage or system preference
      let savedTheme = null;
      try {
        savedTheme = localStorage.getItem('theme');
      } catch {
        /* Storage can be blocked in local reports. */
      }
      if (
        savedTheme === 'dark' ||
        (!savedTheme && window.matchMedia('(prefers-color-scheme: dark)').matches)
      ) {
        html.classList.add('dark');
      }
      // Initial icon update
      updateIcons();
      toggle.addEventListener('click', () => {
        html.classList.toggle('dark');
        try {
          localStorage.setItem('theme', html.classList.contains('dark') ? 'dark' : 'light');
        } catch {
          /* The toggle still works without persistence. */
        }
        updateIcons();
      });
    },
    initKeyboardShortcuts() {
      document.addEventListener('keydown', (e) => {
        if (context.focus.active) return;
        if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
          e.preventDefault();
          element('global-search').focus();
        }
        if (e.key === 'Escape') {
          element('global-search').blur();
        }
      });
    },
  };
  return renderer;
}
