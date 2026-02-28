# Performance Review Checklist

## Purpose

This checklist guides code reviewers through a structured evaluation of performance-related concerns in pull requests. Use it to identify bottlenecks, inefficient patterns, and resource misuse before they reach production. Each item should be assessed as Pass, Fail, or Not Applicable based on the scope of the change under review.

## Database Performance

- [ ] No N+1 query patterns -- related data is fetched with joins or batch queries, not in loops
- [ ] Queries that filter or sort on a column have a corresponding database index
- [ ] SELECT statements request only the columns needed, not SELECT *
- [ ] Pagination is applied to queries that may return unbounded result sets
- [ ] Bulk inserts and updates use batch operations instead of row-by-row execution
- [ ] Query execution plans have been reviewed for complex or newly introduced queries
- [ ] Connection pooling is configured and connections are released promptly after use
- [ ] Read-heavy queries use caching or read replicas where appropriate
- [ ] Database transactions are scoped as narrowly as possible to reduce lock contention

## API Performance

- [ ] List endpoints support pagination with cursor-based or offset-based parameters
- [ ] Batch endpoints are available for operations that clients would otherwise call in a loop
- [ ] Response payloads include only the fields the client needs (no over-fetching)
- [ ] Large response bodies are compressed (gzip or brotli) at the transport layer
- [ ] Slow or expensive endpoints implement caching with appropriate TTL and invalidation
- [ ] Rate limiting is applied to endpoints exposed to external consumers
- [ ] Long-running operations return immediately and use background jobs with status polling
- [ ] HTTP caching headers (ETag, Cache-Control) are set correctly for cacheable resources

## Frontend Performance

- [ ] New third-party dependencies are evaluated for bundle size impact before adoption
- [ ] Large or rarely used components use dynamic imports or React.lazy for code splitting
- [ ] Images use modern formats (WebP, AVIF) and include width/height attributes to prevent layout shift
- [ ] Lists with many items use virtualization (windowing) instead of rendering all rows
- [ ] Critical CSS is inlined or loaded early; non-critical CSS is deferred
- [ ] Web fonts specify font-display: swap and are preloaded where needed
- [ ] Static assets are served with long-lived cache headers and content-hashed filenames
- [ ] Client-side data fetching avoids waterfall patterns by parallelizing independent requests

## Memory Management

- [ ] Event listeners, subscriptions, and timers are cleaned up on component unmount or scope exit
- [ ] Large data structures are released when no longer needed rather than held in module-level caches
- [ ] Streams and file handles are closed in finally blocks or using disposable patterns
- [ ] Closures do not inadvertently capture large objects that prevent garbage collection
- [ ] Server-side caches have size limits and eviction policies to prevent unbounded growth
- [ ] WebSocket connections and long-lived HTTP connections include reconnection and cleanup logic
- [ ] Object pools are used for frequently allocated short-lived objects in hot paths

## Algorithmic Complexity

- [ ] Nested loops over collections are justified and the expected data size is documented
- [ ] Lookups in hot paths use maps or sets (O(1)) instead of array scans (O(n))
- [ ] Sorting is performed at the data layer (database, index) rather than in application code where possible
- [ ] Recursive functions have depth limits or are converted to iterative solutions for large inputs
- [ ] String concatenation in loops uses builders or array joins instead of repeated concatenation
- [ ] Algorithms operating on user-controlled input size have documented worst-case complexity

## Profiling and Measurement

- [ ] Performance-critical changes include before-and-after benchmark results in the PR description
- [ ] New API endpoints have response time budgets documented (e.g., p95 under 200ms)
- [ ] Database query performance is measured under realistic data volumes, not just dev fixtures
- [ ] Frontend changes are validated with Lighthouse or Core Web Vitals measurements
- [ ] Memory usage is profiled for operations that process large datasets or run continuously
- [ ] Load testing has been performed or is planned for changes affecting throughput or concurrency

## Performance Anti-Patterns

- [ ] No synchronous I/O on the main thread or in request handlers
- [ ] No unbounded in-memory collection growth (arrays, maps, caches without eviction)
- [ ] No repeated computation of the same value inside loops -- hoist or memoize instead
- [ ] No unnecessary serialization/deserialization cycles (e.g., JSON.parse(JSON.stringify) for cloning)
- [ ] No polling at aggressive intervals when event-driven approaches (WebSocket, SSE) are available
- [ ] No blocking the Node.js event loop with CPU-intensive work -- offload to worker threads
- [ ] No premature optimization that sacrifices readability without measured evidence of a bottleneck

## Review Response Guidelines

When reporting performance findings:
1. Classify severity as: **Blocker** (measurable production impact), **Warning** (likely issue at scale), or **Note** (improvement opportunity)
2. Include estimated impact with data sizes or request volumes where possible
3. Reference profiling data, benchmarks, or complexity analysis to support the finding
4. Suggest a specific fix or alternative approach alongside each finding
5. Distinguish between proven bottlenecks and theoretical concerns to help the author prioritize
