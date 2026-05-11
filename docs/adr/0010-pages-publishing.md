---
status: accepted
date: 2026-05-11
---

# 0010 — GitHub Pages publishing strategy

## Context

This account has GitHub Actions billing disabled. The Pages publishing flow cannot use the standard `actions/deploy-pages` workflow. The site must be served from a directory in `main`.

## Decision

- **Branch:** `main`
- **Source:** `/docs` folder
- **Build:** local-only, via `npm run build` which runs `bash scripts/build-pages.sh`.
- **Output:** the built site is **committed** to `docs/` on `main`. The pre-push hook (`scripts/smoke.sh`) re-runs the build and asserts `docs/index.html` exists, so a broken build cannot reach `main`.
- **Custom domain:** none for now. The Pages URL is `https://baditaflorin.github.io/mesh-stretch-class/`. Vite `base` is set to `/mesh-stretch-class/` to match.
- **SPA fallback:** `docs/404.html` is a copy of `docs/index.html` (made by `build-pages.sh`) so deep links work.
- **Cache busting:** Vite's default content-hashed asset filenames; the HTML references them directly, so Pages' caching cannot serve stale assets.

## Consequences

- Pages URL works from commit #1 — no Actions wait, no deploy queue.
- `docs/` lives in the repo, which inflates the working-tree size but is small (<300 KB gzipped for this app).
- `.gitignore` does **not** include `docs/`. `.prettierignore` does, so `prettier --check` is fast.
- Anyone with `git push` access ships production. Local pre-push hook is the only gate. If you skip the hook, you ship a broken site — don't.

## Alternatives considered

- **`gh-pages` branch.** Rejected — forces a separate build-and-push step that's easier to forget than committing `docs/` alongside the source.
- **Enable GitHub Actions billing.** Rejected — owner has explicitly chosen not to pay for Actions on this account. Local builds are fine for static sites.
