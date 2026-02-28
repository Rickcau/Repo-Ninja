# Dependency Audit Checklist

## Purpose

This checklist guides code reviewers through a structured assessment of third-party
dependency security. Every external package introduced into the codebase expands the
attack surface and creates an ongoing maintenance obligation. Reviewers should use
these checks to verify that dependencies are necessary, well-maintained, properly
locked, and free of known vulnerabilities before any change is merged.

---

## Dependency Audit Tools

- [ ] Run `npm audit` (Node.js) or `pip-audit` (Python) against the project and confirm zero critical or high-severity findings before approving the PR.
- [ ] Verify that Dependabot or Renovate is enabled on the repository and configured to open PRs for security patches automatically.
- [ ] Confirm that Snyk or an equivalent scanner is integrated into the CI pipeline and that the build fails on high-severity issues.
- [ ] Check that audit tool output is included in the PR description or CI logs so reviewers can inspect results without running tools locally.
- [ ] Ensure audit tooling covers both production and development dependency trees.

---

## Evaluating New Dependencies

- [ ] Confirm the dependency solves a problem that cannot be reasonably addressed with existing packages or a small amount of internal code.
- [ ] Check the package's maintenance status: recent commit activity, open issue count, number of maintainers, and release cadence.
- [ ] Review the package's security history on advisory databases (GitHub Advisories, NVD, Snyk Vulnerability DB) for past CVEs and how quickly they were resolved.
- [ ] Verify the license is compatible with the project's licensing requirements (e.g., MIT, Apache-2.0). Flag copyleft licenses (GPL, AGPL) for legal review.
- [ ] Assess the package's popularity and community adoption (download counts, GitHub stars, dependent projects) as a proxy for reliability.
- [ ] Inspect the package's own dependency tree for excessive transitive dependencies or known-problematic sub-dependencies.
- [ ] Confirm the package supports the runtime versions and platforms the project targets.

---

## Lock File Management

- [ ] Verify that the lock file (`package-lock.json`, `yarn.lock`, `poetry.lock`, etc.) is committed alongside any dependency changes.
- [ ] Confirm that the lock file diff reflects only the intended additions, removals, or upgrades -- no unrelated dependency mutations.
- [ ] Run `npm ci` (or equivalent deterministic install command) in CI to ensure builds use exactly the locked versions rather than resolving ranges at install time.
- [ ] Check that lock file integrity hashes are present and have not been tampered with or stripped.
- [ ] Reject PRs where the lock file is absent, deleted, or added to `.gitignore`.

---

## Transitive Dependency Risks

- [ ] Inspect the full resolved dependency tree (`npm ls --all` or equivalent) to identify deeply nested or duplicated transitive packages.
- [ ] Flag transitive dependencies with known vulnerabilities, even if the direct dependency itself is clean.
- [ ] Check for version conflicts where multiple incompatible copies of the same transitive package are installed.
- [ ] Evaluate whether a lighter alternative exists that would reduce the transitive dependency footprint.
- [ ] Verify that no transitive dependency introduces an incompatible or restrictive license.

---

## Software Composition Analysis (SCA) Integration

- [ ] Confirm that an SCA tool (Snyk, FOSSA, Black Duck, or similar) runs on every pull request and reports findings inline.
- [ ] Verify that SCA policies define severity thresholds that block merges when critical vulnerabilities are detected.
- [ ] Check that the SCA tool's vulnerability database is updated regularly (ideally daily) to catch newly disclosed advisories.
- [ ] Ensure SCA results cover license compliance in addition to security vulnerabilities.
- [ ] Review the SCA tool's ignore/suppress list to confirm that any suppressed findings have documented justifications and expiration dates.
- [ ] Validate that SCA scans cover container images and infrastructure dependencies, not only application-level packages.

---

## Remediation Strategies

- [ ] For vulnerable packages with available patches, verify the PR upgrades to the fixed version and that no breaking changes are introduced.
- [ ] When no patch is available, assess whether the vulnerable code path is reachable in the project's usage of the package.
- [ ] Document temporary mitigations (WAF rules, input validation, feature flags) when an immediate upgrade is not feasible.
- [ ] Set a follow-up deadline for any deferred remediation and track it in the issue backlog.
- [ ] If a dependency is abandoned or chronically vulnerable, evaluate forking, replacing, or inlining the required functionality.
- [ ] Verify that remediation changes include updated lock files and pass the full test suite.

---

## Supply Chain Security

- [ ] Confirm that packages are installed from trusted registries only (npmjs.com, PyPI) and that no private registry misconfigurations allow dependency confusion attacks.
- [ ] Check for typosquatting risks by verifying the exact package name, publisher, and scope match the intended dependency.
- [ ] Verify that package integrity checksums in the lock file match the registry-published values.
- [ ] Review any install scripts (`preinstall`, `postinstall`) in newly added dependencies for suspicious behavior.
- [ ] Confirm that CI environments pin dependency installation tools to known-good versions to avoid compromised toolchains.
- [ ] Evaluate whether package provenance attestations (npm provenance, Sigstore) are available and valid for critical dependencies.
- [ ] Ensure that `.npmrc` or equivalent configuration does not disable integrity checking or allow untrusted sources.
