/**
 * Lint Summary Section
 * Issue counts by severity
 */

export function renderLintSummarySection(): string {
    return `
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
                <div id="summary-errors" class="text-xl font-bold text-rose-600 dark:text-rose-400">0</div>
                <div class="text-2xs text-slate-400 dark:text-slate-500 mt-0.5">Critical issues</div>
            </div>
            <div class="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 p-3 cursor-pointer hover:shadow-lg hover:border-amber-300 dark:hover:border-amber-600 transition-all" onclick="router.toggleSeverity('warning')">
                <div class="flex items-center justify-between mb-1">
                    <span class="text-2xs font-semibold text-amber-600 dark:text-amber-400 uppercase tracking-wider">Warnings</span>
                    <div class="w-6 h-6 rounded bg-amber-100 dark:bg-amber-500/20 flex items-center justify-center">
                        <svg class="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><path d="M12 9v4M12 17h.01"/></svg>
                    </div>
                </div>
                <div id="summary-warnings" class="text-xl font-bold text-amber-600 dark:text-amber-400">0</div>
                <div class="text-2xs text-slate-400 dark:text-slate-500 mt-0.5">Best practice violations</div>
            </div>
            <div class="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 p-3 cursor-pointer hover:shadow-lg hover:border-sky-300 dark:hover:border-sky-600 transition-all" onclick="router.toggleSeverity('info')">
                <div class="flex items-center justify-between mb-1">
                    <span class="text-2xs font-semibold text-sky-600 dark:text-sky-400 uppercase tracking-wider">Info</span>
                    <div class="w-6 h-6 rounded bg-sky-100 dark:bg-sky-500/20 flex items-center justify-center">
                        <svg class="w-3.5 h-3.5 text-sky-600 dark:text-sky-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4M12 8h.01"/></svg>
                    </div>
                </div>
                <div id="summary-info" class="text-xl font-bold text-sky-600 dark:text-sky-400">0</div>
                <div class="text-2xs text-slate-400 dark:text-slate-500 mt-0.5">Suggestions</div>
            </div>
            <div class="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 p-3">
                <div class="flex items-center justify-between mb-1">
                    <span class="text-2xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Files</span>
                    <div class="w-6 h-6 rounded bg-slate-100 dark:bg-slate-700 flex items-center justify-center">
                        <svg class="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/></svg>
                    </div>
                </div>
                <div id="summary-files" class="text-xl font-bold text-slate-700 dark:text-slate-200">0</div>
                <div class="text-2xs text-slate-400 dark:text-slate-500 mt-0.5">Scanned</div>
            </div>
        </div>
    </div>
    `;
}
