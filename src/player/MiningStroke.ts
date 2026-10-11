import { miningSwingCount } from "../survival/MiningTool";

export const MINING_CONTACT_PHASE = 0.64;
export const MINING_RECOVERY_SECONDS = 0.16;
export interface StrokePose { position: [number, number, number]; rotation: [number, number, number] }

/** The final contact lands at progress 1, so hardness/upgrades keep their existing timing. */
export function miningStrokePhase(progress: number, duration: number): number {
  const p = Math.max(0, Math.min(1, progress));
  if (p === 1) return MINING_CONTACT_PHASE;
  return (p * (miningSwingCount(duration) - 1 + MINING_CONTACT_PHASE)) % 1;
}
export function miningContactsCrossed(before: number, after: number, duration: number): number {
  const cycles = miningSwingCount(duration);
  const span = cycles - 1 + MINING_CONTACT_PHASE;
  const count = (progress: number) => Math.max(0, Math.min(cycles,
    Math.floor(Math.max(0, Math.min(1, progress)) * span + 1 - MINING_CONTACT_PHASE + 1e-9)));
  return Math.max(0, count(after) - count(before));
}

const KEYFRAMES: readonly { phase: number; pose: StrokePose }[] = [
  { phase: 0, pose: { position: [0, 0, 0], rotation: [0, 0, 0] } },
  { phase: 0.3, pose: { position: [0.04, 0.045, 0.1], rotation: [0.36, 0.06, -0.36] } },
  { phase: MINING_CONTACT_PHASE, pose: { position: [-0.24, 0.15, -0.17], rotation: [-0.58, -0.04, 0.75] } },
  { phase: 0.73, pose: { position: [-0.2, 0.12, -0.12], rotation: [-0.44, -0.04, 0.62] } },
  { phase: 1, pose: { position: [0, 0, 0], rotation: [0, 0, 0] } },
];
export function miningStrokePose(phase: number): StrokePose {
  const p = Math.max(0, Math.min(1, phase));
  const rightIndex = KEYFRAMES.findIndex((key, index) => index > 0 && p <= key.phase);
  const i = rightIndex < 0 ? KEYFRAMES.length - 1 : rightIndex;
  const a = KEYFRAMES[i - 1]!, b = KEYFRAMES[i]!;
  const t = (p - a.phase) / (b.phase - a.phase);
  // Accelerate the strike; lift, recoil and recovery ease in and out.
  const weight = i === 2 ? t * t * t : t * t * (3 - 2 * t);
  return {
    position: a.pose.position.map((value, axis) => value + (b.pose.position[axis]! - value) * weight) as StrokePose["position"],
    rotation: a.pose.rotation.map((value, axis) => value + (b.pose.rotation[axis]! - value) * weight) as StrokePose["rotation"],
  };
}
