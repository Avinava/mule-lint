# Typed, self-contained HTML reports

The HTML formatter embeds report data, native browser TypeScript, CSS, inline SVG,
and Geist fonts in one file. Opening the report requires no network access.
The CLI and library interfaces and automation report formats remain unchanged.

## Report structure

Overview presents the verdict, severity counts, prioritized findings, heuristic
quality grades, categories, and violated rules. Findings supports search, combined
filters, grouping by severity/file/rule/category, and filtered CSV export. Files
shows parse status and expandable findings; Rules describes the supplied rule
catalog; Architecture presents detected inventories and available metrics.

The finding drawer preserves locations, suggestions, source snippets, standards,
and documentation links. Native modal behavior provides keyboard focus containment;
Escape closes the drawer and returns focus. Previous/next and j/k follow the
originating result collection. Groups initially render 100 findings; filtering and
exports use the entire collection.

## Design system

`redesign.css` defines semantic light/dark tokens for surfaces, text, borders,
selection, teal accent, and severity. Use Geist for prose and Geist Mono for
identifiers and counts. Cards use 12px radii, subtle borders and shadows; the
1240px container uses 28px gutters and 20px section gaps. Below 768px, gutters
become 16px, paired panels stack, controls wrap, and the drawer fills the width.

Shared visual components include panels, numbered section headings, metric cards,
grade badges, finding rows, grouped headers, accordions, empty states, and metadata
lists. Interactive controls expose focus, pressed, selected, hover, and disabled
states. Reduced-motion preferences disable transitions. Severity includes text and
shape cues; color is supplementary.

## Data and states

`ReportContract` supplies finding identities, scan scope, selection, diagnostics,
and gate status. The HTML-only projection also carries evaluated gate conditions
and whether metrics were supplied. Scan completeness is independent of gate status.
Partial scans suppress grades. No-files, no-findings, no-filter-matches, and missing
metrics have distinct wording. Quiet and baseline selections remain visible.
Grades are heuristic estimates, not release approval.

Source content is escaped, JSON is safely embedded, documentation links are
validated, and CSV cells retain formula-injection protection. External links load
only when followed. Generated assets and sample HTML reports are not committed.
External design references are consultation material and must stay outside Git.

## Verification

Unit tests cover projection, escaping, filters, resets, large groups, drawer focus,
and unavailable data. The browser smoke check uses synthetic reports and the public
sample project to test five views, both themes, narrow layouts, offline resources,
console errors, keyboard focus, and 5,000 findings.

```bash
npm run test:browser
```

On macOS or Windows, set `MULE_LINT_BROWSER_EXECUTABLE` to an installed official
Chrome executable. Browser QA requires Node.js 22.17+ or 24+. Screenshots are generated
from `examples/sample-orders-system-api` at 1440×900.

## Section and value audit

| Section                | Source of displayed values                                                                            | Interpretation                                                                                                                                    |
| ---------------------- | ----------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| Header and tabs        | Package version, scan target/time/duration/profile, contract findings, supplied rules and file groups | Files tab includes the project-level group; scanned-file count does not. Missing Architecture metrics display a dash.                             |
| Verdict and severity   | Contract execution/gate plus actual finding counts                                                    | Unknown enabled-rule scope displays a dash. Estimates are suppressed for incomplete scans.                                                        |
| Fix first and patterns | Actual findings ordered by severity/type; category/rule aggregates                                    | List lengths are presentation limits, not total findings. Bar widths scale to the largest actual count.                                           |
| Grades                 | Supplied aggregated metrics; threshold explanations from `src/quality/thresholds.ts`                  | Grades are heuristic. Empty flow measurements do not imply an A complexity grade.                                                                 |
| Findings and export    | The same filtered findings and fingerprints                                                           | Group counts, drawer order, and CSV use the full collection, including rows behind “Show more.”                                                   |
| Files                  | Scan file results and actual finding locations                                                        | Worst files first, then findings in line order. File complexity is a flow-count size classification.                                              |
| Rules                  | Supplied rule catalog, enabled IDs and matching findings                                              | Category headings count findings from the currently displayed rules; category pills describe the supplied catalog.                                |
| Architecture           | Metrics collected from parsed XML, plus optional supplied coverage/duplication                        | Unavailable metrics are omitted from the payload rather than replaced by invented zeros. Partial-scan inventories are explicitly provisional.     |
| Drawer and footer      | Canonical finding fields; package metadata, project root and scan timestamp                           | No fabricated source locations, suggestions, standards or timestamps. The automation parse-error fallback line is omitted from the HTML location. |

The existing scoring model estimates remediation using 5 minutes per code smell,
15 minutes per bug and 30 minutes per vulnerability. Estimated development time is
10 minutes per flow and 5 per sub-flow, with a 60-minute minimum. These are policy
assumptions in `src/quality/calculator.ts`, not observed engineering effort. The
HTML displays the supplied estimate and debt ratio and labels them as heuristic;
it does not manufacture replacement grades or totals. The collector does not
currently measure security hotspots, so the report does not advertise its default
zero as a measured hotspot count.

Semantic color and shadow tokens match the approved design in both themes,
including the A–E palette. Major panels use 14px radii; list cards use 12px.
Typography, gutters, section spacing and drawer geometry use shared tokens.
Tests lock these values without requiring any external reference files.
The full-width footer is an explicit user-requested adjustment to the reference's
content-width footer. Coverage and duplication are additional existing data, not
placeholder values copied from the design prototype.
