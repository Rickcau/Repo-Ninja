# Knowledge Base Documents Task List

This document tracks the knowledge base documents needed for the **Reviews** feature. The review form (`src/components/reviews/review-form.tsx`) references these documents by name, displaying them to users when they select review types.

## Current State

### ✅ Existing Documents

| Document | Location | Review Type |
|----------|----------|-------------|
| `security-review.md` | `src/knowledge-base/review-instructions/` | Security |
| `general-review.md` | `src/knowledge-base/review-instructions/` | General |
| `security.md` | `src/knowledge-base/best-practices/` | Security |

### ❌ Missing Documents

The review form references the following documents that do not exist yet:

| Document | Review Type | Target Location |
|----------|-------------|-----------------|
| `auth-patterns.md` | Security | `src/knowledge-base/review-instructions/` |
| `dependency-audit.md` | Security | `src/knowledge-base/review-instructions/` |
| `performance.md` | Performance | `src/knowledge-base/review-instructions/` |
| `caching-strategies.md` | Performance | `src/knowledge-base/review-instructions/` |
| `accessibility.md` | Accessibility | `src/knowledge-base/review-instructions/` |
| `wcag-checklist.md` | Accessibility | `src/knowledge-base/review-instructions/` |
| `best-practices.md` | General | `src/knowledge-base/review-instructions/` |
| `code-style.md` | General | `src/knowledge-base/review-instructions/` |
| `architecture.md` | General | `src/knowledge-base/review-instructions/` |

---

## Task List

### 1. Security Review Documents

#### 1.1 `auth-patterns.md`
**Purpose:** Authentication and authorization patterns for secure application development.

**Steps to Build:**
1. Create file at `src/knowledge-base/review-instructions/auth-patterns.md`
2. Include sections for:
   - Authentication patterns (JWT, session-based, OAuth 2.0)
   - Secure password storage (bcrypt, Argon2)
   - Token handling best practices (storage, refresh, revocation)
   - Authorization patterns (RBAC, ABAC, claims-based)
   - Common auth vulnerabilities to check for in reviews
   - Code examples showing secure vs insecure patterns
3. Cross-reference with `security-review.md` Authentication/Authorization sections

#### 1.2 `dependency-audit.md`
**Purpose:** Guidelines for auditing third-party dependencies for security risks.

**Steps to Build:**
1. Create file at `src/knowledge-base/review-instructions/dependency-audit.md`
2. Include sections for:
   - Dependency audit tools (`npm audit`, `pip-audit`, Snyk, Dependabot)
   - Evaluating new dependencies (maintenance, security history, license)
   - Lock file management and integrity verification
   - Transitive dependency risks
   - SCA (Software Composition Analysis) integration
   - Remediation strategies for vulnerable packages
   - Supply chain security considerations

---

### 2. Performance Review Documents

#### 2.1 `performance.md`
**Purpose:** Performance review checklist and optimization guidelines.

**Steps to Build:**
1. Create file at `src/knowledge-base/review-instructions/performance.md`
2. Include sections for:
   - Database performance (N+1 queries, indexing, query optimization)
   - API performance (pagination, batch operations, response size)
   - Frontend performance (bundle size, code splitting, lazy loading)
   - Memory management (leaks, garbage collection, resource cleanup)
   - Algorithmic complexity considerations (O(n) analysis)
   - Profiling and measurement techniques
   - Performance anti-patterns to flag in reviews

#### 2.2 `caching-strategies.md`
**Purpose:** Caching patterns and strategies for different application layers.

**Steps to Build:**
1. Create file at `src/knowledge-base/review-instructions/caching-strategies.md`
2. Include sections for:
   - Client-side caching (browser cache, service workers, localStorage)
   - Server-side caching (Redis, Memcached, in-memory)
   - CDN and edge caching strategies
   - Cache invalidation patterns (TTL, event-based, versioning)
   - HTTP cache headers (Cache-Control, ETag, Last-Modified)
   - React/Next.js specific caching (SWR, React Query, ISR, SSG)
   - Cache stampede prevention
   - When NOT to cache (common mistakes)

---

### 3. Accessibility Review Documents

#### 3.1 `accessibility.md`
**Purpose:** Accessibility review guidelines and common patterns.

**Steps to Build:**
1. Create file at `src/knowledge-base/review-instructions/accessibility.md`
2. Include sections for:
   - WCAG 2.1 AA compliance overview
   - Semantic HTML usage and landmarks
   - ARIA attributes (roles, states, properties, live regions)
   - Keyboard navigation requirements
   - Focus management patterns
   - Color contrast requirements
   - Screen reader compatibility
   - Common accessibility mistakes in React/Next.js
   - Testing tools (axe, Lighthouse, screen readers)

#### 3.2 `wcag-checklist.md`
**Purpose:** Detailed WCAG compliance checklist for code reviews.

**Steps to Build:**
1. Create file at `src/knowledge-base/review-instructions/wcag-checklist.md`
2. Include sections for:
   - **Perceivable**: Text alternatives, captions, adaptable content, distinguishable
   - **Operable**: Keyboard accessible, enough time, seizure-safe, navigable, input modalities
   - **Understandable**: Readable, predictable, input assistance
   - **Robust**: Compatible with assistive technologies
3. Format as a reviewable checklist with pass/fail items
4. Include code examples for each principle
5. Reference specific WCAG success criteria numbers (e.g., 1.1.1, 2.1.1)

---

### 4. General Review Documents

#### 4.1 `best-practices.md`
**Purpose:** General coding best practices for maintainable, high-quality code.

**Steps to Build:**
1. Create file at `src/knowledge-base/review-instructions/best-practices.md`
2. Include sections for:
   - SOLID principles with practical examples
   - DRY, KISS, YAGNI principles
   - Clean code guidelines (naming, functions, classes)
   - Error handling patterns
   - Logging best practices
   - Testing philosophy (unit, integration, E2E coverage)
   - Documentation standards
   - Code review etiquette and feedback guidelines

#### 4.2 `code-style.md`
**Purpose:** Code style and formatting guidelines.

**Steps to Build:**
1. Create file at `src/knowledge-base/review-instructions/code-style.md`
2. Include sections for:
   - TypeScript/JavaScript style (variable naming, function naming)
   - File and folder naming conventions (kebab-case)
   - Import organization and ordering
   - Comment style and when to comment
   - Formatting rules (Prettier/ESLint alignment)
   - React component structure conventions
   - CSS/Tailwind class ordering
   - Commit message conventions (Conventional Commits)

#### 4.3 `architecture.md`
**Purpose:** Architecture patterns and review guidelines for structural changes.

**Steps to Build:**
1. Create file at `src/knowledge-base/review-instructions/architecture.md`
2. Include sections for:
   - Next.js App Router conventions (RSC vs client components)
   - API route design patterns
   - State management patterns
   - Data flow architecture (server → client)
   - Module boundaries and dependency direction
   - Separation of concerns (UI, business logic, data access)
   - When to create new abstractions
   - Microservices vs monolith considerations
   - Database schema design principles

---

## Priority Order

Recommended order of implementation based on review type frequency:

1. **High Priority** (General reviews are most common)
   - `best-practices.md`
   - `code-style.md`
   - `architecture.md`

2. **Medium Priority** (Security is critical when selected)
   - `auth-patterns.md`
   - `dependency-audit.md`

3. **Standard Priority** (Specialized reviews)
   - `performance.md`
   - `caching-strategies.md`
   - `accessibility.md`
   - `wcag-checklist.md`

---

## Notes

- All documents should follow the same format as `security-review.md` and `general-review.md` (markdown checklists with categories)
- Documents will be ingested into ChromaDB for semantic search
- Keep documents focused (one topic per file) for better retrieval accuracy
- Include practical code examples for each guideline where possible
- Reference external standards (OWASP, WCAG, etc.) but keep the checklist actionable

---

## Update History

| Date | Update |
|------|--------|
| 2026-02-27 | Initial task list created |
