# Report contract reference

Generated from the exported `reportSchema`. Do not edit the schema or field table by hand.
Run `npm run build && node scripts/generate-contract-reference.mjs` after an intentional
contract change; `--check` rejects drift without writing.

The [machine-readable JSON Schema](report-v1.schema.json) validates the known version-1 fields while allowing additive fields for forward-compatible
consumers. The live MCP output schema describes the current producer shape; do not use an
older closed producer schema to reject a newer additive version-1 report.
Fatal tool errors may contain error text without a report. Consumers must separately check
execution completeness, known scan scope, and gate outcomes before interpreting findings.
This reference does not claim that an older installed package supports report-v1.

| Top-level field | JSON type | Required |
| --------------- | --------- | -------- |
| `schemaVersion` | number    | yes      |
| `tool`          | object    | yes      |
| `execution`     | object    | yes      |
| `scan`          | object    | yes      |
| `selection`     | object    | yes      |
| `gate`          | object    | yes      |
| `summary`       | object    | yes      |
| `findings`      | array     | yes      |

- Schema version: `1`
- Execution states: `complete`, `incomplete`, `no-files`
- Gate states: `not-evaluated`, `passed`, `warning`, `failed`
- Fingerprint version: `muleLint/v1`

See [output formats](../output-formats.md#versioned-report-json) for semantics and examples,
[the library API](../library.md) for the shared service, and
[the architecture decision](../decisions/analysis-pipeline.md) for compatibility boundaries.
