import { useEffect, useState } from "react";
import {
  loadSignalingUrl,
  loadTurnTokenUrl,
  resetIceServers,
  saveSignalingUrl,
  saveTurnTokenUrl,
} from "../sync/iceConfig";
import { appConfig } from "../../shared/config";
import { sequences } from "../stretch/sequences";

type Role = "instructor" | "student";

type Props = {
  open: boolean;
  onClose: () => void;
  roomId: string;
  onRoomChange: (next: string) => void;
  role: Role;
  onRoleChange: (next: Role) => void;
  sequenceId: string;
  onSequenceChange: (next: string) => void;
  jerkThreshold: number;
  onJerkChange: (next: number) => void;
};

export function SettingsDrawer({
  open,
  onClose,
  roomId,
  onRoomChange,
  role,
  onRoleChange,
  sequenceId,
  onSequenceChange,
  jerkThreshold,
  onJerkChange,
}: Props) {
  const [signaling, setSignaling] = useState(loadSignalingUrl());
  const [tokenUrl, setTokenUrl] = useState(loadTurnTokenUrl());

  useEffect(() => {
    if (open) {
      setSignaling(loadSignalingUrl());
      setTokenUrl(loadTurnTokenUrl());
    }
  }, [open]);

  if (!open) return null;

  return (
    <div className="settings-overlay" onClick={onClose}>
      <div className="settings-drawer" onClick={(e) => e.stopPropagation()}>
        <header>
          <h2>Settings</h2>
          <button type="button" onClick={onClose} aria-label="Close">
            ×
          </button>
        </header>

        <label>
          <span>Room ID</span>
          <input value={roomId} onChange={(e) => onRoomChange(e.target.value)} />
        </label>

        <label>
          <span>Role</span>
          <select value={role} onChange={(e) => onRoleChange(e.target.value as Role)}>
            <option value="student">Student (on the mat)</option>
            <option value="instructor">Instructor (drive the class)</option>
          </select>
        </label>

        <label>
          <span>Sequence</span>
          <select value={sequenceId} onChange={(e) => onSequenceChange(e.target.value)}>
            {sequences.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name} — {s.poses.length} poses
              </option>
            ))}
          </select>
        </label>

        <label>
          <span>Jerk threshold ({jerkThreshold.toFixed(2)})</span>
          <input
            type="range"
            min={0.1}
            max={2.0}
            step={0.05}
            value={jerkThreshold}
            onChange={(e) => onJerkChange(Number(e.target.value))}
          />
        </label>
        <p className="settings-help">
          Lower = stricter (treat tiny wobbles as "moving"). Higher = looser. Default 0.40 works for
          a phone on a yoga mat.
        </p>

        <hr />

        <h3>Self-hosted infra (advanced)</h3>
        <p className="settings-help">
          Override the default signaling and TURN endpoints. Leave blank to use the built-in
          defaults (<code>{appConfig.signalingUrl}</code> and <code>{appConfig.turnTokenUrl}</code>
          ).
        </p>

        <label>
          <span>Signaling URL</span>
          <input
            value={signaling}
            onChange={(e) => setSignaling(e.target.value)}
            placeholder={appConfig.signalingUrl}
          />
        </label>

        <label>
          <span>TURN credentials URL</span>
          <input
            value={tokenUrl}
            onChange={(e) => setTokenUrl(e.target.value)}
            placeholder={appConfig.turnTokenUrl}
          />
        </label>

        <div className="settings-actions">
          <button
            type="button"
            onClick={() => {
              saveSignalingUrl(signaling);
              saveTurnTokenUrl(tokenUrl);
              onClose();
              location.reload();
            }}
          >
            Save and reload
          </button>
          <button
            type="button"
            onClick={() => {
              saveSignalingUrl("");
              saveTurnTokenUrl("");
              resetIceServers();
              onClose();
              location.reload();
            }}
          >
            Reset to defaults
          </button>
        </div>

        <hr />

        <footer className="settings-footer">
          <a href={appConfig.repositoryUrl} target="_blank" rel="noreferrer">
            source on github
          </a>
          <span>
            v{appConfig.version} · {appConfig.commit}
          </span>
        </footer>
      </div>
    </div>
  );
}
