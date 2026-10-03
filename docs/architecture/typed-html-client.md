# Typed, self-contained HTML reports

Status: accepted and implemented.

## Context

The report currently assembles executable JavaScript inside TypeScript strings. The
compiler cannot validate those scripts, and CDN-hosted scripts, fonts, styles and
connector images make the single HTML file depend on a network connection.
Existing dashboard styling, issues-table behavior, finding identities, execution
status, CSV escaping, dialogs and mobile navigation are compatibility requirements.

## Decision

- Keep server-rendered HTML and the existing visual components. Use no UI framework.
- Move executable behavior into strict browser TypeScript modules. Share the typed
  report projection with the formatter through type-only imports.
- Bundle the browser entry point, the existing Chart.js and Tabulator versions,
  compiled Tailwind utilities, table CSS and fonts during the package build.
  Embed those generated assets in the HTML; do not load runtime CDN resources.
- Keep connector documentation links as ordinary user-initiated links. Use the
  existing local connector fallback icon so loading a report makes no icon requests.
- Keep generated assets out of source control. Source tests and type checking build
  them explicitly; package builds copy them into the published formatter directory.
- Characterize stable report data and DOM hooks before extraction. Test filters,
  diagnostics, CSV and focus directly as browser modules; retain generated-script
  syntax checks and add offline-resource checks. Browser QA supplements these tests.

## Consequences

Reports are larger but portable and usable without internet access. The build adds
pinned browser-only development dependencies and carries their license notices in
the report/package. The CLI/library report APIs and rule semantics are unchanged.
Generated bundles are build outputs, never a second implementation to edit.

## Validation

Direct module tests cover filter composition and reset, active-row CSV escaping,
execution diagnostics, local connector icons, chart data and drill-down, table
adapters, theme controls, mobile navigation, dialog focus and component failure
fallbacks. The client is included in the repository's strict lint/type checks and
coverage thresholds. The generated bundle also receives a JavaScript syntax check.

Browser regression was verified with an official Chromium headless-shell build,
using a disposable profile, local synthetic HTML files and offline mode. The matrix
covers complete-empty, no-files, parse-incomplete and 5,000-finding reports; desktop
and mobile layouts; both themes; repeated search/reset; header filtering and visible
CSV download; repeated dialogs, Tab/Shift+Tab containment and Escape focus return.
No HTTP(S) requests or browser console/page errors occurred. Documentation screenshots
come from the public sample project at 1440×900.

### Repeat the browser matrix

```bash
npm run test:browser
```

This separate platform-dependent check builds the package, opens only local public
or synthetic reports, disables network access, and verifies the matrix above. It
uses pinned development-only Puppeteer Core and an official Chromium headless-shell
build on Linux x64. It does not change the package's runtime dependencies or
disable browser sandbox/web-security controls.

On another supported browser platform, supply your official Chrome/Chromium binary:

```bash
npm run test:browser -- --executable-path=/path/to/chrome
```

Optionally keep screenshots with `--artifacts=/tmp/mule-report-screenshots`. Reports, isolated browser extraction
and disposable browser profiles are removed after the run. If the platform cannot
launch its browser securely, the command fails with an actionable message rather
than bypassing the restriction. Unit tests, strict type checks and generated-script
syntax checks remain available without a browser.

The browser toolchain requires Node.js 22.17+ or 24+; this development-only requirement
does not change the published CLI's Node.js 20+ contract. The bundled npm Chromium
package contains x64 binaries. Other architectures, macOS and Windows must supply a
compatible official browser executable. The host must provide that browser's normal
shared-library prerequisites, permit browser child processes and local-file access,
and provide writable temporary storage for the extracted browser and disposable
profile. The bundled browser upstream recommends at least 512 MB RAM (1.6 GB preferred).
The CI browser job uses Node.js 22 LTS and the runner image's installed official
Chrome via `MULE_LINT_BROWSER_EXECUTABLE`, retaining its normal sandbox support.
The pinned headless-shell fallback remains available for compatible local Linux
environments; restricted containers may
still block secure browser launch and should report that limitation explicitly.

### CSS compiler compatibility

The report uses Tailwind CSS 4 with an explicit source list and safelist. Its
stylesheet preserves the previous report typography, palette, rounded corners and
shadow sizes. Compiled layers are flattened to preserve the existing unlayered
component cascade; browser checks guard utility spacing against reset overrides. Changes to TypeScript or CSS rebuild the generated assets. The
compiler and runtime glob library no longer depend on the vulnerable `braces`
package. Both production and complete dependency trees remain audited.

Reports require Chrome 111+, Safari 16.4+, or Firefox 128+, matching the CSS
compiler's documented browser support. This changes the HTML viewer requirement,
not the Node.js CLI requirement. Browser qualification checks computed design
tokens as well as interactions and responsive layouts.
