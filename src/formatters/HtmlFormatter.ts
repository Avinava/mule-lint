import { LintReport } from '../types/Report';
import { ALL_RULES } from '../rules';
import packageJson from '../../package.json';

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
    };

    const jsonPayload = JSON.stringify(clientData).replace(/</g, '\\u003c');
    const totalIssues =
        report.summary.bySeverity.error + report.summary.bySeverity.warning + report.summary.bySeverity.info;

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
                    <div class="text-sm font-bold text-slate-900 dark:text-white tracking-tight">Mule-Lint</div>
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
                    <svg class="w-5 h-5 dark:hidden" fill="none" stroke="currentColor" viewBox="0 0 24 24"><circle cx="12" cy="12" r="5"/><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/></svg>
                    <svg class="w-5 h-5 hidden dark:block" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z"/></svg>
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
                    <h2 class="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">Analysis Dashboard</h2>
                    <p class="text-base text-slate-500 dark:text-slate-400 mt-2">
                        Scanned <strong class="text-slate-700 dark:text-slate-200">${report.files.length} files</strong> • Found <strong class="text-rose-600 dark:text-rose-400">${report.summary.bySeverity.error} errors</strong>, 
                        <strong class="text-amber-600 dark:text-amber-400">${report.summary.bySeverity.warning} warnings</strong>, and 
                        <strong class="text-sky-600 dark:text-sky-400">${report.summary.bySeverity.info} suggestions</strong>
                    </p>
                </div>

                <!-- Summary Cards -->
                <div class="grid grid-cols-4 gap-4 mb-6">
                    <div class="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-5 cursor-pointer hover:shadow-lg hover:border-rose-300 dark:hover:border-rose-600 transition-all" onclick="router.toggleSeverity('error')">
                        <div class="flex items-center justify-between mb-3">
                            <span class="text-xs font-semibold text-rose-600 dark:text-rose-400 uppercase tracking-wider">Errors</span>
                            <div class="w-9 h-9 rounded-lg bg-rose-100 dark:bg-rose-500/20 flex items-center justify-center">
                                <svg class="w-5 h-5 text-rose-600 dark:text-rose-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><path d="m15 9-6 6M9 9l6 6"/></svg>
                            </div>
                        </div>
                        <div class="text-3xl font-bold text-rose-600 dark:text-rose-400">${report.summary.bySeverity.error}</div>
                        <div class="text-sm text-slate-400 dark:text-slate-500 mt-1">Critical issues</div>
                    </div>
                    <div class="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-5 cursor-pointer hover:shadow-lg hover:border-amber-300 dark:hover:border-amber-600 transition-all" onclick="router.toggleSeverity('warning')">
                        <div class="flex items-center justify-between mb-3">
                            <span class="text-xs font-semibold text-amber-600 dark:text-amber-400 uppercase tracking-wider">Warnings</span>
                            <div class="w-9 h-9 rounded-lg bg-amber-100 dark:bg-amber-500/20 flex items-center justify-center">
                                <svg class="w-5 h-5 text-amber-600 dark:text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><path d="M12 9v4M12 17h.01"/></svg>
                            </div>
                        </div>
                        <div class="text-3xl font-bold text-amber-600 dark:text-amber-400">${report.summary.bySeverity.warning}</div>
                        <div class="text-sm text-slate-400 dark:text-slate-500 mt-1">Best practice violations</div>
                    </div>
                    <div class="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-5 cursor-pointer hover:shadow-lg hover:border-sky-300 dark:hover:border-sky-600 transition-all" onclick="router.toggleSeverity('info')">
                        <div class="flex items-center justify-between mb-3">
                            <span class="text-xs font-semibold text-sky-600 dark:text-sky-400 uppercase tracking-wider">Info</span>
                            <div class="w-9 h-9 rounded-lg bg-sky-100 dark:bg-sky-500/20 flex items-center justify-center">
                                <svg class="w-5 h-5 text-sky-600 dark:text-sky-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4M12 8h.01"/></svg>
                            </div>
                        </div>
                        <div class="text-3xl font-bold text-sky-600 dark:text-sky-400">${report.summary.bySeverity.info}</div>
                        <div class="text-sm text-slate-400 dark:text-slate-500 mt-1">Suggestions</div>
                    </div>
                    <div class="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-5">
                        <div class="flex items-center justify-between mb-3">
                            <span class="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Files</span>
                            <div class="w-9 h-9 rounded-lg bg-slate-100 dark:bg-slate-700 flex items-center justify-center">
                                <svg class="w-5 h-5 text-slate-500 dark:text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/></svg>
                            </div>
                        </div>
                        <div class="text-3xl font-bold text-slate-700 dark:text-slate-200">${report.files.length}</div>
                        <div class="text-sm text-slate-400 dark:text-slate-500 mt-1">Scanned</div>
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
                this.initTable();
                this.initTheme();
                this.initKeyboardShortcuts();
                this.initExport();
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

        // ===== INIT =====
        document.addEventListener('DOMContentLoaded', () => renderer.init());
    </script>
</body>
</html>`;
}
