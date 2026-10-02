export interface MiningToolDefinition {
  id: "pickaxe";
  name: string;
  miningPower: number;
  combatDamage: number;
  combatCooldown: number;
  combatRange: number;
  swingInterval: number;
}

export const PICKAXE: Readonly<MiningToolDefinition> = {
  id: "pickaxe",
  name: "Pickaxe",
  miningPower: 1,
  combatDamage: 10,
  combatCooldown: 0.55,
  combatRange: 2.1,
  swingInterval: 0.34,
};

export function toolAdjustedMiningDuration(
  hardness: number,
  tool: MiningToolDefinition = PICKAXE,
): number {
  if (!Number.isFinite(hardness)) return Infinity;
  return hardness / Math.max(0.1, tool.miningPower);
}

export function miningSwingCount(
  duration: number,
  tool: MiningToolDefinition = PICKAXE,
): number {
  if (!Number.isFinite(duration) || duration <= 0) return 1;
  return Math.max(1, Math.round(duration / tool.swingInterval));
}
