/**
 * Issues View
 * Table-based issues list with filtering and export
 */

export interface IssuesViewProps {
    totalIssues: number;
}

export function renderIssuesView(props: IssuesViewProps): string {
    return `
            <!-- ===== ISSUES VIEW ===== -->
            <div id="view-issues" class="hidden h-full flex flex-col">
                <!-- Toolbar -->
                <div class="bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 px-5 py-3 flex items-center gap-4 shrink-0">
                    <span class="text-sm text-slate-500 dark:text-slate-400">
                        Showing <strong id="filtered-count" class="text-slate-700 dark:text-slate-200">${props.totalIssues}</strong> of ${props.totalIssues} issues
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
    `;
}
