/**
 * Centralized Badge/Pill Styles
 * Single source of truth for consistent styling across the report
 */

/**
 * Severity badge styles (for issues table)
 */
export const severityBadgeStyles = {
    error: 'bg-rose-100 text-rose-700 dark:bg-rose-500/20 dark:text-rose-400',
    warning: 'bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-400',
    info: 'bg-sky-100 text-sky-700 dark:bg-sky-500/20 dark:text-sky-400',
};

/**
 * Issue type badge styles
 */
export const issueTypeBadgeStyles = {
    'code-smell': {
        bg: 'bg-orange-100 dark:bg-orange-500/20',
        text: 'text-orange-700 dark:text-orange-400',
        label: 'Code Smell',
    },
    bug: {
        bg: 'bg-rose-100 dark:bg-rose-500/20',
        text: 'text-rose-700 dark:text-rose-400',
        label: 'Bug',
    },
    vulnerability: {
        bg: 'bg-purple-100 dark:bg-purple-500/20',
        text: 'text-purple-700 dark:text-purple-400',
        label: 'Vulnerability',
    },
};

/**
 * HTTP method badge styles
 */
export const methodBadgeStyles: Record<string, { bg: string; text: string; dot: string }> = {
    GET: {
        bg: 'bg-emerald-100 dark:bg-emerald-500/20',
        text: 'text-emerald-700 dark:text-emerald-400',
        dot: 'bg-emerald-500',
    },
    POST: {
        bg: 'bg-sky-100 dark:bg-sky-500/20',
        text: 'text-sky-700 dark:text-sky-400',
        dot: 'bg-sky-500',
    },
    PUT: {
        bg: 'bg-amber-100 dark:bg-amber-500/20',
        text: 'text-amber-700 dark:text-amber-400',
        dot: 'bg-amber-500',
    },
    PATCH: {
        bg: 'bg-violet-100 dark:bg-violet-500/20',
        text: 'text-violet-700 dark:text-violet-400',
        dot: 'bg-violet-500',
    },
    DELETE: {
        bg: 'bg-rose-100 dark:bg-rose-500/20',
        text: 'text-rose-700 dark:text-rose-400',
        dot: 'bg-rose-500',
    },
    OPTIONS: {
        bg: 'bg-slate-100 dark:bg-slate-600',
        text: 'text-slate-600 dark:text-slate-300',
        dot: 'bg-slate-400',
    },
    HEAD: {
        bg: 'bg-slate-100 dark:bg-slate-600',
        text: 'text-slate-600 dark:text-slate-300',
        dot: 'bg-slate-400',
    },
    ALL: {
        bg: 'bg-indigo-100 dark:bg-indigo-500/20',
        text: 'text-indigo-700 dark:text-indigo-400',
        dot: 'bg-indigo-500',
    },
};

/**
 * Category badge colors (cycling palette for charts)
 */
export const categoryBadgeColors = [
    'bg-sky-100 text-sky-700 dark:bg-sky-500/20 dark:text-sky-400',
    'bg-violet-100 text-violet-700 dark:bg-violet-500/20 dark:text-violet-400',
    'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400',
    'bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-400',
    'bg-rose-100 text-rose-700 dark:bg-rose-500/20 dark:text-rose-400',
    'bg-pink-100 text-pink-700 dark:bg-pink-500/20 dark:text-pink-400',
    'bg-cyan-100 text-cyan-700 dark:bg-cyan-500/20 dark:text-cyan-400',
    'bg-lime-100 text-lime-700 dark:bg-lime-500/20 dark:text-lime-400',
];

/**
 * Generic count badge (for totals)
 */
export const countBadgeStyle =
    'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200';
