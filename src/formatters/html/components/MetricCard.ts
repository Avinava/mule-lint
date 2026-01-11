/**
 * Metric Card Component
 * Reusable KPI card template
 */

export interface MetricCardProps {
    id: string;
    label: string;
    value: string | number;
    sublabel: string;
    color: string;
    icon?: string;
    onClick?: string;
}

export function renderMetricCard(props: MetricCardProps): string {
    const clickAttr = props.onClick ? `onclick="${props.onClick}" class="cursor-pointer hover:shadow-lg hover:border-${props.color}-300 dark:hover:border-${props.color}-600 transition-all"` : '';

    return `
    <div class="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 p-3 ${props.onClick ? 'cursor-pointer hover:shadow-lg transition-all' : ''}" ${props.onClick ? `onclick="${props.onClick}"` : ''}>
        <div class="flex items-center justify-between mb-1">
            <span class="text-2xs font-semibold text-${props.color}-600 dark:text-${props.color}-400 uppercase tracking-wider">${props.label}</span>
            ${props.icon || ''}
        </div>
        <div id="${props.id}" class="text-xl font-bold text-${props.color}-600 dark:text-${props.color}-400">${props.value}</div>
        <div class="text-2xs text-slate-400 dark:text-slate-500 mt-0.5">${props.sublabel}</div>
    </div>
    `;
}
