import { formatHtml } from '../../src/formatters/HtmlFormatter';
import fixture from '../fixtures/reports/html-characterization.json';
import type { LintReport } from '../../src/types/Report';
describe('Redesigned report rendering', () => {
  it('renders five views, a native dialog, real scan status and offline assets', () => {
    const html = formatHtml(fixture as LintReport, []);
    for (const view of ['overview', 'findings', 'files', 'rules', 'architecture'])
      expect(html.includes(`data-view="${view}"`)).toBe(true);
    expect(html.includes('data-status="incomplete"')).toBe(true);
    expect(html.includes('<dialog id="finding-dialog"')).toBe(true);
    expect(html.includes("font-family:'Geist'")).toBe(true);
    expect(html.includes('Ready to ship')).toBe(false);
  });
  it('preserves a readable summary and diagnostics before scripts initialize', () => {
    const html = formatHtml(fixture as LintReport, []).replace(/<script[\s\S]*?<\/script>/g, '');
    expect(html).toContain('Enable JavaScript');
    expect(html).toContain('broken.xml');
  });
});
