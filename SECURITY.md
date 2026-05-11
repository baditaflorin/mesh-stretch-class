# Security policy

There is no backend, no auth, no secrets, and no PII at runtime. The attack surface is:

- Whatever lives in the user's browser (Yjs CRDT, awareness, localStorage).
- The y-webrtc protocol against my signaling server.
- The DTLS/SRTP tunnel against my TURN relay.

If you find a real vulnerability (XSS, signaling abuse that escalates beyond the room, anything else worth a CVE), email `baditaflorin@gmail.com`. Please don't open a public issue first.
