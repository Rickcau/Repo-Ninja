# Caching Strategies Review Checklist

## Purpose

This checklist guides code reviewers through the evaluation of caching implementations in pull requests. Caching is a critical performance optimization, but incorrect usage leads to stale data, memory leaks, and hard-to-diagnose production incidents. Each item below should be verified against the changes under review to ensure caching is applied correctly, invalidated reliably, and documented for future maintainers.

## Client-Side Caching

- [ ] Browser cache headers are configured appropriately for static assets (long TTL with content hashing)
- [ ] Service worker cache strategies match the data freshness requirements (cache-first vs. network-first)
- [ ] Service worker updates are handled gracefully with versioned cache names
- [ ] localStorage and sessionStorage usage includes size limit checks and error handling
- [ ] Sensitive data (tokens, PII) is not stored in localStorage or unencrypted client-side caches
- [ ] Client-side cache entries have explicit expiration logic and are not left to grow unbounded
- [ ] IndexedDB usage includes proper schema versioning and migration paths

## Server-Side Caching

- [ ] Cache layer choice (Redis, Memcached, in-memory) is justified for the use case
- [ ] In-memory caches are bounded with a maximum size and eviction policy (LRU, LFU)
- [ ] Redis/Memcached connections use pooling and handle connection failures gracefully
- [ ] Cache keys are namespaced to avoid collisions across features or tenants
- [ ] Cache key generation is deterministic and accounts for all relevant parameters
- [ ] Serialization format is consistent and handles versioning of cached objects
- [ ] Cache reads include fallback logic for cache misses without cascading failures
- [ ] Hot key distribution is considered to avoid overloading a single cache node

## CDN and Edge Caching

- [ ] Static assets are served through a CDN with appropriate cache-control directives
- [ ] Dynamic content at the edge uses Vary headers correctly to avoid serving wrong responses
- [ ] CDN cache keys account for query parameters, cookies, or headers that affect the response
- [ ] Purge and invalidation mechanisms are documented and tested
- [ ] Geo-specific content is handled with proper cache segmentation
- [ ] Origin shield or tiered caching is configured to reduce origin load

## Cache Invalidation Patterns

- [ ] TTL values are chosen based on data change frequency and acceptable staleness
- [ ] Event-based invalidation is implemented for data that changes unpredictably
- [ ] Cache invalidation events are published reliably (not fire-and-forget without confirmation)
- [ ] Write-through or write-behind patterns are used consistently where applicable
- [ ] Versioned cache keys are used for data with schema changes (e.g., `user:v2:{id}`)
- [ ] Bulk invalidation does not cause a thundering herd on the origin
- [ ] Cache invalidation logic is covered by tests, including edge cases like partial failures

## HTTP Cache Headers

- [ ] Cache-Control directives are set correctly (public vs. private, max-age, s-maxage, no-store)
- [ ] Authenticated or user-specific responses use `Cache-Control: private` or `no-store`
- [ ] ETag headers are implemented for resources that benefit from conditional requests
- [ ] Last-Modified headers are accurate and used alongside If-Modified-Since handling
- [ ] Vary header is set when response differs by Accept-Encoding, Authorization, or other headers
- [ ] Surrogate-Control headers are used where CDN behavior must differ from browser behavior
- [ ] no-cache is not confused with no-store (no-cache still caches but revalidates)

## React and Next.js Caching

- [ ] SWR or React Query is configured with appropriate revalidation intervals
- [ ] Stale-while-revalidate patterns display cached data while fetching updates in the background
- [ ] ISR (Incremental Static Regeneration) revalidation periods match content update frequency
- [ ] SSG (Static Site Generation) is used for pages that rarely change
- [ ] Next.js fetch cache options (force-cache, no-store) are set intentionally per route
- [ ] Client-side query keys are structured to avoid unnecessary refetches on navigation
- [ ] Prefetching is used for predictable user navigation paths
- [ ] Cache boundaries in React Server Components are placed at appropriate levels

## Cache Stampede Prevention

- [ ] Lock-based recomputation prevents multiple simultaneous cache rebuilds for the same key
- [ ] Probabilistic early expiration (jitter) is applied to prevent synchronized mass expiry
- [ ] Background refresh is used for high-traffic keys approaching expiration
- [ ] Circuit breakers protect the origin when cache infrastructure is degraded
- [ ] Request coalescing (deduplication) is in place for concurrent identical requests
- [ ] Graceful degradation serves stale data when the origin is unreachable

## When NOT to Cache

- [ ] Highly dynamic, user-specific data is not cached at shared layers (CDN, reverse proxy)
- [ ] Write-heavy data paths are not wrapped with read caches that will be immediately invalidated
- [ ] Small or fast-to-compute responses are not cached when the overhead exceeds the benefit
- [ ] Security-sensitive operations (authentication, authorization checks) bypass the cache
- [ ] Cache is not used as a primary data store without persistence guarantees
- [ ] Financial or transactional data requiring strict consistency is not served from stale caches
- [ ] GDPR or data-deletion requirements are not violated by retaining cached copies of deleted data
