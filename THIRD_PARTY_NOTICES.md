# Third-Party Notices

API contract validation uses these separately distributed dependencies:

- `amf-client-js` 5.14.0 — Apache License 2.0. Source: <https://github.com/aml-org/amf>
- `@aml-org/amf-custom-validator` 1.8.5 — ISC license in the npm package; upstream source is also published at <https://github.com/aml-org/amf-custom-validator>

Their license texts remain available in their installed npm packages. Mule Lint does not copy or redistribute the Anypoint CLI.

## Self-contained HTML reports

HTML reports embed the following browser dependencies and their complete license
texts. They make no network requests for scripts, styles, fonts or connector icons.
Connector documentation links open only when the reader follows them.

- Geist — SIL Open Font License 1.1; <https://github.com/vercel/geist-font>
- Geist Mono — SIL Open Font License 1.1; <https://github.com/vercel/geist-font>

Fontsource packages pin the distributed font binaries. Browser packages are build
inputs; they are bundled into generated report assets rather than required from a
CDN or installed into the report reader's environment.
