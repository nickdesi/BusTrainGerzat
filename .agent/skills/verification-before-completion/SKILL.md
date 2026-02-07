---
name: verification-before-completion
description: "Evidence before claims, always. Run verification commands and confirm output BEFORE making any success claims. Use before committing, PRs, or claiming work is complete."
source: obra/superpowers (MIT License)
---

# Verification Before Completion

## The Iron Law

```text
NO COMPLETION CLAIMS WITHOUT FRESH VERIFICATION EVIDENCE
```

If you haven't run the verification command in this message, you cannot claim it passes.

**Claiming work is complete without verification is dishonesty, not efficiency.**

## The Gate Function

```text
BEFORE claiming any status:

0. SECURITY: Scan for secrets (grep "AIza", "key", "secret", check .gitignore)
1. IDENTIFY: What command proves this claim?
2. RUN: Execute the FULL command (fresh, complete)
3. READ: Full output, check exit code, count failures
4. VERIFY: Does output confirm the claim?
   - If NO: State actual status with evidence
   - If YES: State claim WITH evidence
5. ONLY THEN: Make the claim

Skip any step = lying, not verifying
```

## Common Failures

| Claim | Requires | Not Sufficient |
|-------|----------|----------------|
| Tests pass | Test output: 0 failures | Previous run, "should pass" |
| Linter clean | Linter output: 0 errors | Partial check, extrapolation |
| Build succeeds | Build command: exit 0 | Linter passing, logs look good |
| Bug fixed | Test original symptom: passes | Code changed, assumed fixed |
| Requirements met | Line-by-line checklist | Tests passing |
| Secure code | Git status checked + Grep secrets | "I used .env", "Looks safe" |

## Key Patterns

**Tests:**

```text
✅ [Run test command] [See: 34/34 pass] "All tests pass"
❌ "Should pass now" / "Looks correct"
```

**Build:**

```text
✅ [Run build] [See: exit 0] "Build passes"
❌ "Linter passed" (linter doesn't check compilation)
```

**Requirements:**

```text
✅ Re-read plan → Create checklist → Verify each → Report gaps or completion
❌ "Tests pass, phase complete"
```

## Red Flags - STOP

- Using "should", "probably", "seems to"
- Expressing satisfaction before verification ("Great!", "Perfect!", "Done!")
- About to commit/push/PR without verification
- Relying on partial verification
- Thinking "just this once"
- Committing .env or hardcoded keys
- **ANY wording implying success without having run verification**

## Rationalization Prevention

| Excuse | Reality |
|--------|---------|
| "Should work now" | RUN the verification |
| "I'm confident" | Confidence ≠ evidence |
| "Just this once" | No exceptions |
| "Linter passed" | Linter ≠ compiler |
| "Partial check is enough" | Partial proves nothing |

## When To Apply

**ALWAYS before:**

- ANY variation of success/completion claims
- ANY expression of satisfaction about work state
- Committing, PR creation, task completion
- Moving to next task

## The Bottom Line

**No shortcuts for verification.**

Run the command. Read the output. THEN claim the result.

**This is non-negotiable.**

## Related Skills

- `test-driven-development` - Write tests that can be verified
- `systematic-debugging` - Find root cause before claiming fix
