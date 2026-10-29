/** Shared report icon geometry and category labels; no runtime image requests. */
const paths: Record<string, string> = {
  coverage: 'M3 2h10v12H3zM5 5l1 1 2-2M9.5 5H11M5 9l1 1 2-2M9.5 9H11',
  duplication: 'M6 5h7v9H6zM3 11H2V2h8v1',
  overview: 'M2.5 2.5H7V7H2.5zM9 2.5h4.5V7H9zM2.5 9H7v4.5H2.5zM9 9h4.5v4.5H9z',
  findings: 'M5.5 4h8M5.5 8h8M5.5 12h8M2.5 4h.01M2.5 8h.01M2.5 12h.01',
  files: 'M4 1.5h5l3.5 3.5v9.5H4zM9 1.5V5h3.5',
  rules: 'M3 2.5h7.5a2 2 0 0 1 2 2v9H5a2 2 0 0 1-2-2zM3 11.5a2 2 0 0 1 2-2h7.5',
  architecture:
    'M8 2.5a1.5 1.5 0 1 0 0 3 1.5 1.5 0 0 0 0-3ZM3.5 10.5a1.5 1.5 0 1 0 0 3 1.5 1.5 0 0 0 0-3ZM12.5 10.5a1.5 1.5 0 1 0 0 3 1.5 1.5 0 0 0 0-3ZM8 5.5v3l-3.5 2M8 8.5l3.5 2',
  project: 'M8 1.5 14 4.75v6.5L8 14.5 2 11.25v-6.5zM2 4.75 8 8l6-3.25M8 8v6.5',
  clock: 'M8 1.75a6.25 6.25 0 1 0 0 12.5A6.25 6.25 0 0 0 8 1.75ZM8 4.5V8l2.5 1.5',
  bolt: 'M9 1.5 3.5 9H8l-1 5.5L12.5 7H8z',
  layers: 'M8 2 1.5 5.5 8 9l6.5-3.5zM1.5 9 8 12.5 14.5 9',
  download: 'M8 2v8.5M4.5 7 8 10.5 11.5 7M2.5 13.5h11',
  moon: 'M13.5 9.5A6 6 0 0 1 6.5 2.5a6 6 0 1 0 7 7Z',
  sun: 'M11 8a3 3 0 1 0-6 0 3 3 0 0 0 6 0ZM8 1v1.5M8 13.5V15M1 8h1.5M13.5 8H15M3 3l1 1M12 12l1 1M3 13l1-1M12 4l1-1',
  github:
    'M5 2v8M11 2v3a3 3 0 0 1-3 3H5M5 10a2 2 0 1 0 0 4 2 2 0 0 0 0-4ZM11 2a1.5 1.5 0 1 0 0 3 1.5 1.5 0 0 0 0-3Z',
  chevron: 'm5 3 5 5-5 5',
  up: 'm4 9 4-4 4 4M8 5v8',
  down: 'm4 7 4 4 4-4M8 3v8',
  close: 'm4 4 8 8M12 4l-8 8',
  copy: 'M6 5h7v9H6zM3 11H2V2h8v1',
  external: 'M6 3H3v10h10v-3M9 2h5v5M14 2 7 9',
  location:
    'M8 14s4.5-4 4.5-8a4.5 4.5 0 0 0-9 0C3.5 10 8 14 8 14ZM9.5 6a1.5 1.5 0 1 0-3 0 1.5 1.5 0 0 0 3 0',
};
export function icon(name: string): string {
  return `<svg class="icon" width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${paths[name] ?? paths.files}"/></svg>`;
}
export function severityIcon(severity: string): string {
  const path =
    severity === 'error'
      ? 'M7 .8 13.2 7 7 13.2.8 7Z'
      : severity === 'warning'
        ? 'M7 1.4 13.2 12.6H.8Z'
        : 'M7 1.8a5.2 5.2 0 1 1 0 10.4A5.2 5.2 0 0 1 7 1.8Z';
  const tone = severity === 'error' ? 'error' : severity === 'warning' ? 'warning' : 'info';
  return `<svg class="severity ${tone}" width="14" height="14" viewBox="0 0 14 14" aria-hidden="true"><path fill="currentColor" d="${path}"/></svg>`;
}
const categories: Record<string, [string, string]> = {
  'error-handling': ['EH', 'Error handling'],
  security: ['SC', 'Security'],
  'api-led': ['AP', 'API-led'],
  logging: ['LG', 'Logging'],
  standards: ['ST', 'Standards'],
  http: ['HT', 'HTTP'],
  documentation: ['DC', 'Documentation'],
  performance: ['PF', 'Performance'],
  complexity: ['CX', 'Complexity'],
  structure: ['SR', 'Structure'],
  dataweave: ['DW', 'DataWeave'],
  testing: ['TS', 'Testing'],
  operations: ['OP', 'Operations'],
  governance: ['GV', 'Governance'],
  naming: ['NM', 'Naming'],
};
export function categoryMeta(category: string): [string, string] {
  return categories[category] ?? ['··', category];
}
