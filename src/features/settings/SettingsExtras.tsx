import { sequences } from "../stretch/sequences";

type Role = "instructor" | "student";

type Props = {
  role: Role;
  onRoleChange: (next: Role) => void;
  sequenceId: string;
  onSequenceChange: (next: string) => void;
  jerkThreshold: number;
  onJerkChange: (next: number) => void;
};

export function SettingsExtras({
  role,
  onRoleChange,
  sequenceId,
  onSequenceChange,
  jerkThreshold,
  onJerkChange,
}: Props) {
  return (
    <>
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
        Lower = stricter (treat tiny wobbles as "moving"). Higher = looser. Default 0.40 works for a
        phone on a yoga mat.
      </p>
    </>
  );
}
