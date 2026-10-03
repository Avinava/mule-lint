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
  const type =
    props.type === 'reliability' ? 'bug' : props.type === 'security' ? 'vulnerability' : '';
  const actionAttribute =
    props.type === 'complexity' ? 'data-modal="complexity"' : `data-issue-type="${type}"`;

  return `
    <div class="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 p-3 cursor-pointer hover:shadow-lg hover:border-${props.color}-300 dark:hover:border-${props.color}-600 transition-all rating-card">
        <div class="flex items-center justify-between mb-1">
            <div class="flex items-center gap-1">
                <button type="button" ${actionAttribute} class="rating-action text-2xs font-semibold text-${props.color}-600 dark:text-${props.color}-400 uppercase tracking-wider">${props.label}</button>
                <button type="button" class="info-btn" aria-label="About ${props.label}" data-modal="${props.type}">?</button>
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
    valueLabel: 'Avg flow complexity',
  },
  maintainability: {
    id: 'rating-maintainability',
    label: 'Maintainability',
    type: 'maintainability' as const,
    color: 'emerald',
    valueId: 'tech-debt',
    valueLabel: 'Estimated remediation effort',
  },
  reliability: {
    id: 'rating-reliability',
    label: 'Reliability',
    type: 'reliability' as const,
    color: 'blue',
    valueId: 'bug-count',
    valueLabel: 'Bug issues found',
  },
  security: {
    id: 'rating-security',
    label: 'Security',
    type: 'security' as const,
    color: 'rose',
    valueId: 'vuln-count',
    valueLabel: 'Vulnerabilities',
  },
};
