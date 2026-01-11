/**
 * Router Script
 * Navigation and filter management for the report
 * 
 * NOTE: The actual router implementation is inline in HtmlFormatter.ts
 * since it requires access to DOM and tableInstance. This file exports
 * the router script template string for documentation purposes.
 */

export const routerScript = `
const router = {
    currentView: 'dashboard',
    
    navigate(view) {
        this.currentView = view;
        
        // Toggle views
        document.getElementById('view-dashboard').classList.toggle('hidden', view !== 'dashboard');
        document.getElementById('view-issues').classList.toggle('hidden', view !== 'issues');
        
        // Update header tabs
        document.querySelectorAll('.nav-tab').forEach(tab => {
            tab.classList.toggle('active', tab.id === 'nav-' + view);
        });
        
        // Update sidebar nav links
        document.querySelectorAll('.sidebar-link[data-view]').forEach(link => {
            const shouldBeActive = link.dataset.view === view && 
                (view !== 'issues' || !this.hasActiveFilters());
            link.classList.toggle('active', shouldBeActive);
        });
        
        if (view === 'issues' && tableInstance) {
            tableInstance.redraw();
        }
    },
    
    hasActiveFilters() {
        return filterState.severities.length > 0 || filterState.categories.length > 0;
    },
    
    toggleSeverity(severity) {
        const idx = filterState.severities.indexOf(severity);
        if (idx >= 0) {
            filterState.severities.splice(idx, 1);
        } else {
            filterState.severities.push(severity);
        }
        this.navigate('issues');
        this.applyFilters();
        this.updateSidebar();
    },
    
    toggleCategory(category) {
        const idx = filterState.categories.indexOf(category);
        if (idx >= 0) {
            filterState.categories.splice(idx, 1);
        } else {
            filterState.categories.push(category);
        }
        this.navigate('issues');
        this.applyFilters();
        this.updateSidebar();
    },
    
    applyFilters() {
        if (!tableInstance) return;
        
        tableInstance.setFilter((data) => {
            if (filterState.severities.length > 0 && !filterState.severities.includes(data.severity)) {
                return false;
            }
            if (filterState.categories.length > 0 && !filterState.categories.includes(data.category)) {
                return false;
            }
            if (filterState.searchTerm) {
                const term = filterState.searchTerm.toLowerCase();
                return data.message.toLowerCase().includes(term) ||
                       data.fileName.toLowerCase().includes(term) ||
                       data.ruleName.toLowerCase().includes(term) ||
                       data.ruleId.toLowerCase().includes(term) ||
                       data.category.toLowerCase().includes(term);
            }
            return true;
        });
        
        const visibleRows = tableInstance.getDataCount('active');
        document.getElementById('filtered-count').textContent = visibleRows;
    },
    
    updateSidebar() {
        document.querySelectorAll('[data-filter-severity]').forEach(el => {
            el.classList.toggle('active', filterState.severities.includes(el.dataset.filterSeverity));
        });
        
        document.querySelectorAll('[data-filter-category]').forEach(el => {
            el.classList.toggle('active', filterState.categories.includes(el.dataset.filterCategory));
        });
        
        const hasFilters = this.hasActiveFilters();
        document.getElementById('sidebar-reset').classList.toggle('hidden', !hasFilters);
        document.getElementById('clear-filters-btn').classList.toggle('hidden', !hasFilters);
        
        const allIssuesLink = document.querySelector('.sidebar-link[data-view="issues"]');
        if (allIssuesLink && this.currentView === 'issues') {
            allIssuesLink.classList.toggle('active', !hasFilters);
        }
    },
    
    clearAllFilters() {
        filterState.severities = [];
        filterState.categories = [];
        filterState.searchTerm = '';
        document.getElementById('global-search').value = '';
        
        if (tableInstance) {
            tableInstance.clearFilter();
            document.getElementById('filtered-count').textContent = totalIssues;
        }
        this.updateSidebar();
        
        const allIssuesLink = document.querySelector('.sidebar-link[data-view="issues"]');
        if (allIssuesLink && this.currentView === 'issues') {
            allIssuesLink.classList.add('active');
        }
    },
    
    setSearchTerm(term) {
        filterState.searchTerm = term;
        this.navigate('issues');
        this.applyFilters();
    }
};
`;
