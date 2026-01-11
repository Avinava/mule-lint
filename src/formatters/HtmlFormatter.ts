import { LintReport } from '../types/Report';
import { ALL_RULES } from '../rules';
import packageJson from '../../package.json';

// HTML Components - Modular System
import {
    themeVariables,
    baseStyles,
    componentStyles,
    tabulatorStyles,
    modalHtml,
    modalScript,
    sidePanelHtml,
    sidePanelScript, // Ensure this is used!
    renderMetricCard,
    renderQualityRatingsSection,
    qualityRatingsRendererScript,
    renderLintSummarySection
} from './html';

// Import new modular components
import {
    renderHeader,
    HeaderProps
} from './html/sections/Header';

import {
    renderSidebar,
    SidebarProps
} from './html/sections/Sidebar';

import { icons } from './html/components/Icons';

import {
    routerScript
} from './html/scripts/router';

import {
    connectorMeta,
    methodStyles,
    exchangeBaseUrl
} from './html/scripts/renderer';


/**
 * Format lint report as a premium HTML Single Page Application
 * Design inspired by: Stripe Docs + Tailwind CSS Docs
 */
export function formatHtml(report: LintReport): string {
    // 1. Enrich Data
    const enrichedFiles = report.files.map((file) => ({
        ...file,
        issues: file.issues.map((issue) => {
            const ruleDef = ALL_RULES.find((r) => r.id === issue.ruleId);
            return {
                ...issue,
                category: ruleDef?.category || 'General',
                ruleDescription: ruleDef?.description || 'No description available',
                ruleName: ruleDef?.name || issue.ruleId,
                file: file.relativePath,
            };
        }),
    }));

    // 2. Extract project name from path
    const projectName = report.projectRoot.split('/').filter(Boolean).pop() || 'MuleSoft Project';

    // 3. Prepare client data payload
    const clientData = {
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

    const jsonPayload = JSON.stringify(clientData).replace(/</g, '\\u003c');
    const totalIssues =
        report.summary.bySeverity.error +
        report.summary.bySeverity.warning +
        report.summary.bySeverity.info;

    // 4. Build HTML
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
        <!-- ===== HEADER ===== -->
        ${renderHeader({ projectName, version: packageJson.version, totalIssues })}


        <!-- ===== SIDEBAR ===== -->
        ${renderSidebar({ totalIssues })}


        <!-- ===== MAIN CONTENT ===== -->
        <main class="app-main overflow-hidden bg-slate-50 dark:bg-slate-900">
            
            <!-- ===== DASHBOARD VIEW ===== -->
            <div id="view-dashboard" class="h-full overflow-y-auto p-6">
                <!-- Header -->
                <div class="mb-6">
                    <h2 class="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">mule-lint dashboard</h2>
                    <p class="text-base text-slate-500 dark:text-slate-400 mt-2">
                        Scanned <strong class="text-slate-700 dark:text-slate-200">${report.files.length} files</strong> • Found <strong class="text-rose-600 dark:text-rose-400">${report.summary.bySeverity.error} errors</strong>, 
                        <strong class="text-amber-600 dark:text-amber-400">${report.summary.bySeverity.warning} warnings</strong>, and 
                        <strong class="text-sky-600 dark:text-sky-400">${report.summary.bySeverity.info} suggestions</strong>
                    </p>
                </div>

                <!-- Project Metrics (moved to top) -->
                <div class="mb-6">
                    <div class="mb-3">
                        <div class="flex items-center gap-2">
                            <h3 class="text-sm font-semibold text-slate-700 dark:text-slate-200">Project Metrics</h3>
                            <button class="info-btn" onclick="modal.open('project-metrics')">?</button>
                        </div>
                        <p class="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Architecture overview: flows, components, and configurations</p>
                    </div>
                    <div class="grid grid-cols-5 gap-3">
                        ${renderMetricCard({
        id: 'metric-flows',
        label: 'Flows',
        value: '-',
        sublabel: 'Entry points',
        color: 'violet',
        icon: icons.flow
    })}
                        ${renderMetricCard({
        id: 'metric-subflows',
        label: 'Sub-Flows',
        value: '-',
        sublabel: 'Reusable logic',
        color: 'teal',
        icon: icons.subflow
    })}
                        ${renderMetricCard({
        id: 'metric-services',
        label: 'Services',
        value: '-',
        sublabel: 'HTTP endpoints',
        color: 'cyan',
        icon: icons.service
    })}
                        ${renderMetricCard({
        id: 'metric-dw',
        label: 'DataWeave',
        value: '-',
        sublabel: 'Transforms',
        color: 'orange',
        icon: icons.dataweave
    })}
                        ${renderMetricCard({
        id: 'metric-connectors',
        label: 'Connectors',
        value: '-',
        sublabel: 'Configurations',
        color: 'indigo',
        icon: icons.connector
    })}
                    </div>
                    <!-- Connector Inventory (inline with metrics) -->
                    <div id="connector-inventory" class="mt-3 flex items-center gap-2 flex-wrap">
                        <span class="text-2xs font-medium text-slate-500 dark:text-slate-400">Connectors:</span>
                        <div id="connector-pills" class="flex flex-wrap gap-1.5"></div>
                    </div>
                    <!-- API Endpoints -->
                    <div id="endpoints-inventory" class="mt-2" style="display: none;">
                        <div class="flex items-center gap-2 flex-wrap cursor-pointer" onclick="window.toggleEndpoints()">
                            <span class="text-2xs font-medium text-slate-500 dark:text-slate-400">API Endpoints:</span>
                            <div id="endpoint-pills" class="flex flex-wrap gap-1.5"></div>
                            <svg id="endpoints-chevron" class="w-4 h-4 text-slate-400 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"/></svg>
                        </div>
                        <div id="endpoint-details" class="hidden mt-2 p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg border border-slate-200 dark:border-slate-700 max-h-48 overflow-y-auto">
                            <div id="endpoint-list" class="flex flex-wrap gap-1.5"></div>
                        </div>
                    </div>
                    <!-- Environments -->
                    <div id="environments-inventory" class="mt-2 flex items-center gap-2 flex-wrap" style="display: none;">
                        <span class="text-2xs font-medium text-slate-500 dark:text-slate-400">Environments:</span>
                        <div id="environment-pills" class="flex flex-wrap gap-1.5"></div>
                    </div>
                    <!-- Security Patterns -->
                    <div id="security-inventory" class="mt-2 flex items-center gap-2 flex-wrap" style="display: none;">
                        <span class="text-2xs font-medium text-slate-500 dark:text-slate-400">Security:</span>
                        <div id="security-pills" class="flex flex-wrap gap-1.5"></div>
                    </div>
                    <!-- External Services -->
                    <div id="services-inventory" class="mt-2" style="display: none;">
                        <div class="flex items-center gap-2 flex-wrap cursor-pointer" onclick="window.toggleServices()">
                            <span class="text-2xs font-medium text-slate-500 dark:text-slate-400">External Services:</span>
                            <div id="service-pills" class="flex flex-wrap gap-1.5"></div>
                            <svg id="services-chevron" class="w-4 h-4 text-slate-400 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"/></svg>
                        </div>
                        <div id="service-details" class="hidden mt-2 p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg border border-slate-200 dark:border-slate-700">
                            <div id="service-list" class="flex flex-wrap gap-1.5"></div>
                        </div>
                    </div>
                    <!-- Schedulers -->
                    <div id="schedulers-inventory" class="mt-2" style="display: none;">
                        <div class="flex items-center gap-2 flex-wrap cursor-pointer" onclick="window.toggleSchedulers()">
                            <span class="text-2xs font-medium text-slate-500 dark:text-slate-400">Schedulers:</span>
                            <div id="scheduler-pills" class="flex flex-wrap gap-1.5"></div>
                            <svg id="schedulers-chevron" class="w-4 h-4 text-slate-400 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"/></svg>
                        </div>
                        <div id="scheduler-details" class="hidden mt-2 p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg border border-slate-200 dark:border-slate-700">
                            <div id="scheduler-list" class="flex flex-wrap gap-1.5"></div>
                        </div>
                    </div>
                </div>

                ${renderQualityRatingsSection()}

                ${renderLintSummarySection({
        errors: report.summary.bySeverity.error,
        warnings: report.summary.bySeverity.warning,
        info: report.summary.bySeverity.info,
        filesScanned: report.files.length
    })}

                <!-- Charts -->
                <div class="grid grid-cols-3 gap-4 mb-6">
                    <div class="col-span-2 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-5">
                        <div class="mb-4">
                            <div class="flex items-center gap-2">
                                <h3 class="text-base font-semibold text-slate-700 dark:text-slate-200">Top Violated Rules</h3>
                                <button class="info-btn" onclick="modal.open('categories')">?</button>
                            </div>
                            <p class="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Most frequent rule violations across the project</p>
                        </div>
                        <div class="h-[180px]">
                            <canvas id="chart-rules"></canvas>
                        </div>
                    </div>
                    <div class="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-5">
                        <div class="mb-4">
                            <h3 class="text-base font-semibold text-slate-700 dark:text-slate-200">Severity Distribution</h3>
                            <p class="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Overview of issue impact levels</p>
                        </div>
                        <div class="h-[180px] flex items-center justify-center">
                            <canvas id="chart-severity"></canvas>
                        </div>
                    </div>
                </div>

                <div class="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-5">
                    <div class="mb-4">
                        <h3 class="text-base font-semibold text-slate-700 dark:text-slate-200">Issues by Category</h3>
                        <p class="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Breakdown of issues by functional category</p>
                    </div>
                    <div class="h-[240px]">
                        <canvas id="chart-categories"></canvas>
                    </div>
                </div>

                <!-- Flow Complexity Chart -->
                <div id="complexity-chart-container" class="mt-4 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-5" style="display: none;">
                    <div class="mb-4">
                        <h3 class="text-base font-semibold text-slate-700 dark:text-slate-200">Flow Complexity</h3>
                        <p class="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Cyclomatic complexity scores for flows (higher = more complex)</p>
                    </div>
                    <div class="h-[300px]">
                        <canvas id="chart-complexity"></canvas>
                    </div>
                </div>
            </div>

            <!-- ===== ISSUES VIEW ===== -->
            <div id="view-issues" class="hidden h-full flex flex-col">
                <!-- Toolbar -->
                <div class="bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 px-5 py-3 flex items-center gap-4 shrink-0">
                    <span class="text-sm text-slate-500 dark:text-slate-400">
                        Showing <strong id="filtered-count" class="text-slate-700 dark:text-slate-200">${totalIssues}</strong> of ${totalIssues} issues
                    </span>
                    <button id="clear-filters-btn" onclick="router.clearAllFilters()" class="hidden text-sm text-sky-600 hover:text-sky-700 dark:text-sky-400 font-medium">
                        Clear filters
                    </button>
                    <div class="flex-1"></div>
                    <button id="download-csv" class="flex items-center gap-2 px-4 py-2 text-sm font-medium text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 rounded-lg transition-colors">
                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/></svg>
                        Export CSV
                    </button>
                </div>

                <!-- Table -->
                <div id="issues-table" class="flex-1 overflow-hidden bg-white dark:bg-slate-800"></div>
            </div>
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


        // ===== RENDERER =====
        const renderer = {
            init() {
                this.renderSidebar();
                this.renderCharts();
                this.renderMetrics();
                this.initTable();
                this.initTheme();
                this.initKeyboardShortcuts();
                this.initExport();
            },
            
            renderMetrics() {
                if (report.metrics) {
                    const m = report.metrics;
                    document.getElementById('metric-flows').textContent = m.flowCount;
                    document.getElementById('metric-subflows').textContent = m.subFlowCount;
                    document.getElementById('metric-services').textContent = m.httpListenerCount || 0;
                    document.getElementById('metric-dw').textContent = m.dwTransformCount;
                    document.getElementById('metric-connectors').textContent = m.connectorConfigCount;
                    
                    // MuleSoft Exchange icon base URL
                    const exchangeBase = '${exchangeBaseUrl}';
                    
                    // Connector metadata
                    const connectorMeta = ${JSON.stringify(connectorMeta)};

                    
                    // Render connector type pills with logos and links
                    const pillsContainer = document.getElementById('connector-pills');
                    if (pillsContainer && m.connectorTypes && m.connectorTypes.length > 0) {
                        pillsContainer.innerHTML = m.connectorTypes.map(type => {
                            const meta = connectorMeta[type.toLowerCase()] || { name: type, icon: null, doc: null };
                            const docUrl = meta.doc ? 'https://docs.mulesoft.com/' + meta.doc + '/latest/' : null;
                            const pillClass = 'inline-flex items-center gap-1.5 px-2 py-0.5 text-2xs font-medium rounded-full bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors';
                            const iconHtml = meta.icon ? '<img src="' + meta.icon + '" alt="" class="w-3.5 h-3.5 rounded-sm" onerror="this.style.display=\\'none\\'">' : '<span class="w-3.5 h-3.5 rounded-sm bg-slate-300 dark:bg-slate-600 flex items-center justify-center text-2xs">⚙</span>';
                            if (docUrl) {
                                return '<a href="' + docUrl + '" target="_blank" rel="noopener" class="' + pillClass + '" title="View ' + meta.name + ' docs">' + iconHtml + '<span>' + meta.name + '</span></a>';
                            }
                            return '<span class="' + pillClass + '" title="' + meta.name + '">' + iconHtml + '<span>' + meta.name + '</span></span>';
                        }).join('');
                    } else if (pillsContainer) {
                        document.getElementById('connector-inventory').style.display = 'none';
                    }
                    
                    // Render API endpoints - grouped summary
                    const endpointContainer = document.getElementById('endpoint-pills');
                    if (endpointContainer && m.apiEndpoints && m.apiEndpoints.length > 0) {
                        document.getElementById('endpoints-inventory').style.display = 'flex';
                        
                        // Group endpoints by method
                        const byMethod = {};
                        m.apiEndpoints.forEach(ep => {
                            byMethod[ep.method] = (byMethod[ep.method] || 0) + 1;
                        });
                        
                        const methodStyles = ${JSON.stringify(methodStyles)};

                        
                        // Show total count + summary by method
                        const totalBadge = '<span class="inline-flex items-center gap-1 px-2 py-0.5 text-2xs font-bold rounded-full bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200">' + m.apiEndpoints.length + ' endpoints</span>';
                        
                        const methodBadges = Object.entries(byMethod)
                            .sort((a, b) => b[1] - a[1]) // Sort by count desc
                            .map(([method, count]) => {
                                const style = methodStyles[method] || methodStyles['ALL'];
                                return '<span class="inline-flex items-center gap-1.5 px-2 py-0.5 text-2xs font-medium rounded-full ' + style.bg + ' ' + style.text + '"><span class="w-2 h-2 rounded-full ' + style.dot + '"></span>' + method + ' <span class="font-bold">' + count + '</span></span>';
                            }).join('');
                        
                        endpointContainer.innerHTML = totalBadge + methodBadges;
                        
                        // Populate detail list
                        const endpointList = document.getElementById('endpoint-list');
                        if (endpointList) {
                            endpointList.innerHTML = m.apiEndpoints.map(ep => {
                                const style = methodStyles[ep.method] || methodStyles['ALL'];
                                return '<span class="inline-flex items-center gap-1 px-2 py-0.5 text-2xs font-medium rounded-full ' + style.bg + ' ' + style.text + '"><span class="font-bold">' + ep.method + '</span><span class="opacity-75">' + ep.path + '</span></span>';
                            }).join('');
                        }
                        
                        // Toggle function
                        window.toggleEndpoints = function() {
                            const details = document.getElementById('endpoint-details');
                            const chevron = document.getElementById('endpoints-chevron');
                            details.classList.toggle('hidden');
                            chevron.classList.toggle('rotate-180');
                        };
                    }
                    
                    // Render environments
                    const envContainer = document.getElementById('environment-pills');
                    if (envContainer && m.environments && m.environments.length > 0) {
                        document.getElementById('environments-inventory').style.display = 'flex';
                        const envStyles = {
                            'dev': { bg: 'bg-cyan-100 dark:bg-cyan-500/20 text-cyan-700 dark:text-cyan-400', dot: 'bg-emerald-500' },
                            'local': { bg: 'bg-slate-100 dark:bg-slate-600 text-slate-600 dark:text-slate-300', dot: 'bg-slate-400' },
                            'prod': { bg: 'bg-rose-100 dark:bg-rose-500/20 text-rose-700 dark:text-rose-400', dot: 'bg-rose-500' },
                            'qa': { bg: 'bg-violet-100 dark:bg-violet-500/20 text-violet-700 dark:text-violet-400', dot: 'bg-violet-500' },
                            'staging': { bg: 'bg-amber-100 dark:bg-amber-500/20 text-amber-700 dark:text-amber-400', dot: 'bg-amber-500' },
                            'uat': { bg: 'bg-indigo-100 dark:bg-indigo-500/20 text-indigo-700 dark:text-indigo-400', dot: 'bg-indigo-500' },
                            'test': { bg: 'bg-teal-100 dark:bg-teal-500/20 text-teal-700 dark:text-teal-400', dot: 'bg-teal-500' },
                            'sandbox': { bg: 'bg-orange-100 dark:bg-orange-500/20 text-orange-700 dark:text-orange-400', dot: 'bg-orange-500' }
                        };
                        envContainer.innerHTML = m.environments.map(env => {
                            const style = envStyles[env] || envStyles['local'];
                            return '<span class="inline-flex items-center gap-1.5 px-2 py-0.5 text-2xs font-medium rounded-full ' + style.bg + '"><span class="w-2 h-2 rounded-full ' + style.dot + '"></span><span>' + env + '</span></span>';
                        }).join('');
                    }
                    
                    // Render security patterns
                    const securityContainer = document.getElementById('security-pills');
                    if (securityContainer && m.securityPatterns && m.securityPatterns.length > 0) {
                        document.getElementById('security-inventory').style.display = 'flex';
                        const securityStyles = {
                            'TLS': { bg: 'bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400', icon: '🔒' },
                            'OAuth': { bg: 'bg-violet-100 dark:bg-violet-500/20 text-violet-700 dark:text-violet-400', icon: '🔑' },
                            'Secure Properties': { bg: 'bg-amber-100 dark:bg-amber-500/20 text-amber-700 dark:text-amber-400', icon: '🔐' },
                            'Basic Auth': { bg: 'bg-sky-100 dark:bg-sky-500/20 text-sky-700 dark:text-sky-400', icon: '👤' }
                        };
                        securityContainer.innerHTML = m.securityPatterns.map(pattern => {
                            const style = securityStyles[pattern] || { bg: 'bg-slate-100 dark:bg-slate-600 text-slate-600 dark:text-slate-300', icon: '🛡️' };
                            return '<span class="inline-flex items-center gap-1 px-2 py-0.5 text-2xs font-medium rounded-full ' + style.bg + '">' + style.icon + ' ' + pattern + '</span>';
                        }).join('');
                    }
                    
                    // Render external services
                    const serviceContainer = document.getElementById('service-pills');
                    if (serviceContainer && m.externalServices && m.externalServices.length > 0) {
                        document.getElementById('services-inventory').style.display = 'block';
                        serviceContainer.innerHTML = '<span class="inline-flex items-center gap-1 px-2 py-0.5 text-2xs font-bold rounded-full bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200">' + m.externalServices.length + ' services</span>';
                        
                        const serviceList = document.getElementById('service-list');
                        if (serviceList) {
                            serviceList.innerHTML = m.externalServices.map(svc => 
                                '<span class="inline-flex items-center gap-1 px-2 py-0.5 text-2xs font-medium rounded-full bg-indigo-100 dark:bg-indigo-500/20 text-indigo-700 dark:text-indigo-400">🔗 ' + svc.name + ' <span class="opacity-50">(' + svc.host + ')</span></span>'
                            ).join('');
                        }
                        
                        window.toggleServices = function() {
                            const details = document.getElementById('service-details');
                            const chevron = document.getElementById('services-chevron');
                            details.classList.toggle('hidden');
                            chevron.classList.toggle('rotate-180');
                        };
                    }
                    
                    // Render schedulers
                    const schedulerContainer = document.getElementById('scheduler-pills');
                    if (schedulerContainer && m.schedulers && m.schedulers.length > 0) {
                        document.getElementById('schedulers-inventory').style.display = 'block';
                        const cronCount = m.schedulers.filter(s => s.type === 'cron').length;
                        const fixedCount = m.schedulers.filter(s => s.type === 'fixed').length;
                        let summary = '<span class="inline-flex items-center gap-1 px-2 py-0.5 text-2xs font-bold rounded-full bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200">' + m.schedulers.length + ' jobs</span>';
                        if (cronCount > 0) summary += '<span class="inline-flex items-center gap-1 px-2 py-0.5 text-2xs font-medium rounded-full bg-purple-100 dark:bg-purple-500/20 text-purple-700 dark:text-purple-400">⏰ cron ' + cronCount + '</span>';
                        if (fixedCount > 0) summary += '<span class="inline-flex items-center gap-1 px-2 py-0.5 text-2xs font-medium rounded-full bg-teal-100 dark:bg-teal-500/20 text-teal-700 dark:text-teal-400">🔄 fixed ' + fixedCount + '</span>';
                        schedulerContainer.innerHTML = summary;
                        
                        const schedulerList = document.getElementById('scheduler-list');
                        if (schedulerList) {
                            schedulerList.innerHTML = m.schedulers.map(sched => {
                                const icon = sched.type === 'cron' ? '⏰' : '🔄';
                                const bg = sched.type === 'cron' ? 'bg-purple-100 dark:bg-purple-500/20 text-purple-700 dark:text-purple-400' : 'bg-teal-100 dark:bg-teal-500/20 text-teal-700 dark:text-teal-400';
                                return '<span class="inline-flex items-center gap-1 px-2 py-0.5 text-2xs font-medium rounded-full ' + bg + '">' + icon + ' ' + sched.value + ' <span class="opacity-50">(' + sched.flow + ')</span></span>';
                            }).join('');
                        }
                        
                        window.toggleSchedulers = function() {
                            const details = document.getElementById('scheduler-details');
                            const chevron = document.getElementById('schedulers-chevron');
                            details.classList.toggle('hidden');
                            chevron.classList.toggle('rotate-180');
                        };
                    }
                    
                    // Render Quality Ratings (A-E)
                    this.renderQualityRatings(m);
                }
            },
            
            ${qualityRatingsRendererScript},
            
            renderSidebar() {
                // Severity links
                const severityNav = document.getElementById('sidebar-severity');
                const severities = [
                    { key: 'error', label: 'Errors', count: report.summary.bySeverity.error, color: 'bg-rose-500' },
                    { key: 'warning', label: 'Warnings', count: report.summary.bySeverity.warning, color: 'bg-amber-500' },
                    { key: 'info', label: 'Info', count: report.summary.bySeverity.info, color: 'bg-sky-500' }
                ];
                severityNav.innerHTML = severities.filter(s => s.count > 0).map(s => \`
                    <a href="#" onclick="router.toggleSeverity('\${s.key}'); return false;" 
                        data-filter-severity="\${s.key}"
                        class="sidebar-link flex items-center gap-2.5 px-3 py-2 text-sm text-slate-600 dark:text-slate-300 rounded-r-md">
                        <span class="w-2.5 h-2.5 rounded-full \${s.color}"></span>
                        \${s.label}
                        <span class="ml-auto text-xs font-bold text-slate-400 dark:text-slate-500">\${s.count}</span>
                    </a>
                \`).join('');
                
                // Category links
                const catNav = document.getElementById('sidebar-categories');
                const catCounts = {};
                allIssues.forEach(i => catCounts[i.category] = (catCounts[i.category] || 0) + 1);
                const sortedCats = Object.entries(catCounts).sort((a, b) => b[1] - a[1]);
                
                catNav.innerHTML = sortedCats.map(([cat, count]) => \`
                    <a href="#" onclick="router.toggleCategory('\${cat}'); return false;"
                        data-filter-category="\${cat}"
                        class="sidebar-link flex items-center gap-2.5 px-3 py-2 text-sm text-slate-600 dark:text-slate-300 rounded-r-md">
                        <span class="capitalize truncate">\${cat}</span>
                        <span class="ml-auto text-xs font-bold text-slate-400 dark:text-slate-500">\${count}</span>
                    </a>
                \`).join('');
            },
            
            renderCharts() {
                const isDark = document.documentElement.classList.contains('dark');
                const textColor = isDark ? '#94a3b8' : '#64748b';
                const gridColor = isDark ? '#334155' : '#e2e8f0';
                
                Chart.defaults.font.family = "'Inter', sans-serif";
                Chart.defaults.font.size = 11;
                Chart.defaults.color = textColor;
                
                // Top Rules
                const ruleCounts = {};
                const ruleNames = {};
                allIssues.forEach(i => {
                    ruleCounts[i.ruleId] = (ruleCounts[i.ruleId] || 0) + 1;
                    ruleNames[i.ruleId] = i.ruleName;
                });
                const sortedRules = Object.entries(ruleCounts).sort((a, b) => b[1] - a[1]).slice(0, 5);
                
                new Chart(document.getElementById('chart-rules'), {
                    type: 'bar',
                    data: {
                        labels: sortedRules.map(([id]) => {
                            const name = ruleNames[id];
                            return name.length > 30 ? name.substring(0, 27) + '...' : name;
                        }),
                        datasets: [{
                            data: sortedRules.map(x => x[1]),
                            backgroundColor: '#0ea5e9',
                            borderRadius: 4,
                            barThickness: 16,
                        }]
                    },
                    options: {
                        indexAxis: 'y',
                        maintainAspectRatio: false,
                        plugins: { legend: { display: false } },
                        scales: {
                            x: { beginAtZero: true, grid: { color: gridColor }, ticks: { stepSize: 1 } },
                            y: { grid: { display: false } }
                        }
                    }
                });
                
                // Severity donut
                new Chart(document.getElementById('chart-severity'), {
                    type: 'doughnut',
                    data: {
                        labels: ['Errors', 'Warnings', 'Info'],
                        datasets: [{
                            data: [report.summary.bySeverity.error, report.summary.bySeverity.warning, report.summary.bySeverity.info],
                            backgroundColor: ['#e11d48', '#d97706', '#0284c7'],
                            borderWidth: 0,
                            hoverOffset: 4
                        }]
                    },
                    options: {
                        cutout: '60%',
                        plugins: { legend: { position: 'right', labels: { usePointStyle: true, pointStyle: 'circle', padding: 12, font: { size: 10 } } } }
                    }
                });
                
                // Categories bar
                const catCounts = {};
                allIssues.forEach(i => catCounts[i.category] = (catCounts[i.category] || 0) + 1);
                const sortedCats = Object.entries(catCounts).sort((a, b) => b[1] - a[1]);
                const categoryColors = ['#0ea5e9', '#8b5cf6', '#10b981', '#f59e0b', '#ef4444', '#ec4899', '#06b6d4', '#84cc16', '#f97316', '#6366f1'];
                
                new Chart(document.getElementById('chart-categories'), {
                    type: 'bar',
                    data: {
                        labels: sortedCats.map(([cat]) => cat.charAt(0).toUpperCase() + cat.slice(1)),
                        datasets: [{
                            data: sortedCats.map(x => x[1]),
                            backgroundColor: sortedCats.map((_, i) => categoryColors[i % categoryColors.length]),
                            borderRadius: 4,
                            barThickness: 20,
                        }]
                    },
                    options: {
                        indexAxis: 'y',
                        maintainAspectRatio: false,
                        plugins: { legend: { display: false } },
                        scales: {
                            x: { beginAtZero: true, grid: { color: gridColor } },
                            y: { grid: { display: false } }
                        },
                        onClick: (e, elements) => {
                            if (elements.length > 0) {
                                const idx = elements[0].index;
                                router.toggleCategory(sortedCats[idx][0]);
                            }
                        }
                    }
                });

                // Flow Complexity Chart
                const complexityData = report.metrics?.flowComplexityData || [];
                if (complexityData.length > 0) {
                    document.getElementById('complexity-chart-container').style.display = 'block';
                    
                    // Sort by complexity (highest first) and take top 10
                    const sortedComplexity = [...complexityData]
                        .sort((a, b) => b.complexity - a.complexity)
                        .slice(0, 10);
                    
                    // Color based on rating
                    const ratingColors = {
                        'low': '#10b981',      // green
                        'moderate': '#f59e0b', // amber
                        'high': '#ef4444'      // red
                    };
                    
                    new Chart(document.getElementById('chart-complexity'), {
                        type: 'bar',
                        data: {
                            labels: sortedComplexity.map(f => {
                                const name = f.flowName;
                                return name.length > 40 ? name.substring(0, 37) + '...' : name;
                            }),
                            datasets: [{
                                data: sortedComplexity.map(f => f.complexity),
                                backgroundColor: sortedComplexity.map(f => ratingColors[f.rating] || '#6b7280'),
                                borderRadius: 4,
                                barThickness: 18,
                            }]
                        },
                        options: {
                            indexAxis: 'y',
                            maintainAspectRatio: false,
                            plugins: { 
                                legend: { display: false },
                                tooltip: {
                                    callbacks: {
                                        label: function(context) {
                                            const flow = sortedComplexity[context.dataIndex];
                                            const breakdown = Object.entries(flow.breakdown || {})
                                                .map(([k, v]) => k + ': ' + v)
                                                .join(', ');
                                            return ['Complexity: ' + flow.complexity + ' (' + flow.rating + ')', breakdown || 'Base complexity only'];
                                        }
                                    }
                                }
                            },
                            scales: {
                                x: { 
                                    beginAtZero: true, 
                                    grid: { color: gridColor },
                                    title: { display: true, text: 'Cyclomatic Complexity', font: { size: 10 } }
                                },
                                y: { grid: { display: false } }
                            }
                        }
                    });
                }
            },
            
            initTable() {
                const severityOrder = { error: 1, warning: 2, info: 3 };
                
                tableInstance = new Tabulator('#issues-table', {
                    data: allIssues,
                    layout: 'fitColumns',
                    height: '100%',
                    placeholder: 'No issues match your filters',
                    
                    columns: [
                        {
                            title: 'Severity',
                            field: 'severity',
                            width: 100,
                            headerFilter: 'list',
                            headerFilterParams: { valuesLookup: true, multiselect: true, clearable: true },
                            headerFilterFunc: 'in',
                            sorter: (a, b) => severityOrder[a] - severityOrder[b],
                            formatter: (cell) => {
                                const val = cell.getValue();
                                const styles = {
                                    error: 'bg-rose-100 text-rose-700 dark:bg-rose-500/20 dark:text-rose-400',
                                    warning: 'bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-400',
                                    info: 'bg-sky-100 text-sky-700 dark:bg-sky-500/20 dark:text-sky-400'
                                };
                                return \`<span class="inline-flex px-2 py-0.5 text-xs font-semibold uppercase rounded-md \${styles[val]}">\${val}</span>\`;
                            }
                        },
                        {
                            title: 'Rule',
                            field: 'ruleName',
                            minWidth: 200,
                            headerFilter: 'list',
                            headerFilterParams: { valuesLookup: true, multiselect: true, clearable: true },
                            headerFilterFunc: 'in',
                            formatter: (cell) => {
                                const row = cell.getRow().getData();
                                return \`<div><div class="font-medium text-slate-800 dark:text-slate-200 truncate">\${cell.getValue()}</div><div class="text-xs text-slate-400 font-mono">\${row.ruleId}</div></div>\`;
                            }
                        },
                        {
                            title: 'Category',
                            field: 'category',
                            width: 120,
                            headerFilter: 'list',
                            headerFilterParams: { valuesLookup: true, multiselect: true, clearable: true },
                            headerFilterFunc: 'in',
                            formatter: (cell) => \`<span class="capitalize text-slate-600 dark:text-slate-300">\${cell.getValue()}</span>\`
                        },
                        {
                            title: 'File',
                            field: 'fileName',
                            minWidth: 180,
                            headerFilter: 'input',
                            headerFilterPlaceholder: 'Filter...',
                            formatter: (cell) => {
                                const row = cell.getRow().getData();
                                const path = row.fileName;
                                const display = path.length > 40 ? '...' + path.slice(-37) : path;
                                return \`<div><div class="font-mono text-sky-600 dark:text-sky-400 text-xs truncate" title="\${path}">\${display}</div><div class="text-xs text-slate-400">Line \${row.line}</div></div>\`;
                            }
                        },
                        {
                            title: 'Message',
                            field: 'message',
                            widthGrow: 2,
                            headerFilter: 'input',
                            headerFilterPlaceholder: 'Filter...',
                            formatter: (cell) => {
                                const row = cell.getRow().getData();
                                let html = \`<div class="text-slate-700 dark:text-slate-300">\${cell.getValue()}</div>\`;
                                if (row.suggestion) {
                                    html += \`<div class="text-xs text-slate-400 mt-0.5 truncate" title="\${row.suggestion}">💡 \${row.suggestion}</div>\`;
                                }
                                return html;
                            }
                        }
                    ],
                    
                    initialSort: [{ column: 'severity', dir: 'asc' }]
                });
                
                // Global search
                document.getElementById('global-search').addEventListener('input', (e) => {
                    router.setSearchTerm(e.target.value);
                });
            },
            
            initTheme() {
                const toggle = document.getElementById('theme-toggle');
                const html = document.documentElement;
                const lightIcon = document.getElementById('theme-toggle-light-icon');
                const darkIcon = document.getElementById('theme-toggle-dark-icon');
                
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
                if (localStorage.getItem('theme') === 'dark' || 
                    (!localStorage.getItem('theme') && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
                    html.classList.add('dark');
                }
                
                // Initial icon update
                updateIcons();
                
                toggle.addEventListener('click', () => {
                    html.classList.toggle('dark');
                    localStorage.setItem('theme', html.classList.contains('dark') ? 'dark' : 'light');
                    updateIcons();
                });
            },
            
            initKeyboardShortcuts() {
                document.addEventListener('keydown', (e) => {
                    if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
                        e.preventDefault();
                        document.getElementById('global-search').focus();
                    }
                    if (e.key === 'Escape') {
                        document.getElementById('global-search').blur();
                    }
                });
            },
            
            initExport() {
                document.getElementById('download-csv').addEventListener('click', () => {
                    tableInstance.download('csv', 'mule-lint-report.csv');
                });
                document.getElementById('export-btn').addEventListener('click', () => {
                    router.navigate('issues');
                    tableInstance.download('csv', 'mule-lint-report.csv');
                });
            }
        };

        // ===== MODAL SYSTEM =====
        ${modalScript}

        // ===== SIDE PANEL =====
        ${sidePanelScript}

        // ===== INIT =====
        document.addEventListener('DOMContentLoaded', () => {
            modal.init();
            sidepanel.init();
            renderer.init();
        });
    </script>
    ${modalHtml}
    ${sidePanelHtml}
</body>
</html>`;
}
