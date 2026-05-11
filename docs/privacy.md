# Privacy threat model — mesh-stretch-class

## What other peers in the same room can see

Per peer in the awareness map:

- Your **role** — `"instructor"` or `"student"`.
- A boolean **`still`** flag (true/false) based on whether your phone's accelerometer jerk is below the threshold.
- The most recent **timestamp**.

The class state (current sequence, current pose index, when the pose started) is shared as a single Yjs map entry. No peer publishes a name, identifier, or step-by-step trajectory. The aggregate "X / N holding" is rendered from counting the `still` flags.

## What stays local

- All raw accelerometer samples. The DeviceMotion stream never leaves the phone.
- The **per-pose stillness percentages** at the end of class — these are accumulated only on the student's own phone and rendered as a private bar chart. They are never published to the mesh.
- Settings (room ID, role, sequence choice, jerk threshold, signaling overrides).

## What the signaling server sees

`signaling-server` sees the room name (`mesh-stretch-class:<roomId>`), encrypted SDP relays, and your IP. It cannot see role, stillness, or pose state.

## What the TURN server sees

`coturn-hetzner` sees encrypted DataChannel relay bytes when peers can't directly connect. It cannot decrypt the payload.

## Permissions asked

- **Motion / orientation** (`DeviceMotionEvent.requestPermission` on iOS) — required for the student role to detect stillness. Asked only on the "Allow motion & connect" tap.

## What's NOT in the threat model

- A determined attacker on the same Yjs document could correlate `awareness.clientID` with their own observed packet timing. The clientIDs are random per session; there's no fingerprint here.
- The instructor cannot see per-student data even in raw Yjs state? — technically the `still` flags are present in awareness; the **UI** refuses to render them per-peer (see ADR 0003). A modified client could of course read them. The app trusts the mesh; this is not Signal.
