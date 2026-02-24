# Security Code Review Checklist

## Purpose

This checklist provides a focused security review for pull requests. It covers the OWASP Top 10 categories and common web application vulnerabilities. Each item should be evaluated against the changes in the PR.

## Authentication Review

- [ ] Authentication is required for all non-public endpoints
- [ ] Password handling uses bcrypt/scrypt/Argon2 with appropriate cost factors
- [ ] Session tokens are generated with cryptographically secure random generators
- [ ] Session cookies use HttpOnly, Secure, and SameSite attributes
- [ ] Session expiration and idle timeout are implemented
- [ ] Failed login attempts are rate-limited and logged
- [ ] Password reset flows use time-limited, single-use tokens
- [ ] MFA is available for high-privilege accounts

## Authorization Review

- [ ] Every API endpoint checks the caller's authorization level
- [ ] Resource ownership is verified (users cannot access other users' data)
- [ ] Role escalation is not possible through parameter manipulation
- [ ] Admin endpoints have explicit admin-only checks
- [ ] Authorization logic is centralized, not duplicated across endpoints
- [ ] Deleted or deactivated users cannot access resources

## Injection Vulnerabilities

- [ ] SQL queries use parameterized queries or ORM-generated queries (no string concatenation)
- [ ] NoSQL queries use safe query builders (no direct object injection)
- [ ] OS commands are not constructed from user input (if necessary, use allowlists)
- [ ] LDAP, XML, and other interpreters receive sanitized input
- [ ] Template engines auto-escape output by default
- [ ] Regular expressions are safe from ReDoS (catastrophic backtracking)

## Cross-Site Scripting (XSS)

- [ ] User-generated content is escaped before rendering in HTML
- [ ] `dangerouslySetInnerHTML` (React) is not used, or input is sanitized with DOMPurify
- [ ] URL parameters are not reflected into the page without encoding
- [ ] Content Security Policy headers are configured to block inline scripts
- [ ] SVG uploads are sanitized (SVGs can contain embedded scripts)

## Cross-Site Request Forgery (CSRF)

- [ ] State-changing operations require CSRF tokens or use SameSite cookies
- [ ] GET requests do not cause side effects (idempotent)
- [ ] Origin and Referer headers are validated for sensitive operations

## Data Exposure

- [ ] API responses do not include more data than the client needs
- [ ] Sensitive fields (passwords, tokens, SSN) are never included in API responses
- [ ] Error messages do not reveal stack traces, database schemas, or internal paths
- [ ] Logs do not contain passwords, tokens, credit card numbers, or PII
- [ ] Debug endpoints and verbose error modes are disabled in production configuration
- [ ] Database queries select only needed columns (no SELECT *)

## File Upload Security

- [ ] File type validation checks both extension and MIME type / magic bytes
- [ ] Uploaded files are stored outside the web root or in a separate storage service
- [ ] File size limits are enforced at the server level
- [ ] Filenames are sanitized or replaced with generated names
- [ ] Uploaded files are scanned for malware when feasible
- [ ] Image processing libraries are up to date (historically vulnerable to exploits)

## Cryptography

- [ ] Secrets are not hardcoded in source code
- [ ] Encryption uses standard algorithms (AES-256-GCM, RSA-2048+, ECDSA P-256+)
- [ ] Custom cryptographic implementations are avoided (use established libraries)
- [ ] TLS 1.2+ is enforced for all external communications
- [ ] Initialization vectors and salts are unique per operation
- [ ] Key rotation procedures are documented and implementable

## Dependency Security

- [ ] No known critical vulnerabilities in dependencies (`npm audit`)
- [ ] New dependencies are from trusted, maintained packages
- [ ] Lock files are committed and integrity hashes are present
- [ ] No unnecessary dependencies added (minimize attack surface)
- [ ] Transitive dependency vulnerabilities are assessed

## Infrastructure and Configuration

- [ ] Security headers are set: HSTS, X-Content-Type-Options, X-Frame-Options, CSP
- [ ] CORS is configured with specific allowed origins (not wildcard `*` for authenticated APIs)
- [ ] Rate limiting is in place for authentication and resource-intensive endpoints
- [ ] Server version information is not exposed in response headers
- [ ] Debug and development features are disabled in production builds
- [ ] Environment variables are used for all secrets (not hardcoded)

## Severity Classification

When reporting security findings, classify as:
- **Critical**: Remotely exploitable with high impact (RCE, auth bypass, SQL injection)
- **High**: Significant data exposure or privilege escalation
- **Medium**: Requires specific conditions to exploit (stored XSS, CSRF)
- **Low**: Minor information disclosure or defense-in-depth improvements
- **Informational**: Best practice suggestions with no immediate risk
