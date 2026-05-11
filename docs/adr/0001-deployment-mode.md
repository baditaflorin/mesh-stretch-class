---
status: accepted
date: 2026-05-11
---

# 0001 — Deployment mode: Mode A (pure GitHub Pages)

## Context

`mesh-stretch-class` is a peer-to-peer browser app. The mesh of phones needs to share a small amount of shared state (current timestamps) and exchange WebRTC signaling. The signaling and TURN infrastructure already exists as a separate, reusable service ([signaling-server](https://github.com/baditaflorin/signaling-server), [turn-token-server](https://github.com/baditaflorin/turn-token-server), [coturn-hetzner](https://github.com/baditaflorin/coturn-hetzner)) and is not specific to this app.

## Decision

Ship as **Mode A — pure GitHub Pages**. The built site is committed to `docs/` on `main` and served directly by GitHub Pages. There is no runtime backend specific to this app.

The three pieces of shared infrastructure (signaling, TURN credential server, TURN relay) are referenced as external services, not bundled with this repo. They are user-overridable from the Settings drawer.

## Consequences

- Zero hosting cost for this app. Zero secrets in this app.
- The live URL is `https://baditaflorin.github.io/mesh-stretch-class/`, available from commit #1.
- If `wss://turn.0docker.com/ws` goes down, every user can paste their own signaling URL into Settings and keep going.
- STUN-only fallback is automatic if the TURN credential endpoint is unreachable; cross-NAT may fail in that case but local Wi-Fi pairs will still work.
- No build-time secrets. No runtime secrets. No `.env` shipped to the browser.
- The `docs/` directory must be in the repo (not gitignored). The `.prettierignore` excludes it from `prettier --check` to keep the pre-commit hook fast.

## Alternatives considered

- **Mode B (pre-built data)**: rejected — there is no offline-generated data; mesh state is created by users at runtime.
- **Mode C (Docker backend)**: rejected — no per-app server logic is needed. Signaling and TURN are general infrastructure shared across all my mesh apps.
