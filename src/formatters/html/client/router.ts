import type { ReportRuntime, Router } from './types';
import { element, input } from './dom';
export function createRouter(context: ReportRuntime): Router {
  const result: Router = {
    currentView: 'dashboard',
    issueTypes: [],
    navigate(view) {
      this.currentView = view;
      element('view-dashboard').classList.toggle('hidden', view !== 'dashboard');
      element('view-issues').classList.toggle('hidden', view !== 'issues');
      document.querySelectorAll<HTMLElement>('.nav-tab').forEach((tab) => {
        const active = tab.id === 'nav-' + view;
        tab.classList.toggle('active', active);
        tab.setAttribute('aria-current', active ? 'page' : 'false');
      });
      this.updateSidebar();
      context.ui.closeSidebar();
      if (view === 'issues' && context.table) context.table.redraw();
    },
    hasActiveFilters() {
      return (
        context.filters.severities.length > 0 ||
        context.filters.categories.length > 0 ||
        this.issueTypes.length > 0 ||
        Boolean(context.filters.searchTerm) ||
        Boolean(context.table && context.table.getHeaderFilters().length)
      );
    },
    matches(data) {
      if (context.filters.severities.length && !context.filters.severities.includes(data.severity))
        return false;
      if (context.filters.categories.length && !context.filters.categories.includes(data.category))
        return false;
      if (this.issueTypes.length && !this.issueTypes.includes(data.issueType)) return false;
      const term = context.filters.searchTerm.toLowerCase();
      return (
        !term ||
        [data.message, data.fileName, data.ruleName, data.ruleId, data.category].some((value) =>
          (value || '').toLowerCase().includes(term),
        )
      );
    },
    toggleSeverity(severity) {
      const idx = context.filters.severities.indexOf(severity);
      if (idx >= 0) context.filters.severities.splice(idx, 1);
      else context.filters.severities.push(severity);
      this.navigate('issues');
      this.applyFilters();
    },
    toggleCategory(category) {
      const idx = context.filters.categories.indexOf(category);
      if (idx >= 0) context.filters.categories.splice(idx, 1);
      else context.filters.categories.push(category);
      this.navigate('issues');
      this.applyFilters();
    },
    showSeverity(severity) {
      this.clearAllFilters();
      context.filters.severities = [severity];
      this.navigate('issues');
      this.applyFilters();
    },
    showIssueType(type) {
      this.clearAllFilters();
      this.issueTypes = type ? [type] : [];
      this.navigate('issues');
      this.applyFilters();
    },
    applyFilters() {
      if (context.table) context.table.setFilter((data) => this.matches(data));
      else context.ui.renderFallback();
      this.sync();
    },
    sync(filteredCount) {
      const count =
        typeof filteredCount === 'number'
          ? filteredCount
          : context.table
            ? context.table.getDataCount('active')
            : context.allIssues.filter((i) => this.matches(i)).length;
      element('filtered-count').textContent = String(count);
      this.updateSidebar();
      context.ui.updateEmpty(count);
    },
    updateSidebar() {
      document.querySelectorAll<HTMLElement>('[data-filter-severity]').forEach((el) => {
        const active = context.filters.severities.includes(el.dataset.filterSeverity ?? '');
        el.classList.toggle('active', active);
        el.setAttribute('aria-current', active ? 'true' : 'false');
      });
      document.querySelectorAll<HTMLElement>('[data-filter-category]').forEach((el) => {
        const active = context.filters.categories.includes(el.dataset.filterCategory ?? '');
        el.classList.toggle('active', active);
        el.setAttribute('aria-current', active ? 'true' : 'false');
      });
      const active = this.hasActiveFilters();
      element('sidebar-reset').classList.toggle('hidden', !active);
      element('clear-filters-btn').classList.toggle('hidden', !active);
      element('active-filter-description').textContent = this.issueTypes.length
        ? 'Type: ' + this.issueTypes.join(', ')
        : '';
      document.querySelectorAll<HTMLElement>('.sidebar-link[data-view]').forEach((link) => {
        link.classList.toggle(
          'active',
          link.dataset.view === this.currentView && (this.currentView !== 'issues' || !active),
        );
      });
    },
    clearAllFilters() {
      context.filters.severities = [];
      context.filters.categories = [];
      context.filters.searchTerm = '';
      this.issueTypes = [];
      input('global-search').value = '';
      if (context.table) context.table.clearFilter(true);
      else context.ui.renderFallback();
      this.sync();
    },
    setSearchTerm(term) {
      context.filters.searchTerm = term;
      if (term && this.currentView !== 'issues') this.navigate('issues');
      this.applyFilters();
    },
  };
  return result;
}
