import morning from "./morning-wakeup.json";
import desk from "./desk-recovery.json";
import quick from "./quick-yoga.json";

export type PoseStep = {
  name: string;
  holdSec: number;
  notes?: string;
};

export type Sequence = {
  id: string;
  name: string;
  description: string;
  poses: PoseStep[];
};

export const sequences: Sequence[] = [morning as Sequence, desk as Sequence, quick as Sequence];

export function sequenceById(id: string): Sequence {
  return sequences.find((s) => s.id === id) ?? (sequences[0] as Sequence);
}
