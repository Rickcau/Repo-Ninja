# GitHub Actions CI/CD Best Practices

## Workflow Structure

### Basic CI Workflow

```yaml
name: CI
on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  lint:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: 'npm'
      - run: npm ci
      - run: npm run lint

  type-check:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: 'npm'
      - run: npm ci
      - run: npx tsc --noEmit

  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: 'npm'
      - run: npm ci
      - run: npm test -- --coverage
      - uses: actions/upload-artifact@v4
        with:
          name: coverage
          path: coverage/

  build:
    runs-on: ubuntu-latest
    needs: [lint, type-check, test]
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: 'npm'
      - run: npm ci
      - run: npm run build
```

## Job Design Principles

- Run lint, type-check, and tests as separate parallel jobs for faster feedback
- Use `needs` to gate deployment jobs on all quality checks passing
- Cache `node_modules` using `actions/setup-node` with `cache: 'npm'`
- Use `npm ci` instead of `npm install` for deterministic, faster installs
- Pin action versions to specific major versions (`@v4`) not `@latest`

## Secret Management

- Store secrets in GitHub repository or organization settings, never in workflow files
- Use `${{ secrets.SECRET_NAME }}` syntax to reference secrets
- Create separate secrets for different environments (staging vs production)
- Rotate secrets on a regular schedule
- Use OpenID Connect (OIDC) for cloud provider authentication instead of long-lived credentials
- Never echo or log secret values in workflow steps

## Caching Strategies

```yaml
# Cache npm dependencies
- uses: actions/setup-node@v4
  with:
    node-version: 20
    cache: 'npm'

# Cache Next.js build output
- uses: actions/cache@v4
  with:
    path: .next/cache
    key: nextjs-${{ runner.os }}-${{ hashFiles('**/package-lock.json') }}-${{ hashFiles('src/**') }}
    restore-keys: |
      nextjs-${{ runner.os }}-${{ hashFiles('**/package-lock.json') }}-
      nextjs-${{ runner.os }}-
```

## Branch Protection Rules

Configure these rules for the main branch:
- Require status checks to pass before merging (lint, type-check, test, build)
- Require pull request reviews (at least 1 approval)
- Require branches to be up to date before merging
- Do not allow force pushes
- Include administrators in restrictions

## Environment-Based Deployments

```yaml
deploy-staging:
  needs: [build]
  runs-on: ubuntu-latest
  environment: staging
  if: github.ref == 'refs/heads/main'
  steps:
    - uses: actions/checkout@v4
    - name: Deploy to staging
      run: ./scripts/deploy.sh
      env:
        DEPLOY_URL: ${{ vars.STAGING_URL }}
        DEPLOY_TOKEN: ${{ secrets.STAGING_DEPLOY_TOKEN }}

deploy-production:
  needs: [deploy-staging]
  runs-on: ubuntu-latest
  environment: production
  if: github.ref == 'refs/heads/main'
  steps:
    - uses: actions/checkout@v4
    - name: Deploy to production
      run: ./scripts/deploy.sh
      env:
        DEPLOY_URL: ${{ vars.PRODUCTION_URL }}
        DEPLOY_TOKEN: ${{ secrets.PRODUCTION_DEPLOY_TOKEN }}
```

## Security Scanning

```yaml
security:
  runs-on: ubuntu-latest
  steps:
    - uses: actions/checkout@v4
    - run: npm ci
    - name: Audit dependencies
      run: npm audit --audit-level=high
    - name: Check for secrets
      uses: trufflesecurity/trufflehog@main
      with:
        extra_args: --only-verified
```

## Performance Tips

- Use concurrency groups to cancel redundant runs on the same branch
- Split large test suites with matrix strategy for parallelism
- Use `paths` filters to skip workflows when irrelevant files change
- Store build artifacts for downstream jobs instead of rebuilding

```yaml
concurrency:
  group: ${{ github.workflow }}-${{ github.ref }}
  cancel-in-progress: true
```

## Reusable Workflows

Create reusable workflows for common patterns:

```yaml
# .github/workflows/reusable-deploy.yml
on:
  workflow_call:
    inputs:
      environment:
        required: true
        type: string
    secrets:
      deploy-token:
        required: true
```

## Monitoring and Notifications

- Set up Slack or email notifications for failed deployments
- Use GitHub's built-in deployment status checks
- Track workflow run duration trends to catch performance regressions
- Set timeout limits on jobs to prevent runaway processes

```yaml
jobs:
  build:
    timeout-minutes: 15
    runs-on: ubuntu-latest
```

## Common Mistakes to Avoid

- Do not use `actions/checkout@v4` with `fetch-depth: 0` unless you need full git history
- Do not install global packages; use `npx` or local installs
- Do not hardcode Node.js versions; use a matrix or `.node-version` file
- Do not skip `npm ci` caching -- it significantly speeds up workflows
- Do not use self-hosted runners for public repositories (security risk)
- Do not store build artifacts indefinitely; set retention days
