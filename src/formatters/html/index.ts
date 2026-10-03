/**
 * HTML Report Module Index
 * Re-exports all theme, styles, components, sections, scripts, and views
 */

// Theme
export { themeVariables, ratingColors } from './theme';

// Styles
export { baseStyles } from './styles/base.css';
export { componentStyles } from './styles/components.css';
export { tabulatorStyles } from './styles/tabulator.css';

// Components
export { modalHtml, modalContent } from './components/Modal';
export { sidePanelHtml } from './components/SidePanel';
export { renderMetricCard } from './components/MetricCard';
export { renderRatingCard, ratingCards } from './components/RatingBadge';
export { icons } from './components/Icons';

// Sections
export { renderQualityRatingsSection } from './sections/QualityRatings';
export { renderLintSummarySection, LintSummaryProps } from './sections/LintSummary';
export { renderHeader, HeaderProps } from './sections/Header';
export { renderSidebar, SidebarProps } from './sections/Sidebar';

// Views
export { renderDashboardView, DashboardViewProps } from './views/Dashboard';
export { renderIssuesView, IssuesViewProps } from './views/IssuesView';
