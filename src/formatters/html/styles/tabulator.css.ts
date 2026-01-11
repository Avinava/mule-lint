/**
 * Tabulator Table CSS Overrides
 * Custom styling for the issues table
 */

export const tabulatorStyles = `
/* ===== Tabulator Table Overrides ===== */
.tabulator {
    border: none !important;
    font-size: 0.8125rem !important;
    background: var(--bg-primary) !important;
}
.tabulator-header {
    background: var(--bg-secondary) !important;
    border-bottom: 1px solid var(--border-color) !important;
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
    color: var(--text-secondary) !important;
    padding: 8px 12px !important;
}
.tabulator-row {
    background: var(--bg-primary) !important;
    border-bottom: 1px solid var(--bg-tertiary) !important;
    min-height: 40px !important;
}
.tabulator-row:hover { 
    background: var(--bg-secondary) !important; 
}
.tabulator-row.tabulator-selected { 
    background: #eff6ff !important; 
}
.tabulator-cell {
    padding: 8px 12px !important;
    border-right: none !important;
}
.tabulator-header-filter { 
    padding: 4px 8px 8px 8px !important; 
}
.tabulator-header-filter input,
.tabulator-header-filter select {
    width: 100% !important;
    padding: 4px 8px !important;
    border: 1px solid var(--border-color) !important;
    border-radius: var(--radius-sm) !important;
    font-size: 0.75rem !important;
    background: var(--bg-primary) !important;
}
.tabulator-header-filter input:focus,
.tabulator-header-filter select:focus {
    border-color: var(--accent-primary) !important;
    outline: none !important;
    box-shadow: 0 0 0 3px rgba(14, 165, 233, 0.1) !important;
}
.tabulator-edit-list {
    background: var(--bg-primary) !important;
    border: 1px solid var(--border-color) !important;
    border-radius: var(--radius-md) !important;
    box-shadow: var(--shadow-lg) !important;
    max-height: 200px !important;
}
.tabulator-edit-list-item { 
    padding: 6px 10px !important; 
    font-size: 0.75rem !important; 
}
.tabulator-edit-list-item:hover { 
    background: var(--bg-tertiary) !important; 
}
.tabulator-edit-list-item.active { 
    background: var(--accent-primary) !important; 
    color: white !important; 
}

/* Dark mode table */
.dark .tabulator-row.tabulator-selected { 
    background: rgba(56, 189, 248, 0.1) !important; 
}
`;
