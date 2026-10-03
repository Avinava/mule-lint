# Third-Party Notices

API contract validation uses these separately distributed dependencies:

- `amf-client-js` 5.14.0 — Apache License 2.0. Source: <https://github.com/aml-org/amf>
- `@aml-org/amf-custom-validator` 1.8.5 — ISC license in the npm package; upstream source is also published at <https://github.com/aml-org/amf-custom-validator>

Their license texts remain available in their installed npm packages. Mule Lint does not copy or redistribute the Anypoint CLI.

## Self-contained HTML reports

HTML reports embed the following browser dependencies and their complete license
texts. They make no network requests for scripts, styles, fonts or connector icons.
Connector documentation links open only when the reader follows them.

- Chart.js 4.5.1 — MIT; <https://github.com/chartjs/Chart.js>
- @kurkle/color 0.3.4 — MIT; <https://github.com/kurkle/color>
- Tabulator 6.2.1 — MIT; <https://github.com/olifolkerd/tabulator>
- Tailwind CSS 4.3.3 generated utilities — MIT; <https://github.com/tailwindlabs/tailwindcss>
- Inter — SIL Open Font License 1.1; <https://github.com/rsms/inter>
- JetBrains Mono — SIL Open Font License 1.1; <https://github.com/JetBrains/JetBrainsMono>

Fontsource packages pin the distributed font binaries. Browser packages are build
inputs; they are bundled into generated report assets rather than required from a
CDN or installed into the report reader's environment.
