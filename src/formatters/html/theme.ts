/**
 * HTML Report Theme System
 * CSS variables for colors, spacing, and animations
 */

export const themeVariables = `
/* ===== Theme Variables ===== */
:root {
    /* Semantic Colors */
    --color-success: #10b981;
    --color-warning: #f59e0b;
    --color-error: #ef4444;
    --color-info: #3b82f6;
    
    /* Rating Colors (A-E) */
    --rating-a: #10b981;
    --rating-b: #84cc16;
    --rating-c: #f59e0b;
    --rating-d: #f97316;
    --rating-e: #ef4444;
    
    /* Surface Colors */
    --bg-primary: #ffffff;
    --bg-secondary: #f8fafc;
    --bg-tertiary: #f1f5f9;
    --bg-overlay: rgba(0, 0, 0, 0.5);
    
    /* Border */
    --border-color: #e2e8f0;
    --border-color-hover: #cbd5e1;
    
    /* Text */
    --text-primary: #1e293b;
    --text-secondary: #64748b;
    --text-muted: #94a3b8;
    
    /* Accent */
    --accent-primary: #0ea5e9;
    --accent-primary-hover: #0284c7;
    
    /* Spacing */
    --spacing-xs: 4px;
    --spacing-sm: 8px;
    --spacing-md: 16px;
    --spacing-lg: 24px;
    --spacing-xl: 32px;
    
    /* Border Radius */
    --radius-sm: 6px;
    --radius-md: 8px;
    --radius-lg: 12px;
    --radius-xl: 16px;
    
    /* Shadows */
    --shadow-sm: 0 1px 2px rgba(0, 0, 0, 0.05);
    --shadow-md: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
    --shadow-lg: 0 10px 25px rgba(0, 0, 0, 0.1);
    --shadow-xl: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
    
    /* Animation */
    --transition-fast: 150ms ease;
    --transition-normal: 200ms ease;
    --transition-slow: 300ms ease;
}

/* Dark Mode Overrides */
.dark {
    --bg-primary: #0f172a;
    --bg-secondary: #1e293b;
    --bg-tertiary: #334155;
    --bg-overlay: rgba(0, 0, 0, 0.7);
    
    --border-color: #475569;
    --border-color-hover: #64748b;
    
    --text-primary: #f1f5f9;
    --text-secondary: #94a3b8;
    --text-muted: #64748b;
    
    --accent-primary: #38bdf8;
    --accent-primary-hover: #7dd3fc;
}
`;

export const ratingColors: Record<string, string> = {
    A: 'var(--rating-a)',
    B: 'var(--rating-b)',
    C: 'var(--rating-c)',
    D: 'var(--rating-d)',
    E: 'var(--rating-e)',
};
