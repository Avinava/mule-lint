# XML formatting

Formatting and linting solve different problems:

| Command                        | Reads files | Writes files | Checks architecture/practices |
| ------------------------------ | ----------- | ------------ | ----------------------------- |
| `mule-lint .`                  | Yes         | No           | Yes                           |
| `mule-lint format ... --check` | Yes         | No           | No                            |
| `mule-lint format ...`         | Yes         | Yes          | No                            |

The formatter uses Prettier’s XML engine with defaults intended to remain comfortable in Anypoint Studio: four-space indentation, a 140-column preferred width, and preserved attribute quotes.

## Check without changing files

```bash
mule-lint format src/main/mule --check
```

Example output:

```text
  ✗ src/main/mule/orders-api.xml (needs formatting)

3 file(s) scanned: 1 need formatting, 2 unchanged, 0 error(s)
```

The command exits `1` when any file needs formatting, which makes it suitable for CI.

## Apply formatting

Commit or stash your work first, then run:

```bash
mule-lint format src/main/mule
```

Review the Git diff before committing. A project directory formats Mule XML under its standard source tree; a file path formats only that file.

## Override style for one run

```bash
mule-lint format src/main/mule \
  --tab-width 2 \
  --print-width 120 \
  --xml-quote-attributes double
```

Available quote styles are `preserve`, `single`, and `double`.

## Recommended team workflow

1. Agree on formatter options.
2. Apply one formatting-only commit so behavior changes are not hidden in whitespace.
3. Add `mule-lint format src/main/mule --check` to CI.
4. Run normal lint separately; formatting does not fix rule findings.
