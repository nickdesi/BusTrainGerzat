---
description: Automate the release process: build, version bump, changelog, and git tag.
---

# Release Manager Workflow

Use this workflow to ship a new version of the application cleanly and consistentl.

## 1. Pre-Flight Checks

1. **Git Status**: ensure working directory is clean.

    ```bash
    git status
    ```

2. **Branch**: ensure you are on `main`.

    ```bash
    git branch --show-current
    ```

## 2. Validation Build

Run a fresh build to ensure nothing is broken before tagging.

```bash
npm run build
```

* If this fails -> **STOP**. Fix the build first.

## 3. Version Bump

1. Decide validity: **Patch** (bug fixes), **Minor** (features), or **Major** (breaking changes).
2. Update `version` in `package.json`.
3. Update `package-lock.json` (running `npm install` usually syncs it).

## 4. Changelog Update

1. Open `CHANGELOG.md`.
2. Add a new header with the new version and today's date.
3. Move "Unreleased" changes under this new header.

## 5. Git Release

```bash
git add package.json package-lock.json CHANGELOG.md
git commit -m "chore(release): v<NEW_VERSION>"
git tag -a v<NEW_VERSION> -m "Release v<NEW_VERSION>"
```

## 6. Publish

```bash
git push origin main --follow-tags
```

> **Note**: If you have a CI/CD pipeline (like GitHub Actions), this push will likely trigger the production deployment.
