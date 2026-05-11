import { useEffect, useMemo, useRef, useState } from "react";
import { createRoomSync } from "../sync/yjsRoom";
import { maybeFetchTurnCredentials } from "../sync/iceConfig";
import { sequenceById, type Sequence } from "./sequences";

type Role = "instructor" | "student";

type ClassState = {
  sequenceId: string;
  currentIdx: number;
  poseStartedAt: number | null;
};

type AwarenessStretch = {
  role?: Role;
  still?: boolean;
  ts?: number;
};

type Awareness = {
  clientID: number;
  setLocalStateField: (key: string, value: unknown) => void;
  getStates: () => Map<number, Record<string, unknown>>;
  on: (event: string, cb: () => void) => void;
  off: (event: string, cb: () => void) => void;
};

type DeviceMotionRequest = {
  requestPermission?: () => Promise<"granted" | "denied">;
};

type Props = {
  roomId: string;
  role: Role;
  sequenceId: string;
  jerkThreshold: number;
};

export function Stretch({ roomId, role, sequenceId, jerkThreshold }: Props) {
  const sequence: Sequence = sequenceById(sequenceId);
  const [armed, setArmed] = useState(false);
  const [now, setNow] = useState(Date.now());
  const [classState, setClassState] = useState<ClassState>({
    sequenceId: sequence.id,
    currentIdx: -1,
    poseStartedAt: null,
  });
  const [stillCount, setStillCount] = useState(0);
  const [totalStudents, setTotalStudents] = useState(0);
  const [permissionError, setPermissionError] = useState<string | null>(null);

  // Local stillness accumulators per pose (for end-of-class private summary)
  const stillMsPerPoseRef = useRef<number[]>([]);
  const stillRef = useRef(true);
  const lastTickTsRef = useRef(0);
  const lastPoseIdxRef = useRef(-1);

  const mesh = useMemo(() => {
    if (!armed) return null;
    return createRoomSync(roomId);
  }, [armed, roomId]);

  useEffect(() => {
    if (!armed) return;
    void maybeFetchTurnCredentials();
  }, [armed]);

  useEffect(() => {
    return () => {
      mesh?.provider?.destroy();
    };
  }, [mesh]);

  // DeviceMotion → stillness via jerk threshold
  useEffect(() => {
    if (!armed || role !== "student") return undefined;
    let cancelled = false;
    let onMotion: ((e: DeviceMotionEvent) => void) | null = null;

    const start = async () => {
      const req = (window as unknown as { DeviceMotionEvent?: DeviceMotionRequest })
        .DeviceMotionEvent;
      if (req?.requestPermission) {
        try {
          const result = await req.requestPermission();
          if (result !== "granted") {
            setPermissionError("Motion permission denied — stillness can't be measured.");
            return;
          }
        } catch (err) {
          setPermissionError(`Motion permission error: ${err}`);
          return;
        }
      }
      if (cancelled) return;

      let lastA = { x: 0, y: 0, z: 0 };
      onMotion = (e: DeviceMotionEvent) => {
        const a = e.acceleration ?? e.accelerationIncludingGravity;
        if (!a) return;
        const ax = a.x ?? 0,
          ay = a.y ?? 0,
          az = a.z ?? 0;
        const jx = ax - lastA.x;
        const jy = ay - lastA.y;
        const jz = az - lastA.z;
        const jerk = Math.sqrt(jx * jx + jy * jy + jz * jz);
        lastA = { x: ax, y: ay, z: az };
        stillRef.current = jerk < jerkThreshold;
      };
      window.addEventListener("devicemotion", onMotion);
    };

    void start();

    return () => {
      cancelled = true;
      if (onMotion) window.removeEventListener("devicemotion", onMotion);
    };
  }, [armed, role, jerkThreshold]);

  // Yjs class map + awareness wiring
  useEffect(() => {
    if (!mesh?.provider) return undefined;
    const classMap = mesh.doc.getMap<ClassState>("class");
    const awareness = (mesh.provider as unknown as { awareness: Awareness }).awareness;

    // Publish role periodically
    const publishLoop = setInterval(() => {
      awareness.setLocalStateField("stretch", {
        role,
        still: stillRef.current,
        ts: Date.now(),
      });
    }, 1000);
    awareness.setLocalStateField("stretch", { role, still: stillRef.current, ts: Date.now() });

    const refreshClass = () => {
      const state = classMap.get("state");
      if (state) setClassState(state);
    };
    classMap.observe(refreshClass);
    refreshClass();

    const refreshAwareness = () => {
      const states = awareness.getStates();
      let still = 0;
      let students = 0;
      const fresh = Date.now() - 5000;
      states.forEach((s) => {
        const v = s["stretch"] as AwarenessStretch | undefined;
        if (!v || (v.ts ?? 0) < fresh) return;
        if (v.role === "student") {
          students++;
          if (v.still) still++;
        }
      });
      setStillCount(still);
      setTotalStudents(students);
    };
    awareness.on("change", refreshAwareness);
    refreshAwareness();

    return () => {
      clearInterval(publishLoop);
      classMap.unobserve(refreshClass);
      awareness.off("change", refreshAwareness);
    };
  }, [mesh, role]);

  // Local clock + per-pose stillness accumulator
  useEffect(() => {
    const i = setInterval(() => {
      const t = Date.now();
      const dt = lastTickTsRef.current ? t - lastTickTsRef.current : 0;
      lastTickTsRef.current = t;
      // accumulate stillness in current pose bucket
      const idx = classState.currentIdx;
      if (
        role === "student" &&
        idx >= 0 &&
        idx < sequence.poses.length &&
        stillRef.current &&
        classState.poseStartedAt !== null
      ) {
        if (lastPoseIdxRef.current !== idx) {
          // initialise bucket
          stillMsPerPoseRef.current[idx] ??= 0;
          lastPoseIdxRef.current = idx;
        }
        stillMsPerPoseRef.current[idx] = (stillMsPerPoseRef.current[idx] ?? 0) + dt;
      }
      setNow(t);
    }, 500);
    return () => clearInterval(i);
  }, [role, sequence, classState]);

  // Auto-advance pose when hold time has elapsed (instructor only).
  useEffect(() => {
    if (role !== "instructor" || !mesh) return undefined;
    if (classState.currentIdx < 0 || classState.poseStartedAt === null) return undefined;
    const pose = sequence.poses[classState.currentIdx];
    if (!pose) return undefined;
    const remaining = classState.poseStartedAt + pose.holdSec * 1000 - Date.now();
    if (remaining <= 0) {
      advancePose();
      return undefined;
    }
    const t = setTimeout(advancePose, remaining);
    return () => clearTimeout(t);

    function advancePose() {
      if (!mesh) return;
      const classMap = mesh.doc.getMap<ClassState>("class");
      const nextIdx = classState.currentIdx + 1;
      const nextState: ClassState =
        nextIdx >= sequence.poses.length
          ? { sequenceId: sequence.id, currentIdx: -2, poseStartedAt: null } // -2 = ended
          : { sequenceId: sequence.id, currentIdx: nextIdx, poseStartedAt: Date.now() };
      mesh.doc.transact(() => classMap.set("state", nextState));
    }
  }, [role, mesh, classState, sequence]);

  const startClass = () => {
    if (!mesh) return;
    stillMsPerPoseRef.current = [];
    lastPoseIdxRef.current = -1;
    const classMap = mesh.doc.getMap<ClassState>("class");
    mesh.doc.transact(() =>
      classMap.set("state", {
        sequenceId: sequence.id,
        currentIdx: 0,
        poseStartedAt: Date.now(),
      }),
    );
  };

  const endClass = () => {
    if (!mesh) return;
    const classMap = mesh.doc.getMap<ClassState>("class");
    mesh.doc.transact(() =>
      classMap.set("state", {
        sequenceId: sequence.id,
        currentIdx: -2,
        poseStartedAt: null,
      }),
    );
  };

  const skipPose = (delta: number) => {
    if (!mesh) return;
    const classMap = mesh.doc.getMap<ClassState>("class");
    const nextIdx = Math.max(0, Math.min(sequence.poses.length - 1, classState.currentIdx + delta));
    mesh.doc.transact(() =>
      classMap.set("state", {
        sequenceId: sequence.id,
        currentIdx: nextIdx,
        poseStartedAt: Date.now(),
      }),
    );
  };

  if (!armed) {
    return (
      <div className="stretch-arm">
        <h1>mesh-stretch-class</h1>
        <p>
          Group stretch / yoga class over WebRTC. Pick your role in Settings:{" "}
          <strong>instructor</strong> drives the sequence; <strong>students</strong> follow along
          while their phones detect "holding the pose" via accelerometer. Only the aggregate "5 / 8
          holding" is shared — never per-name.
        </p>
        <p className="stretch-hint">
          You are joining as <strong>{role}</strong>. Sequence: <em>{sequence.name}</em>.
        </p>
        <button type="button" className="stretch-arm-button" onClick={() => setArmed(true)}>
          {role === "instructor" ? "Open instructor view" : "Allow motion & connect"}
        </button>
        <p className="stretch-hint">
          Room <code>{roomId}</code>
        </p>
      </div>
    );
  }

  const currentPose =
    classState.currentIdx >= 0 && classState.currentIdx < sequence.poses.length
      ? sequence.poses[classState.currentIdx]
      : null;
  const remaining =
    currentPose && classState.poseStartedAt !== null
      ? Math.max(0, classState.poseStartedAt + currentPose.holdSec * 1000 - now)
      : 0;
  const ended = classState.currentIdx === -2;
  const idle = classState.currentIdx === -1;

  if (role === "instructor") {
    return (
      <div className="stretch-stage stretch-instructor">
        <div className="stretch-aggregate">
          <span className="stretch-aggregate-num">
            {stillCount} / {totalStudents}
          </span>
          <span className="stretch-aggregate-label">holding the pose</span>
        </div>

        {idle && (
          <div className="stretch-center">
            <p>
              Ready to start <em>{sequence.name}</em> ({sequence.poses.length} poses).
            </p>
            <button type="button" className="stretch-primary" onClick={startClass}>
              Start class
            </button>
          </div>
        )}

        {ended && (
          <div className="stretch-center">
            <h2>Class ended.</h2>
            <button type="button" className="stretch-primary" onClick={startClass}>
              Run again
            </button>
          </div>
        )}

        {currentPose && (
          <>
            <div className="stretch-pose-big">
              <h2>{currentPose.name}</h2>
              <p className="stretch-pose-notes">{currentPose.notes}</p>
              <div className="stretch-countdown">{formatSec(remaining)}</div>
            </div>
            <ul className="stretch-sequence-list">
              {sequence.poses.map((p, i) => (
                <li
                  key={i}
                  className={
                    i === classState.currentIdx
                      ? "stretch-pose-current"
                      : i < classState.currentIdx
                        ? "stretch-pose-done"
                        : ""
                  }
                >
                  <span>{i + 1}.</span> {p.name} <small>{p.holdSec}s</small>
                </li>
              ))}
            </ul>
            <div className="stretch-controls">
              <button type="button" onClick={() => skipPose(-1)}>
                ← Prev
              </button>
              <button type="button" onClick={() => skipPose(1)}>
                Next →
              </button>
              <button type="button" onClick={endClass} className="stretch-danger">
                End class
              </button>
            </div>
          </>
        )}
      </div>
    );
  }

  // Student view
  if (idle) {
    return (
      <div className="stretch-stage stretch-student">
        <div className="stretch-center">
          <p>
            Waiting for instructor to start <em>{sequence.name}</em>…
          </p>
          {permissionError && <p className="stretch-error">{permissionError}</p>}
          <small>
            Place your phone on the mat. You are {stillRef.current ? "still" : "moving"}.
          </small>
        </div>
      </div>
    );
  }

  if (ended) {
    const totalSec = sequence.poses.reduce((acc, p) => acc + p.holdSec, 0);
    const stillSec = stillMsPerPoseRef.current.reduce((acc, ms) => acc + ms, 0) / 1000;
    const ratio = totalSec > 0 ? Math.min(1, stillSec / totalSec) : 0;
    return (
      <div className="stretch-stage stretch-student stretch-summary">
        <h2>Class ended.</h2>
        <p>
          You held still <strong>{Math.round(ratio * 100)}%</strong> of the class. (Visible only on
          this phone.)
        </p>
        <ul className="stretch-summary-list">
          {sequence.poses.map((p, i) => {
            const ms = stillMsPerPoseRef.current[i] ?? 0;
            const pct = p.holdSec > 0 ? Math.min(100, (ms / 1000 / p.holdSec) * 100) : 0;
            return (
              <li key={i}>
                <div className="stretch-summary-row">
                  <span>{p.name}</span>
                  <span>{Math.round(pct)}%</span>
                </div>
                <div className="stretch-summary-bar">
                  <div style={{ width: `${pct}%` }} />
                </div>
              </li>
            );
          })}
        </ul>
      </div>
    );
  }

  return (
    <div className="stretch-stage stretch-student">
      {currentPose && (
        <>
          <div className="stretch-pose-name">{currentPose.name}</div>
          <div className="stretch-countdown-big">{formatSec(remaining)}</div>
          {currentPose.notes && <p className="stretch-pose-notes">{currentPose.notes}</p>}
          <div className={`stretch-still-indicator ${stillRef.current ? "ok" : "moving"}`}>
            you are {stillRef.current ? "holding" : "moving"}
          </div>
          {permissionError && <p className="stretch-error">{permissionError}</p>}
        </>
      )}
    </div>
  );
}

function formatSec(ms: number): string {
  const s = Math.ceil(ms / 1000);
  return `${s}s`;
}
