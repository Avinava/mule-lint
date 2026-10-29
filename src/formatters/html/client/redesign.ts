import type { ClientReport, ClientIssue } from '../reportData';
import { escapeHtml as e, element } from './dom';
import { icon, severityIcon, categoryMeta } from '../visuals';
import { THRESHOLDS } from '../../../quality/thresholds';
import { findingsCsv } from './csv';

/** Native, offline report UI. All source content is escaped before insertion. */
export function startReport(d: ClientReport): void {
  const root = element('report-app');
  const allIssues = d.files.flatMap((f) =>
    f.issues.map((i) => ({ ...i, fileName: f.relativePath })),
  );
  const csv = findingsCsv;
  const rank: Record<string, number> = {
    error: 0,
    warning: 1,
    info: 2,
    vulnerability: 0,
    bug: 1,
    'code-smell': 2,
  };
  const issues = allIssues.sort(
    (a, b) =>
      (rank[a.severity] ?? 3) - (rank[b.severity] ?? 3) ||
      (rank[a.issueType] ?? 3) - (rank[b.issueType] ?? 3) ||
      a.fileName.localeCompare(b.fileName) ||
      a.line - b.line,
  );
  const key = (i: ClientIssue) => `${i.fingerprint}:${i.occurrence}`;
  let view = 'overview',
    q = '',
    category = '',
    rule = '',
    type = '',
    group = 'severity',
    rq = '',
    rc = '',
    hit = false;
  const severities = new Set(['error', 'warning', 'info']);
  const limits = new Map<string, number>();
  const expandedFiles = new Map<string, boolean>();
  let collection: ClientIssue[] = [],
    selected: ClientIssue | undefined,
    opener: HTMLElement | null = null;
  const categories = [
    ...new Set([...d.rules.map((r) => r.category), ...issues.map((i) => i.category)]),
  ].sort();
  const counts = (list: ClientIssue[]) =>
    ['error', 'warning', 'info'].map((s) => list.filter((i) => i.severity === s).length);
  const button = (label: string, action: string, value = '', extra = '') =>
    `<button data-action="${action}" data-value="${e(value)}" ${extra}>${label}</button>`;
  const panel = (title: string, content: string, sub = '') =>
    `<section class="panel"><div class="panel-head"><h2>${title}</h2>${sub ? `<span class="muted">${sub}</span>` : ''}</div>${content}</section>`;
  const empty = (text: string) => `<div class="empty">${e(text)}</div>`;
  const location = (i: ClientIssue) =>
    i.location.scope === 'project'
      ? 'Project-level check'
      : `${i.fileName}${i.location.line ? `:${i.location.line}` : ''}${i.location.column ? `:${i.location.column}` : ''}`;
  const mark = severityIcon;
  const categoryBadge = (category: string) =>
    `<span class="category-badge">${e(categoryMeta(category)[0])}</span>`;
  const typeLabel = (type: string) =>
    (
      ({
        'code-smell': 'Code smell',
        bug: 'Bug',
        vulnerability: 'Vulnerability',
        diagnostic: 'Diagnostic',
      }) as Record<string, string>
    )[type] ?? type;
  const severityLabel = (severity: string) =>
    (({ error: 'Errors', warning: 'Warnings', info: 'Info' }) as Record<string, string>)[
      severity
    ] ?? severity;
  const shortLocation = (i: ClientIssue) =>
    i.location.scope === 'project'
      ? 'project'
      : `${i.fileName.split('/').pop() ?? i.fileName}${i.location.line ? `:${i.location.line}` : ''}`;
  const rows = (list: ClientIssue[], mode: 'findings' | 'priority' | 'file' = 'findings') =>
    list
      .map((i, index) =>
        button(
          mode === 'priority'
            ? `<code class="row-number">${String(index + 1).padStart(2, '0')}</code>${mark(i.severity)}<span class="finding-body"><span>${e(i.message)}</span><small><code>${e(i.ruleId)} · ${e(shortLocation(i))}</code></small></span>`
            : mode === 'file'
              ? `<code class="line-number">${i.location.line ? `L${i.location.line}` : '—'}</code>${mark(i.severity)}<span class="finding-body">${e(i.message)}</span><code>${e(i.ruleId)}</code>`
              : `${mark(i.severity)}<span class="finding-body"><span>${e(i.message)}</span><span class="finding-meta"><code>${e(i.ruleId)}</code><span>${e(i.ruleName)}</span><span class="type-badge">${e(typeLabel(i.issueType))}</span><span class="sr-only">${e(i.severity)}</span></span></span><code class="location" title="${e(location(i))}">${e(shortLocation(i))}</code>`,
          'issue',
          key(i),
          `class="finding finding-${mode}"`,
        ),
      )
      .join('');
  const filtered = () =>
    issues.filter(
      (i) =>
        severities.has(i.severity) &&
        (!category || i.category === category) &&
        (!rule || i.ruleId === rule) &&
        (!type || i.issueType === type) &&
        [i.message, i.ruleName, i.ruleId, i.fileName, i.category]
          .join(' ')
          .toLowerCase()
          .includes(q.toLowerCase()),
    );
  const reset = () => {
    q = '';
    category = '';
    rule = '';
    type = '';
    severities.clear();
    ['error', 'warning', 'info'].forEach((s) => severities.add(s));
    limits.clear();
  };
  const go = (field: string, value: string) => {
    reset();
    if (field === 'category') category = value;
    if (field === 'rule') rule = value;
    if (field === 'severity') {
      severities.clear();
      severities.add(value);
    }
    if (field === 'type') type = value;
    view = 'findings';
    render();
  };
  const section = (n: string, title: string, sub: string) =>
    `<div class="section-label"><code>${n}</code><strong>${title}</strong><span>${sub}</span><hr></div>`;
  const metrics = d.metrics;
  function grades(explain = false): string {
    if (d.execution.status !== 'complete' || !metrics)
      return empty('Quality grades unavailable for this scan.');
    const descriptions = {
      reliability: 'Based on bug-type findings.',
      security: 'Based on vulnerability findings.',
      maintainability: 'Estimated fix time relative to estimated development time.',
      complexity: 'Average cyclomatic complexity across measured flows.',
    };
    const cards = (['reliability', 'security', 'maintainability', 'complexity'] as const)
      .map((k) => {
        const m = metrics[k];
        const label = k.charAt(0).toUpperCase() + k.slice(1);
        if (!m || (k === 'complexity' && !metrics.flowComplexityData.length))
          return `<div><span><strong>${label}</strong><small>Not available</small></span></div>`;
        const value =
          k === 'maintainability'
            ? `${metrics.maintainability?.technicalDebt} estimated remediation${explain ? ` · ${metrics.maintainability?.debtRatio}% debt ratio` : ''}`
            : k === 'reliability'
              ? `${metrics.reliability?.bugs} bug-type findings`
              : k === 'security'
                ? `${metrics.security?.vulnerabilities} vulnerabilities`
                : `avg ${metrics.complexity?.average} per flow${metrics.complexity?.highest ? ` · highest ${metrics.complexity.highest.value}` : ''}`;
        return `<div ${!explain && (k === 'reliability' || k === 'security') ? `role="button" tabindex="0" data-action="type" data-value="${k === 'reliability' ? 'bug' : 'vulnerability'}"` : ''}><span class="grade grade-${m.rating}">${m.rating}</span><span><strong>${label}</strong><small>${e(value)}</small>${explain ? `<small>${e(descriptions[k])}</small>` : ''}</span></div>`;
      })
      .join('');
    return `<div class="grades${explain ? ' grade-explanations' : ''}">${cards}</div>${explain ? `<details class="grade-method"><summary>Scoring thresholds and estimation model</summary><p>Grades and remediation time use the linter's heuristic model; they are not measured work or a release guarantee.</p>${(['reliability', 'security', 'maintainability', 'complexity'] as const).map((k) => `<h3>${k}</h3><dl>${THRESHOLDS[k].map((t) => `<dt>${t.grade}</dt><dd>${e(t.description)}</dd>`).join('')}</dl>`).join('')}</details>` : ''}`;
  }
  function overview(): string {
    const c = counts(issues);
    const title =
      d.execution.status === 'incomplete'
        ? 'Scan incomplete'
        : d.execution.status === 'no-files'
          ? 'No files scanned'
          : issues.length
            ? `${c[0]} ${c[0] === 1 ? 'error' : 'errors'} and ${c[1]} ${c[1] === 1 ? 'warning' : 'warnings'} need attention`
            : 'No findings reported';
    const gate = d.gateDetails;
    const verdict = `<div class="verdict"><div><span class="eyebrow">Scan ${e(d.execution.status)} · ${d.gate.status === 'not-evaluated' ? 'No gate evaluated' : `Gate ${e(d.gate.status)}`} </span><h1>${title}</h1><p>Findings apply to the selected files and rules. Static analysis does not replace design, security, testing, or operations review.</p></div><div class="facts">${[
      [d.metadata.filesScanned, 'Files scanned'],
      [d.scan.scopeKnown ? d.scan.enabledRuleIds.length : '—', 'Enabled rules'],
      [issues.length, 'Findings'],
      [
        d.execution.status === 'complete' ? (metrics?.maintainability?.technicalDebt ?? '—') : '—',
        'Est. remediation',
      ],
    ]
      .map(([v, l]) => `<div><strong>${e(v)}</strong><small>${l}</small></div>`)
      .join(
        '',
      )}</div></div>${gate ? `<div class="gate-conditions">${gate.conditions.map((r) => `<span>${r.passed ? '✓' : '!'} ${e(r.condition.metric)}: ${e(r.actualValue)} · violation when ${e(r.condition.operator)} ${e(r.condition.threshold)} (${e(r.condition.status)})</span>`).join('')}</div>` : ''}`;
    const cats = categories
      .filter((c) => issues.some((i) => i.category === c))
      .sort(
        (a, b) =>
          issues.filter((i) => i.category === b).length -
            issues.filter((i) => i.category === a).length || a.localeCompare(b),
      );
    const bars = cats
      .map((c) => {
        const list = issues.filter((i) => i.category === c);
        return button(
          `${categoryBadge(c)}<span>${e(categoryMeta(c)[1])}</span><span class="bar">${counts(list)
            .map(
              (n, j) =>
                `<span class="bar-${j}" style="width:${(n / Math.max(...cats.map((category) => issues.filter((i) => i.category === category).length), 1)) * 100}%"></span>`,
            )
            .join('')}</span><code>${list.length}</code>`,
          'category',
          c,
          'class="bar-row"',
        );
      })
      .join('');
    const top = [...new Set(issues.map((i) => i.ruleId))]
      .map((id) => ({ id, n: issues.filter((i) => i.ruleId === id).length }))
      .sort((a, b) => b.n - a.n || a.id.localeCompare(b.id))
      .slice(0, 6);
    return (
      section('01', 'Verdict', 'Scan outcome and quality gate') +
      `<section class="panel verdict-panel">${verdict}</section>` +
      section('02', 'Severity', 'How serious is it?') +
      `<div class="cards">${['Errors', 'Warnings', 'Info', 'Files'].map((s, j) => button(`<span>${j < 3 ? mark(['error', 'warning', 'info'][j] ?? 'info') : icon('files')} ${s}<small>View →</small></span><strong>${j < 3 ? c[j] : d.metadata.filesScanned}</strong><small>${['Review and resolve errors', 'Review best-practice findings', 'Consider advisory findings', 'Browse scanned files'][j]}</small>`, j === 3 ? 'view' : 'severity', j === 3 ? 'files' : (['error', 'warning', 'info'][j] ?? 'info'), 'class="metric panel"')).join('')}</div>` +
      section('03', 'Act', 'What to fix first') +
      `<div class="columns overview-columns">${panel('Fix first', (rows(issues.slice(0, 5), 'priority') || empty('No findings reported.')) + (issues.length ? button(`See all ${issues.length} findings ${icon('chevron')}`, 'view', 'findings', 'class="panel-action"') : ''), 'Errors first, then vulnerabilities')}${panel('Quality grades', grades(), 'A best, E worst · heuristic estimates')}</div>` +
      section('04', 'Patterns', 'Where findings cluster') +
      `<div class="columns overview-columns">${panel('By category', bars || empty('No findings in any category.'), `<span class="chart-legend">${['error', 'warning', 'info'].map((severity) => `<span>${mark(severity)}${e(severity.charAt(0).toUpperCase() + severity.slice(1))}</span>`).join('')}</span>`)}${panel('Most violated rules', top.map((r) => button(`<code>${e(r.id)}</code><span>${e(issues.find((i) => i.ruleId === r.id)?.ruleName)}</span><span class="rule-bar"><span style="width:${(r.n / Math.max(...top.map((item) => item.n), 1)) * 100}%"></span></span><code>${r.n}</code>`, 'rule', r.id, 'class="bar-row"')).join('') || empty('No rule findings.'))}</div>`
    );
  }
  function findings(): string {
    const list = filtered();
    const groups = new Map<string, ClientIssue[]>();
    list.forEach((i) => {
      const k =
        group === 'file'
          ? i.fileName
          : group === 'rule'
            ? i.ruleId
            : group === 'category'
              ? i.category
              : i.severity;
      const items = groups.get(k) ?? [];
      items.push(i);
      groups.set(k, items);
    });
    const active = q || category || rule || type || severities.size !== 3;
    const controls = `<div class="toolbar finding-toolbar"><input id="finding-search" aria-label="Search findings" placeholder="Search message, rule, file…" value="${e(q)}"><div class="severity-filters">${['error', 'warning', 'info'].map((s, index) => button(`${mark(s)}${severityLabel(s)}<code>${counts(issues)[index]}</code>`, 'toggle', s, `class="severity-chip ${s}" aria-pressed="${severities.has(s)}"`)).join('')}</div><select id="category" aria-label="Category"><option value="">All categories</option>${categories.map((c) => `<option value="${e(c)}" ${category === c ? 'selected' : ''}>${e(categoryMeta(c)[1])}</option>`).join('')}</select><div class="segmented" role="group" aria-label="Group findings"><span>Group</span>${['severity', 'file', 'rule', 'category'].map((g) => button(g.charAt(0).toUpperCase() + g.slice(1), 'group', g, `aria-pressed="${g === group}"`)).join('')}</div>${active ? button('Reset filters', 'reset') : ''}${button(`${icon('download')}Export CSV`, 'csv', '', 'class="export-button"')}</div>`;
    const sortedGroups = [...groups].sort(([a, av], [b, bv]) => {
      if (group === 'severity') return (rank[a] ?? 3) - (rank[b] ?? 3);
      if (group === 'file')
        return (
          Number(a === 'Project Structure') - Number(b === 'Project Structure') ||
          bv.length - av.length ||
          a.localeCompare(b)
        );
      if (group === 'rule')
        return (
          (rank[av[0]?.severity ?? ''] ?? 3) - (rank[bv[0]?.severity ?? ''] ?? 3) ||
          bv.length - av.length ||
          a.localeCompare(b)
        );
      return bv.length - av.length || a.localeCompare(b);
    });
    if (group === 'file')
      sortedGroups.forEach(([, items]) =>
        items.sort((a, b) => a.line - b.line || (rank[a.severity] ?? 3) - (rank[b.severity] ?? 3)),
      );
    collection = sortedGroups.flatMap(([, items]) => items);
    const grouped = sortedGroups
      .map(([k, v]) => {
        const label =
          group === 'severity'
            ? severityLabel(k)
            : group === 'category'
              ? categoryMeta(k)[1]
              : group === 'file'
                ? k === 'Project Structure'
                  ? 'Project-level checks'
                  : (k.split('/').pop() ?? k)
                : (v[0]?.ruleName ?? k);
        const badge =
          group === 'severity'
            ? mark(k)
            : group === 'category'
              ? categoryBadge(k)
              : `<span class="category-badge">${group === 'file' ? (k === 'Project Structure' ? 'PRJ' : 'XML') : e(categoryMeta(v[0]?.category ?? '')[0])}</span>`;
        return `<section class="panel finding-group"><div class="group-head">${badge}<strong>${e(label)}</strong>${group === 'file' || group === 'rule' ? `<code>${e(k)}</code>` : ''}<code class="group-count">${v.length}</code></div>${rows(v.slice(0, limits.get(k) ?? 100))}${v.length > (limits.get(k) ?? 100) ? button('Show more', 'more', k, 'class="panel-action"') : ''}</section>`;
      })
      .join('');
    return `${controls}<p class="results-description muted" role="status">Showing ${list.length} of ${issues.length} findings${rule ? ' · ' + e(rule) : ''}${type ? ' · ' + e(typeLabel(type)) : ''} · select one for location, fix and docs · <code>j / k</code> to step through</p>${grouped || `<div class="empty panel"><strong>${issues.length ? 'No findings match these filters' : d.execution.status === 'complete' ? 'No findings reported' : 'Scan requires attention'}</strong><p>${issues.length ? 'Clear the search or turn a severity back on.' : 'Review the scan scope and diagnostics.'}</p>${active ? button('Reset filters', 'reset') : ''}</div>`}`;
  }

  function files(): string {
    const ordered = [...d.files].sort((a, b) => {
      const ac = counts(issues.filter((i) => i.fileName === a.relativePath)),
        bc = counts(issues.filter((i) => i.fileName === b.relativePath));
      return (
        (bc[0] ?? 0) - (ac[0] ?? 0) ||
        (bc[1] ?? 0) - (ac[1] ?? 0) ||
        (bc[2] ?? 0) - (ac[2] ?? 0) ||
        a.relativePath.localeCompare(b.relativePath)
      );
    });
    const fileIssues = (path: string) =>
      issues
        .filter((i) => i.fileName === path)
        .sort((a, b) => a.line - b.line || (rank[a.severity] ?? 3) - (rank[b.severity] ?? 3));
    collection = ordered.flatMap((f) => fileIssues(f.relativePath));
    return (
      ordered
        .map((f) => {
          const project = f.relativePath === 'Project Structure';
          const parts = f.relativePath.split('/');
          const name = parts.pop() ?? f.relativePath;
          const list = fileIssues(f.relativePath);
          const count = counts(list);
          return `<details class="panel file-panel" data-file="${e(f.relativePath)}" ${(expandedFiles.get(f.relativePath) ?? f.parsed) ? 'open' : ''}><summary><span class="file-badge">${project ? 'PRJ' : 'XML'}</span><span class="file-title"><strong>${project ? 'Project-level checks' : e(name)}</strong><code>${project ? 'Structure, specs, tests and environments' : e(parts.join('/') + '/')}</code></span><span class="file-status">${f.parsed ? e(metrics?.fileComplexity[f.relativePath] ?? 'Parsed') : 'Not parsed'}</span><span class="file-counts">${['error', 'warning', 'info'].map((severity, index) => `<span class="${count[index] ? severity : 'muted'}" aria-label="${count[index]} ${severityLabel(severity)}">${mark(severity)}${count[index]}</span>`).join('')}</span><span class="file-caret">${icon('chevron')}</span></summary>${rows(list.slice(0, limits.get(f.relativePath) ?? 100), 'file') || empty(f.parsed ? 'No findings in this file.' : 'File could not be parsed.')}${list.length > (limits.get(f.relativePath) ?? 100) ? button('Show more', 'more', f.relativePath, 'class="panel-action"') : ''}</details>`;
        })
        .join('') || empty('No files scanned.')
    );
  }
  function rules(): string {
    const list = d.rules.filter(
      (r) =>
        (!rc || r.category === rc) &&
        (!hit || issues.some((i) => i.ruleId === r.id)) &&
        `${r.id} ${r.name} ${r.description}`.toLowerCase().includes(rq.toLowerCase()),
    );
    const ruleCategories = categories
      .filter((c) => d.rules.some((r) => r.category === c))
      .sort(
        (a, b) =>
          d.rules.filter((r) => r.category === b).length -
            d.rules.filter((r) => r.category === a).length || a.localeCompare(b),
      );
    const cats = ['', ...ruleCategories];
    const toolbar = `<div class="toolbar"><input id="rule-search" aria-label="Search rules" value="${e(rq)}" placeholder="Search ${d.rules.length} rules by id, name or description…">${button('Triggered in this scan', 'hit', '', `class="trigger-toggle" aria-pressed="${hit}"`)}<span class="muted">${d.rules.filter((r) => issues.some((i) => i.ruleId === r.id)).length} of ${d.rules.length} rules triggered · ${d.scan.scopeKnown ? `${d.scan.enabledRuleIds.length} enabled` : 'Enabled selection unknown'} · ${list.length} shown</span></div><div class="category-pills" role="group" aria-label="Rule categories">${cats.map((c) => button(`${c ? `<code>${e(categoryMeta(c)[0])}</code>` : '<code>∗</code>'}${c ? e(categoryMeta(c)[1]) : 'All'}<code>${c ? d.rules.filter((r) => r.category === c).length : d.rules.length}</code>`, 'rule-category', c, `class="category-pill" aria-pressed="${rc === c}"`)).join('')}</div>`;
    const catalog = ruleCategories
      .map((c) => {
        const rs = list
          .filter((r) => r.category === c)
          .sort(
            (a, b) =>
              issues.filter((i) => i.ruleId === b.id).length -
                issues.filter((i) => i.ruleId === a.id).length || a.id.localeCompare(b.id),
          );
        if (!rs.length) return '';
        const findings = issues.filter((i) => rs.some((r) => r.id === i.ruleId)).length;
        return `<section class="panel"><div class="catalog-head"><span class="category-badge category-badge-solid">${e(categoryMeta(c)[0])}</span><h2>${e(categoryMeta(c)[1])}</h2><span class="muted">${rs.length} rules${findings ? ` · ${findings} findings` : ''}</span></div>${rs
          .map((r) => {
            const n = issues.filter((i) => i.ruleId === r.id).length;
            return `<div class="rule-row"><code>${e(r.id)}</code><div><div class="rule-title">${mark(r.severity)}<strong>${e(r.name)}</strong><small>${e(r.severity)} · ${e(typeLabel(r.issueType))}</small><span class="rule-selection">${!d.scan.scopeKnown ? 'Selection unknown' : d.scan.enabledRuleIds.includes(r.id) ? 'Enabled' : 'Not enabled'}</span></div><p>${e(r.description)}</p></div>${n ? button(`${n} found →`, 'rule', r.id, 'class="rule-hit"') : ''}</div>`;
          })
          .join('')}</section>`;
      })
      .join('');
    return toolbar + (catalog || empty('No rules match.'));
  }
  function architecture(): string {
    if (!metrics)
      return empty(
        'Architecture metrics: Not available. This report did not supply inventory measurements.',
      );
    const available = d.metricsAvailable;
    const cards: [string, number, string, string][] = [
      ['Flows', metrics.flowCount, 'Entry points', 'architecture'],
      ['Sub-flows', metrics.subFlowCount, 'Reusable logic', 'layers'],
      ['HTTP listeners', metrics.httpListenerCount, 'Inbound endpoints', 'project'],
      ['DataWeave', metrics.dwTransformCount, 'Transforms', 'bolt'],
      [
        'Connector configs',
        metrics.connectorConfigCount,
        metrics.connectorTypes.join(', ') || 'Connection settings',
        'layers',
      ],
    ];
    const facts: [string, string[]][] = [
      ['Environments', metrics.environments],
      [
        'External services',
        metrics.externalServices.map((v) =>
          v.host === 'external' ? v.name : `${v.name} · ${v.host}`,
        ),
      ],
      ['Connector types', metrics.connectorTypes],
      ['Security patterns', metrics.securityPatterns],
      ['Schedulers', metrics.schedulers.map((v) => `${v.flow} · ${v.type}: ${v.value}`)],
    ];
    const endpoints = available
      ? metrics.apiEndpoints
          .map(
            (endpoint) =>
              `<div class="inventory-row"><span class="pill method-pill">${e(endpoint.method)}</span><code>${e(endpoint.path)}</code></div>`,
          )
          .join('') || empty('No endpoints detected.')
      : empty('Not available');
    const factsHtml = `<dl class="architecture-facts">${facts.map(([label, items]) => `<dt>${label}</dt><dd>${!available ? '<span class="muted">Not available</span>' : items.length ? items.map((item) => `<span class="pill neutral-pill">${e(item)}</span>`).join('') : '<span class="muted">None detected</span>'}</dd>`).join('')}</dl>`;
    const flows = available
      ? metrics.flowComplexityData
          .map(
            (flow) =>
              `<div class="inventory-row flow-row"><div><code>${e(flow.flowName)}</code><small title="${e(flow.file)}">${e(flow.file.split(/[\\/]/).pop())}</small></div><strong>${flow.complexity}</strong><span class="pill complexity-${e(flow.rating)}">${e(flow.rating)}</span></div>`,
          )
          .join('') || empty('No flow complexity recorded.')
      : empty('Not available');
    const estimate = `<p class="estimate-note">Heuristic estimates, not a release guarantee.</p>${grades(true)}`;
    const extra: [string, Record<string, number> | undefined][] = [
      [
        'Coverage',
        metrics.coverage
          ? {
              Tests: metrics.coverage.munitTests,
              'Covered flows': metrics.coverage.coveredFlows,
              'Coverage (%)': metrics.coverage.percentage,
            }
          : undefined,
      ],
      [
        'Duplication',
        metrics.duplications
          ? {
              'Duplicated code (%)': metrics.duplications.percentage,
              'Duplicate blocks': metrics.duplications.blocks,
            }
          : undefined,
      ],
    ];
    return `${d.execution.status !== 'complete' ? '<p class="muted">Inventory metrics cover successfully parsed files only; this scan is incomplete.</p>' : ''}<div class="cards architecture-cards">${cards.map(([title, n, sub, name]) => `<div class="metric panel"><span class="metric-icon">${icon(name)}</span><strong>${available ? n : '—'}</strong><span>${title}</span><small>${e(sub)}</small></div>`).join('')}</div><div class="columns architecture-columns">${panel('API endpoints', endpoints + factsHtml)}<div class="panel-stack">${panel('Flow complexity', flows, 'Cyclomatic · higher is harder to test')}${panel('How grades are estimated', estimate)}</div></div><div class="columns">${extra
      .map(([title, data]) => {
        if (data && available)
          return panel(
            title,
            `<dl class="architecture-facts">${Object.entries(data)
              .map(([label, n]) => `<dt>${label}</dt><dd><code>${n}</code></dd>`)
              .join('')}</dl>`,
          );
        const coverage = title === 'Coverage';
        return `<section class="panel optional-metric"><div class="panel-head"><h2>${title}</h2><span class="measurement-status">Not reported</span></div><div class="metric-empty-state"><span class="empty-state-icon">${icon(coverage ? 'coverage' : 'duplication')}</span><div><strong>No ${coverage ? 'coverage' : 'duplication'} data</strong><p>${coverage ? 'This scan did not include test coverage results.' : 'This scan did not include code duplication measurements.'}</p></div></div></section>`;
      })
      .join('')}</div>`;
  }
  function syncTheme(): void {
    document.querySelectorAll('[data-action=theme]').forEach((node) => {
      const dark = document.documentElement.dataset.theme === 'dark';
      node.innerHTML = icon(dark ? 'sun' : 'moon');
      node.setAttribute('aria-label', dark ? 'Switch to light theme' : 'Switch to dark theme');
    });
  }
  function render(): void {
    syncTheme();
    const active = document.activeElement?.id;
    const position = active ? (document.activeElement as HTMLInputElement).selectionStart : null;
    const pages: Record<
      string,
      { eyebrow: string; title: string; description: string; link: string; href: string }
    > = {
      findings: {
        eyebrow: 'Step 1 · Triage',
        title: 'Findings',
        description:
          'Every issue this scan raised. Filter by severity or category, group the way you work, then open a finding for its exact location and suggested fix.',
        link: 'Troubleshooting a message',
        href: 'troubleshooting/',
      },
      files: {
        eyebrow: 'Step 2 · Locate',
        title: 'Files',
        description:
          'Findings mapped to source files in line order, worst file first. Project-level checks cover structure, specs, tests and environments.',
        link: 'Folder structure guide',
        href: 'best-practices/folder-structure/',
      },
      rules: {
        eyebrow: 'Reference',
        title: 'Rules catalog',
        description: `All ${d.rules.length} supplied checks, grouped by category. Rules that fired in this scan link back to their findings.`,
        link: 'Full rules catalog',
        href: 'best-practices/rules-catalog/',
      },
      architecture: {
        eyebrow: 'Context',
        title: 'Architecture',
        description:
          'What the scanner learned about this application: flows, endpoints, connectors and environments, plus how the quality grades are derived.',
        link: 'Mule best-practice handbook',
        href: 'best-practices/mulesoft-best-practices/',
      },
    };
    const page = pages[view];
    root.innerHTML = `${page ? `<div class="page-head"><div><span class="eyebrow">${e(page.eyebrow)}</span><h1>${e(page.title)}</h1><p>${e(page.description)}</p></div><a href="https://avinava.github.io/mule-lint/${page.href}" target="_blank" rel="noopener">${icon('rules')}${e(page.link)}</a></div>` : ''}${view === 'overview' ? overview() : view === 'findings' ? findings() : view === 'files' ? files() : view === 'rules' ? rules() : architecture()}`;

    document.querySelectorAll('[data-view]').forEach((n) => {
      n.setAttribute('aria-current', n.getAttribute('data-view') === view ? 'page' : 'false');
    });
    if (active) {
      const n = document.getElementById(active) as HTMLInputElement | null;
      n?.focus();
      if (n?.tagName === 'INPUT' && position !== null) n.setSelectionRange(position, position);
    }
  }
  const dialog = document.getElementById('finding-dialog') as HTMLDialogElement;
  function openIssue(i: ClientIssue): void {
    selected = i;
    document
      .querySelectorAll<HTMLElement>('.finding')
      .forEach((row) => row.classList.toggle('selected', row.dataset.value === key(i)));
    const idx = collection.indexOf(i);
    dialog.innerHTML = `<div class="drawer-head"><span class="severity-badge ${e(i.severity)}">${mark(i.severity)}${e(i.severity.charAt(0).toUpperCase() + i.severity.slice(1))}</span><code>${e(i.ruleId)}</code><span class="drawer-count">${idx + 1} / ${collection.length}</span>${button(icon('up'), 'prev', '', idx <= 0 ? 'disabled aria-label="Previous finding"' : 'aria-label="Previous finding"')}${button(icon('down'), 'next', '', idx >= collection.length - 1 ? 'disabled aria-label="Next finding"' : 'aria-label="Next finding"')}${button(icon('close'), 'close', '', 'aria-label="Close finding"')}</div><div class="drawer-body"><small>${e(i.ruleName)}</small><h2>${e(i.message)}</h2><h3>${icon('location')}Location</h3><div class="inset"><code>${e(location(i))}</code>${button(`${icon('copy')}Copy`, 'copy')}</div>${i.suggestion ? `<h3>How to fix</h3><p class="suggestion">${e(i.suggestion)}</p>` : ''}${i.codeSnippet ? `<h3>Source</h3><pre>${e(i.codeSnippet)}</pre>` : ''}<h3>Why this rule exists</h3><p>${e(i.ruleDescription)}</p><dl><dt>Category</dt><dd class="category-detail">${categoryBadge(i.category)}${e(categoryMeta(i.category)[1])}</dd><dt>Type</dt><dd>${e(i.issueType)}</dd><dt>Standards</dt><dd>${e(i.standardIds.join(', ') || 'Not recorded')}</dd><dt>Fingerprint</dt><dd><code>${e(i.fingerprint)}</code></dd></dl>${i.docsUrl && /^https?:\/\//.test(i.docsUrl) ? `<a href="${e(i.docsUrl)}" target="_blank" rel="noopener">${icon('rules')}Read rule docs${icon('external')}</a>` : ''}${button(`Find in rules catalog${icon('chevron')}`, 'catalog', i.ruleId, 'class="catalog-action"')}</div>`;
    if (!dialog.open) {
      opener = document.activeElement as HTMLElement;
      dialog.showModal();
    }
  }
  document.addEventListener('click', (event) => {
    const b = (event.target as Element).closest<HTMLElement>('[data-action]');
    if (!b) return;
    const a = b.dataset.action,
      v = b.dataset.value ?? '';
    if (a === 'view') {
      view = v;
      render();
    }
    if (['severity', 'category', 'rule', 'type'].includes(a ?? '')) go(a ?? '', v);
    if (a === 'group') {
      group = v;
      render();
    }
    if (a === 'rule-category') {
      rc = v;
      render();
    }
    if (a === 'toggle') {
      if (severities.has(v)) severities.delete(v);
      else severities.add(v);
      render();
    }
    if (a === 'reset') {
      reset();
      render();
    }
    if (a === 'more') {
      limits.set(v, (limits.get(v) ?? 100) + 100);
      render();
    }
    if (a === 'hit') {
      hit = !hit;
      render();
    }
    if (a === 'issue') {
      if (view === 'overview') collection = issues.slice(0, 5);
      const found = issues.find((i) => key(i) === v);
      if (found) openIssue(found);
    }
    if (a === 'close') dialog.close();
    if ((a === 'prev' || a === 'next') && selected) {
      const i = collection.indexOf(selected) + (a === 'prev' ? -1 : 1);
      if (collection[i]) openIssue(collection[i]);
    }
    if (a === 'catalog' && selected) {
      dialog.close();
      view = 'rules';
      rq = selected.ruleId;
      rc = '';
      hit = false;
      render();
    }
    if (a === 'copy' && selected)
      void navigator.clipboard.writeText(location(selected)).then(
        () => {
          b.textContent = 'Copied';
        },
        () => {
          b.textContent = 'Copy unavailable';
        },
      );
    if (a === 'csv') {
      const blob = new Blob([csv(filtered())], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = d.metadata.projectName + '-findings.csv';
      link.click();
      setTimeout(() => {
        URL.revokeObjectURL(url);
      }, 1000);
    }
    if (a === 'theme') {
      document.documentElement.dataset.theme =
        document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
      syncTheme();
      try {
        localStorage.setItem('mule-lint-theme', document.documentElement.dataset.theme);
      } catch {
        /* Storage is optional. */
      }
    }
  });
  document.addEventListener('input', (event) => {
    const n = event.target as HTMLInputElement;
    if (n.id === 'finding-search') {
      q = n.value;
      limits.clear();
      render();
    }
    if (n.id === 'rule-search') {
      rq = n.value;
      render();
    }
  });
  document.addEventListener('change', (event) => {
    const n = event.target as HTMLSelectElement;
    if (n.id === 'category') category = n.value;
    if (n.id === 'group') group = n.value;
    if (n.id === 'rule-category') rc = n.value;
    render();
  });
  dialog.addEventListener('close', () => {
    document.querySelectorAll('.finding.selected').forEach((row) => {
      row.classList.remove('selected');
    });
    if (opener?.isConnected) opener.focus();
  });
  dialog.addEventListener('click', (event) => {
    if (event.target === dialog && event.clientX < dialog.getBoundingClientRect().left)
      dialog.close();
  });
  document.addEventListener('keydown', (event) => {
    const target = event.target as HTMLElement;
    if (
      (event.key === 'Enter' || event.key === ' ') &&
      target.matches('[role=button][data-action]')
    ) {
      event.preventDefault();
      target.click();
      return;
    }
    if (!dialog.open || /INPUT|SELECT|TEXTAREA/.test(target.tagName)) return;
    if (event.key === 'Escape') {
      dialog.close();
      return;
    }
    if ((event.key === 'j' || event.key === 'k') && selected) {
      event.preventDefault();
      const i = collection.indexOf(selected) + (event.key === 'j' ? 1 : -1);
      if (collection[i]) openIssue(collection[i]);
    }
  });
  try {
    document.documentElement.dataset.theme =
      localStorage.getItem('mule-lint-theme') ??
      (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
  } catch {
    document.documentElement.dataset.theme = 'light';
  }
  document.addEventListener(
    'toggle',
    (event) => {
      const node = event.target;
      if (node instanceof HTMLDetailsElement && node.dataset.file)
        expandedFiles.set(node.dataset.file, node.open);
    },
    true,
  );
  render();
}
