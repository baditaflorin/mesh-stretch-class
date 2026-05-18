import { useEffect, useState } from "react";
import { Stretch } from "./features/stretch/Stretch";
import { SettingsDrawer } from "./features/settings/SettingsDrawer";
import { appConfig } from "./shared/config";
import { sequences } from "./features/stretch/sequences";
import { InviteShareButton, MeshBeacon } from "@baditaflorin/mesh-common";

type Role = "instructor" | "student";

const STORAGE = {
  room: `${appConfig.storagePrefix}:room`,
  role: `${appConfig.storagePrefix}:role`,
  sequence: `${appConfig.storagePrefix}:sequence`,
  jerk: `${appConfig.storagePrefix}:jerk`,
};

function readString(key: string, fallback: string): string {
  return localStorage.getItem(key) ?? fallback;
}
function readNumber(key: string, fallback: number): number {
  const raw = localStorage.getItem(key);
  if (raw === null) return fallback;
  const n = Number(raw);
  return Number.isFinite(n) ? n : fallback;
}

export function App() {
  const [roomId, setRoomId] = useState(() => readString(STORAGE.room, "default"));
  const [role, setRole] = useState<Role>(() => readString(STORAGE.role, "student") as Role);
  const [sequenceId, setSequenceId] = useState(() =>
    readString(STORAGE.sequence, sequences[0]?.id ?? "morning-wakeup"),
  );
  const [jerkThreshold, setJerkThreshold] = useState(() => readNumber(STORAGE.jerk, 0.4));
  const [settingsOpen, setSettingsOpen] = useState(false);

  useEffect(() => {
    localStorage.setItem(STORAGE.room, roomId);
  }, [roomId]);
  useEffect(() => {
    localStorage.setItem(STORAGE.role, role);
  }, [role]);
  useEffect(() => {
    localStorage.setItem(STORAGE.sequence, sequenceId);
  }, [sequenceId]);
  useEffect(() => {
    localStorage.setItem(STORAGE.jerk, String(jerkThreshold));
  }, [jerkThreshold]);

  return (
    <div className="app-root">
      <Stretch roomId={roomId} role={role} sequenceId={sequenceId} jerkThreshold={jerkThreshold} />

      <InviteShareButton appName={appConfig.appName} roomId={roomId} />
      <MeshBeacon app={appConfig.appName} room={roomId} />

      <button
        type="button"
        className="settings-fab"
        onClick={() => setSettingsOpen(true)}
        aria-label="Open settings"
      >
        ⚙
      </button>

      <div className="self-ref">
        <a href={appConfig.repositoryUrl} target="_blank" rel="noreferrer">
          source
        </a>
        <span aria-hidden="true">·</span>
        <a href={appConfig.paypalUrl} target="_blank" rel="noreferrer">
          tip ♥
        </a>
        <span aria-hidden="true">·</span>
        <span>
          v{appConfig.version} · {appConfig.commit}
        </span>
      </div>

      <SettingsDrawer
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        roomId={roomId}
        onRoomChange={setRoomId}
        role={role}
        onRoleChange={setRole}
        sequenceId={sequenceId}
        onSequenceChange={setSequenceId}
        jerkThreshold={jerkThreshold}
        onJerkChange={setJerkThreshold}
      />
    </div>
  );
}
