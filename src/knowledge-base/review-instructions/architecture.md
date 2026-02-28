# Architecture Review Checklist

## Purpose

This checklist guides reviewers through structural and architectural decisions in pull requests. Use it to evaluate whether changes follow established patterns, maintain clean module boundaries, and position the codebase for sustainable growth. Each item should be marked as Pass, Fail, or Not Applicable.

## Next.js App Router Conventions

- [ ] Server Components are the default -- components only use `"use client"` when they require browser APIs, event handlers, or React hooks
- [ ] Data fetching happens in Server Components or route handlers, not in client components via useEffect
- [ ] Page-level components in `src/app/` follow the App Router file conventions (page.tsx, layout.tsx, loading.tsx, error.tsx)
- [ ] Metadata and SEO concerns are handled through the Metadata API in server components, not injected client-side
- [ ] Route groups and parallel routes are used appropriately to organize related pages without affecting URL structure
- [ ] Client components are leaf nodes in the component tree where possible, keeping the server component boundary as high as feasible
- [ ] Props passed from server to client components are serializable (no functions, classes, or Dates)

## API Route Design Patterns

- [ ] API routes export named HTTP method handlers (GET, POST, PUT, DELETE) rather than a single default handler
- [ ] Request validation occurs at the route handler level before calling business logic
- [ ] API responses use consistent shapes with appropriate HTTP status codes
- [ ] Route handlers do not contain business logic directly -- they delegate to service functions in `src/lib/`
- [ ] Authentication and authorization checks are applied before processing the request
- [ ] Error responses follow a uniform structure with a message field and optional error code
- [ ] Large payloads use streaming responses where appropriate (NextResponse with ReadableStream)

## State Management Patterns

- [ ] Server state (data from APIs or databases) is managed through server components and props, not duplicated into client state
- [ ] Client state is scoped to the narrowest component subtree that needs it
- [ ] Global client state is justified -- most state should be local or lifted only as far as necessary
- [ ] URL search params are used for state that should survive page refreshes or be shareable (filters, pagination, tabs)
- [ ] Form state uses controlled components or React hook-based form libraries, not uncontrolled DOM manipulation
- [ ] Derived state is computed inline or via useMemo, not stored separately and kept in sync manually

## Data Flow Architecture

- [ ] Data flows top-down from server components to client components via props
- [ ] Server Actions or API routes handle mutations -- client components do not write directly to data stores
- [ ] Loading and error states are handled at appropriate boundaries (Suspense, error.tsx, or component-level)
- [ ] Data transformations happen in a single layer (typically in service functions), not scattered across components
- [ ] Cache invalidation strategy is explicit -- revalidatePath, revalidateTag, or router.refresh are used intentionally
- [ ] Sensitive data is filtered out on the server before reaching client components

## Module Boundaries

- [ ] Dependencies flow inward: UI depends on business logic, business logic depends on data access -- never the reverse
- [ ] No circular imports between modules or directories
- [ ] Shared types and interfaces live in `src/lib/types.ts` or a dedicated types file, not re-exported across unrelated modules
- [ ] Third-party libraries are wrapped behind internal interfaces so they can be replaced without widespread changes
- [ ] Feature-specific code stays within its feature directory and does not leak into unrelated modules
- [ ] Public APIs of modules (exported functions and types) are intentional -- internal helpers are not exported

## Separation of Concerns

- [ ] UI components handle rendering and user interaction only -- they do not contain fetch calls, data transformations, or business rules
- [ ] Business logic resides in service functions under `src/lib/` and is independently testable
- [ ] Data access (database queries, API calls, vector DB operations) is isolated in dedicated client modules
- [ ] Configuration and environment-dependent values are centralized, not scattered as inline conditionals
- [ ] Styling uses Tailwind utility classes and CSS custom properties -- no inline style objects encoding business logic
- [ ] Error handling, logging, and analytics are cross-cutting concerns handled through middleware or wrapper functions, not embedded in feature code

## When to Create New Abstractions

- [ ] New abstractions solve a repeated pattern observed in at least two or three concrete cases, not a hypothetical future need
- [ ] The abstraction reduces total code complexity rather than adding an indirection layer with no net benefit
- [ ] Existing project abstractions were evaluated before introducing a new one -- duplication of purpose is avoided
- [ ] The abstraction has a clear, single responsibility and a name that accurately describes its role
- [ ] Generic utilities are genuinely generic -- they do not encode assumptions about specific features or business rules
- [ ] The abstraction is documented with a brief comment or JSDoc explaining its intended use and constraints

## Microservices vs Monolith Considerations

- [ ] The application remains a cohesive deployable unit unless there is a clear operational reason to extract a service
- [ ] Boundaries that may become service boundaries in the future are enforced through module interfaces, not premature network calls
- [ ] Shared data models are not split across services without a data synchronization strategy
- [ ] If a new service is proposed, it has an independent deployment lifecycle, dedicated data store, and well-defined API contract
- [ ] Inter-service communication patterns (sync vs async, REST vs events) are chosen based on consistency and latency requirements
- [ ] The operational cost of a new service (monitoring, deployment pipeline, failure modes) is acknowledged and justified

## Database Schema Design

- [ ] Tables and columns follow consistent naming conventions (snake_case for SQL, camelCase for ORM models)
- [ ] Every table has a primary key and appropriate indexes for known query patterns
- [ ] Foreign key relationships are explicit with proper cascade or restrict rules on delete and update
- [ ] Nullable columns are intentional -- columns are NOT NULL by default unless there is a documented reason for allowing nulls
- [ ] Schema migrations are additive and backward-compatible -- destructive changes (dropping columns, renaming tables) include a migration plan
- [ ] Sensitive data fields (tokens, PII) are identified and have appropriate encryption or access controls at the schema level
- [ ] Denormalization, if used, is justified by measured query performance needs, not premature optimization
