---
description: How to run QA validation on mule-lint rules using a real MuleSoft project
---

# Mule-Lint QA Validation Workflow

This workflow validates that mule-lint rules are working correctly by running the linter against a real MuleSoft project and manually verifying each flagged issue.

## Prerequisites

- A MuleSoft project to test against (e.g., `<MULE_PROJECT_PATH>`)
- mule-lint project built (`npm run build`)

## Steps

### 1. Build the Project

// turbo
```bash
cd /Users/avi/Workspaces/github/mule-lint
npm run build
```

### 2. Run the Linter with All Rules

// turbo
```bash
npx ts-node bin/mule-lint.ts <PROJECT_PATH> -f json -e -o /tmp/mule-lint-results.json
```

Replace `<PROJECT_PATH>` with the path to your MuleSoft project.

### 3. Summarize Results by Rule

// turbo
```bash
cat /tmp/mule-lint-results.json | jq 'group_by(.ruleId) | map({ruleId: .[0].ruleId, count: length, severity: .[0].severity}) | sort_by(.count) | reverse'
```

### 4. Extract Unique Examples per Rule

// turbo
```bash
cat /tmp/mule-lint-results.json | jq 'group_by(.ruleId) | map(.[0])' > /tmp/unique-rules.json
cat /tmp/unique-rules.json
```

### 5. Manual Verification for Each Rule

For each rule in the output:

1. **Read the flagged file**: Use `cat` to view the XML/YAML file mentioned in `filePath`
2. **Verify the issue**: Check if the rule correctly identified a problem
3. **Classify the result**:
   - **True Positive**: Rule correctly flagged a real issue
   - **False Positive**: Rule incorrectly flagged valid code
   - **Partially Correct**: Rule is right in some cases but wrong in others

### 6. Document Findings

Create a table documenting each rule:

| Rule ID | Count | Severity | Status | Notes |
|---------|-------|----------|--------|-------|
| MULE-001 | 1 | error | ✅ TRUE POSITIVE | Correctly detected missing global error handler |
| YAML-001 | 60 | warning | ❌ FALSE POSITIVE | Files exist in properties/ folder |

### 7. Fix False Positives

For each false positive:

1. **View the rule implementation**: `src/rules/<category>/<RuleName>.ts`
2. **Identify the root cause**: Usually a regex pattern, path assumption, or missing exclusion
3. **Fix the issue**: Update the rule logic
4. **Rebuild**: `npm run build`

### 8. Re-run and Compare

// turbo
```bash
npx ts-node bin/mule-lint.ts <PROJECT_PATH> -f json -e -o /tmp/mule-lint-results-fixed.json
```

// turbo
```bash
echo "BEFORE:" && cat /tmp/mule-lint-results.json | jq length
echo "AFTER:" && cat /tmp/mule-lint-results-fixed.json | jq length
```

### 9. Commit Fixes

```bash
git add -A
git commit -m "fix: resolve false positive issues identified in QA validation"
```

## Common False Positive Patterns

### Path Assumptions
- Rules assume files are in specific directories
- Fix: Add additional search paths

### Regex Too Strict
- Patterns reject valid naming conventions (e.g., camelCase)
- Fix: Relax regex to accept valid variations

### Missing Context Awareness  
- Rules don't check parent elements (e.g., raise-error in until-successful)
- Fix: Add ancestor checks with XPath

### Auto-Generated Code
- Rules flag framework-generated names (e.g., APIKit flows)
- Fix: Add exclusion patterns for known frameworks

## Expected Accuracy Targets

| Metric | Target |
|--------|--------|
| True Positive Rate | > 95% |
| False Positive Rate | < 5% |
| Coverage | All rule categories tested |
