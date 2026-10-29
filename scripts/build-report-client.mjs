import { build } from 'esbuild';
import { readFile, mkdir, writeFile, copyFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const fontRoots = {
  geist: path.dirname(require.resolve('@fontsource/geist/package.json')),
  'geist-mono': path.dirname(require.resolve('@fontsource/geist-mono/package.json')),
};

const root = fileURLToPath(new URL('..', import.meta.url));
const generated = path.join(root, 'src/formatters/html/generated');
await mkdir(generated, { recursive: true });
const client = await build({
  entryPoints: [path.join(root, 'src/formatters/html/client/index.ts')],
  bundle: true,
  platform: 'browser',
  target: 'es2022',
  format: 'iife',
  minify: true,
  legalComments: 'inline',
  write: false,
});
const fonts = [];
for (const [packageName, family, weights] of [
  ['geist', 'Geist', [400, 500, 600, 700]],
  ['geist-mono', 'Geist Mono', [400, 500, 600, 700]],
]) {
  for (const weight of weights) {
    const font = await readFile(
      path.join(fontRoots[packageName], `files/${packageName}-latin-${weight}-normal.woff2`),
    );
    fonts.push(
      `@font-face{font-family:'${family}';font-style:normal;font-weight:${weight};font-display:swap;src:url(data:font/woff2;base64,${font.toString('base64')}) format('woff2')}`,
    );
  }
}
const notices = [];
for (const [label, licensePath] of [
  ['Geist (SIL OFL 1.1)', '@fontsource/geist/LICENSE'],
  ['Geist Mono (SIL OFL 1.1)', '@fontsource/geist-mono/LICENSE'],
])
  notices.push(`${label}\n${await readFile(path.join(root, 'node_modules', licensePath), 'utf8')}`);
await writeFile(path.join(generated, 'client.mjs'), client.outputFiles[0].text);
await writeFile(
  path.join(generated, 'client.css'),
  [
    ...fonts,
    await readFile(path.join(root, 'src/formatters/html/client/redesign.css'), 'utf8'),
  ].join('\n'),
);
await writeFile(path.join(generated, 'licenses.txt'), notices.join('\n\n'));
if (process.argv.includes('--copy-dist')) {
  const target = path.join(root, 'dist/src/formatters/html/generated');
  await mkdir(target, { recursive: true });
  for (const file of ['client.mjs', 'client.css', 'licenses.txt'])
    await copyFile(path.join(generated, file), path.join(target, file));
}
