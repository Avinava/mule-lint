# Common recipes

Start each command in the Mule project root unless the recipe says otherwise.

## Scan before committing

```bash
mule-lint . --profile recommended
```

This is the normal developer loop. Linting reads files and prints findings; it does not modify the project.

## Focus on one file

```bash
mule-lint src/main/mule/orders-api.xml --profile recommended
```

Useful while editing, but project-wide and cross-file checks are more accurate when you pass `.`.

## Show only errors

```bash
mule-lint . --profile recommended --quiet
```

Quiet mode reduces terminal noise. It does not change the rules that run.

## Create an HTML report

```bash
mule-lint . --profile recommended --format html --output mule-lint-report.html
```

Open the file locally. Because charts, fonts, and the issue table load from public CDNs, the interactive report needs browser network access.

## Share findings in a spreadsheet

```bash
mule-lint . --profile recommended --format csv --output mule-lint-report.csv
```

## Add a warning gate

```bash
mule-lint . --profile recommended --fail-on-warning
```

Profiles choose which rules run. `--fail-on-warning` changes when the command exits non-zero.

## Use a team configuration

```bash
mule-lint . --config .mulelintrc.json
```

The CLI does not discover this file automatically. Always pass `--config` or `-c`.

## Try strict rules without changing config

```bash
mule-lint . --profile strict
```

Strict includes stable opinionated conventions. Treat its first run as a review, not an automatic reason to rewrite working integrations.

## Validate an API contract

```bash
mule-lint api validate src/main/resources/api
```

This validates RAML/OpenAPI. It is separate from Mule XML linting; see [API contract validation](best-practices/api-contracts.md).

## Preview XML formatting

```bash
mule-lint format src/main/mule/orders-api.xml --check
```

Apply formatting only after reviewing the diff:

```bash
mule-lint format src/main/mule/orders-api.xml
```

See [XML formatting](formatting.md) for safe usage.

## Run without installing globally

```bash
npx -y @sfdxy/mule-lint@1.29.1 . --profile recommended
```

Pinning the version makes results repeatable across developers and CI.
