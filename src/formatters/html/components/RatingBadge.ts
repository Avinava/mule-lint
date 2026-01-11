/**
 * Rating Badge Component
 * A-E colored badge with info button
 */

export interface RatingBadgeProps {
    id: string;
    label: string;
    type: 'complexity' | 'maintainability' | 'reliability' | 'security';
    color: string;
    valueId: string;
    valueLabel: string;
}

export function renderRatingCard(props: RatingBadgeProps): string {
    // Map rating type to category filter for issues navigation
    // Note: complexity is a flow metric (not based on violations), so show all issues
    // Maintainability shows all issues since it's calculated from debt ratio
    const categoryMap: Record<string, string> = {
        complexity: '',               // Complexity is metrics-based, show all issues
        maintainability: '',           // All issues affect maintainability (show all)
        reliability: 'error-handling', // Bug-type issues come from error-handling rules
        security: 'security'           // Security category
    };
    const category = categoryMap[props.type] || '';

    // Use navigate('issues') for no filter, toggleCategory for actual filtering
    const clickAction = category
        ? `router.toggleCategory('${category}')`
        : `router.navigate('issues')`;

    return `
    <div class="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 p-3 cursor-pointer hover:shadow-lg hover:border-${props.color}-300 dark:hover:border-${props.color}-600 transition-all" onclick="${clickAction}">
        <div class="flex items-center justify-between mb-1">
            <div class="flex items-center gap-1">
                <span class="text-2xs font-semibold text-${props.color}-600 dark:text-${props.color}-400 uppercase tracking-wider">${props.label}</span>
                <span class="info-btn" title="Click for details" onclick="event.stopPropagation(); modal.open('${props.type}')">?</span>
            </div>
            <div id="${props.id}" class="w-8 h-8 rounded-lg flex items-center justify-center text-lg font-bold bg-slate-200 dark:bg-slate-600 text-slate-500 dark:text-slate-400">-</div>
        </div>
        <div id="${props.valueId}" class="text-sm text-slate-500 dark:text-slate-400">-</div>
        <div class="text-2xs text-slate-400 dark:text-slate-500 mt-0.5">${props.valueLabel}</div>
    </div>
    `;
}


export const ratingCards = {
    complexity: {
        id: 'rating-complexity',
        label: 'Complexity',
        type: 'complexity' as const,
        color: 'purple',
        valueId: 'complexity-avg',
        valueLabel: 'Avg flow complexity'
    },
    maintainability: {
        id: 'rating-maintainability',
        label: 'Maintainability',
        type: 'maintainability' as const,
        color: 'emerald',
        valueId: 'tech-debt',
        valueLabel: 'Technical debt'
    },
    reliability: {
        id: 'rating-reliability',
        label: 'Reliability',
        type: 'reliability' as const,
        color: 'blue',
        valueId: 'bug-count',
        valueLabel: 'Bug issues found'
    },
    security: {
        id: 'rating-security',
        label: 'Security',
        type: 'security' as const,
        color: 'rose',
        valueId: 'vuln-count',
        valueLabel: 'Vulnerabilities'
    }
};
