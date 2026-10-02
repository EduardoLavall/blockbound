import type { PlayerVitals } from "../combat/PlayerVitals";
import type { RuleEngine } from "../roguelite/RuleEngine";
import {
  BASE_PLAYER_STATS,
  NEUTRAL_EQUIPMENT_MODIFIERS,
  type EquipmentStatModifiers,
} from "./PlayerStats";

export interface PlayerStatusSnapshot {
  health: {
    current: number;
    max: number;
    ratio: number;
  };
  mobility: {
    walkSpeed: number;
    sprintSpeed: number;
    jumpSpeed: number;
  };
  melee: {
    baseDamage: number;
    damage: number;
    baseCooldown: number;
    cooldown: number;
    attacksPerSecond: number;
    baseRange: number;
    range: number;
    dpsBeforeCrit: number;
  };
  ranged: {
    baseDamage: number;
    damage: number;
    baseCooldown: number;
    cooldown: number;
    shotsPerSecond: number;
    baseProjectileSpeed: number;
    projectileSpeed: number;
    pierce: number;
    dpsBeforeCrit: number;
  };
  crit: {
    chance: number;
    multiplier: number;
  };
  defense: {
    damageReduction: number;
  };
  utility: {
    miningSpeedMultiplier: number;
    resourceYieldBonus: number;
    repairMultiplier: number;
  };
  statuses: {
    burnChance: number;
    shockChance: number;
    markDuration: number;
  };
  conditional: {
    lowHealthDamageBonus: number;
    lowHealthActive: boolean;
  };
  killEffects: {
    playerHeal: number;
    coreHeal: number;
    repair: number;
    metalEvery: number;
    crystalEvery: number;
  };
}

export interface PlayerStatusLine {
  category: string;
  label: string;
  base: string;
  run: string;
  equipment: string;
  final: string;
}

export class PlayerStatus {
  private equipment: EquipmentStatModifiers = {
    ...NEUTRAL_EQUIPMENT_MODIFIERS,
  };

  constructor(
    private readonly rules: RuleEngine,
    private readonly vitals: PlayerVitals,
  ) {}

  setEquipmentModifiers(
    patch: Partial<EquipmentStatModifiers>,
  ): void {
    this.equipment = {
      ...NEUTRAL_EQUIPMENT_MODIFIERS,
      ...patch,
    };
  }

  get equipmentModifiers(): Readonly<EquipmentStatModifiers> {
    return this.equipment;
  }

  snapshot(): PlayerStatusSnapshot {
    const meleeDamage =
      BASE_PLAYER_STATS.meleeDamage *
      this.rules.meleeDamageMultiplier *
      this.equipment.meleeDamageMultiplier;
    const meleeCooldown =
      BASE_PLAYER_STATS.meleeCooldown *
      this.rules.meleeCooldownMultiplier *
      this.equipment.meleeCooldownMultiplier;

    const rangedDamage =
      BASE_PLAYER_STATS.rangedDamage *
      this.rules.rangedDamageMultiplier *
      this.equipment.rangedDamageMultiplier;
    const rangedCooldown =
      BASE_PLAYER_STATS.rangedCooldown *
      this.rules.rangedCooldownMultiplier *
      this.equipment.rangedCooldownMultiplier;

    const critChance = clamp(
      BASE_PLAYER_STATS.critChance +
        (this.rules.critChance - 0.05) +
        this.equipment.critChanceBonus,
      0,
      0.75,
    );
    const critMultiplier =
      BASE_PLAYER_STATS.critMultiplier +
      (this.rules.critMultiplier - 1.75) +
      this.equipment.critMultiplierBonus;

    const damageReduction = clamp(
      this.rules.playerDamageReduction +
        this.equipment.damageReductionBonus,
      0,
      0.7,
    );

    const miningSpeedMultiplier =
      BASE_PLAYER_STATS.miningSpeedMultiplier *
      this.rules.miningSpeedMultiplier *
      this.equipment.miningSpeedMultiplier;

    const repairMultiplier =
      BASE_PLAYER_STATS.repairMultiplier *
      this.rules.repairMultiplier *
      this.equipment.repairMultiplier;

    const lowHealthDamageBonus =
      this.rules.lowHealthDamageBonus +
      this.equipment.lowHealthDamageBonus;

    return {
      health: {
        current: this.vitals.health.current,
        max: this.vitals.health.max,
        ratio: this.vitals.ratio,
      },
      mobility: {
        walkSpeed:
          BASE_PLAYER_STATS.walkSpeed *
          this.equipment.walkSpeedMultiplier,
        sprintSpeed:
          BASE_PLAYER_STATS.sprintSpeed *
          this.equipment.sprintSpeedMultiplier,
        jumpSpeed:
          BASE_PLAYER_STATS.jumpSpeed *
          this.equipment.jumpSpeedMultiplier,
      },
      melee: {
        baseDamage: BASE_PLAYER_STATS.meleeDamage,
        damage: meleeDamage,
        baseCooldown: BASE_PLAYER_STATS.meleeCooldown,
        cooldown: meleeCooldown,
        attacksPerSecond: 1 / meleeCooldown,
        baseRange: BASE_PLAYER_STATS.meleeRange,
        range:
          BASE_PLAYER_STATS.meleeRange +
          this.rules.meleeRangeBonus +
          this.equipment.meleeRangeBonus,
        dpsBeforeCrit: meleeDamage / meleeCooldown,
      },
      ranged: {
        baseDamage: BASE_PLAYER_STATS.rangedDamage,
        damage: rangedDamage,
        baseCooldown: BASE_PLAYER_STATS.rangedCooldown,
        cooldown: rangedCooldown,
        shotsPerSecond: 1 / rangedCooldown,
        baseProjectileSpeed: BASE_PLAYER_STATS.projectileSpeed,
        projectileSpeed:
          BASE_PLAYER_STATS.projectileSpeed *
          this.rules.projectileSpeedMultiplier *
          this.equipment.projectileSpeedMultiplier,
        pierce:
          BASE_PLAYER_STATS.projectilePierce +
          this.rules.projectilePierceBonus +
          this.equipment.projectilePierceBonus,
        dpsBeforeCrit: rangedDamage / rangedCooldown,
      },
      crit: {
        chance: critChance,
        multiplier: critMultiplier,
      },
      defense: {
        damageReduction,
      },
      utility: {
        miningSpeedMultiplier,
        resourceYieldBonus:
          BASE_PLAYER_STATS.resourceYieldBonus +
          this.rules.resourceYieldBonus +
          this.equipment.resourceYieldBonus,
        repairMultiplier,
      },
      statuses: {
        burnChance: clamp(
          this.rules.playerBurnChance +
            this.equipment.burnChanceBonus,
          0,
          1,
        ),
        shockChance: clamp(
          this.rules.playerShockChance +
            this.equipment.shockChanceBonus,
          0,
          1,
        ),
        markDuration:
          this.rules.playerMarkDuration +
          this.equipment.markDurationBonus,
      },
      conditional: {
        lowHealthDamageBonus,
        lowHealthActive: this.vitals.ratio < 0.5,
      },
      killEffects: {
        playerHeal: this.rules.killHeal,
        coreHeal: this.rules.killCoreHeal,
        repair: this.rules.killRepair,
        metalEvery: this.rules.killMetalEvery,
        crystalEvery: this.rules.killCrystalEvery,
      },
    };
  }

  outgoingDamageMultiplier(): number {
    const snapshot = this.snapshot();
    return snapshot.conditional.lowHealthActive
      ? 1 + snapshot.conditional.lowHealthDamageBonus
      : 1;
  }

  modifyIncomingDamage(base: number): number {
    return base * (1 - this.snapshot().defense.damageReduction);
  }

  modifyMiningDuration(baseDuration: number): number {
    return (
      baseDuration /
      Math.max(0.2, this.snapshot().utility.miningSpeedMultiplier)
    );
  }

  modifyRepairAmount(base: number): number {
    return base * this.snapshot().utility.repairMultiplier;
  }

  explain(): PlayerStatusLine[] {
    const s = this.snapshot();
    const e = this.equipment;

    return [
      line("Vitals", "Current HP", BASE_PLAYER_STATS.maxHealth, "—", "—", s.health.current),
      line("Vitals", "Max HP", BASE_PLAYER_STATS.maxHealth, "—", "—", s.health.max),
      line("Mobility", "Walk speed", BASE_PLAYER_STATS.walkSpeed, "×1", mul(e.walkSpeedMultiplier), s.mobility.walkSpeed, "m/s"),
      line("Mobility", "Sprint speed", BASE_PLAYER_STATS.sprintSpeed, "×1", mul(e.sprintSpeedMultiplier), s.mobility.sprintSpeed, "m/s"),
      line("Mobility", "Jump velocity", BASE_PLAYER_STATS.jumpSpeed, "×1", mul(e.jumpSpeedMultiplier), s.mobility.jumpSpeed, "m/s"),
      line("Blade", "Damage", BASE_PLAYER_STATS.meleeDamage, mul(this.rules.meleeDamageMultiplier), mul(e.meleeDamageMultiplier), s.melee.damage),
      line("Blade", "Cooldown", BASE_PLAYER_STATS.meleeCooldown, mul(this.rules.meleeCooldownMultiplier), mul(e.meleeCooldownMultiplier), s.melee.cooldown, "s"),
      line("Blade", "Attacks/sec", 1 / BASE_PLAYER_STATS.meleeCooldown, "derived", "derived", s.melee.attacksPerSecond),
      line("Blade", "Range", BASE_PLAYER_STATS.meleeRange, signed(this.rules.meleeRangeBonus), signed(e.meleeRangeBonus), s.melee.range, "m"),
      line("Blade", "DPS before crit", BASE_PLAYER_STATS.meleeDamage / BASE_PLAYER_STATS.meleeCooldown, "derived", "derived", s.melee.dpsBeforeCrit),
      line("Repeater", "Damage", BASE_PLAYER_STATS.rangedDamage, mul(this.rules.rangedDamageMultiplier), mul(e.rangedDamageMultiplier), s.ranged.damage),
      line("Repeater", "Cooldown", BASE_PLAYER_STATS.rangedCooldown, mul(this.rules.rangedCooldownMultiplier), mul(e.rangedCooldownMultiplier), s.ranged.cooldown, "s"),
      line("Repeater", "Shots/sec", 1 / BASE_PLAYER_STATS.rangedCooldown, "derived", "derived", s.ranged.shotsPerSecond),
      line("Repeater", "Projectile speed", BASE_PLAYER_STATS.projectileSpeed, mul(this.rules.projectileSpeedMultiplier), mul(e.projectileSpeedMultiplier), s.ranged.projectileSpeed, "m/s"),
      line("Repeater", "Pierce", BASE_PLAYER_STATS.projectilePierce, signed(this.rules.projectilePierceBonus), signed(e.projectilePierceBonus), s.ranged.pierce),
      line("Repeater", "DPS before crit", BASE_PLAYER_STATS.rangedDamage / BASE_PLAYER_STATS.rangedCooldown, "derived", "derived", s.ranged.dpsBeforeCrit),
      line("Combat", "Crit chance", BASE_PLAYER_STATS.critChance * 100, signed((this.rules.critChance - 0.05) * 100), signed(e.critChanceBonus * 100), s.crit.chance * 100, "%"),
      line("Combat", "Crit multiplier", BASE_PLAYER_STATS.critMultiplier, signed(this.rules.critMultiplier - 1.75), signed(e.critMultiplierBonus), s.crit.multiplier, "×"),
      line("Defense", "Damage reduction", 0, signed(this.rules.playerDamageReduction * 100), signed(e.damageReductionBonus * 100), s.defense.damageReduction * 100, "%"),
      line("Utility", "Mining speed", 100, mul(this.rules.miningSpeedMultiplier), mul(e.miningSpeedMultiplier), s.utility.miningSpeedMultiplier * 100, "%"),
      line("Utility", "Resource yield", BASE_PLAYER_STATS.resourceYieldBonus, signed(this.rules.resourceYieldBonus), signed(e.resourceYieldBonus), s.utility.resourceYieldBonus),
      line("Utility", "Repair power", 100, mul(this.rules.repairMultiplier), mul(e.repairMultiplier), s.utility.repairMultiplier * 100, "%"),
      line("Status", "Burn chance", 0, signed(this.rules.playerBurnChance * 100), signed(e.burnChanceBonus * 100), s.statuses.burnChance * 100, "%"),
      line("Status", "Shock chance", 0, signed(this.rules.playerShockChance * 100), signed(e.shockChanceBonus * 100), s.statuses.shockChance * 100, "%"),
      line("Status", "Mark duration", 0, signed(this.rules.playerMarkDuration), signed(e.markDurationBonus), s.statuses.markDuration, "s"),
      line("Conditional", "Low-HP damage", 0, signed(this.rules.lowHealthDamageBonus * 100), signed(e.lowHealthDamageBonus * 100), s.conditional.lowHealthDamageBonus * 100, "%"),
    ];
  }
}

function line(
  category: string,
  label: string,
  base: number,
  run: string,
  equipment: string,
  final: number,
  unit = "",
): PlayerStatusLine {
  return {
    category,
    label,
    base: fmt(base, unit),
    run,
    equipment,
    final: fmt(final, unit),
  };
}

function fmt(value: number, unit: string): string {
  const rounded =
    Math.abs(value) >= 100
      ? value.toFixed(0)
      : Math.abs(value) >= 10
        ? value.toFixed(1)
        : value.toFixed(2);
  return rounded.replace(/\.00$/, "").replace(/(\.\d)0$/, "$1") + unit;
}

function mul(value: number): string {
  return "×" + fmt(value, "");
}

function signed(value: number): string {
  if (Math.abs(value) < 0.0001) return "+0";
  return (value > 0 ? "+" : "") + fmt(value, "");
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}
