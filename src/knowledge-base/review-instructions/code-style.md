# Code Style Review Checklist

## Purpose

This checklist guides reviewers through style and formatting consistency checks during code review. Consistent style reduces cognitive load, makes diffs easier to read, and keeps the codebase approachable for all contributors. Use this alongside the general review checklist to verify that changes conform to the project's established conventions.

## TypeScript/JavaScript Style

- [ ] Variables use `camelCase` for local and instance variables
- [ ] Constants use `UPPER_SNAKE_CASE` for true compile-time constants and `camelCase` for runtime values
- [ ] Boolean variables and properties use a verb prefix (`is`, `has`, `should`, `can`)
- [ ] Functions and methods use `camelCase` with a verb-first naming pattern (e.g., `getUserById`, `handleClick`)
- [ ] Interfaces and type aliases use `PascalCase` without an `I` prefix
- [ ] Enums use `PascalCase` for the name and `PascalCase` for members
- [ ] Generic type parameters use single uppercase letters or descriptive `PascalCase` names (e.g., `T`, `TResult`)
- [ ] Abbreviations in identifiers follow camelCase rules (`httpClient`, not `HTTPClient`)
- [ ] Destructuring is used where it improves clarity, but not forced when it harms readability
- [ ] `const` is preferred over `let`; `var` is never used

## File and Folder Naming

- [ ] All file names use kebab-case (e.g., `user-profile.tsx`, not `userProfile.tsx` or `UserProfile.tsx`)
- [ ] React component files use kebab-case despite the component itself being PascalCase
- [ ] Test files follow the pattern `<module>.test.ts` or `<module>.test.tsx`
- [ ] Index files (`index.ts`) are used only for barrel exports, not for component definitions
- [ ] Directory names use kebab-case and represent a logical grouping
- [ ] Utility and helper files are placed in `lib/` or `utils/`, not scattered across feature directories

## Import Organization

- [ ] Imports are grouped in the following order, separated by blank lines:
  1. Node built-in modules (`fs`, `path`)
  2. External dependencies (`react`, `next`, third-party libraries)
  3. Internal aliases (`@/lib/...`, `@/components/...`)
  4. Relative imports (`./`, `../`)
- [ ] Each group is sorted alphabetically by module path
- [ ] Type-only imports use the `import type` syntax
- [ ] No unused imports remain in the file
- [ ] Wildcard imports (`import * as`) are avoided unless required by the module's API
- [ ] Circular imports are absent (check dependency direction)

## Comment Style

- [ ] Comments explain "why" a decision was made, not "what" the code does
- [ ] No commented-out code is left in the changeset
- [ ] TODO comments include a tracking reference (issue number or owner name)
- [ ] JSDoc comments are present on all exported functions, types, and interfaces
- [ ] Inline comments are placed on the line above the relevant code, not at the end of the line
- [ ] Comments are written in complete sentences with proper capitalization
- [ ] No obvious or redundant comments (e.g., `// increment counter` above `counter++`)

## Formatting Rules

- [ ] Code follows the project's Prettier configuration (line length, trailing commas, quote style)
- [ ] Indentation is consistent (spaces, not tabs, at the project-standard width)
- [ ] No trailing whitespace on any line
- [ ] Files end with a single newline character
- [ ] Semicolons are used consistently per the project's ESLint configuration
- [ ] String literals use the project-standard quote style (single quotes for JS/TS, double for JSX attributes)
- [ ] Arrow functions omit braces and `return` for single-expression bodies
- [ ] Object and array literals use trailing commas for cleaner diffs
- [ ] No more than one blank line separates logical sections within a file

## React Component Structure

- [ ] Components follow a consistent internal ordering:
  1. Type/interface definitions (props, local types)
  2. Component function declaration
  3. Hooks (`useState`, `useEffect`, custom hooks)
  4. Derived values and event handlers
  5. Early returns for loading/error states
  6. JSX return
- [ ] Components use function declarations or named arrow functions, not anonymous defaults
- [ ] Props interfaces are defined above the component, named `<ComponentName>Props`
- [ ] Default props use destructuring defaults, not `defaultProps`
- [ ] Event handler props follow the `on<Event>` naming convention
- [ ] Render logic is extracted into helper functions when JSX exceeds 50 lines
- [ ] Components are exported as named exports, not default exports (unless required by framework)

## CSS/Tailwind Class Ordering

- [ ] Tailwind classes follow a consistent ordering convention:
  1. Layout (`flex`, `grid`, `block`, `inline`)
  2. Positioning (`relative`, `absolute`, `top-*`, `z-*`)
  3. Box model (`w-*`, `h-*`, `p-*`, `m-*`, `border-*`)
  4. Typography (`text-*`, `font-*`, `leading-*`, `tracking-*`)
  5. Visual (`bg-*`, `shadow-*`, `rounded-*`, `opacity-*`)
  6. Interactive (`hover:*`, `focus:*`, `transition-*`, `cursor-*`)
  7. Responsive (`sm:*`, `md:*`, `lg:*`)
- [ ] Colors reference CSS custom properties via Tailwind theme tokens, not hardcoded hex or rgb values
- [ ] No duplicate utility classes on a single element
- [ ] Long class strings are broken across multiple lines for readability
- [ ] `cn()` or `clsx()` is used for conditional class composition
- [ ] Dark mode variants use the project's CSS custom property system, not ad-hoc `dark:` overrides

## Commit Message Conventions

- [ ] Commit messages follow Conventional Commits format: `<type>(<scope>): <description>`
- [ ] Valid types are: `feat`, `fix`, `docs`, `style`, `refactor`, `test`, `chore`, `perf`, `ci`, `build`
- [ ] The subject line is imperative mood, lowercase, and under 72 characters
- [ ] The subject line does not end with a period
- [ ] A blank line separates the subject from the body when a body is present
- [ ] The body explains what changed and why, not how
- [ ] Breaking changes include a `BREAKING CHANGE:` footer or `!` after the type/scope
- [ ] Each commit represents a single logical change
