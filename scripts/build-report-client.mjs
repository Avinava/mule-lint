import { build } from 'esbuild';
import postcss from 'postcss';
import tailwind from 'tailwindcss';
import { readFile, mkdir, writeFile, copyFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const fontRoots = {
  inter: path.dirname(require.resolve('@fontsource/inter/package.json')),
  'jetbrains-mono': path.dirname(require.resolve('@fontsource/jetbrains-mono/package.json')),
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
const utilityCss = await postcss([
  tailwind({
    content: [path.join(root, 'src/formatters/html/**/*.ts')],
    darkMode: 'class',
    safelist: [
      {
        pattern:
          /^(text|border)-(purple|emerald|blue|rose|cyan|sky|slate|amber)-(300|400|500|600)$/,
        variants: ['dark', 'hover', 'dark:hover'],
      },
    ],
    theme: {
      extend: {
        fontFamily: {
          sans: ['Inter', '-apple-system', 'BlinkMacSystemFont', 'sans-serif'],
          mono: ['JetBrains Mono', 'SF Mono', 'monospace'],
        },
        fontSize: {
          '2xs': ['0.65rem', { lineHeight: '0.9rem' }],
          xs: ['0.75rem', { lineHeight: '1rem' }],
          sm: ['0.8125rem', { lineHeight: '1.15rem' }],
          base: ['0.875rem', { lineHeight: '1.35rem' }],
        },
      },
    },
  }),
]).process('@tailwind base;\n@tailwind components;\n@tailwind utilities;', { from: undefined });
const fonts = [];
for (const [packageName, family, weights] of [
  ['inter', 'Inter', [400, 500, 600, 700]],
  ['jetbrains-mono', 'JetBrains Mono', [400, 500]],
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
const tableCss = await readFile(
  path.join(root, 'node_modules/tabulator-tables/dist/css/tabulator.min.css'),
  'utf8',
);
const notices = [];
for (const [label, licensePath] of [
  ['Chart.js 4.5.1 (MIT)', 'chart.js/LICENSE.md'],
  ['@kurkle/color (MIT)', '@kurkle/color/LICENSE.md'],
  ['Tabulator 6.2.1 (MIT)', 'tabulator-tables/LICENSE'],
  ['Tailwind CSS 3.4.17 (MIT)', 'tailwindcss/LICENSE'],
  ['Inter (SIL OFL 1.1)', '@fontsource/inter/LICENSE'],
  ['JetBrains Mono (SIL OFL 1.1)', '@fontsource/jetbrains-mono/LICENSE'],
])
  notices.push(`${label}\n${await readFile(path.join(root, 'node_modules', licensePath), 'utf8')}`);
await writeFile(path.join(generated, 'client.mjs'), client.outputFiles[0].text);
await writeFile(
  path.join(generated, 'client.css'),
  [...fonts, utilityCss.css, tableCss.replace(/\/\*# sourceMappingURL=.*?\*\//g, '')].join('\n'),
);
await writeFile(path.join(generated, 'licenses.txt'), notices.join('\n\n'));
if (process.argv.includes('--copy-dist')) {
  const target = path.join(root, 'dist/src/formatters/html/generated');
  await mkdir(target, { recursive: true });
  for (const file of ['client.mjs', 'client.css', 'licenses.txt'])
    await copyFile(path.join(generated, file), path.join(target, file));
}
