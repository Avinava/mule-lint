---
name: code-review
description: Systematic code review and refactoring of a TypeScript/JavaScript codebase. Use when asked to audit, review, refactor, or improve code quality.
---

# Code Review & Refactoring Skill

A structured, collaborative process for discovering, prioritizing, and fixing code quality issues.

---

## Phase 1: Context Gathering

**Goal:** Understand the codebase, the user's priorities, and constraints before scanning anything.

### Initial Questions

Before running a single grep, ask the user:

1. **Scope** — Whole codebase, specific module, or a single file?
2. **Pain points** — What bothers them most? (e.g., "too many `any` casts", "mcp.ts is a mess", "error handling is inconsistent")
3. **Standards** — Are there lint rules, formatting tools, or coding conventions already in place?
4. **Off-limits** — Anything they explicitly don't want touched? (e.g., "don't refactor the auth flow")
5. **Depth** — Quick surface pass, or deep structural review?

Let the user answer in shorthand. The goal is to avoid wasting time on findings they don't care about.

> [!TIP]
> If the user dumps context freely ("just review everything"), that's fine — use it to guide the scan. If they're specific ("fix the type safety issues"), skip straight to the relevant scan category.

**Exit condition:** You know the scope, can name their top concern, and understand what tools/standards exist.

---

## Phase 2: Discovery (Scan)

**Goal:** Build a complete picture before changing anything.

Run relevant scans in parallel. Skip categories the user excluded in Phase 1.

### 2A. Duplication Scan

```
grep -rn "pattern" src/ --include="*.ts" | head -30
```

Common duplications:

- Client/service instantiation boilerplate → extract to `shared.ts`
- Error handling patterns like `error instanceof Error ? error.message : error` → extract to utility
- Date/time parsing, config loading, response formatting

### 2B. Type Safety Scan

```
grep -rn "as any\|as unknown\|: any\|@ts-ignore\|@ts-expect-error" src/ --include="*.ts"
```

Categorize each hit:

- **Fixable now** — has an obvious correct type
- **Needs interface** — cast exists because response type isn't defined
- **Legitimate** — rare cases where `any` is correct (document with a comment why)

### 2C. Dead Code & Bug Scan

- Functions that always return the same value
- Unused imports, private fields, unreachable branches
- Variables written but never read
- `catch` blocks that swallow errors silently
- Computed values that aren't actually computed (e.g., `errorCount` always 0)

### 2D. Structural Scan

```
wc -l src/**/*.ts | sort -rn | head -10
```

Files over 300 lines are decomposition candidates. Look for:

- God classes with unrelated responsibilities
- Single files registering many handlers/routes/tools
- Mixed concerns (business logic + I/O + formatting)

### 2E. Hardcoded Values

```
grep -rn "hardcoded\|TODO\|FIXME\|'0.1.0'\|localhost" src/ --include="*.ts"
```

Magic strings, hardcoded versions, region IDs, URLs that should be configurable.

**Exit condition:** You can list every finding with a category label. No more scans needed.

---

## Phase 3: Prioritize & Curate

**Goal:** Present findings to the user and let them decide what to fix vs defer.

> [!IMPORTANT]
> Never start fixing before the user approves the plan. Present, don't prescribe.

### Present Findings

Group findings by category and suggest a priority order based on impact × effort:

| Priority | Category                        | Rationale                                     |
| -------- | ------------------------------- | --------------------------------------------- |
| 1        | **Code Duplication**            | Shared utilities benefit every subsequent fix |
| 2        | **Type Safety**                 | Catches bugs, makes refactoring safer         |
| 3        | **Monolith Decomposition**      | Largest structural win, enables parallel work |
| 4        | **Dead Code / Bugs**            | Reduces noise, fixes real defects             |
| 5        | **Hardcoded Values**            | Quick wins, reduces config drift              |
| 6+       | **Abstractions / Tests / Docs** | Often separate efforts                        |

### User Curation

Present the full list and ask the user to curate:

- **Keep** — fix this now
- **Defer** — acknowledge but skip for now (with rationale)
- **Skip** — not worth doing
- **Reorder** — different priority than suggested

Accept shorthand: "1-4: keep, 5: defer, 6: skip" or "looks good, go ahead."

Create a task checklist (`task.md`) with `[ ]` items reflecting the user's approved plan.

**Exit condition:** User has approved a concrete, ordered list of what to fix.

---

## Phase 4: Implement

**Goal:** Work through the approved fixes in order, verifying each one.

### Workflow Per Fix

1. **Edit** — Make the minimal change
2. **Build** — `npm run build` (or equivalent) — must pass before moving on
3. **Test** — `npm test` — no regressions
4. **Lint** — `npm run lint` — no new errors
5. **Format** — `npm run format:check` → fix with `--write` if needed

> [!CAUTION]
> If incremental edits compound errors in a file (cascading fixes that each break something new), stop and rewrite the file cleanly. Don't keep patching a broken state.

### Commit Strategy

One logical commit per priority group:

```bash
git add -A && git commit -m "refactor: <category>

- bullet point per change
- mention files affected"
```

### Coherence Check (at ~80% completion)

After most fixes have landed, pause and do a holistic pass:

- Re-read modified files **as a whole**, not just the diffs
- Check for consistency across modules (naming, error handling patterns, import styles)
- Look for contradictions introduced by fixes (e.g., a utility extracted but still inline in one file)
- Verify the codebase "reads well" — would a new team member understand the structure?

If issues surface, fix them before continuing to the remaining items.

### Common Refactoring Patterns

#### Extracting Shared Utilities

```typescript
// Before: duplicated in 7 files
const client = new FooClient({ ...getConfig() });

// After: src/commands/shared.ts
export function createClient(): FooClient {
  return new FooClient({ ...getConfig() });
}
```

#### Monolith Decomposition

Split into **registrar functions** — pure functions `(server, deps) → void`:

```typescript
// src/handlers/auth.ts
export function registerAuthHandlers(server: Server, client: Client): void {
    server.register('login', ...);
}

// src/main.ts (thin orchestrator)
registerAuthHandlers(server, client);
registerUserHandlers(server, client);
```

Key rules: zero coupling between modules, barrel export via `index.ts`.

#### Type Safety: AxiosError

```typescript
// Before: hand-casting
if (e instanceof Error && 'response' in e) {
  const axiosErr = e as { response?: { status?: number } };
}

// After: proper typing
import { AxiosError } from 'axios';
if (e instanceof AxiosError && e.response) {
  // e.response is fully typed
}
```

---

## Phase 5: Verify & Report

**Goal:** Confirm everything works, do a fresh-eyes review, and document what was done.

### Full Check Suite

```bash
npm run build && npm test && npm run lint && npm run format:check
```

### Fresh-Eyes Pass

Re-read the final codebase **without thinking about the diffs**. Pretend you're seeing it for the first time:

- Does the file structure make sense?
- Are the module names self-explanatory?
- Could someone onboard from the code alone?
- Are there any spots where the refactoring left "seams" visible (e.g., inconsistent naming between old and new code)?

This catches issues that only made sense in the context of the changes but look wrong in the final state.

### Report

Create a walkthrough summarizing:

- What changed and why
- Verification results (build, test, lint, format)
- Items deferred (with rationale for each)
- Any follow-up recommendations

---

## Project-Specific: Error Handling Patterns

When reviewing error handling in this codebase, apply these conventions:

### Permanent Errors (Do NOT Retry)

The following errors are treated as permanent in `QueryExecutor` and skip retries:

- `INVALID_TYPE`: Object doesn't exist (e.g., CPQ objects on non-CPQ org)
- `INVALID_FIELD`: Field doesn't exist on object
- `sObject type 'X' is not supported`
- `no such column`, `doesn't exist`

### Graceful Degradation

- `STORAGE_LIMIT_EXCEEDED`: Returns empty results instead of crashing. Analysis continues with available data.
- Runners should catch individual query failures and continue with other queries.

### Structured Errors

Use `AnalyzerError` hierarchy from `@metadata-analyzer/types`:

```typescript
import { QueryError, ErrorCode } from '@metadata-analyzer/types';
throw new QueryError(ErrorCode.QUERY_FAILED, 'Query failed', { queryName });
```

---

## Anti-Patterns

| Don't                                      | Do Instead                                     |
| ------------------------------------------ | ---------------------------------------------- |
| Fix everything in one giant commit         | One commit per priority group                  |
| Create abstractions speculatively          | Extract only when 3+ concrete duplicates exist |
| Add base classes for 2 subclasses          | Wait until the pattern is clear across 4+      |
| Rewrite working code for style alone       | Focus on correctness, safety, and structure    |
| Cascade incremental fixes on a broken file | Rewrite the file cleanly                       |
| Skip the build step after an edit          | Always build immediately                       |
| Dictate priorities without asking          | Present findings and let the user curate       |

---

## Guidance Notes

**Tone:** Be direct and procedural. Explain rationale briefly when it affects decisions, but don't over-justify. Show don't tell — code diffs over paragraphs.

**Handling deviations:**

- If the user wants to skip discovery → ask what they want fixed, go straight to implementation
- If the user disagrees with priority order → adjust immediately, they know the codebase better
- If scope creep happens mid-fix → note the new item, finish current work, then ask if they want to add it to the plan

**Context management:**

- Track what you've learned about the codebase's conventions as you go
- Don't let knowledge gaps accumulate — if something is unclear (e.g., "why does this API return `unknown[]`?"), ask immediately
- Apply what you learn from early fixes to later ones (e.g., if the user prefers explicit types over inference, use that style going forward)

**Quality over speed:**

- Each fix should leave the code measurably better
- If a fix doesn't clearly improve things, skip it
- The goal is a codebase that's easier to work in tomorrow, not a clean diff today
