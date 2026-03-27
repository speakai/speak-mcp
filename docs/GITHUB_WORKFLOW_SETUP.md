# GitHub Workflow Setup Guide

Standard CI/CD, testing, and release workflow for Speak AI packages. Reference this when setting up any new codebase.

## Overview

Every repo gets 4 things:

1. **Tests** — catch bugs before merge
2. **CI pipeline** — runs tests on every PR
3. **LLM-powered auto-release** — auto-determines version bump, generates changelog, publishes on merge to main
4. **Dependabot** — alerts on security vulnerabilities and major version bumps only

```
Developer pushes code
        |
        v
  [CI on PR] ── tests, typecheck, build verification
        |
        v
  Code review + merge to main
        |
        v
  [Release workflow]
        |
        ├── Build + test (gate)
        ├── Read commits since last tag
        ├── LLM analyzes commits → patch/minor/major/none
        ├── Bump version in package.json
        ├── Update CHANGELOG.md
        ├── Commit + tag + push
        └── Publish to npm / GitHub Package Registry
```

---

## 1. Package Types — What to Test and How

Pick your package type, follow its setup. Everything else (CI, release, Dependabot) is the same across all types.

### Quick Reference

| | Shared/Types Package | API/Backend Package (npm) | UI Package (npm) | Deployed App |
|---|---------------------|--------------------------|------------------|-------------|
| **Examples** | speak-shared, voice-agent-shared | speak-mcp | speak-ui | voice-agent-client, voice-agent-backend |
| **Test framework** | vitest | vitest + coverage | vitest + Playwright | None initially (build + lint is the gate) |
| **What to test** | Export verification, enum values | Endpoint correctness, error handling, input validation | Component rendering, accessibility, E2E flows | Build compiles, lint passes |
| **Mock strategy** | None (pure types) | Mock HTTP client (axios) | Mock API calls, render with Testing Library | N/A |
| **Coverage gating** | No (too few lines) | Yes (65%+ threshold) | Optional | No |
| **CI matrix** | Ubuntu + Windows | Ubuntu + Windows | Ubuntu only (Playwright) | Ubuntu only |
| **Release workflow** | LLM auto-publish | LLM auto-publish | LLM auto-publish | None (deployed via Vercel/AWS/Docker) |
| **Extra CI steps** | Verify ESM import | Coverage report | Playwright install + E2E job | Private registry auth if needed |

---

### A. Shared/Types Packages

For packages that export TypeScript enums, types, interfaces, and constants. No business logic.

**What we did:** speak-shared (16 tests), voice-agent-shared (24 tests)

**Install:**
```bash
npm install -D vitest
```

**vitest.config.ts:**
```typescript
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    testTimeout: 10_000,
  },
});
```

**package.json:**
```json
{
  "scripts": {
    "test": "vitest run"
  }
}
```

**What to test:**

1. **Main entry exports all key enums** — catch broken re-exports
2. **Sub-path exports work** (`./enums`, `./interfaces`)
3. **Enum values are correct** — catch accidental renames
4. **Constant arrays match enums** — catch desync
5. **Note:** `type` aliases (e.g., `type Foo = "a" | "b"`) don't exist at runtime — skip them

**tests/exports.test.ts pattern:**
```typescript
import { describe, it, expect } from "vitest";

describe("Package exports — main entry", () => {
  it("exports all key enums", async () => {
    const pkg = await import("../src/index");
    expect(pkg.MyEnum).toBeDefined();
    expect(pkg.MY_CONSTANTS).toBeInstanceOf(Array);
    // type aliases like `type Foo = "a" | "b"` are NOT runtime values — skip them
  });
});

describe("Enum values", () => {
  it("MyEnum has expected values", async () => {
    const { MyEnum } = await import("../src/enums/myEnum");
    expect(MyEnum.VALUE_A).toBe("value_a");
    expect(Object.values(MyEnum)).toHaveLength(3);
  });
});
```

**CI steps:**
```yaml
- run: npm ci --ignore-scripts
- run: npm run build
- run: node -e "import('./dist/index.js').then(() => console.log('ESM OK')).catch(e => { console.error(e); process.exit(1) })"
- run: npm test
```

---

### B. API/Backend Packages

For packages with HTTP clients, tools, CLI commands, or server logic.

**What we did:** speak-mcp (173 tests, 69% coverage)

**Install:**
```bash
npm install -D vitest @vitest/coverage-v8
```

**Test pyramid:**

| Layer | What it catches | Example file |
|-------|----------------|-------------|
| **Smoke** | Tool registration, unique names, descriptions | `smoke.test.ts` |
| **Integration** | Each tool calls correct HTTP method + URL | `tools-integration.test.ts` |
| **Error handling** | HTTP 401/403/404/429/500, timeouts, DNS failures | `error-handling.test.ts` |
| **Input validation** | Zod schemas reject bad input (empty strings, wrong types, out of range) | `input-validation.test.ts` |
| **Endpoint coverage** | Every tool module has at least one test | `tools-coverage.test.ts` |
| **Unit** | Pure utility functions | `media-utils.test.ts` |

**Key principle:** All API tests use **mocked HTTP clients** — no real API calls, no secrets in CI.

```typescript
// Mock pattern — intercepts all HTTP calls
const mockGet = vi.fn().mockResolvedValue({ data: { data: {} } });
const mockClient = { get: mockGet, post: mockPost, ... } as any;
vi.mock("axios", () => ({ default: { create: () => mockClient } }));
```

**Coverage gating (vitest.config.ts):**
```typescript
export default defineConfig({
  test: {
    coverage: {
      provider: "v8",
      include: ["src/**/*.ts"],
      exclude: ["src/types.d.ts", "src/cli/**"],
      thresholds: {
        lines: 65,
        functions: 70,
        branches: 50,
        statements: 65,
      },
    },
  },
});
```

**CI steps:**
```yaml
- run: npm ci
- run: npm run build
- run: npm run test:coverage
```

---

### C. UI Packages

For React component libraries, Next.js apps, or any frontend with a DOM.

**What we did:** speak-ui already had tests — we added CI pipeline + Dependabot

**Install:**
```bash
npm install -D vitest @testing-library/react jsdom jest-axe
npm install -D @playwright/test
```

**What to test:**

| Layer | What | Tool |
|-------|------|------|
| **Unit** | Component renders, props work, state changes | Vitest + Testing Library React |
| **Accessibility** | WCAG AA compliance | jest-axe |
| **E2E** | Full user flows in real browser | Playwright |

**CI — two parallel jobs:**
```yaml
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v6
      - uses: actions/setup-node@v6
        with:
          node-version: 22
      - run: npm ci --ignore-scripts
      - run: npm run typecheck
      - run: npm test

  e2e:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v6
      - uses: actions/setup-node@v6
        with:
          node-version: 22
      - run: npm ci --ignore-scripts
      - run: npx playwright install --with-deps chromium
      - run: npm run test:e2e
      - uses: actions/upload-artifact@v4
        if: ${{ !cancelled() }}
        with:
          name: playwright-report
          path: playwright-report/
          retention-days: 7
```

**Note:** E2E runs on **Ubuntu only** — no Windows matrix (Playwright + browser install is slow and unnecessary cross-platform).

---

---

### D. Deployed Apps (Not Published to npm)

For Next.js apps, Express APIs, workers — apps deployed to Vercel, AWS, Docker, etc. No npm publish, no version bumping needed.

**What we did:** voice-agent-client (Next.js/Vercel), voice-agent-backend (Express/AWS ECS)

**CI focus is different** — no release pipeline, just build verification:

| What | Why | Priority |
|------|-----|----------|
| **Build check** | Catch TypeScript errors before merge | Must have |
| **Lint** | Catch code quality issues | Must have |
| **Typecheck** | Even with strict off, catches type regressions | Must have |
| **Unit tests** | Utils, hooks, pure business logic | Add incrementally |
| **E2E tests** | Full user flows | Later (complex setup) |

**CI (`.github/workflows/ci.yml`):**
```yaml
name: CI

on:
  pull_request:
    branches: [master, dev]
  push:
    branches-ignore: [master]

jobs:
  build:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v6

      - uses: actions/setup-node@v6
        with:
          node-version: 22
          registry-url: https://npm.pkg.github.com  # if using private @speakai packages
          scope: "@speakai"

      - name: Install dependencies
        run: npm ci
        env:
          NODE_AUTH_TOKEN: ${{ secrets.GITHUB_TOKEN }}  # for private registry

      - name: Lint
        run: npm run lint

      - name: Build
        run: npm run build
```

**Key differences from published packages:**
- **No release workflow** — deployment is handled by Vercel/AWS/Docker, not npm publish
- **No version bumping** — version in package.json is informational only
- **No Windows matrix** — deployed apps only need to build on Linux (what CI/CD and Docker use)
- **Private registry auth** — if the app depends on `@speakai/*` private packages, pass `NODE_AUTH_TOKEN`
- **No test step yet** — add `npm test` when tests exist, but build + lint alone catches most PR breakages

**When to add tests later:**
- Backend: Start with API route tests (supertest) for auth, billing, and critical CRUD
- Frontend: Start with component tests for complex forms and data-heavy views
- Both: Add incrementally per feature, don't try to retrofit the whole codebase at once

---

### What We Built Across Our Repos

| Repo | Type | Tests | Coverage | CI | Release | Dependabot |
|------|------|-------|----------|-----|---------|------------|
| **speak-mcp** | API/Backend (npm) | 173 (7 files) | 69% gated | PR + main | LLM auto | Majors + security |
| **speak-shared** | Shared/Types (npm) | 16 (1 file) | — | PR + main | LLM auto | Majors + security |
| **voice-agent-shared** | Shared/Types (GitHub pkg) | 24 (1 file) | — | PR + main | LLM auto | Majors + security |
| **speak-ui** | UI Library (npm) | Existing (unit + E2E) | Existing | PR + main | LLM auto | Majors + security |
| **voice-agent-client** | Deployed App (Vercel) | — | — | PR (build + lint) | N/A | Majors + security |
| **voice-agent-backend** | Deployed App (AWS ECS) | — | — | PR (build + lint) | N/A | Majors + security |

---

## 2. CI Pipeline

Runs on every PR. Must pass before merge (enforce via branch protection).

### Standard CI (`.github/workflows/ci.yml`)

```yaml
name: CI

on:
  pull_request:
    branches: [main]
  push:
    branches-ignore: [main]

jobs:
  test:
    runs-on: ${{ matrix.os }}

    strategy:
      matrix:
        os: [ubuntu-latest, windows-latest]
        node-version: [22]

    steps:
      - uses: actions/checkout@v6
      - uses: actions/setup-node@v6
        with:
          node-version: ${{ matrix.node-version }}

      - name: Install dependencies
        run: npm ci

      - name: Build
        run: npm run build

      - name: Run tests
        run: npm test
```

**Important notes:**
- Always use **Node 22** — Node 20 is deprecated
- Always use **actions/checkout@v6**, **actions/setup-node@v6**, **actions/ai-inference@v2**
- If running on Windows matrix, never use bash syntax (`if [ -f ]`). Use `node -e` for cross-platform checks:
  ```yaml
  - name: Verify build
    run: node -e "const fs=require('fs'); if(!fs.existsSync('dist/index.js')){process.exit(1)}"
  ```

### For packages with coverage gating

Replace `npm test` with `npm run test:coverage`.

### For UI packages with E2E

Add a parallel E2E job:
```yaml
  e2e:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v6
      - uses: actions/setup-node@v6
        with:
          node-version: 22
      - run: npm ci --ignore-scripts
      - run: npx playwright install --with-deps chromium
      - run: npm run test:e2e
```

---

## 3. LLM-Powered Auto-Release

On push to main/master, the release workflow:
1. Runs tests as a gate
2. Reads git commits since the last `v*` tag
3. Sends commits to GPT-4o-mini via `actions/ai-inference@v2` (uses built-in `GITHUB_TOKEN`, no API key needed)
4. LLM responds with `bump: patch|minor|major|none` and a changelog line
5. Bumps version, updates CHANGELOG.md, commits, tags, publishes

### Release workflow (`.github/workflows/release.yml`)

```yaml
name: Release

on:
  push:
    branches: [main]

concurrency: ${{ github.workflow }}-${{ github.ref }}

permissions:
  contents: write
  models: read

jobs:
  test:
    # ... (same as CI test job, on ubuntu-latest only)

  release:
    needs: test
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v6
        with:
          fetch-depth: 0

      - uses: actions/setup-node@v6
        with:
          node-version: 22
          registry-url: https://registry.npmjs.org  # or https://npm.pkg.github.com

      - name: Install & build
        run: npm ci && npm run build

      - name: Get commits since last release
        id: commits
        run: |
          LAST_TAG=$(git tag -l 'v*' --sort=-v:refname | head -1)
          if [ -z "$LAST_TAG" ]; then
            COMMIT_LOG=$(git log --oneline --no-decorate -50)
          else
            COMMIT_LOG=$(git log "${LAST_TAG}..HEAD" --oneline --no-decorate)
          fi

          if [ -z "$COMMIT_LOG" ]; then
            echo "has_changes=false" >> "$GITHUB_OUTPUT"
            exit 0
          fi

          echo "has_changes=true" >> "$GITHUB_OUTPUT"
          CURRENT=$(node -p "require('./package.json').version")
          echo "current_version=$CURRENT" >> "$GITHUB_OUTPUT"

          EOF=$(dd if=/dev/urandom bs=15 count=1 status=none | base64)
          echo "log<<$EOF" >> "$GITHUB_OUTPUT"
          echo "$COMMIT_LOG" >> "$GITHUB_OUTPUT"
          echo "$EOF" >> "$GITHUB_OUTPUT"

      - name: Analyze changes with AI
        if: steps.commits.outputs.has_changes == 'true'
        id: ai
        uses: actions/ai-inference@v2
        with:
          model: openai/gpt-4o-mini
          temperature: 0
          max-completion-tokens: 512
          system-prompt: |
            You are a release manager for an npm package. Analyze git commits and determine the semver bump type and write a changelog entry.

            Rules:
            - "fix:", bug fixes → patch
            - "feat:", new features → minor
            - "BREAKING CHANGE", removed features → major
            - "chore:", "docs:", "ci:", "test:" with no user-facing change → none
            - Multiple changes: pick the highest bump level.
            - When unsure between patch and minor, choose patch.

            Respond in EXACTLY this format — two lines, no markdown:
            bump: patch
            changelog: Fixed input validation for upload endpoint
          prompt: |
            Package: YOUR_PACKAGE_NAME (current version: ${{ steps.commits.outputs.current_version }})

            Commits since last release:
            ${{ steps.commits.outputs.log }}

      - name: Parse AI response and bump version
        if: steps.commits.outputs.has_changes == 'true'
        id: bump
        env:
          AI_RESPONSE: ${{ steps.ai.outputs.response }}
        run: |
          BUMP=$(echo "$AI_RESPONSE" | grep -oP 'bump:\s*\K\w+' | head -1)
          CHANGELOG=$(echo "$AI_RESPONSE" | grep -oP 'changelog:\s*\K.+' | head -1)

          if [ "$BUMP" = "none" ] || [ -z "$BUMP" ]; then
            echo "should_release=false" >> "$GITHUB_OUTPUT"
            exit 0
          fi

          if [[ "$BUMP" != "patch" && "$BUMP" != "minor" && "$BUMP" != "major" ]]; then
            echo "should_release=false" >> "$GITHUB_OUTPUT"
            exit 0
          fi

          echo "should_release=true" >> "$GITHUB_OUTPUT"
          echo "bump=$BUMP" >> "$GITHUB_OUTPUT"

          NEW_VERSION=$(npm version "$BUMP" --no-git-tag-version)
          echo "new_version=$NEW_VERSION" >> "$GITHUB_OUTPUT"

          DATE=$(date +%Y-%m-%d)
          if [ -f CHANGELOG.md ]; then
            EXISTING=$(cat CHANGELOG.md)
            printf "# Changelog\n\n## %s (%s)\n\n- %s\n%s" \
              "$NEW_VERSION" "$DATE" "$CHANGELOG" \
              "$(echo "$EXISTING" | tail -n +2)" > CHANGELOG.md
          else
            printf "# Changelog\n\n## %s (%s)\n\n- %s\n" \
              "$NEW_VERSION" "$DATE" "$CHANGELOG" > CHANGELOG.md
          fi

      - name: Commit and tag release
        if: steps.bump.outputs.should_release == 'true'
        run: |
          git config user.name "github-actions[bot]"
          git config user.email "github-actions[bot]@users.noreply.github.com"
          git add package.json package-lock.json CHANGELOG.md
          git commit -m "chore: release ${{ steps.bump.outputs.new_version }} [skip ci]"
          git tag "${{ steps.bump.outputs.new_version }}"
          git push origin main --tags

      - name: Publish to npm
        if: steps.bump.outputs.should_release == 'true'
        run: npm publish --access public
        env:
          NODE_AUTH_TOKEN: ${{ secrets.NPM_TOKEN }}
```

### Key customization points

| Setting | Public npm | GitHub Package Registry |
|---------|-----------|------------------------|
| `registry-url` | `https://registry.npmjs.org` | `https://npm.pkg.github.com` |
| `NODE_AUTH_TOKEN` | `${{ secrets.NPM_TOKEN }}` | `${{ secrets.GITHUB_TOKEN }}` |
| `npm publish` | `--access public` | (no flag needed) |
| Permissions | `contents: write, models: read` | `contents: write, packages: write, models: read` |

### For monorepos (e.g., voice-agent-shared)

Add `working-directory: ./packages/shared` to npm steps and read version from the nested path:
```bash
CURRENT=$(node -p "require('./packages/shared/package.json').version")
```

### Safety guards built in

- LLM response validated — only `patch`, `minor`, `major`, `none` accepted
- Invalid response → release skipped (not broken)
- `[skip ci]` on release commit prevents infinite loops
- `concurrency` lock prevents parallel releases
- Tests must pass before LLM step runs
- `temperature: 0` for deterministic output

---

## 4. Dependabot

Only alerts on **major version bumps** and **security vulnerabilities**. Minor/patch updates are handled by `^` ranges in package.json automatically.

### `.github/dependabot.yml`

```yaml
version: 2

updates:
  - package-ecosystem: npm
    directory: /
    schedule:
      interval: weekly
      day: monday
    open-pull-requests-limit: 5
    labels:
      - dependencies
    ignore:
      - dependency-name: "*"
        update-types:
          - "version-update:semver-minor"
          - "version-update:semver-patch"

  - package-ecosystem: github-actions
    directory: /
    schedule:
      interval: monthly
    labels:
      - ci
    ignore:
      - dependency-name: "*"
        update-types:
          - "version-update:semver-minor"
          - "version-update:semver-patch"
```

For monorepos, set `directory: /packages/shared` (or wherever `package.json` lives).

---

## 5. Branch Protection (Manual — GitHub UI)

Do this once per repo:

1. Go to **repo** → **Settings** → **Branches**
2. Click **Add branch ruleset** (or "Add rule")
3. Branch name pattern: `main` (or `master`)
4. Enable:
   - **Require a pull request before merging**
   - **Require status checks to pass before merging** → search and add `test`
5. Save

This prevents direct pushes to main and ensures CI passes before every merge.

---

## 6. .gitignore

Standard entries every repo should have:

```
node_modules/
dist/
coverage/
*.tsbuildinfo
.env
.env.*
.DS_Store
*.log
.npmrc
```

For UI repos, also add:
```
.next/
out/
test-results/
playwright-report/
blob-report/
```

---

## 7. Commit Convention

Use conventional commits for best results with the LLM release pipeline:

| Prefix | Meaning | Version bump |
|--------|---------|-------------|
| `feat:` | New feature | minor |
| `fix:` | Bug fix | patch |
| `chore:` | Maintenance, no user impact | none (skip) |
| `docs:` | Documentation only | none (skip) |
| `ci:` | CI/CD changes | none (skip) |
| `test:` | Test changes only | none (skip) |
| `refactor:` | Code restructure, no behavior change | none (skip) |
| `BREAKING CHANGE:` | Breaking API change | major |

---

## 8. Checklist for New Repos

### All repos (published or deployed)

- [ ] `.github/workflows/ci.yml` — runs on PRs, Node 22
- [ ] `.github/dependabot.yml` — majors + security only
- [ ] `.gitignore` — includes `coverage/`, `dist/`, `node_modules/`, `.env`
- [ ] Branch protection enabled in GitHub Settings (require CI to pass)
- [ ] Actions pinned to latest: checkout@v6, setup-node@v6, ai-inference@v2
- [ ] `.nvmrc` set to `22` (if used)

### Published packages (npm / GitHub Package Registry) — add these:

- [ ] `vitest` installed, `npm test` script works
- [ ] Tests exist (export verification for type packages, integration tests for API packages)
- [ ] `.github/workflows/release.yml` — LLM-powered auto-release on main
- [ ] `engines: { "node": ">=22" }` in package.json

### Deployed apps (Vercel, AWS, Docker) — add these:

- [ ] CI runs `npm run build` (catches TypeScript errors)
- [ ] CI runs `npm run lint` (catches code quality issues)
- [ ] `NODE_AUTH_TOKEN` passed in CI if using private `@speakai/*` packages
- [ ] No release workflow needed — deployment is handled externally

---

## 9. Required Secrets

| Secret | Where | Purpose |
|--------|-------|---------|
| `GITHUB_TOKEN` | Auto-provided | LLM inference, git push, GitHub Releases |
| `NPM_TOKEN` | Repo settings → Secrets | npm publish (public registry only) |

For GitHub Package Registry, `GITHUB_TOKEN` handles both auth and publish — no extra secrets needed.

---

## 10. Action Versions Reference

Always use these versions (as of 2026-03):

| Action | Version |
|--------|---------|
| `actions/checkout` | `@v6` |
| `actions/setup-node` | `@v6` |
| `actions/ai-inference` | `@v2` |
| `actions/upload-artifact` | `@v4` |
| `actions/upload-pages-artifact` | `@v3` |
| `actions/deploy-pages` | `@v4` |
