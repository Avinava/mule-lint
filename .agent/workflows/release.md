---
description: How to release a new version of mule-lint
---

# Releasing a New Version

Follow these steps to release a new version of mule-lint.

## Pre-Release Checklist

- [ ] All tests pass: `npm test`
- [ ] Lint passes: `npm run lint`
- [ ] Build succeeds: `npm run build`
- [ ] CHANGELOG is updated
- [ ] Version is bumped in package.json

## Version Bump

Use semantic versioning:

- **MAJOR**: Breaking changes (e.g., removed rules, changed API)
- **MINOR**: New features (e.g., new rules, new config options)
- **PATCH**: Bug fixes

```bash
# Bump version (updates package.json)
npm version patch   # 1.0.0 -> 1.0.1
npm version minor   # 1.0.0 -> 1.1.0
npm version major   # 1.0.0 -> 2.0.0
```

## Release Steps

### 1. Update CHANGELOG

Add entry to CHANGELOG.md:

```markdown
## [1.1.0] - 2024-12-16

### Added
- MULE-011: New rule for database connection pooling

### Fixed
- Fixed false positive in MULE-004 for localhost URLs

### Changed
- Improved error messages for MULE-003
```

### 2. Build and Test

```bash
npm run build
npm test
npm run lint
```

### 3. Create Git Tag

```bash
# Create tag
git tag -a v1.1.0 -m "Release v1.1.0"

# Push changes and tags
git push origin main --tags
```

### 4. Publish to npm

```bash
# Login to npm (if not already)
npm login

# Publish
npm publish
```

### 5. Create GitHub Release

1. Go to GitHub Releases
2. Click "Draft a new release"
3. Select the tag (e.g., v1.1.0)
4. Add release notes from CHANGELOG
5. Publish release

## Tag Naming Convention

- **Release tags**: `v1.0.0`, `v1.1.0`, `v2.0.0`
- **Pre-release tags**: `v1.1.0-beta.1`, `v1.1.0-rc.1`

## Post-Release

- [ ] Verify npm package: `npm view mule-lint`
- [ ] Test installation: `npm install -g mule-lint@latest`
- [ ] Update documentation if needed
- [ ] Announce release (if applicable)

## Rollback

If a release needs to be reverted:

```bash
# Unpublish from npm (within 72 hours)
npm unpublish mule-lint@1.1.0

# Delete tag
git tag -d v1.1.0
git push origin :refs/tags/v1.1.0
```

## CI/CD Release (Future)

For automated releases, add GitHub Actions:

```yaml
# .github/workflows/release.yml
name: Release

on:
  push:
    tags:
      - 'v*'

jobs:
  publish:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          registry-url: 'https://registry.npmjs.org'
      - run: npm ci
      - run: npm run build
      - run: npm test
      - run: npm publish
        env:
          NODE_AUTH_TOKEN: ${{ secrets.NPM_TOKEN }}
```
