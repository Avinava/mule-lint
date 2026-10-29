/**
 * HTML Formatter
 * Generates a premium HTML Single Page Application report
 *
 * This file is the orchestrator that composes modular components from ./html/
 * Design inspired by: Stripe Docs + Tailwind CSS Docs
 */

import { LintReport } from '../types/Report';
import { ALL_RULES } from '../rules';
import type { Rule } from '../types';
import packageJson from '../../package.json';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { buildClientData } from './html/reportData';

import { icon } from './html/visuals';
import { createReportContract } from '../core/ReportContract';

let cachedAssets: { script: string; styles: string; licenses: string } | undefined;
function browserAssets() {
  if (!cachedAssets) {
    const read = (name: string): string =>
      readFileSync(join(__dirname, 'html/generated', name), 'utf8');
    cachedAssets = {
      script: read('client.mjs').replace(/<\/script/gi, '<\\/script'),
      styles: read('client.css').replace(/<\/style/gi, '<\\/style'),
      licenses: read('licenses.txt').replace(/-->/g, '--&gt;'),
    };
  }
  return cachedAssets;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * Format lint report as a premium HTML Single Page Application
 */
export function formatHtml(report: LintReport, rules: Rule[] = ALL_RULES): string {
  const assets = browserAssets();
  // 1. Enrich Data
  const contract = createReportContract(report, rules);

  // 2. Build client data payload
  const clientData = buildClientData(report, rules, contract);
  const jsonPayload = JSON.stringify(clientData).replace(/</g, '\\u003c');

  // 3. Calculate summary values
  const projectName = clientData.metadata.projectName;
  const escapedProjectName = escapeHtml(projectName);
  const totalIssues = contract.summary.totalIssues;
  const selectionNote = [
    contract.selection.quiet ? 'Errors-only selection' : '',
    contract.selection.baseline
      ? `Baseline: ${contract.selection.baseline.newIssues} new, ${contract.selection.baseline.unchanged} unchanged, ${contract.selection.baseline.fixed} fixed`
      : '',
  ]
    .filter(Boolean)
    .join(' · ');

  const mark = `<svg width="24" height="24" viewBox="0 0 28 28" aria-hidden="true"><rect width="28" height="28" rx="7.5" fill="currentColor"/><path d="M7.5 9h13M7.5 14h9.5M7.5 19h5" stroke="var(--panel)" stroke-width="2.5" stroke-linecap="round"/><circle cx="19.2" cy="19" r="2.3" fill="var(--accent)"/></svg>`;
  const brand = `<a class="brand" href="https://github.com/Avinava/mule-lint">${mark}<span>mule<span class="accent">-</span>lint</span></a>`;
  const nav = ['overview', 'findings', 'files', 'rules', 'architecture']
    .map(
      (view) =>
        `<button data-action="view" data-value="${view}" data-view="${view}">${icon(view)}${view.charAt(0).toUpperCase() + view.slice(1)}${view === 'overview' ? '' : `<span class="tab-count" ${view === 'files' ? 'title="File groups, including project-level checks"' : ''}>${view === 'findings' ? totalIssues : view === 'files' ? clientData.files.length : view === 'rules' ? rules.length : clientData.metrics ? clientData.metrics.flowCount + clientData.metrics.subFlowCount : '—'}</span>`}</button>`,
    )
    .join('');
  const executionHtml = `<section class="execution-status ${contract.execution.status === 'complete' ? '' : 'diagnostic'}" data-status="${contract.execution.status}"><strong>Scan ${contract.execution.status} · ${totalIssues} findings</strong>${contract.execution.diagnostics.map((item) => `<p>${escapeHtml(item.relativePath ?? item.ruleId ?? '')} ${escapeHtml(item.message)}</p>`).join('')}<details><summary>Scan scope and selection</summary><p>Include: ${escapeHtml(contract.scan.include.join(', ') || 'Not recorded')} · Exclude: ${escapeHtml(contract.scan.exclude.join(', ') || 'None recorded')}</p><p>${contract.selection.quiet ? 'Errors-only selection. ' : ''}${contract.selection.baseline ? `Baseline: ${contract.selection.baseline.newIssues} new, ${contract.selection.baseline.unchanged} unchanged, ${contract.selection.baseline.fixed} fixed` : 'No baseline selection.'}</p></details></section>`;
  return `<!DOCTYPE html>
<html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>mule-lint report · ${escapedProjectName}</title><style>${assets.styles}</style></head><body>
<a class="skip" href="#report-app">Skip to report</a>
<script id="report-data" type="application/json">${jsonPayload}</script>
<header><div class="brand-bar"><div class="container">${brand}<code class="version">v${packageJson.version}</code><span class="muted">Static analysis for Mule 4</span><nav class="resources"><a href="https://avinava.github.io/mule-lint/">${icon('rules')}Docs</a><a href="https://avinava.github.io/mule-lint/best-practices/rules-catalog/">Rules catalog</a><a href="https://avinava.github.io/mule-lint/quality-gates/">Quality gates</a><a href="https://github.com/Avinava/mule-lint">${icon('github')}GitHub</a></nav></div></div>
<div class="container project-header"><span class="project-icon">${icon('project')}</span><div class="project-identity"><small>Scan report <span class="breadcrumb-separator">/</span> <code>${escapeHtml(clientData.scan.target?.path ?? 'Scope not recorded')}</code></small><h2>${escapedProjectName}</h2><div class="project-meta"><span>${icon('clock')}<code>${escapeHtml(new Date(report.timestamp).toLocaleString('en-GB', { dateStyle: 'medium', timeStyle: 'short' }))}</code></span><span>${icon('bolt')}<code>${report.durationMs} ms</code></span><span>${icon('layers')}<code>profile ${escapeHtml(clientData.scan.profile ?? 'not recorded')}</code></span><span>${icon('files')}<code>${report.summary.totalFiles} files</code></span></div></div><span class="gate-badge" data-gate="${contract.gate.status}"><span class="status-dot"></span>Gate ${escapeHtml(contract.gate.status.replace('-', ' '))}</span><button class="icon-button" data-action="theme" aria-label="Toggle color theme">${icon('moon')}</button></div>
<nav class="container tabs" aria-label="Report views">${nav}</nav></header>
<main class="container" id="main-content">
${contract.execution.status !== 'complete' ? executionHtml : ''}
${selectionNote ? `<p class="selection-notice">${escapeHtml(selectionNote)}</p>` : ''}
<div id="report-app" tabindex="-1"><p>${totalIssues} findings in ${report.summary.totalFiles} files. Enable JavaScript for interactive report views.</p></div>
${contract.execution.status === 'complete' ? `<details class="scan-details"><summary>Scan details and selection</summary>${executionHtml}</details>` : ''}</main><footer class="report-footer"><div class="container"><div class="footer-grid"><div class="footer-about">${brand}<p>This report was generated by mule-lint v${packageJson.version}, an open-source static analyser for MuleSoft Mule 4 applications. It runs locally and needs no Anypoint credentials.</p><a class="repository-link" href="https://github.com/Avinava/mule-lint" target="_blank" rel="noopener">${icon('github')}Avinava/mule-lint${icon('external')}</a></div><nav aria-label="Learning resources"><h2>Learn</h2><a href="https://avinava.github.io/mule-lint/getting-started/">Getting started</a><a href="https://avinava.github.io/mule-lint/best-practices/rules-catalog/">Rules catalog</a><a href="https://avinava.github.io/mule-lint/best-practices/standards-catalog/">Standards catalog</a><a href="https://avinava.github.io/mule-lint/quality-gates/">Quality gates</a><a href="https://avinava.github.io/mule-lint/troubleshooting/">Troubleshooting</a></nav><nav aria-label="Project resources"><h2>Project</h2><a href="https://github.com/Avinava/mule-lint">Source on GitHub</a><a href="https://github.com/Avinava/mule-lint/issues">Report an issue</a><a href="https://www.npmjs.com/package/@sfdxy/mule-lint">npm · @sfdxy/mule-lint</a><a href="https://avinava.github.io/mule-lint/best-practices/ci-cd/">CI/CD integration</a></nav></div><div class="footer-meta"><code>${escapeHtml(report.projectRoot)}</code><span>Generated ${escapeHtml(report.timestamp)}</span><span>MIT licensed</span></div></div></footer>
<dialog id="finding-dialog" aria-label="Finding details"></dialog>
<!-- Browser dependency licenses:
${assets.licenses}
--><script>${assets.script}</script></body></html>`;
}
