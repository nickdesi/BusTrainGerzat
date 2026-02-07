---
description: Automate the release process (build, version bump, changelog, git tag).
---

# Release Manager Workflow

Use this workflow to ship a new version of the application. Refer to `.agent/skills/release-manager/SKILL.md` for specific file paths and commands.

## Execution Checklist

1. **Pre-Flight**:
   - Check `git status` (must be clean).
   - Check branch (must be `main` or release branch).

2. **Validation**:
   - Run a fresh build/test cycle. Stop if it fails.

3. **Version Bump**:
   - Consult the Skill to find ALL files that need updating (`package.json`, `README.md`, etc.).
   - Apply the updates.

4. **Changelog**:
   - Update `CHANGELOG.md` with the new version header and classified changes.

5. **Release**:
   - Commit, Tag, and Push using the commands provided in the Skill.

## When to use this workflow

- User says "Release version 1.2.0".
- User says "Ship it".
- User says "Deploy to production".
