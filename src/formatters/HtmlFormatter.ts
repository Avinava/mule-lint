/**
 * HTML Formatter
 * Generates a premium HTML Single Page Application report
 * 
 * This file is the orchestrator that composes modular components from ./html/
 * Design inspired by: Stripe Docs + Tailwind CSS Docs
 */

import { LintReport } from '../types/Report';
import { ALL_RULES } from '../rules';
import packageJson from '../../package.json';

// Import all modular components from html/
import {
    // Theme & Styles
    themeVariables,
    baseStyles,
    componentStyles,
    tabulatorStyles,
    // Components
    modalHtml,
    modalScript,
    sidePanelHtml,
    sidePanelScript,
    // Sections
    renderHeader,
    renderSidebar,
    // Views
    renderDashboardView,
    renderIssuesView,
    // Scripts
    routerScript,
    generateRendererScript,
    initScript,
    qualityRatingsRendererScript,
    connectorMeta,
    methodStyles,
    exchangeBaseUrl,
} from './html';

/**
 * Enrich files with rule metadata
 */
function enrichFiles(report: LintReport) {
    return report.files.map((file) => ({
        ...file,
        issues: file.issues.map((issue) => {
            const ruleDef = ALL_RULES.find((r) => r.id === issue.ruleId);
            return {
                ...issue,
                category: ruleDef?.category || 'General',
                ruleDescription: ruleDef?.description || 'No description available',
                ruleName: ruleDef?.name || issue.ruleId,
                issueType: ruleDef?.issueType || 'code-smell',
                file: file.relativePath,
            };
        }),
    }));
}

/**
 * Build client-side data payload
 */
function buildClientData(report: LintReport, enrichedFiles: ReturnType<typeof enrichFiles>) {
    const projectName = report.projectRoot.split('/').filter(Boolean).pop() || 'MuleSoft Project';

    return {
        metadata: {
            projectName,
            projectRoot: report.projectRoot,
            timestamp: report.timestamp,
            version: packageJson.version,
            filesScanned: report.files.length,
            duration: report.durationMs || 0,
        },
        summary: report.summary,
        files: enrichedFiles,
        rules: ALL_RULES.map((r) => ({
            id: r.id,
            name: r.name,
            category: r.category,
            severity: r.severity,
            description: r.description,
            issueType: r.issueType || 'code-smell',
        })),
        metrics: report.metrics || {
            flowCount: 0,
            subFlowCount: 0,
            dwTransformCount: 0,
            connectorConfigCount: 0,
            httpListenerCount: 0,
            connectorTypes: [],
            errorHandlerCount: 0,
            choiceRouterCount: 0,
            apiEndpoints: [],
            environments: [],
            securityPatterns: [],
            externalServices: [],
            schedulers: [],
            fileComplexity: {},
            flowComplexityData: [],
        },
    };
}

/**
 * Format lint report as a premium HTML Single Page Application
 */
export function formatHtml(report: LintReport): string {
    // 1. Enrich Data
    const enrichedFiles = enrichFiles(report);

    // 2. Build client data payload
    const clientData = buildClientData(report, enrichedFiles);
    const jsonPayload = JSON.stringify(clientData).replace(/</g, '\\u003c');

    // 3. Calculate summary values
    const projectName = clientData.metadata.projectName;
    const totalIssues =
        report.summary.bySeverity.error +
        report.summary.bySeverity.warning +
        report.summary.bySeverity.info;

    // 4. Generate renderer script with configuration
    const rendererScript = generateRendererScript({
        exchangeBaseUrl,
        connectorMeta,
        methodStyles,
        qualityRatingsRendererScript,
    });

    // 5. Build HTML document
    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Mule-Lint Report • ${projectName}</title>
    <meta name="description" content="Static analysis report for MuleSoft applications">
    
    <!-- Fonts: Inter + JetBrains Mono -->
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet">
    
    <!-- Tailwind CSS -->
    <script src="https://cdn.tailwindcss.com"></script>
    <script>
        tailwind.config = {
            darkMode: 'class',
            theme: {
                extend: {
                    fontFamily: {
                        sans: ['Inter', '-apple-system', 'BlinkMacSystemFont', 'sans-serif'],
                        mono: ['JetBrains Mono', 'SF Mono', 'monospace'],
                    },
                    fontSize: {
                        '2xs': ['0.65rem', { lineHeight: '0.9rem' }],
                        'xs': ['0.75rem', { lineHeight: '1rem' }],
                        'sm': ['0.8125rem', { lineHeight: '1.15rem' }],
                        'base': ['0.875rem', { lineHeight: '1.35rem' }],
                    }
                }
            }
        }
    </script>
    
    <!-- Tabulator -->
    <link href="https://unpkg.com/tabulator-tables@6.2.1/dist/css/tabulator.min.css" rel="stylesheet">
    <script type="text/javascript" src="https://unpkg.com/tabulator-tables@6.2.1/dist/js/tabulator.min.js"></script>

    <!-- Chart.js -->
    <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>

    <style>
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
        ${renderHeader({ projectName, version: packageJson.version, totalIssues })}

        <!-- ===== SIDEBAR ===== -->
        ${renderSidebar({ totalIssues })}

        <!-- ===== MAIN CONTENT ===== -->
        <main class="app-main overflow-hidden bg-slate-50 dark:bg-slate-900">
            ${renderDashboardView({
        filesScanned: report.files.length,
        errors: report.summary.bySeverity.error,
        warnings: report.summary.bySeverity.warning,
        info: report.summary.bySeverity.info,
    })}

            ${renderIssuesView({ totalIssues })}
        </main>
    </div>

    <script>
        // ===== STATE (Single Source of Truth) =====
        const reportRaw = document.getElementById('report-data').textContent;
        const report = JSON.parse(reportRaw);
        const allIssues = report.files.flatMap(f => f.issues.map(i => ({ ...i, fileName: f.relativePath })));
        const totalIssues = allIssues.length;
        let tableInstance = null;
        
        // Filter state - THIS is the source of truth, not Tabulator
        const filterState = {
            severities: [],  // e.g., ['error', 'warning']
            categories: [],  // e.g., ['security', 'naming']
            searchTerm: ''
        };

        // ===== ROUTER =====
        ${routerScript}

        ${rendererScript}

        // ===== MODAL SYSTEM =====
        ${modalScript}

        // ===== SIDE PANEL =====
        ${sidePanelScript}

        ${initScript}
    </script>
    ${modalHtml}
    ${sidePanelHtml}
</body>
</html>`;
}
