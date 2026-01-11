/**
 * HTML Report Module Index
 * Re-exports all theme, styles, components, sections, and scripts
 */

// Theme
export { themeVariables, ratingColors } from './theme';

// Styles
export { baseStyles } from './styles/base.css';
export { componentStyles } from './styles/components.css';
export { tabulatorStyles } from './styles/tabulator.css';

// Components
export { modalHtml, modalScript, modalContent } from './components/Modal';
export { sidePanelHtml, sidePanelScript } from './components/SidePanel';
export { renderMetricCard } from './components/MetricCard';
export { renderRatingCard, ratingCards } from './components/RatingBadge';
export { icons } from './components/Icons';

// Sections
export { renderQualityRatingsSection, qualityRatingsRendererScript } from './sections/QualityRatings';
export { renderLintSummarySection, LintSummaryProps } from './sections/LintSummary';
export { renderHeader, HeaderProps } from './sections/Header';
export { renderSidebar, SidebarProps } from './sections/Sidebar';

// Scripts (configuration exports)
export { connectorMeta, methodStyles, exchangeBaseUrl } from './scripts/renderer';
export { routerScript } from './scripts/router';
