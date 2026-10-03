# Development and release scripts

Run these commands from the repository root. Each script has an active build,
verification, development, or release role; package commands are the preferred entrypoints.

| Script                            | Entry point                                                       | Purpose                                                                                                                                          |
| --------------------------------- | ----------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| `build-report-client.mjs`         | `npm run build:client`; `npm run build`                           | Bundle the offline report client, styles, fonts, and license notices. `--copy-dist` also copies the generated assets into the published package. |
| `watch-report-client.mjs`         | `npm run build:watch`                                             | Watch report source changes alongside the TypeScript compiler.                                                                                   |
| `generate-contract-reference.mjs` | `npm run docs:contracts:generate`; `npm run docs:contracts:check` | Generate or verify schema and rule-registry documentation against compiled runtime code.                                                         |
| `package-smoke.mjs`               | `npm run package:check`                                           | Pack and install the package in a temporary directory, then verify shipped exports and executable behavior.                                      |
| `contract-smoke.mjs`              | Imported by `package-smoke.mjs`                                   | Share executable and MCP contract assertions with the installed-package smoke check.                                                             |
| `report-browser-smoke.mjs`        | `npm run test:browser`                                            | Check offline report interactions, failure fallbacks, and accessibility behavior in a real browser.                                              |
| `check-release.mjs`               | CI; tag workflow; manual release preparation                      | Verify package, lockfile, changelog, and optional tag identity without dependencies or network access.                                           |

`npm run build` cleans the output, builds and copies report assets once, then compiles
TypeScript. Keep `--copy-dist` usable directly: the watch workflow also relies on it.
See [the release workflow](../.agent/workflows/release.md) for the complete publication
checks and scoped tag command. Do not remove a release or manual check merely because
it is invoked by a workflow rather than `package.json`.
