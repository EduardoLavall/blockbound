export interface PlayerBaseStats {
  maxHealth: number;
  walkSpeed: number;
  sprintSpeed: number;
  jumpSpeed: number;
  meleeDamage: number;
  meleeCooldown: number;
  meleeRange: number;
  rangedDamage: number;
  rangedCooldown: number;
  projectileSpeed: number;
  projectilePierce: number;
  critChance: number;
  critMultiplier: number;
  miningSpeedMultiplier: number;
  resourceYieldBonus: number;
  repairMultiplier: number;
}

export const BASE_PLAYER_STATS: Readonly<PlayerBaseStats> = {
  maxHealth: 140,
  walkSpeed: 5.4,
  sprintSpeed: 8.4,
  jumpSpeed: 7.2,
  meleeDamage: 34,
  meleeCooldown: 0.48,
  meleeRange: 2.45,
  rangedDamage: 24,
  rangedCooldown: 0.34,
  projectileSpeed: 25,
  projectilePierce: 0,
  critChance: 0.05,
  critMultiplier: 1.75,
  miningSpeedMultiplier: 1,
  resourceYieldBonus: 0,
  repairMultiplier: 1,
};

export interface EquipmentStatModifiers {
  walkSpeedMultiplier: number;
  sprintSpeedMultiplier: number;
  jumpSpeedMultiplier: number;
  meleeDamageMultiplier: number;
  meleeCooldownMultiplier: number;
  meleeRangeBonus: number;
  rangedDamageMultiplier: number;
  rangedCooldownMultiplier: number;
  projectileSpeedMultiplier: number;
  projectilePierceBonus: number;
  critChanceBonus: number;
  critMultiplierBonus: number;
  damageReductionBonus: number;
  miningSpeedMultiplier: number;
  resourceYieldBonus: number;
  repairMultiplier: number;
  burnChanceBonus: number;
  shockChanceBonus: number;
  markDurationBonus: number;
  lowHealthDamageBonus: number;
}

export const NEUTRAL_EQUIPMENT_MODIFIERS: Readonly<EquipmentStatModifiers> = {
  walkSpeedMultiplier: 1,
  sprintSpeedMultiplier: 1,
  jumpSpeedMultiplier: 1,
  meleeDamageMultiplier: 1,
  meleeCooldownMultiplier: 1,
  meleeRangeBonus: 0,
  rangedDamageMultiplier: 1,
  rangedCooldownMultiplier: 1,
  projectileSpeedMultiplier: 1,
  projectilePierceBonus: 0,
  critChanceBonus: 0,
  critMultiplierBonus: 0,
  damageReductionBonus: 0,
  miningSpeedMultiplier: 1,
  resourceYieldBonus: 0,
  repairMultiplier: 1,
  burnChanceBonus: 0,
  shockChanceBonus: 0,
  markDurationBonus: 0,
  lowHealthDamageBonus: 0,
};
