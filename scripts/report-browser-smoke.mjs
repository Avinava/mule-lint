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
    await page.click('#nav-issues');
    const expectedStatus =
      name === 'nofiles' ? 'no-files' : name === 'broken' ? 'incomplete' : 'complete';
    assert.equal(await page.$eval('.execution-status', (el) => el.dataset.status), expectedStatus);
    const expectedCount = name === 'large' ? 5000 : name === 'broken' ? 1 : 0;
    await page.waitForFunction(
      (count) => Number(document.getElementById('filtered-count').textContent) === count,
      {},
      expectedCount,
    );
    if (name === 'broken')
      assert.match(
        await page.$eval('.execution-status', (el) => el.textContent),
        /Synthetic broken document/,
      );
    if (!expectedCount)
      assert.equal(await page.$eval('#issue-empty-state', (el) => el.hidden), false);
    if (name === 'large') await exerciseLargeReport(page);
    assert.deepEqual(errors, [], `${name}: browser errors`);
    assert.deepEqual(requests, [], `${name}: unexpected network requests`);
    console.log(`PASS ${name}: ${expectedStatus}, ${expectedCount} findings, offline`);
    await page.close();
  }

  // Screenshots and responsive checks always use the repository's public sample.
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
  assert.deepEqual(
    await page.evaluate(() => {
      const dashboard = getComputedStyle(document.getElementById('view-dashboard'));
      const metric = document.getElementById('metric-flows');
      const card = getComputedStyle(metric.parentElement);
      const heading = getComputedStyle(document.querySelector('#view-dashboard h3'));
      return {
        horizontalPadding: dashboard.paddingLeft,
        verticalPadding: dashboard.paddingTop,
        cardPadding: card.paddingLeft,
        headingSize: heading.fontSize,
        metricColor: getComputedStyle(metric).color,
      };
    }),
    {
      horizontalPadding: '28px',
      verticalPadding: '24px',
      cardPadding: '12px',
      headingSize: '13px',
      metricColor: 'rgb(124, 58, 237)',
    },
    'CSS compiler upgrade must preserve report spacing, typography and palette',
  );
  await capture(page, 'dashboard');
  await page.click('#nav-issues');
  await page.waitForSelector('.tabulator-row');
  await capture(page, 'issues');
  await page.click('#theme-toggle');
  assert.equal(await page.$eval('html', (el) => el.classList.contains('dark')), true);
  assert.equal(
    await page.$eval('#metric-flows', (el) => getComputedStyle(el).color),
    'rgb(167, 139, 250)',
    'Dynamic metric colors must retain the dark variant',
  );
  await capture(page, 'issues-dark');
  for (const width of [390, 320]) {
    await page.setViewport({ width, height: 844 });
    assert.deepEqual(
      await page.evaluate(() => ({
        width: innerWidth,
        content: document.documentElement.scrollWidth,
      })),
      { width, content: width },
    );
    assert.equal(
      await page.$eval('.report-project h1', (el) => el.scrollWidth <= el.clientWidth),
      true,
    );
    await page.click('#sidebar-toggle');
    assert.equal(
      await page.$eval('#sidebar-toggle', (el) => el.getAttribute('aria-expanded')),
      'true',
    );
    await page.click('.sidebar-link[data-view="dashboard"]');
    assert.equal(
      await page.$eval('#sidebar-toggle', (el) => el.getAttribute('aria-expanded')),
      'false',
    );
    await capture(page, `mobile-${width}`);
  }
  assert.deepEqual(errors, [], 'sample: browser errors');
  assert.deepEqual(requests, [], 'sample: unexpected network requests');
  console.log(
    'PASS sample: desktop, light/dark themes, 390px/320px mobile navigation and project identity',
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
      localStorage.removeItem('theme');
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
async function capture(page, name) {
  if (!artifacts) return;
  await mkdir(artifacts, { recursive: true });
  await page.screenshot({ path: path.join(artifacts, `${name}.png`) });
}
async function exerciseLargeReport(page) {
  await page.waitForSelector('.tabulator-row');
  for (let count = 0; count < 3; count++) {
    await page.type('#global-search', 'Synthetic issue 10');
    await page.waitForFunction(
      () => Number(document.getElementById('filtered-count').textContent) < 5000,
    );
    await page.click('#clear-filters-btn');
    await page.waitForFunction(
      () => document.getElementById('filtered-count').textContent === '5000',
    );
  }
  await page.type('input[placeholder="Filter message..."]', 'Synthetic issue 10');
  await page.waitForFunction(
    () => Number(document.getElementById('filtered-count').textContent) < 5000,
  );
  const activeCount = await page.$eval('#filtered-count', (el) => Number(el.textContent));
  assert.equal(activeCount, 111);
  const downloads = path.join(temporary, 'downloads');
  await mkdir(downloads);
  const session = await page.createCDPSession();
  await session.send('Page.setDownloadBehavior', { behavior: 'allow', downloadPath: downloads });
  await page.click('#download-csv');
  const deadline = Date.now() + 10000;
  let csv;
  while (csv === undefined && Date.now() < deadline) {
    try {
      const candidate = await readFile(path.join(downloads, 'mule-lint-report.csv'), 'utf8');
      // The final name can become visible before all bytes are flushed.
      if (candidate.split('\r\n').length - 1 === activeCount && candidate.endsWith('"'))
        csv = candidate;
      else await new Promise((resolve) => setTimeout(resolve, 100));
    } catch (error) {
      if (error.code !== 'ENOENT') throw error;
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
  }
  assert.ok(csv, 'CSV download timed out');
  assert.equal(
    csv.split('\r\n').length - 1,
    activeCount,
    'CSV must contain precisely visible rows',
  );
  await page.click('#clear-filters-btn');
  await page.waitForFunction(
    () => document.getElementById('filtered-count').textContent === '5000',
  );
  assert.equal(await page.$eval('input[placeholder="Filter message..."]', (el) => el.value), '');
  for (let count = 0; count < 3; count++) {
    await page.click('.issue-open');
    await checkDialogFocus(page, '#sidepanel');
    await page.keyboard.press('Escape');
    assert.equal(
      await page.evaluate(() => document.activeElement.classList.contains('issue-open')),
      true,
    );
  }
  await page.click('#nav-dashboard');
  for (let count = 0; count < 3; count++) {
    await page.click('[data-modal="severity"]');
    await checkDialogFocus(page, '#modal-overlay');
    await page.keyboard.press('Escape');
    assert.equal(await page.evaluate(() => document.activeElement.dataset.modal), 'severity');
  }
}
async function checkDialogFocus(page, selector) {
  await page.keyboard.press('Tab');
  assert.equal(await page.$eval(selector, (el) => el.contains(document.activeElement)), true);
  await page.keyboard.down('Shift');
  await page.keyboard.press('Tab');
  await page.keyboard.up('Shift');
  assert.equal(await page.$eval(selector, (el) => el.contains(document.activeElement)), true);
}
