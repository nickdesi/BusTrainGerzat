---
name: code-refactor
description: "Clean up technical debt without breaking functionality."
---

# Code Refactor Skill

This skill provides the knowledge and techniques for improving code quality, readability, and maintainability without altering external behavior.

## Core Philosophy

**To refactor safely, you must have tests.**

If you change code without tests, you are not refactoring; you are just changing code and hoping for the best.

## The Process

1. **Identify the Smell**:
   - Long Function
   - Large Class
   - Duplicated Code
   - Feature Envy (using another object's data more than its own)
   - Unclear Naming

2. **Create Safety Net**:
   - Run existing tests.
   - If missing, write a Characterization Test (captures current behavior).

3. **Execute Moves**:
   - **Extract Method**: Group related lines into a named function.
   - **Rename**: Give variables and functions names that reveal intent.
   - **Inline**: Remove unnecessary indirection.
   - **Simplify Conditional**: Use guard clauses, decompose complex boolean logic.

4. **Verify**:
   - Tests must pass after *every single move*.
