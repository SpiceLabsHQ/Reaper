# Application Code Review — Specialty Steps

Applies to work types: `application_code`, `test_code`.

Apply these steps after completing the universal review process. Flag only
clear violations — do not penalize for patterns the work unit did not touch.

## Test Coverage Verification

- Confirm that tests were **written** for new code, not merely executed.
- For every new function, class, or exported module, check for a corresponding
  test file or test case. Missing test coverage on new public interfaces is a
  blocking issue.
- If new code is internal (unexported helpers), note the absence but do not
  block unless coverage is obviously absent for the whole change.

## SOLID Principles Checklist

Flag only clear violations. Not every principle applies to every change.

- **Single Responsibility**: Does each class or function do one thing?
  Flag if a new type handles multiple unrelated concerns.
- **Open/Closed**: Is new behavior added by extension, not by modifying
  existing code? Flag if existing behaviour was changed to accommodate new
  requirements when an extension point would have worked.
- **Interface Segregation**: Are interfaces narrow and focused?
  Flag if a caller is forced to depend on methods it does not use.
- **Dependency Inversion**: Are dependencies injected rather than
  instantiated inline? Flag hard-coded `new SomeService()` inside business
  logic where injection would enable testing.

## Runtime Correctness

Check for obvious errors — do not exhaustively audit every code path.

- **Null / undefined dereference**: Property access on a value that may be
  null or undefined without a guard.
- **Off-by-one errors**: Loop boundaries that produce fence-post bugs
  (e.g., `<` vs `<=`, index starts at 1 vs 0).
- **Unhandled async errors**: `await` calls without `try/catch` or `.catch()`
  where the caller does not propagate the rejection.
- **Type coercion surprises** (JS/TS): Loose equality (`==`) comparisons or
  arithmetic on mixed types that produce unexpected results.

Non-exhaustive. Do not speculate about paths you cannot verify from the diff.
