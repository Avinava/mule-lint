# Sample Orders System API

This small Mule 4 project is the example used throughout the mule-lint documentation. It is designed to be scanned, not deployed to a real backend.

All names, hosts, payloads, identifiers, and configuration values are synthetic. The reserved `.invalid` domain prevents the sample backend from resolving on the public internet.

The project intentionally contains a few lint findings so you can see how profiles, output formats, and quality gates behave.

From this directory, run:

```bash
mule-lint . --profile recommended
```

Expected summary:

```text
Summary:
  Errors:    1
  Warnings:  5
  Infos:     5
```

The command exits with status `1` because the sample includes an error. That is expected. Open `src/main/mule/orders-api.xml` and add an error handler to `get-order-by-id-flow` to try the fix.

To create the HTML report shown in the documentation:

```bash
mule-lint . --profile recommended --format html --output mule-lint-report.html
```

The generated report is ignored by Git and should not be committed.
