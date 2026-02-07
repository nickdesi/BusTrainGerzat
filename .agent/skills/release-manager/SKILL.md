---
name: release-manager
description: Automate the release process: build, version bump, changelog, and git tag.
license: Complete terms in LICENSE.txt
---

# Release Manager Guidelines

Use this skill to ship a new version of the application cleanly and consistently.

## Release Process

### 1. Pre-Flight Checks

- **Git Status**: ensure working directory is clean (`git status`).
- **Branch**: ensure you are on `main` (`git branch --show-current`).

### 2. Validation Build

- Run `npm run build`.
- If this fails -> **STOP**. Fix the build first.

### 3. Version Bump Strategy

- Decide: **Patch** (bug fixes), **Minor** (features), or **Major** (breaking changes).
- Update version string in **ALL** of the following locations:
  1. **`package.json`**: Update `"version"`. Run `npm install` to sync lockfile.
  2. **`README.md`**: Update Badge URLs (e.g., `v1.8.0` -> `v1.9.0`).
  3. **`components/Footer.tsx`**: Update `APP_VERSION` constant.
  4. **`CHANGELOG.md`**: Add new header `## [X.Y.Z] - YYYY-MM-DD`.

### 4. Git Release

```bash
# Stage all version files
git add package.json package-lock.json README.md components/Footer.tsx CHANGELOG.md

# Commit
git commit -m "chore(release): v<NEW_VERSION>"

# Tag
git tag -a v<NEW_VERSION> -m "Release v<NEW_VERSION>"
```

### 5. Publish

```bash
git push origin main --follow-tags
```

> **Note**: This usually triggers the deployment pipeline.
