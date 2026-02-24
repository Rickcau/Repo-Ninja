# TypeScript Best Practices

## Configuration

- Always enable `strict: true` in `tsconfig.json`
- Enable `noUncheckedIndexedAccess` to catch potential undefined array/object access
- Enable `exactOptionalProperties` to distinguish between `undefined` and missing properties
- Set `target` to `ES2022` or later for modern JavaScript features
- Use `moduleResolution: "bundler"` for modern bundler compatibility

## Type Design Principles

- Prefer `interface` for object shapes that may be extended or implemented
- Prefer `type` for unions, intersections, mapped types, and conditional types
- Make illegal states unrepresentable through the type system
- Use discriminated unions for state machines and variant types
- Avoid `enum` in most cases; prefer `as const` objects or union literal types

## Avoiding Common Pitfalls

- Never use `any` -- use `unknown` and narrow with type guards
- Avoid type assertions (`as`) unless absolutely necessary; prefer type guards
- Do not use `!` (non-null assertion) in production code; handle null/undefined explicitly
- Avoid `@ts-ignore`; use `@ts-expect-error` with a comment if suppression is truly needed
- Do not overuse generics -- add them only when the function genuinely works with multiple types

## Function Signatures

- Explicitly type function parameters; rely on inference for return types in simple cases
- Use overloads sparingly; prefer discriminated union parameters
- Use `readonly` arrays and objects in function signatures to prevent mutation
- Define callback types explicitly rather than inline for reusability
- Use `void` return type for functions that should not have their return value used

## Type Guards and Narrowing

- Write custom type guard functions (`function isUser(x: unknown): x is User`) for complex checks
- Use `in` operator for property-based narrowing
- Use `instanceof` for class-based narrowing
- Prefer exhaustive checks with `never` in switch default cases
- Use `satisfies` operator to validate a value matches a type without widening

## Generics

- Name generic parameters descriptively: `TItem`, `TResponse`, not just `T`, `U`
- Constrain generics with `extends` to provide useful autocompletion and error messages
- Use default generic parameters to reduce boilerplate at call sites
- Avoid deeply nested generic types that reduce readability
- Extract complex generic expressions into named type aliases

## Working with External Data

- Define explicit types for all API responses -- never trust `any` from `fetch` or libraries
- Use Zod or similar runtime validation libraries at system boundaries
- Create separate types for API responses (external) and internal domain models
- Transform and validate data at the boundary, then use strong internal types throughout
- Type JSON parsing results as `unknown` and validate before use

## Module Organization

- Export types from dedicated `types.ts` files or colocated alongside their feature
- Use barrel exports (`index.ts`) sparingly -- they can cause bundle size issues
- Import types with `import type { ... }` to ensure they are erased at compile time
- Avoid circular dependencies between type files
- Group related types into namespaces only when genuinely needed for disambiguation

## Error Handling

- Define typed error classes extending `Error` for domain-specific errors
- Use discriminated union return types (`Result<T, E>`) for expected failure cases
- Reserve `throw` for truly exceptional situations
- Type catch clause variables as `unknown` and narrow before using
- Create utility types for API error responses

## Utility Types

- Use `Partial<T>` for update/patch operations
- Use `Required<T>` to enforce all optional fields
- Use `Pick<T, K>` and `Omit<T, K>` to derive sub-types from existing interfaces
- Use `Record<K, V>` for dictionary/map types
- Create project-specific utility types for recurring patterns (e.g., `Nullable<T>`, `AsyncResult<T>`)

## Code Quality

- Run `tsc --noEmit` in CI to catch type errors without building
- Use ESLint with `@typescript-eslint` for type-aware linting rules
- Enable `no-explicit-any`, `no-unsafe-assignment`, and `no-unsafe-return` lint rules
- Keep type definitions close to where they are used
- Document complex types with JSDoc comments explaining their purpose and constraints
