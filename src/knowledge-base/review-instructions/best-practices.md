# Coding Best Practices Review Checklist

## Purpose

This document provides a structured checklist for code reviewers to evaluate general code quality, maintainability, and adherence to widely accepted software engineering principles. Use it as a companion to domain-specific review guides to ensure that every pull request meets a consistent quality bar before it is merged.

---

## SOLID Principles

- [ ] **Single Responsibility:** Each class or module has one well-defined reason to change.
- [ ] **Open/Closed:** New behavior is added through extension (new classes, interfaces, or composition) rather than modifying existing, tested code.
- [ ] **Liskov Substitution:** Subtypes can replace their base types without altering the correctness of the program.
- [ ] **Interface Segregation:** Interfaces are focused and cohesive; consumers are not forced to depend on methods they do not use.
- [ ] **Dependency Inversion:** High-level modules depend on abstractions, not on concrete implementations. Dependencies are injected rather than instantiated internally.

---

## DRY, KISS, YAGNI

- [ ] **DRY (Don't Repeat Yourself):** Duplicated logic has been extracted into shared functions, utilities, or constants. Copy-pasted blocks are absent.
- [ ] **KISS (Keep It Simple, Stupid):** The solution uses the simplest approach that satisfies the requirements. Unnecessary abstractions or indirection layers have been avoided.
- [ ] **YAGNI (You Aren't Gonna Need It):** No speculative features, unused parameters, or dead code paths have been introduced for hypothetical future use.

---

## Clean Code Guidelines

### Naming

- [ ] Variables, functions, and classes use descriptive, intention-revealing names.
- [ ] Boolean variables and functions read naturally as predicates (e.g., `isValid`, `hasAccess`).
- [ ] Abbreviations are avoided unless they are universally understood within the domain.
- [ ] Naming conventions are consistent with the rest of the codebase (casing, prefixes, suffixes).

### Functions

- [ ] Functions are short and perform a single, clearly stated task.
- [ ] Parameter lists are minimal (three or fewer parameters preferred); related parameters are grouped into objects when appropriate.
- [ ] Side effects are explicit and documented; pure functions are preferred where possible.
- [ ] Deeply nested control flow (more than two or three levels) has been refactored into guard clauses or extracted helpers.

### Classes and Modules

- [ ] Classes have a clear, cohesive purpose and a manageable number of public methods.
- [ ] Internal implementation details are private; the public API exposes only what consumers need.
- [ ] File length is reasonable; large files have been split along logical boundaries.

---

## Error Handling Patterns

- [ ] Errors are caught at the appropriate layer and not silently swallowed.
- [ ] Error messages are descriptive and include enough context (operation, input, expected vs. actual) for debugging.
- [ ] Custom error types or error codes are used where callers need to distinguish between failure modes.
- [ ] External call failures (network, database, file I/O) are handled gracefully with retries or fallback behavior where applicable.
- [ ] Sensitive information (credentials, tokens, PII) is never included in error messages or stack traces.

---

## Logging Best Practices

- [ ] Log statements use appropriate severity levels (debug, info, warn, error) consistently.
- [ ] Logs include structured context (request ID, user ID, operation name) to support traceability.
- [ ] High-frequency code paths avoid excessive logging that could impact performance or inflate log volume.
- [ ] Sensitive data is redacted or omitted from log output.
- [ ] Log messages are written for the operator, not the developer; they describe what happened and what action may be needed.

---

## Testing Philosophy

### Unit Tests

- [ ] Critical business logic and utility functions have corresponding unit tests.
- [ ] Tests follow the Arrange-Act-Assert pattern and test one behavior per case.
- [ ] External dependencies are mocked or stubbed to isolate the unit under test.
- [ ] Edge cases, boundary values, and error paths are covered, not just the happy path.

### Integration Tests

- [ ] Key integration points (API routes, database queries, third-party service calls) have integration tests that verify end-to-end data flow.
- [ ] Test fixtures and seed data are deterministic and do not depend on external state.

### End-to-End Tests

- [ ] Core user workflows have E2E coverage that exercises the system from the UI or API entry point through to the data layer.
- [ ] E2E tests are resilient to minor UI changes (using data attributes or accessible roles for selectors rather than CSS classes).

---

## Documentation Standards

- [ ] Public APIs, exported functions, and complex algorithms include concise doc comments explaining purpose, parameters, and return values.
- [ ] Non-obvious design decisions are annotated with brief inline comments explaining "why," not "what."
- [ ] README or setup documentation is updated when new dependencies, environment variables, or configuration steps are introduced.
- [ ] Changelog or release notes entries are added for user-facing changes.

---

## Code Review Etiquette

- [ ] Feedback is specific, actionable, and references concrete lines of code or patterns.
- [ ] Suggestions clearly distinguish between required changes (blocking) and optional improvements (non-blocking).
- [ ] Questions are asked with genuine curiosity; assume the author had a reason for their approach.
- [ ] Praise is given where warranted; acknowledge good patterns, thorough tests, or clear documentation.
- [ ] Reviews are timely; aim to provide initial feedback within one business day of the review request.
- [ ] Large pull requests are flagged early; encourage the author to break them into smaller, reviewable units.
