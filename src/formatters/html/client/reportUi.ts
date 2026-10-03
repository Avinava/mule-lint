import type { ReportRuntime, ReportUi } from './types';
import { element, query, input, escapeHtml } from './dom';
export function createReportUi(context: ReportRuntime): ReportUi {
  const result: ReportUi = {
    location(issue) {
      return (issue.line ?? 0) > 0
        ? issue.fileName +
            ':' +
            String(issue.line) +
            ((issue.column ?? 0) > 0 ? ':' + String(issue.column) : '')
        : issue.fileName +
            (issue.location && issue.location.scope === 'file'
              ? ' (file-level finding)'
              : ' (project-level finding)');
    },
    emptyMessage() {
      if (context.report.execution.status === 'no-files')
        return 'No files were scanned. Check the target path and include patterns.';
      if (context.report.execution.status === 'incomplete')
        return 'Analysis is incomplete. Review the execution diagnostics before treating this as a pass.';
      if (context.router.hasActiveFilters())
        return 'No issues match your filters. Clear filters to see all findings.';
      return 'No findings in the scanned files.';
    },
    updateEmpty(count) {
      const el = element('issue-empty-state');
      el.hidden = count !== 0;
      el.textContent = this.emptyMessage();
    },
    renderExecution() {
      const execution = context.report.execution;
      const title =
        execution.status === 'incomplete'
          ? 'Analysis incomplete'
          : execution.status === 'no-files'
            ? 'No files scanned'
            : 'Analysis complete';
      const description =
        execution.status === 'incomplete'
          ? 'Some checks could not finish. Resolve these diagnostics and run lint again.'
          : execution.status === 'no-files'
            ? 'Check the target path and include patterns before treating this report as a pass.'
            : 'Review findings below. Static analysis does not replace runtime, security or design review.';
      const scan = context.report.scan;
      const scope = !scan.scopeKnown
        ? 'Scan scope not recorded'
        : 'Profile: ' +
          (scan.profile || 'custom') +
          ' · ' +
          String(scan.enabledRuleIds.length) +
          ' enabled rules';
      const patterns =
        'Include: ' +
        (scan.include.join(', ') || 'not recorded') +
        ' · Exclude: ' +
        (scan.exclude.join(', ') || 'none recorded');
      const gate = context.report.gate;
      const selection = context.report.selection;
      const baseline = selection.baseline;
      const target =
        scan.scopeKnown && scan.target
          ? ' · Target: ' + scan.target.kind + ' ' + scan.target.path
          : '';
      const executionContext =
        scope +
        target +
        ' · Gate: ' +
        gate.status +
        (gate.name ? ' (' + gate.name + ')' : '') +
        (selection.quiet ? ' · Errors-only selection' : '') +
        (baseline
          ? ' · Baseline: ' +
            String(baseline.newIssues) +
            ' new, ' +
            String(baseline.unchanged) +
            ' unchanged, ' +
            String(baseline.fixed) +
            ' fixed'
          : '');
      document.querySelectorAll<HTMLElement>('.execution-status').forEach((el) => {
        el.dataset.status = execution.status;
        el.innerHTML =
          '<strong>' +
          title +
          '</strong><p>' +
          description +
          '</p><p>Scanned at ' +
          escapeHtml(context.report.metadata.timestamp) +
          '</p><p>' +
          escapeHtml(executionContext) +
          '</p><p>' +
          escapeHtml(patterns) +
          '</p>' +
          (execution.diagnostics.length
            ? '<ul>' +
              execution.diagnostics
                .map(
                  (d) =>
                    '<li>' +
                    escapeHtml([d.ruleId, d.relativePath, d.message].filter(Boolean).join(' · ')) +
                    '</li>',
                )
                .join('') +
              '</ul>'
            : '');
      });
      if (execution.status !== 'complete') element('quality-ratings').style.display = 'none';
    },
    renderFallback() {
      const container = element('issues-fallback');
      container.hidden = false;
      const issues = context.allIssues.filter((i) => context.router.matches(i));
      container.innerHTML = issues
        .map(
          (issue) =>
            '<article class="fallback-issue"><button type="button" class="fallback-open"><strong>' +
            escapeHtml(
              issue.severity.toUpperCase() + ' · ' + issue.ruleId + ' · ' + issue.ruleName,
            ) +
            '</strong></button><p>' +
            escapeHtml(issue.message) +
            '</p><p><code>' +
            escapeHtml(this.location(issue)) +
            '</code></p>' +
            (issue.suggestion ? '<p>Suggested fix: ' + escapeHtml(issue.suggestion) + '</p>' : '') +
            '</article>',
        )
        .join('');
      container.querySelectorAll<HTMLElement>('.fallback-open').forEach((button, index) => {
        button.addEventListener('click', () => {
          const issue = issues[index];
          if (issue) context.renderer.openIssue(issue, button);
        });
      });
    },
    csv(issues) {
      const fields = [
        'severity',
        'ruleId',
        'fileName',
        'line',
        'column',
        'message',
        'suggestion',
      ] as const;
      const cell = (value: string | number | undefined) => {
        const text = String(value == null ? '' : value);
        const safe = /^(?:[\t\r\n]|\s*[=+\-@])/.test(text) ? "'" + text : text;
        return '"' + safe.replace(/"/g, '""') + '"';
      };
      return [
        'Severity,Rule,File,Line,Column,Message,Suggestion',
        ...issues.map((issue) => fields.map((key) => cell(issue[key])).join(',')),
      ].join('\r\n');
    },
    downloadCsv() {
      const issues = context.table
        ? context.table.getData('active')
        : context.allIssues.filter((i) => context.router.matches(i));
      const url = URL.createObjectURL(
        new Blob([this.csv(issues)], { type: 'text/csv;charset=utf-8' }),
      );
      const link = document.createElement('a');
      link.href = url;
      link.download = 'mule-lint-report.csv';
      link.click();
      setTimeout(() => {
        URL.revokeObjectURL(url);
      }, 1000);
    },
    closeSidebar() {
      query('.app-layout').classList.remove('sidebar-open');
      element('sidebar-toggle').setAttribute('aria-expanded', 'false');
    },
    init() {
      document.addEventListener('click', (event) => {
        if (!(event.target instanceof Element)) return;
        const control = event.target.closest<HTMLElement>(
          '[data-navigate], [data-clear-filters], [data-modal], [data-show-severity], [data-issue-type], [data-filter-severity], [data-filter-category], [data-toggle-details]',
        );
        if (!control) return;
        event.preventDefault();
        const data = control.dataset;
        if (data.clearFilters !== undefined) context.router.clearAllFilters();
        if (data.navigate) context.router.navigate(data.navigate);
        if (data.modal) context.modal.open(data.modal);
        if (data.showSeverity) context.router.showSeverity(data.showSeverity);
        if (data.issueType !== undefined) context.router.showIssueType(data.issueType);
        if (data.filterSeverity) context.router.toggleSeverity(data.filterSeverity);
        if (data.filterCategory) context.router.toggleCategory(data.filterCategory);
        if (data.toggleDetails) {
          const details = element(data.toggleDetails + '-details');
          const open = !details.classList.toggle('hidden');
          control.setAttribute('aria-expanded', String(open));
          const chevronName =
            data.toggleDetails === 'endpoint'
              ? 'endpoints'
              : data.toggleDetails === 'service'
                ? 'services'
                : 'schedulers';
          element(chevronName + '-chevron').classList.toggle('rotate-180', open);
        }
      });
      element('sidebar-toggle').addEventListener('click', () => {
        const open = query('.app-layout').classList.toggle('sidebar-open');
        element('sidebar-toggle').setAttribute('aria-expanded', String(open));
      });
      element('global-search').addEventListener('input', () => {
        context.router.setSearchTerm(input('global-search').value);
      });
      element('download-csv').addEventListener('click', () => {
        this.downloadCsv();
      });
      element('export-btn').addEventListener('click', () => {
        context.router.navigate('issues');
        this.downloadCsv();
      });
      this.renderExecution();
      context.router.sync();
    },
  };
  return result;
}
