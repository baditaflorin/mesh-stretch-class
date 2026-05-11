---
status: accepted
date: 2026-05-12
---

# 0002 — Role-asymmetric UI

## Context

The class has two kinds of participants with different information needs:

- The **instructor** is driving the sequence. They need to know the room's progress: are the students with me, or do I need to give the current pose more time? They have agency to advance, rewind, or end the class.
- A **student** is on a mat trying to follow along. Their primary information need is "what is the pose called, what should I be doing, how much time is left." They should not feel surveilled while wobbling.

If both roles see the same dashboard, two failure modes show up. (1) Students fixate on whether the aggregate counter has ticked up because of them — performative stillness. (2) The instructor doesn't have an at-a-glance signal of "is anyone still with me?"

## Decision

- **Instructor view:** the pose sequence list at the top, current pose enlarged in the centre with countdown, **aggregate stillness bar prominent** ("5 / 8 holding"), prev / next / end controls at the bottom. No per-student data.
- **Student view:** current pose name big, countdown big, current pose notes, a single small private indicator at the bottom showing whether **your own phone** is detecting stillness. **No aggregate counter is shown to students.**
- **End-of-class summary:** rendered only on the student's phone, computed locally from per-pose stillness accumulators that never leave the device.

## Consequences

- The instructor's "aggregate" is a single calm number, not a leaderboard. They can adjust pace based on the room without singling anyone out.
- Students see only what they need to do and a private signal of how they're doing. They cannot game the aggregate because they cannot see it.
- The end-of-class summary is therapeutic, not competitive. It tells you about you. No one else sees it.

## Alternatives considered

- **Identical view for both roles.** Rejected — creates the surveillance dynamic.
- **Instructor sees per-student names + stillness state.** Rejected by ADR 0003.
- **Aggregate on student screens.** Rejected — invites performative behaviour.
