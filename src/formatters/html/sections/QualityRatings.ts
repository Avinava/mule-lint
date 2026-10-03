/**
 * Quality Estimates Section
 * A-E ratings for complexity, maintainability, reliability, security
 */

import { renderRatingCard, ratingCards } from '../components/RatingBadge';

export function renderQualityRatingsSection(): string {
  return `
    <div id="quality-ratings" class="mb-6" style="display: none;">
        <div class="mb-3">
            <h3 class="text-sm font-semibold text-slate-700 dark:text-slate-200">
                Quality Estimates
                <span class="ml-2 px-1.5 py-0.5 text-2xs font-bold text-amber-600 dark:text-amber-400 bg-amber-100 dark:bg-amber-500/20 rounded uppercase tracking-wide">Beta</span>
            </h3>
            <p class="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Heuristic estimates for this scan (A=best, E=worst), not a release or security guarantee. Open a label to review findings; ? explains the calculation.</p>
        </div>
        <div class="summary-grid grid grid-cols-4 gap-3">
            ${renderRatingCard(ratingCards.complexity)}
            ${renderRatingCard(ratingCards.maintainability)}
            ${renderRatingCard(ratingCards.reliability)}
            ${renderRatingCard(ratingCards.security)}
        </div>
    </div>
    `;
}
