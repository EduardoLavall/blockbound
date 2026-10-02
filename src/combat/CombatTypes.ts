export enum PlayerActionMode {
  Tool = "tool",
  Blade = "blade",
  Repeater = "repeater",
}

export enum EnemyStatus {
  Burn = "burn",
  Shock = "shock",
  Mark = "mark",
}

export type DamageSource =
  | "player-melee"
  | "player-projectile"
  | "turret"
  | "spike"
  | "burn";

export interface EnemyStatusState {
  remaining: number;
  magnitude: number;
  tick: number;
}
