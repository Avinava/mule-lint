/**
 * Header Section
 * App header with navigation, search, and actions
 */

export interface HeaderProps {
    projectName: string;
    version: string;
    totalIssues: number;
}

export function renderHeader(props: HeaderProps): string {
    return `
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
                <h1 class="text-lg font-semibold text-slate-800 dark:text-white tracking-tight">${props.projectName}</h1>
                <span class="text-xs text-slate-400 dark:text-slate-500 font-mono">v${props.version}</span>
            </div>

            <div class="flex-1"></div>

            <!-- Nav Tabs -->
            <nav class="flex items-center gap-1 h-full">
                <button id="nav-dashboard" onclick="router.navigate('dashboard')" 
                    class="nav-tab active h-full px-3 text-sm font-medium text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200">
                    Dashboard
                </button>
                <button id="nav-issues" onclick="router.navigate('issues')" 
                    class="nav-tab h-full px-3 text-sm font-medium text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 flex items-center gap-1.5">
                    Issues
                    <span class="bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 px-1.5 py-0.5 rounded text-xs font-bold">${props.totalIssues}</span>
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
    `;
}
