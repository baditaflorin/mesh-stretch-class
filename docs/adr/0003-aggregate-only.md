---
status: accepted
date: 2026-05-12
---

# 0003 — Aggregate display only, no per-name

## Context

The instructor would arguably benefit from a per-student "Alice: moving, Bob: still" panel — they could give individual cues. The mesh's data layer (a Yjs awareness state per peer) easily supports this. The question is whether we should expose it.

## Decision

Even the instructor only sees the aggregate count "**X / N holding**." Per-peer stillness is _technically_ in the awareness map but the instructor UI never renders it grouped by identity. No display name is collected from students; peers are identified only by their ephemeral `awareness.clientID`.

## Consequences

- The instructor can read the room ("3 of 8 holding — they need more time on this pose") but cannot call out individuals ("hey Mark, you're wobbling"). The class stays gentle.
- A wobbly student gets a private signal on their own phone, not public attention.
- An instructor who wants to coach an individual does it the analog way — they look at the room and walk over. The dashboard refuses to be a yelling stick.
- This also makes the app deployable to drop-in classes where no one knows anyone's name. The mesh requires no identity, no account, no introduction.

## Alternatives considered

- **Show per-student names + state to the instructor.** Rejected — invites surveillance dynamics that don't fit a stretch class.
- **Aggregate plus an anonymous list of dots ("○ ○ ● ○ ●").** Considered — gives the instructor more granularity than just a number. Rejected for v1 as marginal; revisit if instructors complain.
- **Opt-in per-student attribution.** Considered. Adds a second toggle for marginal benefit. Excluded for now.
