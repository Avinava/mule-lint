import assert from 'node:assert/strict';
import { mkdtemp, readFile, writeFile, mkdir, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { spawnSync } from 'node:child_process';
import { formatHtml } from '../dist/src/formatters/HtmlFormatter.js';

const root = fileURLToPath(new URL('..', import.meta.url));
const argument = (name) =>
  process.argv.find((value) => value.startsWith(`--${name}=`))?.slice(name.length + 3);
const explicitBrowser = argument('executable-path') ?? process.env.MULE_LINT_BROWSER_EXECUTABLE;
const artifacts = argument('artifacts');
if (!explicitBrowser && (process.platform !== 'linux' || process.arch !== 'x64')) {
  throw new Error(
    'The bundled browser supports Linux x64. Supply --executable-path=/path/to/official/chrome on another platform.',
  );
}
const [nodeMajor, nodeMinor] = process.versions.node.split('.').map(Number);
if (!((nodeMajor === 22 && nodeMinor >= 17) || nodeMajor >= 24)) {
  throw new Error(
    'Browser QA requires Node.js 22.17+ or 24+. The published CLI runtime requirement is unchanged.',
  );
}
const temporary = await mkdtemp(path.join(tmpdir(), 'mule-report-browser-'));
const previousTmpdir = process.env.TMPDIR;
// Upstream executablePath/inflate use os.tmpdir(); isolate extraction before importing.
process.env.TMPDIR = temporary;
let browser;
try {
  const { default: puppeteer } = await import('puppeteer-core');
  const { default: chromium } = await import('@sparticuz/chromium');
  browser = await puppeteer.launch({
    executablePath: explicitBrowser ?? (await chromium.executablePath()),
    headless: explicitBrowser ? true : 'shell',
    pipe: true,
    // No sandbox or web-security relaxation. This flag only avoids small /dev/shm volumes.
    args: ['--disable-dev-shm-usage'],
    userDataDir: path.join(temporary, 'profile'),
  });
  const browserVersion = await browser.version();
  if (!explicitBrowser)
    assert.match(browserVersion, /\/149\./, 'Expected the pinned Chromium binary');
  console.log(`Browser: ${browserVersion}`);
  const base = {
    projectRoot: '/synthetic/browser-report',
    timestamp: '2026-01-01T00:00:00.000Z',
    durationMs: 1,
    files: [],
    summary: {
      totalFiles: 0,
      filesWithIssues: 0,
      parseErrors: 0,
      bySeverity: { error: 0, warning: 0, info: 0 },
      byRule: {},
    },
  };
  const clean = structuredClone(base);
  clean.files = [
    { filePath: '/synthetic/main.xml', relativePath: 'main.xml', parsed: true, issues: [] },
  ];
  clean.summary.totalFiles = 1;
  const broken = structuredClone(clean);
  broken.files[0].parsed = false;
  broken.files[0].parseError = 'Synthetic broken document';
  broken.summary.parseErrors = 1;
  const large = structuredClone(clean);
  large.files[0].issues = Array.from({ length: 5000 }, (_, index) => ({
    severity: ['error', 'warning', 'info'][index % 3],
    ruleId: `SYNTH-${index % 5}`,
    line: index + 1,
    column: 3,
    message: `Synthetic issue ${index}`,
    suggestion: 'Use a synthetic named flow',
    codeSnippet: '<flow name="example"/>',
  }));
  large.summary.filesWithIssues = 1;
  large.summary.bySeverity = { error: 1667, warning: 1667, info: 1666 };

  for (const [name, report] of Object.entries({ clean, nofiles: base, broken, large })) {
    const file = path.join(temporary, `${name}.html`);
    await writeFile(file, formatHtml(report, []));
    const { page, errors, requests } = await openOffline(file);
    await page.click('[data-view="findings"]');
    const expectedStatus =
      name === 'nofiles' ? 'no-files' : name === 'broken' ? 'incomplete' : 'complete';
    assert.equal(await page.$eval('.execution-status', (el) => el.dataset.status), expectedStatus);
    if (name === 'large') {
      assert.equal(await page.$$eval('.finding', (els) => els.length), 300);
      await page.type('#finding-search', 'Synthetic issue 10');
      assert.match(await page.$eval('#report-app', (el) => el.textContent), /111 of 5000/);
      await page.click('[data-action="reset"]');
      await page.click('.finding');
      assert.equal(await page.$eval('dialog', (el) => el.open), true);
      await checkDialogFocus(page, 'dialog');
      await page.keyboard.press('Escape');
      assert.equal(await page.$eval('dialog', (el) => el.open), false);
    }
    assert.deepEqual(errors, []);
    assert.deepEqual(requests, []);
    await page.close();
  }
  const sample = path.join(temporary, 'sample.html');
  const result = spawnSync(
    process.execPath,
    [
      path.join(root, 'dist/bin/mule-lint.js'),
      path.join(root, 'examples/sample-orders-system-api'),
      '--profile',
      'recommended',
      '--format',
      'html',
      '--output',
      sample,
    ],
    { cwd: root, encoding: 'utf8' },
  );
  assert.ok([0, 1].includes(result.status), `Sample report failed: ${result.stderr}`);
  const { page, errors, requests } = await openOffline(sample);
  for (const theme of ['light', 'dark']) {
    await page.evaluate((theme) => (document.documentElement.dataset.theme = theme), theme);
    for (const view of ['overview', 'findings', 'files', 'rules', 'architecture']) {
      await page.click(`[data-view="${view}"]`);
      await page.evaluate(() => window.scrollTo(0, 0));
      await verifyDisplayedValues(page, view);
      await capture(page, `${view}-${theme}`);
      if (view === 'overview' || view === 'architecture')
        await capture(page, `${view}-${theme}-full`, true);
      if (view === 'architecture' && artifacts) {
        const optional = await page.$('#report-app > .columns:last-child');
        if (optional)
          await optional.screenshot({
            path: path.join(artifacts, `optional-metrics-${theme}.png`),
          });
      }
      if (view === 'findings') {
        await page.click('.finding');
        await capture(page, `drawer-${theme}`);
        await page.keyboard.press('Escape');
      }
      assert.ok((await page.$eval('#report-app', (el) => el.textContent.length)) > 0);
    }
  }
  await page.$eval('footer', (el) => el.scrollIntoView({ block: 'end' }));
  assert.equal(await page.$eval('footer', (el) => el.getBoundingClientRect().width), 1440);
  await capture(page, 'footer-desktop');
  for (const width of [768, 390, 320]) {
    await page.setViewport({ width, height: 900 });
    for (const view of ['overview', 'findings', 'files', 'rules', 'architecture']) {
      await page.click(`[data-view="${view}"]`);
      assert.equal(
        await page.evaluate(() => document.documentElement.scrollWidth),
        width,
        `${view}: overflow at ${width}px`,
      );
    }
    await capture(page, `mobile-${width}`);
    await page.$eval('footer', (el) => el.scrollIntoView({ block: 'end' }));
    assert.equal(await page.$eval('footer', (el) => el.getBoundingClientRect().width), width);
    await capture(page, `footer-${width}`);
  }
  assert.deepEqual(errors, []);
  assert.deepEqual(requests, []);
  console.log(
    'PASS offline report: five views, themes, mobile, diagnostics, 5000 findings, drawer keyboard focus',
  );
  await page.close();
} catch (error) {
  console.error(
    'Browser QA failed. Use an official browser supported by this platform; this test never disables browser sandbox or web security.',
  );
  throw error;
} finally {
  await browser?.close();
  if (previousTmpdir === undefined) delete process.env.TMPDIR;
  else process.env.TMPDIR = previousTmpdir;
  await rm(temporary, { recursive: true, force: true });
}

async function openOffline(file) {
  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });
  await page.emulateMediaFeatures([{ name: 'prefers-color-scheme', value: 'light' }]);
  await page.evaluateOnNewDocument(() => {
    try {
      localStorage.removeItem('mule-lint-theme');
    } catch {
      /* local reports may block storage */
    }
  });
  await page.setOfflineMode(true);
  const errors = [],
    requests = [];
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(message.text());
  });
  page.on('request', (request) => {
    if (/^https?:/.test(request.url())) requests.push(request.url());
  });
  await page.goto(pathToFileURL(file).href, { waitUntil: 'networkidle0' });
  return { page, errors, requests };
}
async function capture(page, name, fullPage = false) {
  if (!artifacts) return;
  await mkdir(artifacts, { recursive: true });
  await page.screenshot({ path: path.join(artifacts, `${name}.png`), fullPage });
}
async function checkDialogFocus(page, selector) {
  await page.keyboard.press('Tab');
  assert.equal(await page.$eval(selector, (el) => el.contains(document.activeElement)), true);
  await page.keyboard.down('Shift');
  await page.keyboard.press('Tab');
  await page.keyboard.up('Shift');
  assert.equal(await page.$eval(selector, (el) => el.contains(document.activeElement)), true);
}

/** Compare rendered numeric values with the embedded scan, never with demo totals. */
async function verifyDisplayedValues(page, view) {
  const result = await page.evaluate((view) => {
    const d = JSON.parse(document.getElementById('report-data').textContent);
    const findings = d.files.flatMap((file) => file.issues);
    const text = (selector) =>
      [...document.querySelectorAll(selector)].map((node) => node.textContent.trim());
    if (view === 'overview')
      return {
        actual: text('.cards .metric>strong'),
        expected: ['error', 'warning', 'info']
          .map((severity) => String(findings.filter((issue) => issue.severity === severity).length))
          .concat(String(d.metadata.filesScanned)),
      };
    if (view === 'architecture')
      return {
        actual: text('.architecture-cards .metric>strong'),
        expected: d.metrics
          ? [
              d.metrics.flowCount,
              d.metrics.subFlowCount,
              d.metrics.httpListenerCount,
              d.metrics.dwTransformCount,
              d.metrics.connectorConfigCount,
            ].map(String)
          : [],
      };
    if (view === 'findings')
      return {
        actual: text('.group-count').map(Number),
        expected: ['error', 'warning', 'info']
          .map((severity) => findings.filter((issue) => issue.severity === severity).length)
          .filter(Boolean),
      };
    if (view === 'files')
      return {
        actual: [...document.querySelectorAll('.file-panel')].map((panel) => {
          return [...panel.querySelectorAll('.file-counts>span')].map((node) =>
            Number(node.textContent.trim()),
          );
        }),
        expected: [...document.querySelectorAll('.file-panel')].map((panel) => {
          const file = d.files.find((file) => file.relativePath === panel.dataset.file);
          return ['error', 'warning', 'info'].map(
            (severity) => file.issues.filter((issue) => issue.severity === severity).length,
          );
        }),
      };
    return {
      actual: [...document.querySelectorAll('.category-pill')].map((pill) =>
        Number(pill.querySelector('code:last-child').textContent),
      ),
      expected: [...document.querySelectorAll('.category-pill')].map((pill) =>
        pill.dataset.value
          ? d.rules.filter((rule) => rule.category === pill.dataset.value).length
          : d.rules.length,
      ),
    };
  }, view);
  assert.deepEqual(
    result.actual,
    result.expected,
    `${view}: displayed counts must match embedded scan data`,
  );
}
