/**
 * Sidebar Section
 * Navigation and filter controls
 */

export interface SidebarProps {
    totalIssues: number;
}

export function renderSidebar(props: SidebarProps): string {
    return `
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
                        <span class="ml-auto text-xs font-bold text-slate-400 dark:text-slate-500">${props.totalIssues}</span>
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
    `;
}
