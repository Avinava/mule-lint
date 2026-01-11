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
    grid-template-columns: 240px 1fr;
    grid-template-rows: 56px 1fr;
    height: 100vh;
    overflow: hidden;
}
.app-header { grid-column: 1 / -1; }
.app-sidebar { grid-row: 2; overflow-y: auto; }
.app-main { grid-row: 2; overflow: hidden; }

/* ===== Print Styles ===== */
@media print {
    .app-layout { display: block; height: auto; }
    .app-sidebar, .app-header { display: none; }
    .app-main { overflow: visible; }
}
`;
