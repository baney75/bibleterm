# Release Checklist

## Pre-release

- [ ] Update `package.json` version
- [ ] Update `src/meta.ts` version
- [ ] Update `CHANGELOG.md` under a new version heading
- [ ] Regenerate branding if needed: `bun run ascii:generate`
- [ ] Run `bun run verify`
- [ ] Run `bun run install` and verify `bterm --doctor`
- [ ] Run `bun publish --dry-run --access public`
- [ ] Confirm docs reflect any behavior changes

## Git and Tag

- [ ] Commit with release message (`release: vX.Y.Z`)
- [ ] Tag release (`git tag vX.Y.Z`)
- [ ] Push commit and tags
- [ ] Publish the GitHub Release for that tag

## Post-release

- [ ] Create GitHub release notes from changelog
- [ ] Verify latest CI run is green on `main`
- [ ] Smoke-test install from clean shell profile
- [ ] Smoke-test global package install: `bun install -g bibleterm`
- [ ] Verify `bterm upgrade` from a previously installed version
- [ ] Publish npm package with `bun publish --access public`
