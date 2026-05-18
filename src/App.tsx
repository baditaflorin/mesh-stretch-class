import { useEffect, useState } from "react";
import { MeshShell } from "@baditaflorin/mesh-common";
import { Stretch } from "./features/stretch/Stretch";
import { SettingsExtras } from "./features/settings/SettingsExtras";
import { appConfig } from "./shared/config";
import { sequences } from "./features/stretch/sequences";

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
    <MeshShell
      config={appConfig}
      roomId={roomId}
      onRoomChange={setRoomId}
      settingsExtras={
        <SettingsExtras
          role={role}
          onRoleChange={setRole}
          sequenceId={sequenceId}
          onSequenceChange={setSequenceId}
          jerkThreshold={jerkThreshold}
          onJerkChange={setJerkThreshold}
        />
      }
    >
      <Stretch roomId={roomId} role={role} sequenceId={sequenceId} jerkThreshold={jerkThreshold} />
    </MeshShell>
  );
}
