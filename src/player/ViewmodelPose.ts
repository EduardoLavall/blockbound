import { PlayerActionMode } from "../combat/CombatTypes";

/** Camera-local poses. Equipment no longer shares a single tilted transform. */
export const VIEWMODEL_POSES = {
  [PlayerActionMode.Tool]: { position: [0.48, -0.55, -1.12], rotation: [-0.04, -0.1, -0.24] },
  [PlayerActionMode.Blade]: { position: [0.46, -0.55, -1.05], rotation: [-0.12, -0.08, -0.32] },
  [PlayerActionMode.Repeater]: { position: [0.32, -0.4, -0.8], rotation: [0, 0.16, 0] },
} as const;
