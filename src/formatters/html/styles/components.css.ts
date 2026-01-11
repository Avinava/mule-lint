/**
 * Component CSS Styles
 * Modal, sidebar, cards, buttons
 */

export const componentStyles = `
/* ===== Sidebar Navigation ===== */
.sidebar-link {
    position: relative;
    border-left: 2px solid transparent;
    transition: var(--transition-fast);
}
.sidebar-link:hover {
    background: rgba(0,0,0,0.03);
}
.dark .sidebar-link:hover {
    background: rgba(255,255,255,0.03);
}
.sidebar-link.active {
    border-left-color: var(--accent-primary);
    background: linear-gradient(90deg, rgba(14, 165, 233, 0.08) 0%, transparent 100%);
    color: #0284c7;
    font-weight: 600;
}
.dark .sidebar-link.active {
    border-left-color: #38bdf8;
    background: linear-gradient(90deg, rgba(56, 189, 248, 0.1) 0%, transparent 100%);
    color: #38bdf8;
}

/* ===== Header Navigation Tabs ===== */
.nav-tab {
    position: relative;
    transition: var(--transition-fast);
}
.nav-tab::after {
    content: '';
    position: absolute;
    bottom: -1px;
    left: 0;
    right: 0;
    height: 2px;
    background: transparent;
    transition: var(--transition-fast);
}
.nav-tab.active {
    color: #0284c7;
    font-weight: 600;
}
.nav-tab.active::after {
    background: var(--accent-primary);
}
.dark .nav-tab.active {
    color: #38bdf8;
}
.dark .nav-tab.active::after {
    background: #38bdf8;
}

/* ===== Modal ===== */
.modal-overlay {
    position: fixed;
    inset: 0;
    background: var(--bg-overlay);
    backdrop-filter: blur(4px);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1000;
    opacity: 0;
    visibility: hidden;
    transition: var(--transition-normal);
}
.modal-overlay.active {
    opacity: 1;
    visibility: visible;
}
.modal-content {
    background: var(--bg-primary);
    border-radius: var(--radius-xl);
    box-shadow: var(--shadow-xl);
    max-width: 520px;
    width: 90%;
    max-height: 85vh;
    overflow-y: auto;
    transform: scale(0.95);
    transition: transform var(--transition-normal);
}
.modal-overlay.active .modal-content {
    transform: scale(1);
}
.modal-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: var(--spacing-md) 20px;
    border-bottom: 1px solid var(--border-color);
}
.modal-title {
    font-size: 1rem;
    font-weight: 600;
    color: var(--text-primary);
}
.modal-close {
    width: 32px;
    height: 32px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: var(--radius-md);
    color: var(--text-secondary);
    transition: var(--transition-fast);
    cursor: pointer;
    border: none;
    background: transparent;
}
.modal-close:hover {
    background: var(--bg-tertiary);
    color: var(--text-primary);
}
.modal-body {
    padding: 20px;
}
.modal-body h4 {
    font-size: 0.8125rem;
    font-weight: 600;
    color: var(--text-secondary);
    margin-bottom: 8px;
}
.modal-body p, .modal-body li {
    font-size: 0.8125rem;
    color: var(--text-secondary);
    line-height: 1.5;
}
.modal-body ul {
    list-style: disc;
    padding-left: 20px;
    margin: 8px 0;
}
.modal-body .rating-scale {
    display: flex;
    flex-direction: column;
    gap: 8px;
    margin-top: 12px;
    background: var(--bg-secondary);
    padding: 12px;
    border-radius: var(--radius-md);
}
.rating-scale .rating-row {
    display: flex;
    align-items: center;
    gap: 10px;
}
.rating-scale .badge {
    min-width: 24px;
    height: 24px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    border-radius: var(--radius-sm);
    font-weight: 700;
    font-size: 0.75rem;
    color: white;
    flex-shrink: 0;
}

/* ===== Info Button ===== */
.info-btn {
    width: 18px;
    height: 18px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    border-radius: 50%;
    background: var(--bg-tertiary);
    color: var(--text-secondary);
    cursor: pointer;
    transition: var(--transition-fast);
    border: none;
    font-size: 0.65rem;
    font-weight: 700;
    margin-left: 4px;
}
.info-btn:hover {
    background: var(--accent-primary);
    color: white;
}

/* ===== Side Panel ===== */
.sidepanel {
    position: fixed;
    top: 0;
    right: 0;
    width: 420px;
    height: 100vh;
    background: var(--bg-primary);
    border-left: 1px solid var(--border-color);
    box-shadow: var(--shadow-xl);
    z-index: 999;
    transform: translateX(100%);
    transition: transform var(--transition-slow);
    overflow-y: auto;
}
.sidepanel.active {
    transform: translateX(0);
}
.sidepanel-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: var(--spacing-md) 20px;
    border-bottom: 1px solid var(--border-color);
    position: sticky;
    top: 0;
    background: var(--bg-primary);
}
.sidepanel-title {
    font-size: 1rem;
    font-weight: 600;
    color: var(--text-primary);
}
.sidepanel-close {
    width: 32px;
    height: 32px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: var(--radius-md);
    color: var(--text-secondary);
    transition: var(--transition-fast);
    cursor: pointer;
    border: none;
    background: transparent;
}
.sidepanel-close:hover {
    background: var(--bg-tertiary);
    color: var(--text-primary);
}
.sidepanel-body {
    padding: 20px;
}
`;
