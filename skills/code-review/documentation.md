# Documentation Review — Specialty Steps

Applies to work type: `documentation`.

Apply these steps after completing the universal review process.

## Implementation Accuracy

Cross-reference the documentation against the actual code in the worktree.

- For every behavioral claim in the docs, verify the implementation matches.
  Example: if the docs say a flag defaults to `true`, confirm the code default.
- Flag any claim about behavior, defaults, options, or return values that does
  not match the implementation as a blocking issue.

## Coverage of Shipped Items

Verify the documentation covers what was actually shipped in this work unit.

- List the features, flags, API endpoints, or behavior changes delivered.
- Check that each appears in the updated documentation.
- Flag undocumented shipped features or behavior changes as blocking issues.

## Coverage of Removed Items

Verify the documentation does not reference items that were deleted.

- Check for references to removed flags, retired agents or commands, deleted
  endpoints, or deprecated configuration keys.
- Flag any surviving reference to a removed item as a blocking issue, since
  it will mislead users attempting to use the documented feature.

## Code Examples

If the documentation includes code examples, spot-check them for correctness.

- Verify that code examples are syntactically valid for the documented
  language or tool.
- Verify that function names, option keys, and type signatures in examples
  match the actual API as implemented in the worktree.
- Flag incorrect or non-compiling examples as blocking issues.
  Flag outdated examples (correct syntax, wrong API shape) as blocking.
