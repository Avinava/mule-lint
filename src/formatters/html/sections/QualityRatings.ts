/**
 * Quality Ratings Section
 * A-E ratings for complexity, maintainability, reliability, security
 */

import { renderRatingCard, ratingCards } from '../components/RatingBadge';

export function renderQualityRatingsSection(): string {
    return `
    <div id="quality-ratings" class="mb-6" style="display: none;">
        <div class="mb-3">
            <h3 class="text-sm font-semibold text-slate-700 dark:text-slate-200">
                Quality Ratings 
                <span class="ml-2 px-1.5 py-0.5 text-2xs font-bold text-amber-600 dark:text-amber-400 bg-amber-100 dark:bg-amber-500/20 rounded uppercase tracking-wide">Beta</span>
            </h3>
            <p class="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Overall code quality assessment (A=best, E=worst). Click ? for calculation details.</p>
        </div>
        <div class="grid grid-cols-4 gap-3">
            ${renderRatingCard(ratingCards.complexity)}
            ${renderRatingCard(ratingCards.maintainability)}
            ${renderRatingCard(ratingCards.reliability)}
            ${renderRatingCard(ratingCards.security)}
        </div>
    </div>
    `;
}

export const qualityRatingsRendererScript = `
renderQualityRatings(m) {
    const ratingColors = {
        'A': 'bg-emerald-500 text-white',
        'B': 'bg-lime-500 text-white',
        'C': 'bg-amber-500 text-white',
        'D': 'bg-orange-500 text-white',
        'E': 'bg-rose-500 text-white',
        '-': 'bg-slate-300 dark:bg-slate-600 text-slate-600 dark:text-slate-300'
    };
    
    const hasRatings = m.complexity || m.maintainability || m.reliability || m.security;
    
    if (hasRatings) {
        document.getElementById('quality-ratings').style.display = 'block';
        
        if (m.complexity) {
            const rating = m.complexity.rating || '-';
            const ratingEl = document.getElementById('rating-complexity');
            ratingEl.textContent = rating;
            ratingEl.className = 'w-8 h-8 rounded-lg flex items-center justify-center text-lg font-bold ' + (ratingColors[rating] || ratingColors['-']);
            document.getElementById('complexity-avg').textContent = 'Avg: ' + (m.complexity.average || 0);
        }
        
        if (m.maintainability) {
            const rating = m.maintainability.rating || '-';
            const ratingEl = document.getElementById('rating-maintainability');
            ratingEl.textContent = rating;
            ratingEl.className = 'w-8 h-8 rounded-lg flex items-center justify-center text-lg font-bold ' + (ratingColors[rating] || ratingColors['-']);
            document.getElementById('tech-debt').textContent = m.maintainability.technicalDebt || '0min';
        }
        
        if (m.reliability) {
            const rating = m.reliability.rating || '-';
            const ratingEl = document.getElementById('rating-reliability');
            ratingEl.textContent = rating;
            ratingEl.className = 'w-8 h-8 rounded-lg flex items-center justify-center text-lg font-bold ' + (ratingColors[rating] || ratingColors['-']);
            document.getElementById('bug-count').textContent = (m.reliability.bugs || 0) + ' bugs';
        }
        
        if (m.security) {
            const rating = m.security.rating || '-';
            const ratingEl = document.getElementById('rating-security');
            ratingEl.textContent = rating;
            ratingEl.className = 'w-8 h-8 rounded-lg flex items-center justify-center text-lg font-bold ' + (ratingColors[rating] || ratingColors['-']);
            const vulns = (m.security.vulnerabilities || 0);
            const hotspots = (m.security.hotspots || 0);
            document.getElementById('vuln-count').textContent = vulns + ' vulns, ' + hotspots + ' hotspots';
        }
    }
}
`;
