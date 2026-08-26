# Rule profiles

A profile is a named set of rules. Start with `recommended` unless your team has a specific reason to choose another.

| Profile       | Use it when                                                       | Trade-off                            |
| ------------- | ----------------------------------------------------------------- | ------------------------------------ |
| `baseline`    | You want high-confidence vendor, security, and correctness checks | Smallest stable set                  |
| `recommended` | You want the normal team default                                  | Reviewed requirements and practices  |
| `strict`      | You want all stable rules, including conventions                  | Most findings and more team judgment |

## Select a profile

For one run:

```bash
mule-lint . --profile recommended
```

For a shared config:

```json
{
  "extends": "mule-lint:recommended",
  "rules": {
    "MULE-002": { "enabled": false },
    "SEC-003": { "enabled": true, "severity": "error" }
  }
}
```

The short names `baseline`, `recommended`, and `strict` are also accepted in `extends`.

## Profiles do not decide the exit code

Profiles choose rule membership. Each rule keeps its declared severity unless config overrides it.

```text
profile → which rules run
severity → how each finding is classified
gate     → whether the command passes or fails
```

A recommended scan with warnings can still exit `0`. Add `--fail-on-warning` or a [quality gate](quality-gates.md) when the team is ready to enforce warnings.

## Existing project rollout

1. Run `recommended` without a warning gate.
2. Generate HTML and group findings by rule.
3. Fix true errors and high-value repeated warnings.
4. Document narrow exceptions in `.mulelintrc.json`.
5. Add enforcement only after the baseline is stable.

This keeps the first scan useful instead of creating a permanently red pipeline.

## Experimental rules

Experimental rules are not included in stable profiles. Evaluate them explicitly:

```bash
mule-lint . --profile recommended --experimental
```

Do not gate a team on an experimental rule without reviewing its false positives and release notes.

## Compatibility

Adding a rule to a stable profile is announced in a minor release. Removing or redefining a profile is a breaking change. With no profile configured, the CLI retains historical behavior and runs all registered stable rules at their declared severities. MCP scans default to `recommended`.

Profile membership is also available to agents through the `mule-lint://rules` MCP resources.
