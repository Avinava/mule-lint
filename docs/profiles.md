# Rule profiles

Profiles give teams and agents a stable name for a reviewed set of rules. They control rule
membership only; a rule keeps its declared severity unless configuration overrides it.

| Profile     | Reference               | Intended use                                                   |
| ----------- | ----------------------- | -------------------------------------------------------------- |
| Baseline    | `mule-lint:baseline`    | High-confidence vendor, security, and correctness requirements |
| Recommended | `mule-lint:recommended` | Stable vendor requirements and reviewed recommended practices  |
| Strict      | `mule-lint:strict`      | All stable rules, including opinionated conventions            |

Experimental rules are excluded from every stable profile. Use `--experimental` when evaluating
them; promoting an experimental rule into a profile requires a reviewed minor release.

## Select a profile

From the CLI:

```bash
mule-lint ./src/main/mule --profile recommended
```

Or in `.mulelintrc.json`:

```json
{
  "extends": "mule-lint:recommended",
  "rules": {
    "MULE-002": { "enabled": false },
    "SEC-001": { "enabled": true, "severity": "error" }
  }
}
```

The short names `baseline`, `recommended`, and `strict` are also accepted. The CLI profile wins over
the configuration profile, and an explicit per-rule setting wins over profile membership.

## Compatibility contract

- Adding a new optional profile is a minor change.
- Adding a rule to `recommended` or `strict` is a minor change and is called out in release notes.
- Removing a rule from a profile, renaming a profile, or changing its meaning is a breaking change.
- The library keeps its historical behavior when no profile is configured: every registered rule
  runs at its declared severity. MCP scans default to `recommended` so agents get a stable set.

Each rule's machine-readable profile membership is published in `mule-lint://rules` and its
individual `mule-lint://rules/{id}` resource.
