---
description: Validate rule accuracy without leaking private Mule project data
---

# QA validation

## Preferred source

Use repository fixtures and `examples/sample-orders-system-api` first. A private project may be inspected locally only when the owner has placed it in scope and the task requires it.

Never commit or paste private project names, paths, endpoints, IDs, payloads, credentials, comments, business logic, or generated reports. Reduce a confirmed behavior to a new synthetic fixture.

## 1. Build and establish a baseline

```bash
npm run build
node dist/bin/mule-lint.js examples/sample-orders-system-api --profile recommended
```

The sample’s expected summary is documented in its README.

## 2. Capture machine-readable findings

JSON output is a flat array:

```bash
node dist/bin/mule-lint.js <PROJECT_PATH> \
  --profile recommended \
  --format json \
  --output /tmp/mule-lint-results.json
```

The command may exit `1` when it finds errors; that does not mean report generation failed.

Summarize without printing sensitive messages or paths:

```bash
jq 'group_by(.ruleId) | map({ruleId: .[0].ruleId, count: length, severity: .[0].severity})' \
  /tmp/mule-lint-results.json
```

## 3. Review representative findings locally

For each affected rule, classify a small sample as:

- true positive;
- false positive;
- uncertain without design/runtime context.

Record only rule ID, counts, classification, and a generic reason. Do not put raw private file content in issues or commits.

## 4. Reproduce synthetically

For every confirmed false positive or missed finding:

1. create the smallest made-up XML/YAML/DWL input that reproduces the behavior;
2. use neutral names and `.invalid` endpoints;
3. add the focused regression test;
4. fix the rule;
5. run the focused and registry/parity tests.

## 5. Compare safely

Re-run the same command and compare aggregate counts by rule. Delete temporary reports after the review. Do not add an automatic `git add` or commit step; the human/primary task decides what belongs in source control.
