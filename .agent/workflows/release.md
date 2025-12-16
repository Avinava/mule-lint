# Release Workflow

This document describes how to release new versions of mule-lint.

## Automatic Release Process

The release is fully automated. Just push a version tag!

### Steps

1. **Update version in package.json**
   ```bash
   npm version patch   # 1.3.1 -> 1.3.2
   # or
   npm version minor   # 1.3.1 -> 1.4.0
   # or
   npm version major   # 1.3.1 -> 2.0.0
   ```

2. **Push with tags**
   ```bash
   git push origin master --tags
   ```

3. **Done!** GitHub Actions will:
   - Run tests
   - Publish to npm
   - Create GitHub Release with auto-generated notes

## Manual Release (if needed)

```bash
# 1. Update version
npm version minor -m "chore: bump to %s"

# 2. Push tag
git push origin master --tags

# Or push tag only
git tag v1.4.0
git push origin v1.4.0
```

## Versioning Guide

| Change Type | Command | Example |
|-------------|---------|---------|
| Bug fix | `npm version patch` | 1.3.1 → 1.3.2 |
| New feature | `npm version minor` | 1.3.1 → 1.4.0 |
| Breaking change | `npm version major` | 1.3.1 → 2.0.0 |

## CI/CD Workflows

| Workflow | Trigger | Action |
|----------|---------|--------|
| `ci.yml` | Push/PR | Test on Node 18/20/22 |
| `publish.yml` | Push tag `v*` | Build, test, publish to npm, create release |
