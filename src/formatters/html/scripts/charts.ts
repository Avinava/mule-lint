/**
 * Chart Configuration
 * Colors, styles, and settings for Chart.js visualizations
 */

/**
 * Severity colors for charts and badges
 */
export const severityColors = {
    error: '#e11d48',   // rose-600
    warning: '#d97706', // amber-600
    info: '#0284c7',    // sky-600
};

/**
 * Category chart colors (cycling palette)
 */
export const categoryColors = [
    '#0ea5e9', // sky-500
    '#8b5cf6', // violet-500
    '#10b981', // emerald-500
    '#f59e0b', // amber-500
    '#ef4444', // rose-500
    '#ec4899', // pink-500
    '#06b6d4', // cyan-500
    '#84cc16', // lime-500
    '#f97316', // orange-500
    '#6366f1', // indigo-500
];

/**
 * Flow complexity rating colors
 */
export const complexityRatingColors = {
    low: '#10b981',      // emerald-500
    moderate: '#f59e0b', // amber-500
    high: '#ef4444',     // rose-500
};

/**
 * Quality rating colors (A-E scale)
 */
export const qualityRatingColors = {
    A: 'bg-emerald-500 text-white',
    B: 'bg-lime-500 text-white',
    C: 'bg-amber-500 text-white',
    D: 'bg-orange-500 text-white',
    E: 'bg-rose-500 text-white',
    '-': 'bg-slate-300 dark:bg-slate-600 text-slate-600 dark:text-slate-300',
};

/**
 * Environment badge styles
 */
export const environmentStyles: Record<string, { bg: string; dot: string }> = {
    dev: { bg: 'bg-cyan-100 dark:bg-cyan-500/20 text-cyan-700 dark:text-cyan-400', dot: 'bg-emerald-500' },
    local: { bg: 'bg-slate-100 dark:bg-slate-600 text-slate-600 dark:text-slate-300', dot: 'bg-slate-400' },
    prod: { bg: 'bg-rose-100 dark:bg-rose-500/20 text-rose-700 dark:text-rose-400', dot: 'bg-rose-500' },
    qa: { bg: 'bg-violet-100 dark:bg-violet-500/20 text-violet-700 dark:text-violet-400', dot: 'bg-violet-500' },
    staging: { bg: 'bg-amber-100 dark:bg-amber-500/20 text-amber-700 dark:text-amber-400', dot: 'bg-amber-500' },
    uat: { bg: 'bg-indigo-100 dark:bg-indigo-500/20 text-indigo-700 dark:text-indigo-400', dot: 'bg-indigo-500' },
    test: { bg: 'bg-teal-100 dark:bg-teal-500/20 text-teal-700 dark:text-teal-400', dot: 'bg-teal-500' },
    sandbox: { bg: 'bg-orange-100 dark:bg-orange-500/20 text-orange-700 dark:text-orange-400', dot: 'bg-orange-500' },
};

/**
 * Security pattern badge styles
 */
export const securityStyles: Record<string, { bg: string; icon: string }> = {
    TLS: { bg: 'bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400', icon: '🔒' },
    OAuth: { bg: 'bg-violet-100 dark:bg-violet-500/20 text-violet-700 dark:text-violet-400', icon: '🔑' },
    'Secure Properties': { bg: 'bg-amber-100 dark:bg-amber-500/20 text-amber-700 dark:text-amber-400', icon: '🔐' },
    'Basic Auth': { bg: 'bg-sky-100 dark:bg-sky-500/20 text-sky-700 dark:text-sky-400', icon: '👤' },
};

/**
 * Default security style for unknown patterns
 */
export const defaultSecurityStyle = {
    bg: 'bg-slate-100 dark:bg-slate-600 text-slate-600 dark:text-slate-300',
    icon: '🛡️'
};

/**
 * Chart theme colors (dark mode aware)
 */
export const chartTheme = {
    light: {
        textColor: '#64748b',  // slate-500
        gridColor: '#e2e8f0',  // slate-200
    },
    dark: {
        textColor: '#94a3b8',  // slate-400
        gridColor: '#334155',  // slate-700
    },
};

/**
 * Common chart bar settings
 */
export const chartBarSettings = {
    borderRadius: 4,
    barThickness: {
        rules: 16,
        categories: 20,
        complexity: 18,
    },
};

/**
 * Accent color for primary chart elements
 */
export const accentColor = '#0ea5e9'; // sky-500
