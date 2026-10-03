# Shared analysis pipeline

Status: accepted for the next unreleased implementation.

## Decision

A typed analysis service owns explicit configuration loading, rule selection, scanning,
quiet selection, baseline application, quality-gate evaluation, report construction and
exit policy. CLI and MCP remain adapters for input, output and transport. The service
returns the legacy report and the versioned contract together. Legacy formatter APIs remain
compatible adapters and may project the same report through the canonical contract builder.

The service does not discover configuration files. Unknown configuration keys keep their
existing warning behavior. The CLI keeps stable rules by default; the MCP adapter retains
its recommended profile and complete registered rule set. A supplied engine retains its
own scope/configuration and supplies its actual enabled rule metadata. Combining it with
independent rules/config/profile options is rejected rather than silently discarding inputs.

## Compatibility boundaries

- Rule IDs, meanings, profiles, flat JSON, baseline fingerprints, CLI exits, MCP tool names
  and resource URIs are unchanged.
- Execution completeness is distinct from coverage. A file target scans selected-file
  context and may run project rules; it is not evidence that the whole project was scanned.
- Nested file/project finding locations use the same project-relative namespace.
- Engine serialization and caches are unchanged until per-run isolation is characterized.
- XML formatting and RAML/OpenAPI validation remain separate capabilities.
- Formatter rendering, filesystem output and transport errors stay in their adapters.

## Characterization and verification

Report-contract, robustness, quality-gate, baseline and executable package tests pin the
existing incomplete/no-files/parse/rule-error outcomes. Service tests cover explicit config,
custom-rule resolution, profile/default differences, quiet-before-baseline order, permissive
gates, deterministic findings and the injected-engine boundary. Installed-package tests
exercise CLI, library and MCP from unrelated working directories.

The engine may be split into private scope/context/execution/aggregation helpers later.
This extraction is intentionally not an engine rewrite or a shared runtime dependency
for the other tools.
