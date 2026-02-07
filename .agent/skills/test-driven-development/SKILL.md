---
name: test-driven-development
description: "RED-GREEN-REFACTOR cycle. Write test first, watch it fail, write minimal code to pass. No production code without a failing test first. Use for ALL new features, bug fixes, and refactoring."
source: obra/superpowers (MIT License)
---

# Test-Driven Development (TDD)

## The Iron Law

```
NO PRODUCTION CODE WITHOUT A FAILING TEST FIRST
```

Write code before the test? **Delete it. Start over.**

- Don't keep it as "reference"
- Don't "adapt" it while writing tests
- Delete means delete

## Red-Green-Refactor

```
┌─────────────────────────────────────────────────────────────┐
│  RED          →     GREEN        →     REFACTOR     →  REPEAT │
│  Write failing      Minimal code       Clean up              │
│  test               to pass            (stay green)          │
└─────────────────────────────────────────────────────────────┘
```

### RED - Write Failing Test

Write ONE minimal test showing what should happen.

**Requirements:**

- One behavior per test
- Clear, descriptive name
- Real code (no mocks unless unavoidable)

```typescript
// ✅ GOOD: Clear name, tests real behavior
test('rejects empty email', async () => {
  const result = await submitForm({ email: '' });
  expect(result.error).toBe('Email required');
});

// ❌ BAD: Vague name, tests mock not code
test('validation works', async () => {
  const mock = jest.fn().mockResolvedValue(true);
  expect(mock).toHaveBeenCalled();
});
```

### Verify RED - Watch It Fail

**MANDATORY. Never skip.**

```bash
npm test path/to/test.test.ts
```

Confirm:

- Test **fails** (not errors)
- Failure message is expected
- Fails because feature missing (not typos)

**Test passes?** You're testing existing behavior. Fix test.

### GREEN - Minimal Code

Write **simplest code to pass the test**.

```typescript
// ✅ GOOD: Just enough to pass
function validateEmail(email: string) {
  if (!email?.trim()) return { error: 'Email required' };
  return { valid: true };
}

// ❌ BAD: Over-engineered (YAGNI violation)
function validateEmail(email: string, options?: {
  allowSubdomains?: boolean;
  checkMX?: boolean;
  customRegex?: RegExp;
}) { /* ... */ }
```

### Verify GREEN - Watch It Pass

**MANDATORY.**

```bash
npm test path/to/test.test.ts
```

Confirm:

- Test passes
- Other tests still pass
- Output pristine (no errors, warnings)

### REFACTOR - Clean Up

After green only:

- Remove duplication
- Improve names
- Extract helpers

**Keep tests green. Don't add behavior.**

## Common Rationalizations

| Excuse | Reality |
|--------|---------|
| "Too simple to test" | Simple code breaks. Test takes 30 seconds. |
| "I'll test after" | Tests passing immediately prove nothing. |
| "Already manually tested" | Ad-hoc ≠ systematic. No record, can't re-run. |
| "Need to explore first" | Fine. Throw away exploration, start with TDD. |
| "TDD will slow me down" | TDD faster than debugging. |
| "Test hard = skip it" | Hard to test = hard to use. Simplify design. |

## Red Flags - STOP and Start Over

- Code before test
- Test after implementation
- Test passes immediately
- Can't explain why test failed
- Rationalizing "just this once"
- "Keep as reference" or "adapt existing code"

**All of these mean: Delete code. Start over with TDD.**

## Verification Checklist

Before marking work complete:

- [ ] Every new function/method has a test
- [ ] Watched each test fail before implementing
- [ ] Each test failed for expected reason
- [ ] Wrote minimal code to pass each test
- [ ] All tests pass
- [ ] Output pristine (no errors, warnings)
- [ ] Edge cases and errors covered

Can't check all boxes? You skipped TDD. Start over.

## Debugging Integration

Bug found? Write failing test reproducing it. Follow TDD cycle.

**Never fix bugs without a test.**

## Related Skills

- `systematic-debugging` - For finding root cause before writing fix test
- `verification-before-completion` - For confirming tests actually pass
