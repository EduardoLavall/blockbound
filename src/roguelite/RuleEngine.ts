import type { EnemyInstance } from "../ai/EnemySystem";
import { EnemyStatus } from "../combat/CombatTypes";
import { BASE_PLAYER_STATS } from "../player/PlayerStats";

export class RuleEngine {
  meleeDamageMultiplier = 1;
  meleeCooldownMultiplier = 1;
  meleeRangeBonus = 0;

  rangedDamageMultiplier = 1;
  rangedCooldownMultiplier = 1;
  projectileSpeedMultiplier = 1;
  projectilePierceBonus = 0;

  critChance = BASE_PLAYER_STATS.critChance;
  critMultiplier = BASE_PLAYER_STATS.critMultiplier;

  playerDamageReduction = 0;
  structureDamageReduction = 0;
  coreDamageReduction = 0;

  turretDamageMultiplier = 1;
  turretCooldownMultiplier = 1;
  turretBurnChance = 0;
  turretShockChance = 0;
  markedTurretBonus = 0;

  spikeDamageMultiplier = 1;
  spikeCooldownMultiplier = 1;
  shockedSpikeBonus = 0;

  miningSpeedMultiplier = BASE_PLAYER_STATS.miningSpeedMultiplier;
  resourceYieldBonus = BASE_PLAYER_STATS.resourceYieldBonus;
  repairMultiplier = BASE_PLAYER_STATS.repairMultiplier;

  playerBurnChance = 0;
  playerShockChance = 0;
  playerMarkDuration = 0;
  statusDamageBonus = 0;
  shockSlowFactor = 0.72;

  killHeal = 0;
  killCoreHeal = 0;
  killRepair = 0;
  killMetalEvery = 0;
  killCrystalEvery = 0;

  lowHealthDamageBonus = 0;

  playerOutgoingMultiplier(healthRatio: number): number {
    if (healthRatio < 0.5) {
      return 1 + this.lowHealthDamageBonus;
    }
    return 1;
  }

  modifyPlayerIncomingDamage(base: number): number {
    return base * (1 - Math.min(0.7, this.playerDamageReduction));
  }

  modifyStructureIncomingDamage(base: number): number {
    return base * (1 - Math.min(0.7, this.structureDamageReduction));
  }

  modifyCoreIncomingDamage(base: number): number {
    return base * (1 - Math.min(0.7, this.coreDamageReduction));
  }

  modifyTurretDamage(base: number, enemy: EnemyInstance): number {
    let multiplier = this.turretDamageMultiplier;

    if (enemy.statuses.has(EnemyStatus.Mark)) {
      multiplier *= 1 + this.markedTurretBonus;
    }
    if (enemy.statuses.has(EnemyStatus.Burn)) {
      multiplier *= 1 + this.statusDamageBonus;
    }

    return base * multiplier;
  }

  modifySpikeDamage(base: number, enemy: EnemyInstance): number {
    let multiplier = this.spikeDamageMultiplier;

    if (enemy.statuses.has(EnemyStatus.Shock)) {
      multiplier *= 1 + this.shockedSpikeBonus;
    }
    if (enemy.statuses.has(EnemyStatus.Burn)) {
      multiplier *= 1 + this.statusDamageBonus;
    }

    return base * multiplier;
  }

  modifyMiningDuration(base: number): number {
    return base / Math.max(0.2, this.miningSpeedMultiplier);
  }

  modifyRepairAmount(base: number): number {
    return base * this.repairMultiplier;
  }
}
