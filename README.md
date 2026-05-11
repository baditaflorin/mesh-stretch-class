# mesh-stretch-class

[![Live](https://img.shields.io/badge/live-baditaflorin.github.io%2Fmesh--stretch--class-C699F0?style=flat-square)](https://baditaflorin.github.io/mesh-stretch-class/)
[![Version](https://img.shields.io/github/package-json/v/baditaflorin/mesh-stretch-class?style=flat-square&color=8c7eb0)](https://github.com/baditaflorin/mesh-stretch-class/blob/main/package.json)
[![License](https://img.shields.io/badge/license-MIT-blue?style=flat-square)](LICENSE)
[![No backend](https://img.shields.io/badge/backend-none-0e0a14?style=flat-square)](docs/adr/0001-deployment-mode.md)

> Peer-to-peer browser mesh. One device is the instructor; the rest are students on their mats. Phones detect "holding the pose" via accelerometer; the instructor sees only the aggregate.

**Live:** https://baditaflorin.github.io/mesh-stretch-class/

A group stretch / yoga class without an app to install. Pick **instructor** on the TV-tab or designated phone; everyone else stays on **student**. The instructor drives a pre-canned pose sequence with per-pose hold-times. Students' phones live on their mats and publish only a binary "still / moving" via accelerometer jerk threshold. The instructor sees "5 / 8 holding" — never who's wobbling. At end of class, each student gets a **private** per-pose stillness summary on their own phone.

## How it works

- Three bundled sequences in [`src/features/stretch/sequences/`](src/features/stretch/sequences): `morning-wakeup`, `desk-recovery`, `quick-yoga`. JSON; easy to add more.
- DeviceMotion `acceleration` (fallback to `accelerationIncludingGravity`) is sampled on each student phone. The frame-to-frame jerk magnitude `√(Δax² + Δay² + Δaz²)` is compared against a configurable threshold (default 0.40). Jerk is rotation-invariant.
- Class state (sequence id, current pose index, when the pose started) is a single `Y.Map` entry shared via [y-webrtc](https://github.com/yjs/y-webrtc). Per-peer state (role, still flag, timestamp) lives in awareness.
- Pose auto-advances when its hold-time elapses; instructor can prev/next manually.
- End-of-class: each student's phone locally renders a per-pose stillness bar chart. Nothing is published.

## Privacy threat model

See [docs/privacy.md](docs/privacy.md). The instructor sees only the aggregate "X / N holding." Per-pose results are private to the student's own phone.

## Architecture

- **Mode A** — pure GitHub Pages. ([ADR 0001](docs/adr/0001-deployment-mode.md))
- **WebRTC** — Yjs + y-webrtc with self-hosted signaling and TURN.

## Run it locally

```bash
git clone https://github.com/baditaflorin/mesh-stretch-class.git
cd mesh-stretch-class
npm install
npm run dev
```

Open one tab as instructor on a laptop; open the live URL on phones for students. Same room ID.

## Self-hosted infrastructure

| Repo                                                                   | Endpoint                               | Role                      |
| ---------------------------------------------------------------------- | -------------------------------------- | ------------------------- |
| [signaling-server](https://github.com/baditaflorin/signaling-server)   | `wss://turn.0docker.com/ws`            | y-webrtc protocol fan-out |
| [turn-token-server](https://github.com/baditaflorin/turn-token-server) | `https://turn.0docker.com/credentials` | HMAC TURN creds           |
| [coturn-hetzner](https://github.com/baditaflorin/coturn-hetzner)       | `turn:turn.0docker.com:3479`           | TURN relay                |

## ADRs

- [0001 — Deployment mode](docs/adr/0001-deployment-mode.md)
- [0002 — Role-asymmetric UI](docs/adr/0002-role-asymmetric-ui.md)
- [0003 — Aggregate display only, no per-name](docs/adr/0003-aggregate-only.md)
- [0010 — GitHub Pages publishing](docs/adr/0010-pages-publishing.md)

## License

[MIT](LICENSE) © 2026 Florin Badita
