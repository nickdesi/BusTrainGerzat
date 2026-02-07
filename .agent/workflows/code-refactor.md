---
description: Clean up technical debt without breaking functionality.
---

# Code Refactor Workflow

Use this workflow to improve code quality.

## Execution Steps

1. **Select Target**:
   - Identify the file/function to refactor.
   - *Why* are we refactoring? (e.g. "Too complex to understand").

2. **Establish Baseline (TDD)**:
   - Run `npm test` (or equivalent).
   - If no tests cover this code, **STOP**.
   - Use `test-driven-development` skill to write a test that passes *before* you change anything.

3. **Refactor Loop**:
   - Apply one "Refactoring Move" from the Skill (`.agent/skills/code-refactor/SKILL.md`).
   - Run tests immediately.
   - Commit if green. Upgrade if red.

4. **Review**:
   - Is the code clearer?
   - Did we break anything?

## When to use this workflow

- User says "Clean up this file".
- User says "This function is too long".
- User says "Refactor for clarity".
