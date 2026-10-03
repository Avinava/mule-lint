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

import { createReportContract } from '../core/ReportContract';

// Import all modular components from html/
import {
  // Theme & Styles
  themeVariables,
  baseStyles,
  componentStyles,
  tabulatorStyles,
  // Components
  modalHtml,
  sidePanelHtml,
  // Sections
  renderHeader,
  renderSidebar,
  // Views
  renderDashboardView,
  renderIssuesView,
} from './html';

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

  return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>mule-lint report · ${escapedProjectName}</title>
    <meta name="description" content="Static analysis report for MuleSoft applications">
    
    <style>
        ${assets.styles}
        ${themeVariables}
        ${baseStyles}
        ${componentStyles}
        ${tabulatorStyles}
    </style>
</head>
<body class="bg-slate-50 dark:bg-slate-900 text-slate-700 dark:text-slate-300 font-sans">

    <script id="report-data" type="application/json">${jsonPayload}</script>

    <div class="app-layout">
        <!-- ===== HEADER ===== -->
        ${renderHeader({ projectName: escapedProjectName, version: packageJson.version, totalIssues })}

        <!-- ===== SIDEBAR ===== -->
        ${renderSidebar({ totalIssues })}

        <!-- ===== MAIN CONTENT ===== -->
        <main class="app-main overflow-hidden bg-slate-50 dark:bg-slate-900">
            ${renderDashboardView({
              filesScanned: report.summary.totalFiles,
              errors: contract.summary.bySeverity.error,
              warnings: contract.summary.bySeverity.warning,
              info: contract.summary.bySeverity.info,
            })}

            ${renderIssuesView({ totalIssues })}
        </main>
    </div>

    ${modalHtml}
    ${sidePanelHtml}
    <!-- Browser dependency licenses:
${assets.licenses}
    -->
    <script>${assets.script}</script>
</body>
</html>`;
}
