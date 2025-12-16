import { LintReport } from '../types/Report';
import { ALL_RULES } from '../rules';
import packageJson from '../../package.json';

/**
 * Format lint report as a modern, interactive HTML Single Page Application
 */
export function formatHtml(report: LintReport): string {
    // 1. Enrich Data
    const enrichedFiles = report.files.map(file => ({
        ...file,
        issues: file.issues.map(issue => {
            const ruleDef = ALL_RULES.find(r => r.id === issue.ruleId);
            return {
                ...issue,
                category: ruleDef?.category || 'General',
                ruleDescription: ruleDef?.description || 'No description available',
                ruleName: ruleDef?.name || issue.ruleId,
                file: file.relativePath
            };
        })
    }));

    // Reconstruct report data for the client
    const clientData = {
        metadata: {
            timestamp: report.timestamp,
            version: packageJson.version,
            filesScanned: report.files.length,
            duration: report.durationMs || 0
        },
        summary: report.summary,
        files: enrichedFiles,
        rules: ALL_RULES.map(r => ({ id: r.id, name: r.name, category: r.category, severity: r.severity }))
    };

    const jsonPayload = JSON.stringify(clientData).replace(/</g, '\\u003c');

    return `<!DOCTYPE html>
<html lang="en" class="bg-gray-50 text-slate-800">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Mule-Lint Report</title>
    
    <!-- Fonts -->
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet">
    
    <!-- Tailwind CSS -->
    <script src="https://cdn.tailwindcss.com"></script>
    <script>
        tailwind.config = {
            theme: {
                extend: {
                    fontFamily: {
                        sans: ['Inter', 'sans-serif'],
                        mono: ['JetBrains Mono', 'monospace'],
                    },
                    colors: {
                        brand: {
                            50: '#f0f9ff',
                            100: '#e0f2fe',
                            500: '#0ea5e9',
                            600: '#0284c7',
                            900: '#0c4a6e',
                        },
                        severity: {
                            error: '#ef4444',
                            warning: '#f59e0b',
                            info: '#3b82f6'
                        }
                    }
                }
            }
        }
    </script>
    
    <!-- Icons -->
    <script src="https://unpkg.com/lucide@latest"></script>

    <!-- Chart.js -->
    <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
    
    <!-- Tabulator -->
    <link href="https://unpkg.com/tabulator-tables@6.2.1/dist/css/tabulator.min.css" rel="stylesheet">
    <script type="text/javascript" src="https://unpkg.com/tabulator-tables@6.2.1/dist/js/tabulator.min.js"></script>

    <style>
        /* Custom Scrollbar */
        ::-webkit-scrollbar { width: 8px; height: 8px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 4px; }
        ::-webkit-scrollbar-thumb:hover { background: #94a3b8; }

        /* Tabulator Overrides */
        .tabulator {
            border: none !important;
            background-color: transparent !important;
            font-family: 'Inter', sans-serif !important;
        }
        .tabulator-header {
            background-color: #f8fafc !important;
            border-bottom: 2px solid #e2e8f0 !important;
            color: #64748b !important;
            font-weight: 600 !important;
            font-size: 0.75rem !important;
            text-transform: uppercase !important;
            letter-spacing: 0.05em !important;
        }
        .tabulator-header .tabulator-col {
            background-color: #f8fafc !important;
            border-right: none !important;
        }
        .tabulator-row {
            background-color: white !important;
            border-bottom: 1px solid #f1f5f9 !important;
            color: #334155 !important;
        }
        .tabulator-row:hover {
            background-color: #f8fafc !important;
        }
        .tabulator-row.tabulator-selected {
            background-color: #e0f2fe !important;
        }
        .tabulator-cell {
            padding: 14px 20px !important;
            border-right: none !important;
            font-size: 0.9rem !important;
        }
        
        /* Header Filter Inputs */
        .tabulator-header-filter input,
        .tabulator-header-filter select {
            width: 100% !important;
            padding: 6px 10px !important;
            border: 2px solid #cbd5e1 !important;
            border-radius: 6px !important;
            font-size: 0.8rem !important;
            background-color: #ffffff !important;
            color: #334155 !important;
            outline: none !important;
        }
        .tabulator-header-filter input:focus,
        .tabulator-header-filter select:focus {
            border-color: #0ea5e9 !important;
            box-shadow: 0 0 0 3px rgba(14, 165, 233, 0.15) !important;
        }
        .tabulator-header-filter input::placeholder {
            color: #94a3b8 !important;
        }
        
        /* Tabulator List Filter Styling */
        .tabulator-edit-list {
            background: white !important;
            border: 2px solid #e2e8f0 !important;
            border-radius: 8px !important;
            box-shadow: 0 10px 25px -5px rgba(0,0,0,0.1), 0 8px 10px -6px rgba(0,0,0,0.1) !important;
            max-height: 200px !important;
            overflow-y: auto !important;
        }
        .tabulator-edit-list-item {
            padding: 8px 12px !important;
            font-size: 0.85rem !important;
            color: #334155 !important;
        }
        .tabulator-edit-list-item:hover {
            background-color: #f1f5f9 !important;
        }
        .tabulator-edit-list-item.active {
            background-color: #0ea5e9 !important;
            color: white !important;
        }
        
        /* Chart Container */
        .chart-container {
            position: relative;
            height: 250px;
            width: 100%;
        }

        [x-cloak] { display: none !important; }
    </style>
</head>
<body>

    <!-- Data Injection -->
    <script id="report-data" type="application/json">
        ${jsonPayload}
    </script>

    <div id="app" class="min-h-screen flex flex-col">
        
        <!-- Navbar -->
        <header class="bg-white border-b border-gray-200 sticky top-0 z-50">
            <div class="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8">
                <div class="flex justify-between h-16">
                    <div class="flex items-center gap-4">
                        <div class="flex items-center gap-2">
                             <div class="bg-brand-600 text-white p-1.5 rounded-lg shadow-sm">
                                <i data-lucide="shield-check" class="w-6 h-6"></i>
                            </div>
                            <div>
                                <h1 class="text-xl font-bold text-gray-900 tracking-tight">Mule-Lint</h1>
                                <p class="text-xs text-gray-500 font-medium">Enterprise Static Analysis</p>
                            </div>
                        </div>
                        
                        <!-- Tabs -->
                        <nav class="ml-10 flex space-x-1 bg-gray-100 p-1 rounded-lg">
                            <button onclick="router.navigate('dashboard')" 
                                id="nav-dashboard"
                                data-active="true"
                                class="px-4 py-1.5 rounded-md text-sm font-medium transition-all duration-200 text-gray-600 hover:text-gray-900 data-[active=true]:bg-white data-[active=true]:text-brand-600 data-[active=true]:shadow-sm">
                                Dashboard
                            </button>
                            <button onclick="router.navigate('issues')" 
                                id="nav-issues"
                                class="px-4 py-1.5 rounded-md text-sm font-medium transition-all duration-200 text-gray-600 hover:text-gray-900 data-[active=true]:bg-white data-[active=true]:text-brand-600 data-[active=true]:shadow-sm">
                                Issues
                                <span id="nav-badge" class="ml-2 bg-gray-200 text-gray-600 px-1.5 py-0.5 rounded-full text-xs">0</span>
                            </button>
                        </nav>
                    </div>

                    <div class="flex items-center gap-4">
                        <span class="text-sm text-gray-500 hidden md:block">
                            Generated <span id="timestamp-display" class="font-mono text-gray-700"></span>
                        </span>
                        <div class="h-6 w-px bg-gray-200"></div>
                        <a href="https://github.com/mulesoft-labs/mule-lint" target="_blank" class="text-gray-500 hover:text-gray-900 transition-colors">
                            <i data-lucide="github" class="w-5 h-5"></i>
                        </a>
                        <button onclick="window.print()" class="text-gray-500 hover:text-brand-600 transition-colors" title="Print Report">
                            <i data-lucide="printer" class="w-5 h-5"></i>
                        </button>
                    </div>
                </div>
            </div>
        </header>

        <!-- Main Content -->
        <main class="flex-1 w-full">
            
            <!-- Dashboard View -->
            <div id="view-dashboard" class="space-y-6 max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-8">
                <!-- Summary Cards -->
                <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    <!-- Error Card -->
                    <div class="bg-white rounded-xl shadow-sm border border-gray-100 p-6 flex items-start justify-between cursor-pointer hover:shadow-md transition-shadow group" onclick="router.filterBySeverity('error')">
                        <div>
                            <p class="text-sm font-medium text-gray-500">Errors</p>
                            <h3 class="text-3xl font-bold text-severity-error mt-2" id="stat-error">0</h3>
                             <p class="text-xs text-gray-400 mt-1 group-hover:text-red-400 transition-colors">Critical violations</p>
                        </div>
                        <div class="p-3 bg-red-50 rounded-lg group-hover:bg-red-100 transition-colors">
                            <i data-lucide="x-circle" class="w-6 h-6 text-severity-error"></i>
                        </div>
                    </div>

                    <!-- Warning Card -->
                    <div class="bg-white rounded-xl shadow-sm border border-gray-100 p-6 flex items-start justify-between cursor-pointer hover:shadow-md transition-shadow group" onclick="router.filterBySeverity('warning')">
                        <div>
                            <p class="text-sm font-medium text-gray-500">Warnings</p>
                            <h3 class="text-3xl font-bold text-severity-warning mt-2" id="stat-warning">0</h3>
                            <p class="text-xs text-gray-400 mt-1 group-hover:text-orange-400 transition-colors">Potential issues</p>
                        </div>
                         <div class="p-3 bg-orange-50 rounded-lg group-hover:bg-orange-100 transition-colors">
                            <i data-lucide="alert-triangle" class="w-6 h-6 text-severity-warning"></i>
                        </div>
                    </div>

                    <!-- Info Card -->
                    <div class="bg-white rounded-xl shadow-sm border border-gray-100 p-6 flex items-start justify-between cursor-pointer hover:shadow-md transition-shadow group" onclick="router.filterBySeverity('info')">
                        <div>
                            <p class="text-sm font-medium text-gray-500">Infos</p>
                            <h3 class="text-3xl font-bold text-severity-info mt-2" id="stat-info">0</h3>
                            <p class="text-xs text-gray-400 mt-1 group-hover:text-blue-400 transition-colors">Suggestions</p>
                        </div>
                         <div class="p-3 bg-blue-50 rounded-lg group-hover:bg-blue-100 transition-colors">
                            <i data-lucide="info" class="w-6 h-6 text-severity-info"></i>
                        </div>
                    </div>

                    <!-- Files Card -->
                    <div class="bg-white rounded-xl shadow-sm border border-gray-100 p-6 flex items-start justify-between">
                        <div>
                            <p class="text-sm font-medium text-gray-500">Files Scanned</p>
                            <h3 class="text-3xl font-bold text-gray-700 mt-2" id="stat-files">0</h3>
                            <p class="text-xs text-gray-400 mt-1">XML Resources</p>
                        </div>
                        <div class="p-3 bg-gray-50 rounded-lg">
                            <i data-lucide="file-code" class="w-6 h-6 text-gray-500"></i>
                        </div>
                    </div>
                </div>

                <!-- Charts Section -->
                <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <!-- Top Rules -->
                    <div class="lg:col-span-2 bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                        <div class="flex items-center justify-between mb-6">
                            <div>
                                <h3 class="text-lg font-semibold text-gray-800">Top 5 Violated Rules</h3>
                                <p class="text-sm text-gray-500 mt-1">Most frequently triggered lint rules</p>
                            </div>
                        </div>
                        <div class="chart-container">
                            <canvas id="chart-top-rules"></canvas>
                        </div>
                    </div>

                    <!-- Severity Distribution -->
                    <div class="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                        <div class="flex items-center justify-between mb-6">
                            <div>
                                <h3 class="text-lg font-semibold text-gray-800">Severity Breakdown</h3>
                                <p class="text-sm text-gray-500 mt-1">Distribution by issue type</p>
                            </div>
                        </div>
                        <div class="chart-container flex items-center justify-center">
                            <canvas id="chart-severity"></canvas>
                        </div>
                    </div>
                </div>
                
                 <!-- Categories Section -->
                 <div class="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                    <div class="flex items-center justify-between mb-6">
                        <div>
                            <h3 class="text-lg font-semibold text-gray-800">Issues by Category</h3>
                            <p class="text-sm text-gray-500 mt-1">Grouped by rule category</p>
                        </div>
                        <button onclick="router.navigate('issues')" class="text-sm text-brand-600 hover:text-brand-900 font-medium">View All Issues &rarr;</button>
                    </div>
                    <div class="h-[300px] w-full relative">
                        <canvas id="chart-categories"></canvas>
                    </div>
                </div>
            </div>

            <!-- Issues View -->
            <div id="view-issues" class="hidden h-[calc(100vh-80px)] flex flex-col px-6 py-4 overflow-hidden">
                <!-- Filters Toolbar -->
                <div class="bg-white p-4 rounded-t-xl border border-gray-200 border-b-0 shadow-sm flex flex-wrap gap-4 items-center justify-between flex-shrink-0">
                    <div class="flex items-center gap-4 flex-1">
                        <div class="relative flex-1 max-w-md">
                            <i data-lucide="search" class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400"></i>
                            <input type="text" id="global-search" placeholder="Quick search..." 
                                class="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent transition-shadow">
                        </div>
                        <div class="text-sm text-gray-500 italic">
                            <i data-lucide="filter" class="w-4 h-4 inline mr-1"></i>
                            Use column headers to filter (multiselect supported)
                        </div>
                    </div>
                    
                    <div class="flex items-center gap-2">
                         <button id="download-csv" class="flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-600 bg-gray-50 border border-gray-300 rounded-lg hover:bg-gray-100 transition-colors">
                            <i data-lucide="download" class="w-4 h-4"></i>
                            Export CSV
                        </button>
                    </div>
                </div>

                <!-- Tabulator Container - uses remaining height -->
                <div id="issues-table-container" class="flex-1 bg-white border border-gray-200 rounded-b-xl overflow-hidden shadow-sm"></div>
            </div>
        </main>
    </div>

    <script>
        // --- State ---
        const reportRaw = document.getElementById('report-data').textContent;
        const report = JSON.parse(reportRaw);
        
        // Flatten issues for the table
        const allIssues = report.files.flatMap(f => f.issues.map(i => ({
            ...i,
            fileName: f.relativePath
        })));

        // --- Router ---
        const router = {
            navigate(view) {
                ['dashboard', 'issues'].forEach(v => {
                    document.getElementById(\`view-\${v}\`).classList.toggle('hidden', v !== view);
                    const btn = document.getElementById(\`nav-\${v}\`);
                    if (v === view) btn.setAttribute('data-active', 'true');
                    else btn.removeAttribute('data-active');
                });
                if (view === 'issues' && window.tableInstance) window.tableInstance.redraw();
            },
            
            filterBySeverity(severity) {
                this.navigate('issues');
                window.tableInstance.setHeaderFilterValue("severity", [severity]);
            }
        };

        // --- Renderer ---
        const renderer = {
            init() {
                document.getElementById('timestamp-display').textContent = new Date(report.metadata.timestamp).toLocaleString();
                
                document.getElementById('stat-error').textContent = report.summary.bySeverity.error;
                document.getElementById('stat-warning').textContent = report.summary.bySeverity.warning;
                document.getElementById('stat-info').textContent = report.summary.bySeverity.info;
                document.getElementById('stat-files').textContent = report.metadata.filesScanned;
                document.getElementById('nav-badge').textContent = allIssues.length;

                this.renderCharts();
                this.initTable();
                lucide.createIcons();
            },

            renderCharts() {
                const colors = { error: '#ef4444', warning: '#f59e0b', info: '#3b82f6' };
                
                // Top Rules (Bar) - Using Names
                const ruleCounts = {};
                const ruleNames = {};
                allIssues.forEach(i => {
                    ruleCounts[i.ruleId] = (ruleCounts[i.ruleId] || 0) + 1;
                    ruleNames[i.ruleId] = i.ruleName;
                });
                
                const sortedRules = Object.entries(ruleCounts)
                    .sort((a, b) => b[1] - a[1])
                    .slice(0, 5);
                
                new Chart(document.getElementById('chart-top-rules'), {
                    type: 'bar',
                    data: {
                        labels: sortedRules.map(x => {
                            const id = x[0];
                            const name = ruleNames[id];
                            return name.length > 30 ? name.substring(0, 27) + '...' : name;
                        }),
                        datasets: [{
                            label: 'Violations',
                            data: sortedRules.map(x => x[1]),
                            backgroundColor: '#0ea5e9',
                            borderRadius: 6,
                        }]
                    },
                    options: {
                        maintainAspectRatio: false,
                        plugins: { 
                            legend: { display: false },
                            tooltip: {
                                callbacks: {
                                    title: (ctx) => {
                                        const idx = ctx[0].dataIndex;
                                        const id = sortedRules[idx][0];
                                        return \`\${ruleNames[id]} (\${id})\`;
                                    }
                                }
                            }
                        },
                        scales: { y: { beginAtZero: true, grid: { borderDash: [2, 4], color: '#f1f5f9' } }, x: { grid: { display: false } } }
                    }
                });

                // Severity (Doughnut)
                new Chart(document.getElementById('chart-severity'), {
                    type: 'doughnut',
                    data: {
                        labels: ['Error', 'Warning', 'Info'],
                        datasets: [{
                            data: [report.summary.bySeverity.error, report.summary.bySeverity.warning, report.summary.bySeverity.info],
                            backgroundColor: [colors.error, colors.warning, colors.info],
                            borderWidth: 0,
                            hoverOffset: 4
                        }]
                    },
                    options: {
                        cutout: '75%',
                        plugins: { legend: { position: 'bottom', labels: { usePointStyle: true, padding: 20 } } }
                    }
                });
                
                // Categories (Bar) - Colorful
                const catCounts = {};
                allIssues.forEach(i => catCounts[i.category] = (catCounts[i.category] || 0) + 1);
                const sortedCats = Object.entries(catCounts).sort((a,b) => b[1] - a[1]);
                
                // Color palette for categories
                const categoryColors = [
                    '#0ea5e9', '#8b5cf6', '#10b981', '#f59e0b', '#ef4444',
                    '#ec4899', '#06b6d4', '#84cc16', '#f97316', '#6366f1'
                ];
                
                 new Chart(document.getElementById('chart-categories'), {
                    type: 'bar',
                    data: {
                        labels: sortedCats.map(x => x[0].charAt(0).toUpperCase() + x[0].slice(1)),
                        datasets: [{
                            label: 'Issues',
                            data: sortedCats.map(x => x[1]),
                            backgroundColor: sortedCats.map((_, i) => categoryColors[i % categoryColors.length]),
                            borderRadius: 4,
                            barThickness: 20
                        }]
                    },
                     options: {
                        indexAxis: 'y',
                        maintainAspectRatio: false,
                        plugins: { legend: { display: false } },
                        scales: { x: { beginAtZero: true, grid: { borderDash: [2, 4], color: '#f1f5f9' } }, y: { grid: { display: false } } }
                    }
                });
            },

            initTable() {
                const table = new Tabulator("#issues-table-container", {
                    data: allIssues,
                    layout: "fitColumns",
                    height: "100%",
                    placeholder: "No issues found matching filters",
                    frozenRows: 0, // Header is always frozen in Tabulator by default
                    
                    columns: [
                        { 
                            title: "Severity", 
                            field: "severity", 
                            width: 140,
                            headerFilter: "list",
                            headerFilterParams: {
                                valuesLookup: true,
                                multiselect: true,
                                clearable: true
                            },
                            headerFilterFunc: "in",
                            formatter: (cell) => {
                                const val = cell.getValue();
                                const colorMap = {
                                    error: "bg-red-100 text-red-700 border-red-200",
                                    warning: "bg-orange-100 text-orange-700 border-orange-200",
                                    info: "bg-blue-100 text-blue-700 border-blue-200"
                                };
                                return '<span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ' + (colorMap[val] || 'bg-gray-100') + ' uppercase tracking-wide">' + val + '</span>';
                            }
                        },
                        { 
                            title: "Rule", 
                            field: "ruleName",
                            width: 250,
                            headerFilter: "list",
                            headerFilterParams: {
                                valuesLookup: true,
                                multiselect: true,
                                clearable: true
                            },
                            headerFilterFunc: "in",
                            formatter: (cell) => {
                                const row = cell.getRow().getData();
                                return '<div class="flex flex-col"><span class="font-medium text-sm text-gray-900">' + cell.getValue() + '</span><span class="text-xs text-gray-500 font-mono">' + row.ruleId + '</span></div>';
                            }
                        },
                        { 
                            title: "Category", 
                            field: "category", 
                            width: 140, 
                            headerFilter: "list",
                            headerFilterParams: {
                                valuesLookup: true,
                                multiselect: true,
                                clearable: true
                            },
                            headerFilterFunc: "in",
                            formatter: (cell) => '<span class="text-sm text-gray-600 capitalize">' + cell.getValue() + '</span>'
                        },
                        { 
                            title: "File Path", 
                            field: "fileName", 
                            headerFilter: "input",
                            headerFilterPlaceholder: "Filter...",
                            formatter: (cell) => {
                                const row = cell.getRow().getData();
                                return '<div class="flex flex-col"><span class="font-mono text-sm text-brand-600 font-medium truncate" title="' + row.fileName + '">' + row.fileName + '</span><span class="text-xs text-gray-400 font-mono">Line: ' + row.line + '</span></div>';
                            },
                        },
                        { 
                            title: "Message", 
                            field: "message", 
                            widthGrow: 2,
                            headerFilter: "input",
                            headerFilterPlaceholder: "Filter...",
                            formatter: (cell) => {
                                const row = cell.getRow().getData();
                                return '<div class="flex flex-col gap-1"><span class="text-sm text-gray-700">' + cell.getValue() + '</span><span class="text-xs text-gray-400">' + row.ruleDescription + '</span></div>';
                            }
                        }
                    ],
                    initialSort: [{ column: "severity", dir: "asc" }]
                });
                
                window.tableInstance = table;

                // Quick Search
                document.getElementById('global-search').addEventListener('keyup', (e) => {
                    const term = e.target.value.toLowerCase();
                    if (!term) { table.clearFilter(); return; }
                    table.setFilter((data) => (
                         data.message.toLowerCase().includes(term) ||
                         data.fileName.toLowerCase().includes(term) ||
                         data.ruleName.toLowerCase().includes(term) ||
                         data.ruleId.toLowerCase().includes(term)
                    ));
                });
                
                // Export
                document.getElementById('download-csv').addEventListener('click', () => {
                    table.download("csv", "mule-lint-report.csv");
                });
            }
        };

        // --- Init ---
        document.addEventListener('DOMContentLoaded', () => {
             renderer.init();
        });

    </script>
</body>
</html>`;
}
