import type { ClientIssue, ClientReport } from '../reportData';
import type { ProjectMetrics } from '../../../types/Report';
export interface IssueTable {
  getHeaderFilters(): unknown[];
  getDataCount(range: 'active'): number;
  getData(range: 'active'): ClientIssue[];
  clearFilter(header: boolean): void;
  setFilter(predicate: (issue: ClientIssue) => boolean): void;
  redraw(): void;
}
export interface Filters {
  severities: string[];
  categories: string[];
  searchTerm: string;
}
export interface Router {
  currentView: string;
  issueTypes: string[];
  navigate(view: string): void;
  hasActiveFilters(): boolean;
  matches(issue: ClientIssue): boolean;
  toggleSeverity(severity: string): void;
  toggleCategory(category: string): void;
  showSeverity(severity: string): void;
  showIssueType(type: string): void;
  applyFilters(): void;
  sync(count?: number): void;
  updateSidebar(): void;
  clearAllFilters(): void;
  setSearchTerm(term: string): void;
}
export interface ReportUi {
  location(
    issue: Pick<ClientIssue, 'fileName'> &
      Partial<Pick<ClientIssue, 'line' | 'column' | 'location'>>,
  ): string;
  emptyMessage(): string;
  updateEmpty(count: number): void;
  renderExecution(): void;
  renderFallback(): void;
  csv(issues: readonly Partial<ClientIssue>[]): string;
  downloadCsv(): void;
  closeSidebar(): void;
  init(): void;
}
export interface DialogFocus {
  active: HTMLElement | null;
  opener: HTMLElement | null;
  open(el: HTMLElement, opener?: HTMLElement | null): void;
  close(el: HTMLElement): void;
  init(): void;
}
export interface Modal {
  init(): void;
  open(type: string): void;
  close(): void;
}
export interface Sidepanel {
  init(): void;
  open(title: string, content: string, opener?: HTMLElement | null): void;
  close(): void;
}
export interface Renderer {
  init(): void;
  renderMetrics(): void;
  renderQualityRatings(metrics: ProjectMetrics): void;
  renderSidebar(): void;
  renderCharts(): void;
  initTable(): void;
  openIssue(issue: ClientIssue, opener?: HTMLElement | null): void;
  initTheme(): void;
  initKeyboardShortcuts(): void;
}
export interface ReportRuntime {
  report: ClientReport;
  allIssues: ClientIssue[];
  filters: Filters;
  table: IssueTable | null;
  router: Router;
  ui: ReportUi;
  focus: DialogFocus;
  modal: Modal;
  sidepanel: Sidepanel;
  renderer: Renderer;
}
