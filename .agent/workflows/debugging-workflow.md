---
description: Workflow for debugging root causes using the systematic-debugging skill.
---

# Debugging Workflow

Use this workflow to systematically find and fix the root cause of bugs, errors, and unexpected behavior.

## Core Principle

**NO FIXES WITHOUT ROOT CAUSE INVESTIGATION FIRST.**

## Execution Steps

This workflow relies entirely on the `systematic-debugging` skill.

1. **Read the Skill**:
   - Use `view_file` to read `.agent/skills/systematic-debugging/SKILL.md`.

2. **Execute Phase 1: Root Cause Investigation**:
   - Follow the steps in the Skill to investigate the issue.
   - Gather evidence and trace the data flow.
   - **Do not propose a fix yet.**

3. **Execute Phase 2: Pattern Analysis**:
   - Compare broken code against working examples in the codebase.

4. **Execute Phase 3: Hypothesis and Testing**:
   - Form a hypothesis.
   - Test it with minimal changes.

5. **Execute Phase 4: Implementation**:
   - Create a failing test case (using `test-driven-development` skill if needed).
   - Implement the fix.
   - Verify the fix.

## When to use this workflow

- User says "Fix this bug".
- User says "I'm getting an error".
- Something isn't working as expected.
