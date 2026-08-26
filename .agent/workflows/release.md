# Release workflow

Releases are triggered by a pushed `v*` tag. The publish workflow uses Node.js 22, runs `npm run check`, verifies the tag matches `package.json`, publishes with npm provenance, creates a GitHub release, and then notifies the mule-skills compatibility hub on a best-effort basis.

## 1. Prepare

- Confirm the intended semantic version.
- Update `package.json` and `package-lock.json` together.
- Update `CHANGELOG.md` and versioned docs/examples when public behavior changed.
- Review profile membership, rule IDs, output/exit codes, library exports, MCP contracts, and screenshots.
- Run `npm run check` locally.
- Confirm the working tree and branch are ready for release.

## 2. Create the version commit and tag

Use the repository’s normal versioning process. Ensure the final tag exactly matches the package version:

```bash
node -p 'require("./package.json").version'
git tag vX.Y.Z
git push origin vX.Y.Z
```

Do not push a tag until the version commit is already on the intended release branch.

## 3. Verify automation

In `.github/workflows/publish.yml`, the tag run should:

1. install with `npm ci` on Node 22;
2. pass `npm run check`;
3. verify `vX.Y.Z` equals `package.json` version;
4. publish `@sfdxy/mule-lint` publicly with provenance;
5. create generated GitHub release notes;
6. dispatch `tool_release` to the compatibility hub when its token is configured.

The compatibility notification is `continue-on-error`; a missing token warns and requires a manual hub update, but it does not roll back an npm release.

## 4. Post-release checks

```bash
npm view @sfdxy/mule-lint version
npx -y @sfdxy/mule-lint@X.Y.Z --version
npx -y @sfdxy/mule-lint@X.Y.Z mcp
```

Confirm the GitHub release exists, the package smoke command works, and the compatibility hub received or manually recorded the new version.
