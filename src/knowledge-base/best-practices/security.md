# Web Security Best Practices

## Authentication

- Use established authentication libraries (NextAuth.js, Auth.js, Clerk) instead of custom implementations
- Implement multi-factor authentication (MFA) for sensitive operations
- Use secure session management: HTTP-only cookies, Secure flag, SameSite attribute
- Set appropriate session expiration and implement idle timeout
- Hash passwords with bcrypt, scrypt, or Argon2 -- never use MD5 or SHA for passwords
- Implement account lockout after repeated failed login attempts
- Use constant-time comparison for token and password verification

## Authorization

- Implement role-based access control (RBAC) or attribute-based access control (ABAC)
- Check authorization on every API request, not just in the UI
- Use middleware for route-level authorization checks
- Validate that the authenticated user owns the resource they are accessing
- Apply the principle of least privilege: grant minimum necessary permissions
- Log all authorization failures for security monitoring

## Input Validation and Sanitization

- Validate all inputs on the server side regardless of client-side validation
- Use schema validation libraries (Zod, Joi, Yup) for structured input validation
- Sanitize HTML content to prevent XSS -- use DOMPurify or similar libraries
- Validate file uploads: check MIME types, file size limits, and scan for malware
- Use parameterized queries or ORMs to prevent SQL injection
- Reject unexpected fields in API payloads (allowlist approach)

## Cross-Site Scripting (XSS) Prevention

- Use React's built-in JSX escaping (avoid `dangerouslySetInnerHTML`)
- When raw HTML is necessary, sanitize with DOMPurify before rendering
- Implement Content Security Policy (CSP) headers to restrict script sources
- Set `X-Content-Type-Options: nosniff` to prevent MIME type sniffing
- Encode output data appropriately for its context (HTML, URL, JavaScript)

## Cross-Site Request Forgery (CSRF) Protection

- Use anti-CSRF tokens for all state-changing operations
- Set `SameSite=Lax` or `SameSite=Strict` on authentication cookies
- Verify the `Origin` and `Referer` headers for sensitive endpoints
- Use the double-submit cookie pattern when stateless CSRF protection is needed

## API Security

- Use HTTPS for all API communications -- never transmit sensitive data over HTTP
- Implement rate limiting to prevent abuse and denial of service
- Use API keys or OAuth tokens for service-to-service authentication
- Validate Content-Type headers on incoming requests
- Return minimal error information in production (no stack traces, internal paths)
- Implement request size limits to prevent payload-based attacks
- Use CORS headers to restrict which origins can call your API

## Secret Management

- Never commit secrets, API keys, or credentials to version control
- Use environment variables for configuration, with `.env.local` in `.gitignore`
- Rotate secrets regularly and implement secret rotation without downtime
- Use a secrets manager (Azure Key Vault, AWS Secrets Manager, HashiCorp Vault) in production
- Audit access to secrets and log secret retrieval events
- Separate secrets per environment (development, staging, production)

## Dependency Security

- Run `npm audit` or `pnpm audit` regularly and fix critical vulnerabilities
- Use Dependabot or Renovate for automated dependency updates
- Pin major versions and review changelogs before upgrading
- Avoid packages with no maintenance or known security issues
- Use lockfiles (`package-lock.json`, `pnpm-lock.yaml`) and verify integrity
- Scan for typosquatting attacks when adding new dependencies

## Headers and Transport Security

- Set `Strict-Transport-Security` (HSTS) header with a long max-age
- Implement `X-Frame-Options: DENY` or use CSP `frame-ancestors` directive
- Set `Referrer-Policy: strict-origin-when-cross-origin`
- Remove `X-Powered-By` header to avoid revealing server technology
- Configure proper CORS headers: restrict allowed origins, methods, and headers

## Logging and Monitoring

- Log authentication events (login, logout, failed attempts, MFA usage)
- Log authorization failures and suspicious patterns
- Never log sensitive data (passwords, tokens, personal information)
- Implement alerting for anomalous patterns (brute force, unusual access times)
- Retain security logs for an appropriate compliance period
- Use structured logging for easy searching and correlation

## Data Protection

- Encrypt sensitive data at rest using AES-256 or equivalent
- Use TLS 1.2+ for all data in transit
- Implement proper data classification (public, internal, confidential, restricted)
- Follow data retention policies: delete data that is no longer needed
- Implement data anonymization for analytics and non-production environments
- Comply with relevant regulations (GDPR, CCPA, HIPAA) for data handling
