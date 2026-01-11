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
    sidePanelScript,
    renderQualityRatingsSection,
    renderLintSummarySection
} from './html';

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
        /* ===== Theme Variables ===== */
        :root {
            --color-success: #10b981;
            --color-warning: #f59e0b;
            --color-error: #ef4444;
            --color-info: #3b82f6;
            --rating-a: #10b981;
            --rating-b: #84cc16;
            --rating-c: #f59e0b;
            --rating-d: #f97316;
            --rating-e: #ef4444;
            --bg-primary: #ffffff;
            --bg-secondary: #f8fafc;
            --bg-tertiary: #f1f5f9;
            --border-color: #e2e8f0;
            --text-primary: #1e293b;
            --text-secondary: #64748b;
            --text-muted: #94a3b8;
            --spacing-xs: 4px;
            --spacing-sm: 8px;
            --spacing-md: 16px;
            --spacing-lg: 24px;
            --transition-fast: 150ms;
            --transition-normal: 200ms;
        }
        .dark {
            --bg-primary: #0f172a;
            --bg-secondary: #1e293b;
            --bg-tertiary: #334155;
            --border-color: #475569;
            --text-primary: #f1f5f9;
            --text-secondary: #94a3b8;
            --text-muted: #64748b;
        }

        /* ===== Base ===== */
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        html { -webkit-font-smoothing: antialiased; -moz-osx-font-smoothing: grayscale; }
        
        /* ===== Scrollbar ===== */
        ::-webkit-scrollbar { width: 6px; height: 6px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: #d1d5db; border-radius: 3px; }
        ::-webkit-scrollbar-thumb:hover { background: #9ca3af; }
        .dark ::-webkit-scrollbar-thumb { background: #4b5563; }

        /* ===== Layout ===== */
        .app-layout {
            display: grid;
            grid-template-columns: 240px 1fr;
            grid-template-rows: 56px 1fr;
            height: 100vh;
            overflow: hidden;
        }
        .app-header { grid-column: 1 / -1; }
        .app-sidebar { grid-row: 2; overflow-y: auto; }
        .app-main { grid-row: 2; overflow: hidden; }

        /* ===== Sidebar Link (Tailwind Docs style) ===== */
        .sidebar-link {
            position: relative;
            border-left: 2px solid transparent;
            transition: all 0.1s ease;
        }
        .sidebar-link:hover {
            background: rgba(0,0,0,0.03);
        }
        .dark .sidebar-link:hover {
            background: rgba(255,255,255,0.03);
        }
        .sidebar-link.active {
            border-left-color: #0ea5e9;
            background: linear-gradient(90deg, rgba(14, 165, 233, 0.08) 0%, transparent 100%);
            color: #0284c7;
            font-weight: 600;
        }
        .dark .sidebar-link.active {
            border-left-color: #38bdf8;
            background: linear-gradient(90deg, rgba(56, 189, 248, 0.1) 0%, transparent 100%);
            color: #38bdf8;
        }

        /* ===== Header Tab ===== */
        .nav-tab {
            position: relative;
            transition: all 0.15s ease;
        }
        .nav-tab::after {
            content: '';
            position: absolute;
            bottom: -1px;
            left: 0;
            right: 0;
            height: 2px;
            background: transparent;
            transition: background 0.15s ease;
        }
        .nav-tab.active {
            color: #0284c7;
            font-weight: 600;
        }
        .nav-tab.active::after {
            background: #0ea5e9;
        }
        .dark .nav-tab.active {
            color: #38bdf8;
        }
        .dark .nav-tab.active::after {
            background: #38bdf8;
        }

        /* ===== Tabulator ===== */
        .tabulator {
            border: none !important;
            background: transparent !important;
            font-family: inherit !important;
            font-size: 0.8125rem !important;
        }
        .tabulator-header {
            background: #f8fafc !important;
            border-bottom: 1px solid #e2e8f0 !important;
        }
        .tabulator-header .tabulator-col {
            background: transparent !important;
            border-right: none !important;
        }
        .tabulator-col-title {
            font-size: 0.6875rem !important;
            font-weight: 600 !important;
            text-transform: uppercase !important;
            letter-spacing: 0.04em !important;
            color: #64748b !important;
            padding: 8px 12px !important;
        }
        .tabulator-row {
            background: white !important;
            border-bottom: 1px solid #f1f5f9 !important;
            min-height: 40px !important;
        }
        .tabulator-row:hover { background: #f8fafc !important; }
        .tabulator-row.tabulator-selected { background: #eff6ff !important; }
        .tabulator-cell {
            padding: 8px 12px !important;
            border-right: none !important;
        }
        .tabulator-header-filter { padding: 4px 8px 8px 8px !important; }
        .tabulator-header-filter input,
        .tabulator-header-filter select {
            width: 100% !important;
            padding: 4px 8px !important;
            border: 1px solid #e2e8f0 !important;
            border-radius: 6px !important;
            font-size: 0.75rem !important;
            background: white !important;
        }
        .tabulator-header-filter input:focus,
        .tabulator-header-filter select:focus {
            border-color: #0ea5e9 !important;
            outline: none !important;
            box-shadow: 0 0 0 3px rgba(14, 165, 233, 0.1) !important;
        }
        .tabulator-edit-list {
            background: white !important;
            border: 1px solid #e2e8f0 !important;
            border-radius: 8px !important;
            box-shadow: 0 10px 25px rgba(0,0,0,0.1) !important;
            max-height: 200px !important;
        }
        .tabulator-edit-list-item { padding: 6px 10px !important; font-size: 0.75rem !important; }
        .tabulator-edit-list-item:hover { background: #f1f5f9 !important; }
        .tabulator-edit-list-item.active { background: #0ea5e9 !important; color: white !important; }
        
        /* Dark mode table */
        .dark .tabulator-header { background: #1e293b !important; border-color: #334155 !important; }
        .dark .tabulator-col-title { color: #94a3b8 !important; }
        .dark .tabulator-row { background: #0f172a !important; border-color: #1e293b !important; }
        .dark .tabulator-row:hover { background: #1e293b !important; }
        .dark .tabulator-header-filter input { background: #1e293b !important; border-color: #334155 !important; color: #e2e8f0 !important; }

        /* ===== Print ===== */
        @media print {
            .app-layout { display: block; height: auto; }
            .app-sidebar, .app-header { display: none; }
            .app-main { overflow: visible; }
        }

        /* ===== Modal ===== */
        .modal-overlay {
            position: fixed;
            inset: 0;
            background: rgba(0, 0, 0, 0.5);
            backdrop-filter: blur(4px);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 1000;
            opacity: 0;
            visibility: hidden;
            transition: all 0.2s ease;
        }
        .modal-overlay.active {
            opacity: 1;
            visibility: visible;
        }
        .modal-content {
            background: white;
            border-radius: 16px;
            box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
            max-width: 520px;
            width: 90%;
            max-height: 85vh;
            overflow-y: auto;
            transform: scale(0.95);
            transition: transform 0.2s ease;
        }
        .modal-overlay.active .modal-content {
            transform: scale(1);
        }
        .dark .modal-content {
            background: #1e293b;
        }
        .modal-header {
            display: flex;
            align-items: center;
            justify-content: space-between;
            padding: 16px 20px;
            border-bottom: 1px solid #e2e8f0;
        }
        .dark .modal-header {
            border-color: #334155;
        }
        .modal-title {
            font-size: 1rem;
            font-weight: 600;
            color: #1e293b;
        }
        .dark .modal-title {
            color: #f1f5f9;
        }
        .modal-close {
            width: 32px;
            height: 32px;
            display: flex;
            align-items: center;
            justify-content: center;
            border-radius: 8px;
            color: #64748b;
            transition: all 0.15s ease;
            cursor: pointer;
            border: none;
            background: transparent;
        }
        .modal-close:hover {
            background: #f1f5f9;
            color: #1e293b;
        }
        .dark .modal-close:hover {
            background: #334155;
            color: #f1f5f9;
        }
        .modal-body {
            padding: 20px;
        }
        .modal-body h4 {
            font-size: 0.8125rem;
            font-weight: 600;
            color: #475569;
            margin-bottom: 8px;
        }
        .dark .modal-body h4 {
            color: #94a3b8;
        }
        .modal-body p, .modal-body li {
            font-size: 0.8125rem;
            color: #64748b;
            line-height: 1.5;
        }
        .dark .modal-body p, .dark .modal-body li {
            color: #94a3b8;
        }
        .modal-body ul {
            list-style: disc;
            padding-left: 20px;
            margin: 8px 0;
        }
        .modal-body .rating-scale {
            display: grid;
            grid-template-columns: auto 1fr;
            gap: 4px 12px;
            margin-top: 12px;
            background: #f8fafc;
            padding: 12px;
            border-radius: 8px;
        }
        .dark .modal-body .rating-scale {
            background: #0f172a;
        }
        .rating-scale .badge {
            width: 24px;
            height: 24px;
            display: flex;
            align-items: center;
            justify-content: center;
            border-radius: 6px;
            font-weight: 700;
            font-size: 0.75rem;
        }

        /* Info Icon */
        .info-btn {
            width: 18px;
            height: 18px;
            display: inline-flex;
            align-items: center;
            justify-content: center;
            border-radius: 50%;
            background: #e2e8f0;
            color: #64748b;
            cursor: pointer;
            transition: all 0.15s ease;
            border: none;
            font-size: 0.65rem;
            font-weight: 700;
            margin-left: 4px;
        }
        .info-btn:hover {
            background: #0ea5e9;
            color: white;
        }
        .dark .info-btn {
            background: #334155;
            color: #94a3b8;
        }
        .dark .info-btn:hover {
            background: #38bdf8;
            color: #0f172a;
        }
    </style>
</head>
<body class="bg-slate-50 dark:bg-slate-900 text-slate-700 dark:text-slate-300 font-sans">

    <script id="report-data" type="application/json">${jsonPayload}</script>

    <div class="app-layout">
        <!-- ===== HEADER ===== -->
        <header class="app-header bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 shadow-sm flex items-center px-5 gap-5">
            <!-- Logo + Brand (clickable to dashboard) -->
            <a href="#" onclick="router.navigate('dashboard'); return false;" class="flex items-center gap-2.5 shrink-0 hover:opacity-80 transition-opacity">
                <div class="w-8 h-8 bg-gradient-to-br from-sky-500 to-blue-600 rounded-lg flex items-center justify-center text-white shadow-sm">
                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"/></svg>
                </div>
                <div>
                    <div class="text-sm font-bold text-slate-900 dark:text-white tracking-tight">mule-lint</div>
                    <div class="text-2xs text-slate-400 dark:text-slate-500 -mt-0.5">Static analysis for MuleSoft</div>
                </div>
            </a>

            <div class="h-6 w-px bg-slate-200 dark:bg-slate-700"></div>

            <!-- PROJECT NAME (Prominent) -->
            <div class="flex items-center gap-3">
                <h1 class="text-lg font-semibold text-slate-800 dark:text-white tracking-tight">${projectName}</h1>
                <span class="text-xs text-slate-400 dark:text-slate-500 font-mono">v${packageJson.version}</span>
            </div>

            <div class="flex-1"></div>

            <!-- Nav Tabs (Tailwind style with underline) -->
            <nav class="flex items-center gap-1 h-full">
                <button id="nav-dashboard" onclick="router.navigate('dashboard')" 
                    class="nav-tab active h-full px-3 text-sm font-medium text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200">
                    Dashboard
                </button>
                <button id="nav-issues" onclick="router.navigate('issues')" 
                    class="nav-tab h-full px-3 text-sm font-medium text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 flex items-center gap-1.5">
                    Issues
                    <span class="bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 px-1.5 py-0.5 rounded text-xs font-bold">${totalIssues}</span>
                </button>
            </nav>

            <div class="h-6 w-px bg-slate-200 dark:bg-slate-700"></div>

            <!-- Search -->
            <div class="relative w-52 hidden md:block">
                <input type="text" id="global-search" placeholder="Search issues..." 
                    class="w-full pl-9 pr-3 py-2 text-sm bg-slate-100 dark:bg-slate-700 border-0 rounded-lg text-slate-700 dark:text-slate-200 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-500">
                <svg class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
            </div>

            <!-- Actions -->
            <div class="flex items-center gap-1">
                <a href="https://github.com/Avinava/mule-lint" target="_blank" rel="noopener noreferrer" title="View on GitHub" class="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors">
                    <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/></svg>
                </a>
                <button id="export-btn" title="Export CSV" class="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors">
                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/></svg>
                </button>
                <button id="theme-toggle" title="Toggle theme" class="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors">
                    <svg id="theme-toggle-dark-icon" class="w-5 h-5 dark:hidden" fill="none" stroke="currentColor" viewBox="0 0 24 24"><circle cx="12" cy="12" r="5"/><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/></svg>
                    <svg id="theme-toggle-light-icon" class="w-5 h-5 hidden dark:block" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z"/></svg>
                </button>
            </div>
        </header>

        <!-- ===== SIDEBAR ===== -->
        <aside class="app-sidebar bg-white dark:bg-slate-800/50 border-r border-slate-100 dark:border-slate-700 py-4">
            <!-- Navigation -->
            <div class="px-4 mb-5">
                <div class="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-widest px-2 mb-2">Navigation</div>
                <nav class="space-y-1">
                    <a href="#" onclick="router.navigate('dashboard'); return false;" data-view="dashboard" 
                        class="sidebar-link active flex items-center gap-2.5 px-3 py-2 text-sm text-slate-600 dark:text-slate-300 rounded-r-md">
                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/></svg>
                        Dashboard
                    </a>
                    <a href="#" onclick="router.navigate('issues'); return false;" data-view="issues"
                        class="sidebar-link flex items-center gap-2.5 px-3 py-2 text-sm text-slate-600 dark:text-slate-300 rounded-r-md">
                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/></svg>
                        All Issues
                        <span class="ml-auto text-xs font-bold text-slate-400 dark:text-slate-500">${totalIssues}</span>
                    </a>
                </nav>
            </div>

            <!-- Severity Filter -->
            <div class="px-4 mb-5">
                <div class="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-widest px-2 mb-2">By Severity</div>
                <nav id="sidebar-severity" class="space-y-1"></nav>
            </div>

            <!-- Reset Button (shown when filters active) -->
            <div id="sidebar-reset" class="px-4 mb-5 hidden">
                <button onclick="router.clearAllFilters()" 
                    class="w-full flex items-center justify-center gap-1.5 px-3 py-2.5 text-sm font-medium text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-500/10 hover:bg-rose-100 dark:hover:bg-rose-500/20 border border-rose-200 dark:border-rose-500/30 rounded-lg transition-colors">
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>
                    Clear All Filters
                </button>
            </div>

            <!-- Category Filter -->
            <div class="px-4">
                <div class="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-widest px-2 mb-2">By Category</div>
                <nav id="sidebar-categories" class="space-y-1 max-h-[300px] overflow-y-auto"></nav>
            </div>
        </aside>

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
                        <h3 class="text-sm font-semibold text-slate-700 dark:text-slate-200">Project Metrics</h3>
                        <p class="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Architecture overview: flows, components, and configurations</p>
                    </div>
                    <div class="grid grid-cols-5 gap-3">
                        <div class="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 p-3">
                            <div class="flex items-center justify-between mb-1">
                                <span class="text-2xs font-semibold text-violet-600 dark:text-violet-400 uppercase tracking-wider">Flows</span>
                                <div class="w-6 h-6 rounded bg-violet-100 dark:bg-violet-500/20 flex items-center justify-center">
                                    <svg class="w-3.5 h-3.5 text-violet-600 dark:text-violet-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"/></svg>
                                </div>
                            </div>
                            <div id="metric-flows" class="text-xl font-bold text-violet-600 dark:text-violet-400">-</div>
                            <div class="text-2xs text-slate-400 dark:text-slate-500 mt-0.5">Entry points</div>
                        </div>
                        <div class="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 p-3">
                            <div class="flex items-center justify-between mb-1">
                                <span class="text-2xs font-semibold text-teal-600 dark:text-teal-400 uppercase tracking-wider">Sub-Flows</span>
                                <div class="w-6 h-6 rounded bg-teal-100 dark:bg-teal-500/20 flex items-center justify-center">
                                    <svg class="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16m-7 6h7"/></svg>
                                </div>
                            </div>
                            <div id="metric-subflows" class="text-xl font-bold text-teal-600 dark:text-teal-400">-</div>
                            <div class="text-2xs text-slate-400 dark:text-slate-500 mt-0.5">Reusable logic</div>
                        </div>
                        <div class="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 p-3">
                            <div class="flex items-center justify-between mb-1">
                                <span class="text-2xs font-semibold text-cyan-600 dark:text-cyan-400 uppercase tracking-wider">Services</span>
                                <div class="w-6 h-6 rounded bg-cyan-100 dark:bg-cyan-500/20 flex items-center justify-center">
                                    <svg class="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9"/></svg>
                                </div>
                            </div>
                            <div id="metric-services" class="text-xl font-bold text-cyan-600 dark:text-cyan-400">-</div>
                            <div class="text-2xs text-slate-400 dark:text-slate-500 mt-0.5">HTTP endpoints</div>
                        </div>
                        <div class="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 p-3">
                            <div class="flex items-center justify-between mb-1">
                                <span class="text-2xs font-semibold text-orange-600 dark:text-orange-400 uppercase tracking-wider">DataWeave</span>
                                <div class="w-6 h-6 rounded bg-orange-100 dark:bg-orange-500/20 flex items-center justify-center">
                                    <svg class="w-3.5 h-3.5 text-orange-600 dark:text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4"/></svg>
                                </div>
                            </div>
                            <div id="metric-dw" class="text-xl font-bold text-orange-600 dark:text-orange-400">-</div>
                            <div class="text-2xs text-slate-400 dark:text-slate-500 mt-0.5">Transforms</div>
                        </div>
                        <div class="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 p-3">
                            <div class="flex items-center justify-between mb-1">
                                <span class="text-2xs font-semibold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider">Connectors</span>
                                <div class="w-6 h-6 rounded bg-indigo-100 dark:bg-indigo-500/20 flex items-center justify-center">
                                    <svg class="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 12h14M5 12a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2M5 12a2 2 0 00-2 2v4a2 2 0 002 2h14a2 2 0 002-2v-4a2 2 0 00-2-2"/></svg>
                                </div>
                            </div>
                            <div id="metric-connectors" class="text-xl font-bold text-indigo-600 dark:text-indigo-400">-</div>
                            <div class="text-2xs text-slate-400 dark:text-slate-500 mt-0.5">Configurations</div>
                        </div>
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

                <!-- Quality Ratings (A-E) - Shown first -->
                <div id="quality-ratings" class="mb-6" style="display: none;">
                    <div class="mb-3">
                        <h3 class="text-sm font-semibold text-slate-700 dark:text-slate-200">Quality Ratings</h3>
                        <p class="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Overall code quality assessment (A=best, E=worst). Hover for calculation details.</p>
                    </div>
                    <div class="grid grid-cols-4 gap-3">
                        <div class="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 p-3 cursor-help" title="Complexity: Average cyclomatic complexity across flows. Counts choice/when, foreach, try, scatter-gather, async, error-handlers. A(≤5) B(≤10) C(≤15) D(≤20) E(>20)">
                            <div class="flex items-center justify-between mb-1">
                                <span class="text-2xs font-semibold text-purple-600 dark:text-purple-400 uppercase tracking-wider">Complexity</span>
                                <div id="rating-complexity" class="w-8 h-8 rounded-lg flex items-center justify-center text-lg font-bold">-</div>
                            </div>
                            <div id="complexity-avg" class="text-sm text-slate-500 dark:text-slate-400">-</div>
                            <div class="text-2xs text-slate-400 dark:text-slate-500 mt-0.5">Avg flow complexity</div>
                        </div>
                        <div class="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 p-3 cursor-help" title="Maintainability: Technical debt ratio. Debt = (code smells×5min) + (bugs×15min) + (vulns×30min). Ratio = debt / (flows×10min + subflows×5min). A(≤5%) B(≤10%) C(≤20%) D(≤50%) E(>50%)">
                            <div class="flex items-center justify-between mb-1">
                                <span class="text-2xs font-semibold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">Maintainability</span>
                                <div id="rating-maintainability" class="w-8 h-8 rounded-lg flex items-center justify-center text-lg font-bold">-</div>
                            </div>
                            <div id="tech-debt" class="text-sm text-slate-500 dark:text-slate-400">-</div>
                            <div class="text-2xs text-slate-400 dark:text-slate-500 mt-0.5">Technical debt</div>
                        </div>
                        <div class="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 p-3 cursor-help" title="Reliability: Bug-type issues count. Includes: missing error handlers (MULE-003), missing pom.xml (PROJ-001). A(0) B(1-2) C(3-5) D(6-10) E(>10)">
                            <div class="flex items-center justify-between mb-1">
                                <span class="text-2xs font-semibold text-blue-600 dark:text-blue-400 uppercase tracking-wider">Reliability</span>
                                <div id="rating-reliability" class="w-8 h-8 rounded-lg flex items-center justify-center text-lg font-bold">-</div>
                            </div>
                            <div id="bug-count" class="text-sm text-slate-500 dark:text-slate-400">-</div>
                            <div class="text-2xs text-slate-400 dark:text-slate-500 mt-0.5">Bug issues found</div>
                        </div>
                        <div class="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 p-3 cursor-help" title="Security: Vulnerability count. Includes: hardcoded credentials (MULE-201), insecure TLS (MULE-202), plaintext secrets (YAML-004), hardcoded URLs (MULE-004). A(0) B(1) C(2-3) D(4-5) E(>5)">
                            <div class="flex items-center justify-between mb-1">
                                <span class="text-2xs font-semibold text-rose-600 dark:text-rose-400 uppercase tracking-wider">Security</span>
                                <div id="rating-security" class="w-8 h-8 rounded-lg flex items-center justify-center text-lg font-bold">-</div>
                            </div>
                            <div id="vuln-count" class="text-sm text-slate-500 dark:text-slate-400">-</div>
                            <div class="text-2xs text-slate-400 dark:text-slate-500 mt-0.5">Vulnerabilities</div>
                        </div>
                    </div>
                </div>

                <!-- Lint Summary (moved below Quality Ratings) -->
                <div class="mb-6">
                    <div class="mb-3">
                        <h3 class="text-sm font-semibold text-slate-700 dark:text-slate-200">Lint Summary</h3>
                        <p class="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Issue breakdown by severity. Click to filter issues.</p>
                    </div>
                    <div class="grid grid-cols-4 gap-3">
                        <div class="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 p-3 cursor-pointer hover:shadow-lg hover:border-rose-300 dark:hover:border-rose-600 transition-all" onclick="router.toggleSeverity('error')">
                            <div class="flex items-center justify-between mb-1">
                                <span class="text-2xs font-semibold text-rose-600 dark:text-rose-400 uppercase tracking-wider">Errors</span>
                                <div class="w-6 h-6 rounded bg-rose-100 dark:bg-rose-500/20 flex items-center justify-center">
                                    <svg class="w-3.5 h-3.5 text-rose-600 dark:text-rose-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><path d="m15 9-6 6M9 9l6 6"/></svg>
                                </div>
                            </div>
                            <div class="text-xl font-bold text-rose-600 dark:text-rose-400">${report.summary.bySeverity.error}</div>
                            <div class="text-2xs text-slate-400 dark:text-slate-500 mt-0.5">Critical issues</div>
                        </div>
                        <div class="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 p-3 cursor-pointer hover:shadow-lg hover:border-amber-300 dark:hover:border-amber-600 transition-all" onclick="router.toggleSeverity('warning')">
                            <div class="flex items-center justify-between mb-1">
                                <span class="text-2xs font-semibold text-amber-600 dark:text-amber-400 uppercase tracking-wider">Warnings</span>
                                <div class="w-6 h-6 rounded bg-amber-100 dark:bg-amber-500/20 flex items-center justify-center">
                                    <svg class="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><path d="M12 9v4M12 17h.01"/></svg>
                                </div>
                            </div>
                            <div class="text-xl font-bold text-amber-600 dark:text-amber-400">${report.summary.bySeverity.warning}</div>
                            <div class="text-2xs text-slate-400 dark:text-slate-500 mt-0.5">Best practice violations</div>
                        </div>
                        <div class="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 p-3 cursor-pointer hover:shadow-lg hover:border-sky-300 dark:hover:border-sky-600 transition-all" onclick="router.toggleSeverity('info')">
                            <div class="flex items-center justify-between mb-1">
                                <span class="text-2xs font-semibold text-sky-600 dark:text-sky-400 uppercase tracking-wider">Info</span>
                                <div class="w-6 h-6 rounded bg-sky-100 dark:bg-sky-500/20 flex items-center justify-center">
                                    <svg class="w-3.5 h-3.5 text-sky-600 dark:text-sky-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4M12 8h.01"/></svg>
                                </div>
                            </div>
                            <div class="text-xl font-bold text-sky-600 dark:text-sky-400">${report.summary.bySeverity.info}</div>
                            <div class="text-2xs text-slate-400 dark:text-slate-500 mt-0.5">Suggestions</div>
                        </div>
                        <div class="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 p-3">
                            <div class="flex items-center justify-between mb-1">
                                <span class="text-2xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Files</span>
                                <div class="w-6 h-6 rounded bg-slate-100 dark:bg-slate-700 flex items-center justify-center">
                                    <svg class="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/></svg>
                                </div>
                            </div>
                            <div class="text-xl font-bold text-slate-700 dark:text-slate-200">${report.files.length}</div>
                            <div class="text-2xs text-slate-400 dark:text-slate-500 mt-0.5">Scanned</div>
                        </div>
                    </div>
                </div>

                <!-- Charts -->
                <div class="grid grid-cols-3 gap-4 mb-6">
                    <div class="col-span-2 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-5">
                        <div class="mb-4">
                            <h3 class="text-base font-semibold text-slate-700 dark:text-slate-200">Top Violated Rules</h3>
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
        const router = {
            currentView: 'dashboard',
            
            navigate(view) {
                this.currentView = view;
                
                // Toggle views
                document.getElementById('view-dashboard').classList.toggle('hidden', view !== 'dashboard');
                document.getElementById('view-issues').classList.toggle('hidden', view !== 'issues');
                
                // Update header tabs
                document.querySelectorAll('.nav-tab').forEach(tab => {
                    tab.classList.toggle('active', tab.id === 'nav-' + view);
                });
                
                // Update sidebar nav links (Dashboard/All Issues)
                document.querySelectorAll('.sidebar-link[data-view]').forEach(link => {
                    const shouldBeActive = link.dataset.view === view && 
                        (view !== 'issues' || !this.hasActiveFilters());
                    link.classList.toggle('active', shouldBeActive);
                });
                
                if (view === 'issues' && tableInstance) {
                    tableInstance.redraw();
                }
            },
            
            hasActiveFilters() {
                return filterState.severities.length > 0 || filterState.categories.length > 0;
            },
            
            // Toggle severity filter (add/remove from state)
            toggleSeverity(severity) {
                const idx = filterState.severities.indexOf(severity);
                if (idx >= 0) {
                    filterState.severities.splice(idx, 1);
                } else {
                    filterState.severities.push(severity);
                }
                this.navigate('issues');
                this.applyFilters();
                this.updateSidebar();
            },
            
            // Toggle category filter (add/remove from state)
            toggleCategory(category) {
                const idx = filterState.categories.indexOf(category);
                if (idx >= 0) {
                    filterState.categories.splice(idx, 1);
                } else {
                    filterState.categories.push(category);
                }
                this.navigate('issues');
                this.applyFilters();
                this.updateSidebar();
            },
            
            // Apply filter state to Tabulator
            applyFilters() {
                if (!tableInstance) return;
                
                // Build filter function from state
                tableInstance.setFilter((data) => {
                    // Severity filter
                    if (filterState.severities.length > 0 && !filterState.severities.includes(data.severity)) {
                        return false;
                    }
                    // Category filter
                    if (filterState.categories.length > 0 && !filterState.categories.includes(data.category)) {
                        return false;
                    }
                    // Search term filter
                    if (filterState.searchTerm) {
                        const term = filterState.searchTerm.toLowerCase();
                        return data.message.toLowerCase().includes(term) ||
                               data.fileName.toLowerCase().includes(term) ||
                               data.ruleName.toLowerCase().includes(term) ||
                               data.ruleId.toLowerCase().includes(term) ||
                               data.category.toLowerCase().includes(term);
                    }
                    return true;
                });
                
                // Update count
                const visibleRows = tableInstance.getDataCount('active');
                document.getElementById('filtered-count').textContent = visibleRows;
            },
            
            // Update sidebar to reflect current filter state
            updateSidebar() {
                // Update severity highlights
                document.querySelectorAll('[data-filter-severity]').forEach(el => {
                    const isActive = filterState.severities.includes(el.dataset.filterSeverity);
                    el.classList.toggle('active', isActive);
                });
                
                // Update category highlights
                document.querySelectorAll('[data-filter-category]').forEach(el => {
                    const isActive = filterState.categories.includes(el.dataset.filterCategory);
                    el.classList.toggle('active', isActive);
                });
                
                // Show/hide reset button
                const hasFilters = this.hasActiveFilters();
                document.getElementById('sidebar-reset').classList.toggle('hidden', !hasFilters);
                document.getElementById('clear-filters-btn').classList.toggle('hidden', !hasFilters);
                
                // Update "All Issues" link - active only when no filters
                const allIssuesLink = document.querySelector('.sidebar-link[data-view="issues"]');
                if (allIssuesLink && this.currentView === 'issues') {
                    allIssuesLink.classList.toggle('active', !hasFilters);
                }
            },
            
            // Clear all filters
            clearAllFilters() {
                filterState.severities = [];
                filterState.categories = [];
                filterState.searchTerm = '';
                document.getElementById('global-search').value = '';
                
                if (tableInstance) {
                    tableInstance.clearFilter();
                    document.getElementById('filtered-count').textContent = totalIssues;
                }
                this.updateSidebar();
                
                // Re-activate "All Issues" link
                const allIssuesLink = document.querySelector('.sidebar-link[data-view="issues"]');
                if (allIssuesLink && this.currentView === 'issues') {
                    allIssuesLink.classList.add('active');
                }
            },
            
            // Set search term
            setSearchTerm(term) {
                filterState.searchTerm = term;
                this.navigate('issues');
                this.applyFilters();
            }
        };

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
                    const exchangeBase = 'https://www.mulesoft.com/exchange/organizations/68ef9520-24e9-4cf2-b2f5-620025690913/assets/';
                    
                    // Connector metadata with display names, real logos from MuleSoft Exchange, and doc links
                    const connectorMeta = {
                        salesforce: { name: 'Salesforce', icon: exchangeBase + 'com.mulesoft.connectors/mule-salesforce-connector/icon/svg/', doc: 'salesforce-connector' },
                        netsuite: { name: 'NetSuite', icon: exchangeBase + 'com.mulesoft.connectors/mule-netsuite-connector/icon/svg/', doc: 'netsuite-connector' },
                        workday: { name: 'Workday', icon: exchangeBase + 'com.mulesoft.connectors/mule-workday-connector/icon/svg/', doc: 'workday-connector' },
                        http: { name: 'HTTP', icon: exchangeBase + 'org.mule.connectors/mule-http-connector/icon/svg/', doc: 'http-connector' },
                        db: { name: 'Database', icon: exchangeBase + 'org.mule.connectors/mule-db-connector/icon/svg/', doc: 'db-connector' },
                        database: { name: 'Database', icon: exchangeBase + 'org.mule.connectors/mule-db-connector/icon/svg/', doc: 'db-connector' },
                        sap: { name: 'SAP', icon: exchangeBase + 'com.mulesoft.connectors/mule-sap-connector/icon/svg/', doc: 'sap-connector' },
                        kafka: { name: 'Kafka', icon: exchangeBase + 'com.mulesoft.connectors/mule-kafka-connector/icon/svg/', doc: 'kafka-connector' },
                        jms: { name: 'JMS', icon: exchangeBase + 'org.mule.connectors/mule-jms-connector/icon/svg/', doc: 'jms-connector' },
                        amqp: { name: 'AMQP', icon: exchangeBase + 'com.mulesoft.connectors/mule-amqp-connector/icon/svg/', doc: 'amqp-connector' },
                        sftp: { name: 'SFTP', icon: exchangeBase + 'org.mule.connectors/mule-sftp-connector/icon/svg/', doc: 'sftp-connector' },
                        ftp: { name: 'FTP', icon: exchangeBase + 'org.mule.connectors/mule-ftp-connector/icon/svg/', doc: 'ftp-connector' },
                        file: { name: 'File', icon: exchangeBase + 'org.mule.connectors/mule-file-connector/icon/svg/', doc: 'file-connector' },
                        email: { name: 'Email', icon: exchangeBase + 'org.mule.connectors/mule-email-connector/icon/svg/', doc: 'email-connector' },
                        vm: { name: 'VM', icon: exchangeBase + 'org.mule.connectors/mule-vm-connector/icon/svg/', doc: 'vm-connector' },
                        os: { name: 'ObjectStore', icon: exchangeBase + 'org.mule.connectors/mule-objectstore-connector/icon/svg/', doc: 'object-store-connector' },
                        mongodb: { name: 'MongoDB', icon: exchangeBase + 'com.mulesoft.connectors/mule-mongodb-connector/icon/svg/', doc: 'mongodb-connector' },
                        redis: { name: 'Redis', icon: exchangeBase + 'com.mulesoft.connectors/mule-redis-connector/icon/svg/', doc: 'redis-connector' },
                        slack: { name: 'Slack', icon: exchangeBase + 'com.mulesoft.connectors/mule-slack-connector/icon/svg/', doc: 'slack-connector' },
                        box: { name: 'Box', icon: exchangeBase + 'com.mulesoft.connectors/mule-box-connector/icon/svg/', doc: 'box-connector' },
                        's3': { name: 'Amazon S3', icon: exchangeBase + 'com.mulesoft.connectors/mule-amazon-s3-connector/icon/svg/', doc: 'amazon-s3-connector' },
                        'amazon-s3': { name: 'Amazon S3', icon: exchangeBase + 'com.mulesoft.connectors/mule-amazon-s3-connector/icon/svg/', doc: 'amazon-s3-connector' },
                        sqs: { name: 'Amazon SQS', icon: exchangeBase + 'com.mulesoft.connectors/mule-amazon-sqs-connector/icon/svg/', doc: 'amazon-sqs-connector' },
                        dynamodb: { name: 'DynamoDB', icon: exchangeBase + 'com.mulesoft.connectors/mule-amazon-dynamodb-connector/icon/svg/', doc: 'amazon-dynamodb-connector' },
                        servicenow: { name: 'ServiceNow', icon: exchangeBase + 'com.mulesoft.connectors/mule-servicenow-connector/icon/svg/', doc: 'servicenow-connector' },
                        sockets: { name: 'Sockets', icon: exchangeBase + 'org.mule.connectors/mule-sockets-connector/icon/svg/', doc: 'sockets-connector' },
                        snowflake: { name: 'Snowflake', icon: exchangeBase + 'com.mulesoft.connectors/mule-snowflake-connector/icon/svg/', doc: 'snowflake-connector' },
                        stripe: { name: 'Stripe', icon: exchangeBase + 'com.mulesoft.connectors/mule-stripe-connector/icon/svg/', doc: 'stripe-connector' },
                        'anypoint-mq': { name: 'Anypoint MQ', icon: exchangeBase + 'com.mulesoft.connectors/anypoint-mq-connector/icon/svg/', doc: 'anypoint-mq-connector' },
                        // Core/internal connectors without Exchange logos
                        mule: { name: 'Mule Core', icon: null, doc: null },
                        apikit: { name: 'APIkit', icon: null, doc: 'apikit' },
                        'mule-apikit': { name: 'APIkit', icon: null, doc: 'apikit' },
                        java: { name: 'Java', icon: null, doc: 'java-module' },
                        'java-logger': { name: 'Logger', icon: null, doc: null },
                        schedulers: { name: 'Scheduler', icon: null, doc: null },
                        'secure-properties': { name: 'Secure Props', icon: null, doc: 'mule-runtime/mule-4.4/secure-app-props' }
                    };
                    
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
                        
                        const methodStyles = {
                            'GET': { bg: 'bg-emerald-100 dark:bg-emerald-500/20', text: 'text-emerald-700 dark:text-emerald-400', dot: 'bg-emerald-500' },
                            'POST': { bg: 'bg-sky-100 dark:bg-sky-500/20', text: 'text-sky-700 dark:text-sky-400', dot: 'bg-sky-500' },
                            'PUT': { bg: 'bg-amber-100 dark:bg-amber-500/20', text: 'text-amber-700 dark:text-amber-400', dot: 'bg-amber-500' },
                            'PATCH': { bg: 'bg-orange-100 dark:bg-orange-500/20', text: 'text-orange-700 dark:text-orange-400', dot: 'bg-orange-500' },
                            'DELETE': { bg: 'bg-rose-100 dark:bg-rose-500/20', text: 'text-rose-700 dark:text-rose-400', dot: 'bg-rose-500' },
                            'ALL': { bg: 'bg-slate-100 dark:bg-slate-600', text: 'text-slate-600 dark:text-slate-300', dot: 'bg-slate-400' }
                        };
                        
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
            
            renderQualityRatings(m) {
                // Color scheme for ratings
                const ratingColors = {
                    'A': 'bg-emerald-500 text-white',
                    'B': 'bg-lime-500 text-white',
                    'C': 'bg-amber-500 text-white',
                    'D': 'bg-orange-500 text-white',
                    'E': 'bg-rose-500 text-white',
                    '-': 'bg-slate-300 dark:bg-slate-600 text-slate-600 dark:text-slate-300'
                };
                
                // Check if we have enhanced metrics
                const hasRatings = m.complexity || m.maintainability || m.reliability || m.security;
                
                if (hasRatings) {
                    document.getElementById('quality-ratings').style.display = 'block';
                    
                    // Complexity Rating
                    if (m.complexity) {
                        const rating = m.complexity.rating || '-';
                        const ratingEl = document.getElementById('rating-complexity');
                        ratingEl.textContent = rating;
                        ratingEl.className = 'w-8 h-8 rounded-lg flex items-center justify-center text-lg font-bold ' + (ratingColors[rating] || ratingColors['-']);
                        document.getElementById('complexity-avg').textContent = 'Avg: ' + (m.complexity.average || 0);
                    }
                    
                    // Maintainability Rating
                    if (m.maintainability) {
                        const rating = m.maintainability.rating || '-';
                        const ratingEl = document.getElementById('rating-maintainability');
                        ratingEl.textContent = rating;
                        ratingEl.className = 'w-8 h-8 rounded-lg flex items-center justify-center text-lg font-bold ' + (ratingColors[rating] || ratingColors['-']);
                        document.getElementById('tech-debt').textContent = m.maintainability.technicalDebt || '0min';
                    }
                    
                    // Reliability Rating
                    if (m.reliability) {
                        const rating = m.reliability.rating || '-';
                        const ratingEl = document.getElementById('rating-reliability');
                        ratingEl.textContent = rating;
                        ratingEl.className = 'w-8 h-8 rounded-lg flex items-center justify-center text-lg font-bold ' + (ratingColors[rating] || ratingColors['-']);
                        document.getElementById('bug-count').textContent = (m.reliability.bugs || 0) + ' bugs';
                    }
                    
                    // Security Rating
                    if (m.security) {
                        const rating = m.security.rating || '-';
                        const ratingEl = document.getElementById('rating-security');
                        ratingEl.textContent = rating;
                        ratingEl.className = 'w-8 h-8 rounded-lg flex items-center justify-center text-lg font-bold ' + (ratingColors[rating] || ratingColors['-']);
                        const vulns = (m.security.vulnerabilities || 0);
                        const hotspots = (m.security.hotspots || 0);
                        document.getElementById('vuln-count').textContent = vulns + ' vulns, ' + hotspots + ' hotspots';
                    }
                }
            },
            
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
        const modal = {
            overlay: null,
            content: {
                complexity: {
                    title: 'Complexity Rating',
                    body: \`
                        <h4>What is measured</h4>
                        <p>Average cyclomatic complexity across all flows. Higher complexity = harder to test and maintain.</p>
                        <h4 style="margin-top: 16px;">How it's calculated</h4>
                        <p>Count decision points per flow:</p>
                        <ul>
                            <li>choice/when clauses</li>
                            <li>foreach loops</li>
                            <li>try/catch blocks</li>
                            <li>scatter-gather routes</li>
                            <li>async operations</li>
                            <li>error handlers</li>
                        </ul>
                        <p style="margin-top: 8px;"><strong>Formula:</strong> Base complexity (1) + total decision points</p>
                        <h4 style="margin-top: 16px;">Rating Thresholds</h4>
                        <div class="rating-scale">
                            <span class="badge" style="background: var(--rating-a); color: white;">A</span><span>≤ 5 - Simple, easy to test</span>
                            <span class="badge" style="background: var(--rating-b); color: white;">B</span><span>≤ 10 - Moderate complexity</span>
                            <span class="badge" style="background: var(--rating-c); color: white;">C</span><span>≤ 15 - Complex, consider splitting</span>
                            <span class="badge" style="background: var(--rating-d); color: white;">D</span><span>≤ 20 - High, refactor recommended</span>
                            <span class="badge" style="background: var(--rating-e); color: white;">E</span><span>> 20 - Critical, immediate action</span>
                        </div>
                    \`
                },
                maintainability: {
                    title: 'Maintainability Rating',
                    body: \`
                        <h4>What is measured</h4>
                        <p>Technical debt as a percentage of estimated development time.</p>
                        <h4 style="margin-top: 16px;">How it's calculated</h4>
                        <p><strong>Debt minutes:</strong></p>
                        <ul>
                            <li>Code smells × 5 minutes</li>
                            <li>Bug issues × 15 minutes</li>
                            <li>Vulnerabilities × 30 minutes</li>
                        </ul>
                        <p style="margin-top: 8px;"><strong>Development estimate:</strong> (flows × 10min) + (subflows × 5min), min 60min</p>
                        <p style="margin-top: 8px;"><strong>Debt Ratio:</strong> (Debt minutes / Development estimate) × 100%</p>
                        <h4 style="margin-top: 16px;">Rating Thresholds</h4>
                        <div class="rating-scale">
                            <span class="badge" style="background: var(--rating-a); color: white;">A</span><span>≤ 5% - Excellent maintainability</span>
                            <span class="badge" style="background: var(--rating-b); color: white;">B</span><span>≤ 10% - Good maintainability</span>
                            <span class="badge" style="background: var(--rating-c); color: white;">C</span><span>≤ 20% - Moderate debt</span>
                            <span class="badge" style="background: var(--rating-d); color: white;">D</span><span>≤ 50% - High debt, plan remediation</span>
                            <span class="badge" style="background: var(--rating-e); color: white;">E</span><span>> 50% - Critical, immediate action</span>
                        </div>
                    \`
                },
                reliability: {
                    title: 'Reliability Rating',
                    body: \`
                        <h4>What is measured</h4>
                        <p>Number of bug-type issues that may cause runtime failures.</p>
                        <h4 style="margin-top: 16px;">Bug-type rules include</h4>
                        <ul>
                            <li><strong>MULE-003:</strong> Missing error handler on flows</li>
                            <li><strong>PROJ-001:</strong> Missing pom.xml file</li>
                        </ul>
                        <h4 style="margin-top: 16px;">Rating Thresholds</h4>
                        <div class="rating-scale">
                            <span class="badge" style="background: var(--rating-a); color: white;">A</span><span>0 bugs - No reliability issues</span>
                            <span class="badge" style="background: var(--rating-b); color: white;">B</span><span>1-2 bugs - Minor concerns</span>
                            <span class="badge" style="background: var(--rating-c); color: white;">C</span><span>3-5 bugs - Moderate risk</span>
                            <span class="badge" style="background: var(--rating-d); color: white;">D</span><span>6-10 bugs - High risk</span>
                            <span class="badge" style="background: var(--rating-e); color: white;">E</span><span>> 10 bugs - Critical issues</span>
                        </div>
                    \`
                },
                security: {
                    title: 'Security Rating',
                    body: \`
                        <h4>What is measured</h4>
                        <p>Vulnerability count from security-related rule violations.</p>
                        <h4 style="margin-top: 16px;">Vulnerability rules include</h4>
                        <ul>
                            <li><strong>MULE-201:</strong> Hardcoded credentials</li>
                            <li><strong>MULE-202:</strong> Insecure TLS configuration</li>
                            <li><strong>YAML-004:</strong> Plaintext secrets in config</li>
                            <li><strong>MULE-004:</strong> Hardcoded URLs</li>
                        </ul>
                        <h4 style="margin-top: 16px;">Rating Thresholds</h4>
                        <div class="rating-scale">
                            <span class="badge" style="background: var(--rating-a); color: white;">A</span><span>0 vulns - Secure configuration</span>
                            <span class="badge" style="background: var(--rating-b); color: white;">B</span><span>1 vuln - Minor finding</span>
                            <span class="badge" style="background: var(--rating-c); color: white;">C</span><span>2-3 vulns - Review needed</span>
                            <span class="badge" style="background: var(--rating-d); color: white;">D</span><span>4-5 vulns - Remediation required</span>
                            <span class="badge" style="background: var(--rating-e); color: white;">E</span><span>> 5 vulns - Critical security issues</span>
                        </div>
                    \`
                }
            },
            init() {
                // Create modal overlay
                this.overlay = document.createElement('div');
                this.overlay.className = 'modal-overlay';
                this.overlay.innerHTML = \`
                    <div class="modal-content">
                        <div class="modal-header">
                            <h3 class="modal-title"></h3>
                            <button class="modal-close" onclick="modal.close()">
                                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>
                            </button>
                        </div>
                        <div class="modal-body"></div>
                    </div>
                \`;
                document.body.appendChild(this.overlay);
                
                // Close on backdrop click
                this.overlay.addEventListener('click', (e) => {
                    if (e.target === this.overlay) this.close();
                });
                
                // Close on Escape
                document.addEventListener('keydown', (e) => {
                    if (e.key === 'Escape' && this.overlay.classList.contains('active')) {
                        this.close();
                    }
                });
            },
            open(type) {
                const data = this.content[type];
                if (!data) return;
                this.overlay.querySelector('.modal-title').textContent = data.title;
                this.overlay.querySelector('.modal-body').innerHTML = data.body;
                this.overlay.classList.add('active');
            },
            close() {
                this.overlay.classList.remove('active');
            }
        };

        // ===== INIT =====
        document.addEventListener('DOMContentLoaded', () => {
            modal.init();
            renderer.init();
        });
    </script>
</body>
</html>`;
}
