/**
 * Base CSS Styles
 * Reset, scrollbar, layout grid
 */

export const baseStyles = `
/* ===== Base Reset ===== */
*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
html { -webkit-font-smoothing: antialiased; -moz-osx-font-smoothing: grayscale; }

/* ===== Scrollbar ===== */
::-webkit-scrollbar { width: 6px; height: 6px; }
::-webkit-scrollbar-track { background: transparent; }
::-webkit-scrollbar-thumb { background: #d1d5db; border-radius: 3px; }
::-webkit-scrollbar-thumb:hover { background: #9ca3af; }
.dark ::-webkit-scrollbar-thumb { background: #4b5563; }

/* ===== App Layout Grid ===== */
.app-layout {
    display: grid;
    grid-template-columns: 240px minmax(0, 1fr);
    grid-template-rows: 56px minmax(0, 1fr);
    height: 100vh;
    overflow: hidden;
}
.app-header { grid-column: 1 / -1; }
.app-sidebar { grid-row: 2; overflow-y: auto; }
.app-main { grid-row: 2; overflow: hidden; }

/* Core affordances also work if utility styles cannot load. */
[hidden], .hidden { display: none !important; }
body { font-family: Inter, system-ui, sans-serif; color: var(--text-primary); background: var(--bg-primary); }
button { cursor: pointer; text-align: left; }
button:focus-visible, a:focus-visible, input:focus-visible { outline: 3px solid #0284c7; outline-offset: 3px; }
svg { width: 20px; height: 20px; flex-shrink: 0; }
.app-header { display: flex; align-items: center; gap: 16px; padding: 0 20px; min-width: 0; }
.app-main { min-width: 0; min-height: 0; }
#view-dashboard { height: 100%; overflow-y: auto; }
#view-issues { height: 100%; display: flex; flex-direction: column; min-width: 0; }
#issues-table { min-height: 100px; flex: 1; }
#issues-fallback { overflow-y: auto; flex: 1; padding: 16px; }
.fallback-issue { padding: 16px; border-bottom: 1px solid var(--border-color); overflow-wrap: anywhere; }
.fallback-issue p { margin-top: 8px; }
.fallback-open, .issue-open { text-align: left; max-width: 100%; }
#sidebar-toggle { display: none; border: 1px solid var(--border-color); border-radius: 6px; padding: 7px 10px; }
.execution-status, .report-notice { margin: 0 0 20px; padding: 12px 16px; border: 1px solid var(--border-color); border-radius: 8px; font-size: 13px; line-height: 1.5; overflow-wrap: anywhere; }
.execution-status p { margin-top: 4px; }
.execution-status ul { padding-left: 20px; margin-top: 8px; }
.execution-status[data-status="incomplete"], .execution-status[data-status="no-files"] { border-left: 4px solid #d97706; }
.compact-status { margin: 8px 16px; flex-shrink: 0; max-height: 130px; overflow-y: auto; }
#issue-empty-state, #table-status { margin: 8px 16px; }
.summary-grid > button { width: 100%; }
.rating-card { position: relative; }
.rating-action::after { content: ''; position: absolute; inset: 0; }
.rating-card .info-btn { position: relative; z-index: 1; }
.sidepanel { max-width: 100vw; }
.report-project { flex-shrink: 1; }
.report-search { flex-shrink: 1; min-width: 120px; }
.report-actions, .report-nav { flex-shrink: 0; }
@media (max-width: 1100px) {
    .report-brand > div:last-child { display: none; }
    .report-project > span { display: none; }
    .app-header { gap: 10px; }
}
@media (max-width: 767px) {
    .app-layout { --report-header-height: 132px; grid-template-columns: minmax(0, 1fr); grid-template-rows: var(--report-header-height) minmax(0, 1fr); }
    .app-header { display: grid; grid-template-columns: auto minmax(0, 1fr) auto; grid-template-rows: 32px 36px 36px; gap: 6px 10px; padding: 8px 12px; }
    .app-header > .h-6, .app-header > .flex-1, .report-brand { display: none; }
    .report-project { grid-column: 1 / 3; grid-row: 1; min-width: 0; }
    .report-project h1 { font-size: 15px; max-width: 100%; }
    .report-actions { grid-column: 3; grid-row: 1; }
    .report-actions > a, #export-btn { display: none; }
    #sidebar-toggle { display: block; grid-column: 1; grid-row: 2; }
    .report-nav { grid-column: 2 / 4; grid-row: 2; height: 36px; justify-self: end; }
    .report-nav button { padding-left: 8px; padding-right: 8px; }
    .report-search { grid-column: 1 / -1; grid-row: 3; width: 100%; min-width: 0; }
    .report-search input { min-width: 0; }
    .app-sidebar { display: none; }
    .sidebar-open .app-sidebar { display: block; position: absolute; top: var(--report-header-height); bottom: 0; left: 0; width: min(280px, 90vw); background: var(--bg-primary); z-index: 30; box-shadow: var(--shadow-xl); }
    .app-main { grid-column: 1; }
    #view-dashboard { padding: 16px; }
    .metrics-grid, .summary-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
    .charts-grid { grid-template-columns: minmax(0, 1fr); }
    .charts-grid > .col-span-2 { grid-column: auto; }
    .issues-toolbar { flex-wrap: wrap; gap: 8px; padding: 10px 12px; }
    .issues-toolbar > div:first-child { flex: 1; min-width: 170px; }
    .issues-toolbar > .flex-1 { display: none; }
    #download-csv { padding: 8px; }
    .sidepanel { width: 100%; }
    .compact-status { max-height: 100px; }
}
@media (prefers-reduced-motion: reduce) {
    *, *::before, *::after { transition: none !important; scroll-behavior: auto !important; }
}

/* ===== Print Styles ===== */
@media print {
    .app-layout { display: block; height: auto; }
    .app-sidebar, .app-header { display: none; }
    .app-main { overflow: visible; }
}
`;
