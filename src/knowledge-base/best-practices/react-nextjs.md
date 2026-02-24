# React/Next.js Best Practices

## Project Structure

- Use Next.js App Router (not Pages Router) for all new projects
- Colocate page-specific components alongside their route segments
- Place shared components in `components/` at the project root
- Use `lib/` for utilities, API clients, constants, and shared logic
- Use `hooks/` for custom React hooks
- Group related files: `feature/component.tsx`, `feature/hook.ts`, `feature/types.ts`

## TypeScript Integration

- Enable strict mode in `tsconfig.json` (`"strict": true`)
- Define interfaces for all component props and API response shapes
- Use `type` for unions, intersections, and computed types
- Use `interface` for object shapes that may be extended
- Avoid `any` -- use `unknown` with type guards or explicit narrow types
- Export types from a central `types.ts` or colocated `types.ts` per feature

## Server Components vs Client Components

- Default to Server Components (no directive needed)
- Add `"use client"` only when the component requires: event handlers, `useState`, `useEffect`, `useRef` with DOM interaction, or browser-only APIs
- Keep client components small -- extract server-renderable logic into separate server components
- Never import server-only modules (like `fs` or database clients) in client components
- Use composition: pass server-fetched data as props to client interactive wrappers

## Data Fetching

- Fetch data in Server Components using `async/await` directly in the component body
- Use Route Handlers (`app/api/`) for client-side mutations and third-party API proxying
- Implement `error.tsx` boundary files in each route segment for error recovery
- Implement `loading.tsx` for streaming/suspense skeleton states
- Use `notFound()` from `next/navigation` for 404 scenarios
- Deduplicate requests: Next.js automatically deduplicates identical `fetch()` calls

## Forms and Mutations

- Use Server Actions for form submissions when possible (simpler, no API route needed)
- Validate on both client (for UX feedback) and server (for security)
- Use Zod for schema validation on both sides
- Implement optimistic updates with `useOptimistic` for responsive UI
- Always handle loading and error states in form submissions

## Performance Optimization

- Use `next/image` for all images (automatic format conversion, lazy loading, sizing)
- Use `next/font` to self-host fonts with zero layout shift
- Export proper `metadata` objects (or `generateMetadata`) for SEO on every page
- Use `dynamic(() => import(...))` for heavy client components not needed at initial load
- Implement route segment caching with `revalidate` or on-demand ISR
- Minimize client-side JavaScript: prefer server rendering where possible

## Error Handling Patterns

- Create `error.tsx` files in each route segment for granular error boundaries
- Log errors server-side with structured logging (never expose stack traces to users)
- Show user-friendly messages on the client with recovery options (retry button)
- Use toast/sonner notifications for non-blocking transient errors
- Implement global `global-error.tsx` as the top-level fallback

## State Management

- Use React Server Components to avoid client state where possible
- Use `useState` for local UI state (modals, form inputs, toggles)
- Use URL search params (`useSearchParams`) for filter/sort state that should be shareable
- Use React Context sparingly -- only for truly global client state (theme, auth session)
- Avoid large state management libraries unless complexity genuinely demands it

## Testing

- Write unit tests for utility functions and hooks with Vitest or Jest
- Use React Testing Library for component integration tests
- Test Server Components by testing their rendered output
- Use Playwright or Cypress for critical end-to-end user flows
- Mock external services at the network layer (MSW) rather than mocking modules

## Accessibility

- Use semantic HTML elements (`nav`, `main`, `article`, `button`, not `div` for everything)
- Ensure all interactive elements are keyboard accessible
- Add `aria-label` attributes where visual context is not sufficient
- Test with screen readers periodically
- Maintain sufficient color contrast ratios (WCAG AA minimum)

## Security Considerations

- Never expose API keys or secrets in client components or client bundles
- Use environment variables prefixed with `NEXT_PUBLIC_` only for truly public values
- Validate and sanitize all user inputs on the server side
- Implement CSRF protection for mutation endpoints
- Use Content Security Policy headers in `next.config.js`
