# General Code Review Checklist

## Purpose

This checklist guides code reviewers through a systematic evaluation of pull requests. Apply each section to every review, noting items as Pass, Fail, or Not Applicable.

## Code Quality

- [ ] Code is readable and self-documenting with clear variable and function names
- [ ] Functions are focused on a single responsibility and kept under 50 lines where practical
- [ ] No duplicated code -- shared logic is extracted into reusable functions or modules
- [ ] Magic numbers and strings are replaced with named constants
- [ ] Comments explain "why" not "what" -- the code itself should explain "what"
- [ ] Dead code, commented-out code, and TODO comments without tracking issues are removed
- [ ] Consistent code style matching the project's linting rules

## Architecture and Design

- [ ] Changes align with the existing architecture and patterns in the codebase
- [ ] New abstractions are justified -- not over-engineered for a single use case
- [ ] Dependencies flow in the correct direction (no circular imports)
- [ ] API contracts are stable and backward-compatible (or breaking changes are documented)
- [ ] Separation of concerns: UI logic, business logic, and data access are in appropriate layers
- [ ] New components or modules are placed in the correct directory per project conventions

## TypeScript and Type Safety

- [ ] No use of `any` type without explicit justification
- [ ] Function parameters and return types are properly typed
- [ ] Interfaces are defined for all data structures crossing module boundaries
- [ ] Null and undefined cases are handled explicitly (no `!` non-null assertions in production)
- [ ] Type guards are used for runtime type narrowing where needed
- [ ] Generic types are constrained appropriately

## Error Handling

- [ ] All async operations have proper error handling (try/catch, .catch(), error boundaries)
- [ ] Errors are logged with sufficient context for debugging
- [ ] User-facing error messages are helpful and do not expose internal details
- [ ] Network failures, timeouts, and edge cases are handled gracefully
- [ ] Error recovery paths are implemented where possible (retry, fallback)

## Testing

- [ ] New functionality has corresponding unit tests
- [ ] Edge cases and error paths are tested
- [ ] Tests are deterministic (no flaky tests, no reliance on external services)
- [ ] Test names clearly describe the scenario being tested
- [ ] Mocks and stubs are minimal and focused
- [ ] Integration or E2E tests cover critical user flows affected by the change

## Performance

- [ ] No N+1 query patterns in database access
- [ ] Large lists are paginated, not loaded entirely into memory
- [ ] Expensive computations are memoized or cached appropriately
- [ ] React components avoid unnecessary re-renders (proper dependency arrays, memo usage)
- [ ] Bundle size impact is considered for new dependencies
- [ ] Images and assets are optimized

## Security (Quick Check)

- [ ] No secrets, API keys, or credentials in the code
- [ ] User input is validated and sanitized on the server
- [ ] Authentication and authorization checks are in place for protected routes
- [ ] No SQL injection, XSS, or CSRF vulnerabilities introduced
- [ ] Sensitive data is not logged or exposed in error messages

## Documentation

- [ ] Public APIs and exported functions have JSDoc or equivalent documentation
- [ ] README or docs are updated if the change affects setup, configuration, or usage
- [ ] Breaking changes are clearly documented in the PR description
- [ ] Complex algorithms or business rules have explanatory comments

## Git and PR Hygiene

- [ ] Commit messages are clear, concise, and follow conventional commits format
- [ ] PR is focused on a single concern (not mixing features, refactors, and fixes)
- [ ] PR description explains what changed and why
- [ ] No unrelated changes or formatting-only diffs mixed in
- [ ] Branch is up to date with the target branch

## Review Response Guidelines

When providing review feedback:
1. Classify each finding as: **Blocker** (must fix), **Suggestion** (should fix), or **Nit** (nice to fix)
2. Provide specific line references and code examples for fixes
3. Explain the reasoning behind each suggestion
4. Acknowledge good patterns and improvements in the code
5. Ask clarifying questions rather than making assumptions about intent
