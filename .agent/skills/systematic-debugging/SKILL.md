---
name: systematic-debugging
description: "4-phase root cause debugging process. ALWAYS find root cause before attempting fixes. Use for ANY technical issue: test failures, bugs, unexpected behavior, performance problems, build failures."
source: obra/superpowers (MIT License)
---

# Systematic Debugging

## The Iron Law

```text
NO FIXES WITHOUT ROOT CAUSE INVESTIGATION FIRST
```

If you haven't completed Phase 1, you cannot propose fixes.

**Random fixes waste time and create new bugs. Quick patches mask underlying issues.**

## The Four Phases

### Phase 1: Root Cause Investigation

**BEFORE attempting ANY fix:**

1. **Read Error Messages Carefully**
   - Don't skip past errors or warnings
   - Read stack traces completely
   - Note line numbers, file paths, error codes

2. **Reproduce Consistently**
   - Can you trigger it reliably?
   - What are the exact steps?
   - If not reproducible → gather more data, don't guess

3. **Check Recent Changes**
   - What changed that could cause this?
   - Git diff, recent commits
   - New dependencies, config changes

4. **Trace Data Flow (Backward Tracing)**
   - Where does bad value originate?
   - What called this with bad value?
   - Keep tracing up until you find the source

5. **Gather Evidence in Multi-Component Systems**
   - **Log** what data enters component
   - **Log** what data exits component
   - **Verify** environment/config propagation
   - **Check** state at each layer

### Phase 2: Pattern Analysis

1. **Find Working Examples**
   - Locate similar working code in same codebase
   - What works that's similar to what's broken?

2. **Identify Differences**
   - What's different between working and broken?
   - List every difference, however small
   - Don't assume "that can't matter"

3. **Understand Dependencies**
   - What settings, config, environment?
   - What assumptions does it make?

### Phase 3: Hypothesis and Testing

1. **Form Single Hypothesis**
   - State clearly: "I think X is the root cause because Y"
   - Write it down
   - Be specific, not vague

2. **Test Minimally**
   - Make the SMALLEST possible change to test hypothesis
   - **One variable at a time**
   - Don't fix multiple things at once

3. **Verify Before Continuing**
   - Didn't work? Form NEW hypothesis
   - **DON'T add more fixes on top**

### Phase 4: Implementation

1. **Create Failing Test Case**
   - Use `test-driven-development` skill
   - MUST have before fixing

2. **Implement Single Fix**
   - Address the root cause identified
   - ONE change at a time
   - No "while I'm here" improvements

3. **Verify Fix**
   - Test passes now?
   - No other tests broken?
   - Issue actually resolved?

4. **If 3+ Fixes Failed: Question Architecture**
   - Each fix reveals new problem? = **Architectural problem**
   - STOP and question fundamentals
   - Discuss with user before attempting more fixes

## Red Flags - STOP and Follow Process

If you catch yourself thinking:

- "Quick fix for now, investigate later"
- "Just try changing X and see if it works"
- "It's probably X, let me fix that"
- "I don't fully understand but this might work"
- "Here are the main problems: [lists fixes without investigation]"
- **"One more fix attempt" (when already tried 2+)**

**ALL of these mean: STOP. Return to Phase 1.**

## Related Skills

- `test-driven-development` - For creating failing test case (Phase 4)
- `verification-before-completion` - Verify fix worked before claiming success
