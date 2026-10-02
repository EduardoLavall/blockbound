import { describe, expect, it } from "vitest";
import { PlayerVitals } from "../combat/PlayerVitals";
import { RuleEngine } from "../roguelite/RuleEngine";
import { PlayerStatus } from "./PlayerStatus";
import { BASE_PLAYER_STATS } from "./PlayerStats";

describe("PlayerStatus", () => {
  it("exposes the gameplay baselines from one source", () => {
    const status = new PlayerStatus(
      new RuleEngine(),
      new PlayerVitals(),
    );

    const snapshot = status.snapshot();

    expect(snapshot.health.max).toBe(BASE_PLAYER_STATS.maxHealth);
    expect(snapshot.mobility.walkSpeed).toBe(BASE_PLAYER_STATS.walkSpeed);
    expect(snapshot.mobility.sprintSpeed).toBe(BASE_PLAYER_STATS.sprintSpeed);
    expect(snapshot.mobility.jumpSpeed).toBe(BASE_PLAYER_STATS.jumpSpeed);

    expect(snapshot.melee.damage).toBe(BASE_PLAYER_STATS.meleeDamage);
    expect(snapshot.melee.cooldown).toBe(BASE_PLAYER_STATS.meleeCooldown);
    expect(snapshot.melee.range).toBe(BASE_PLAYER_STATS.meleeRange);

    expect(snapshot.ranged.damage).toBe(BASE_PLAYER_STATS.rangedDamage);
    expect(snapshot.ranged.cooldown).toBe(BASE_PLAYER_STATS.rangedCooldown);
    expect(snapshot.ranged.projectileSpeed).toBe(
      BASE_PLAYER_STATS.projectileSpeed,
    );

    expect(snapshot.crit.chance).toBe(BASE_PLAYER_STATS.critChance);
    expect(snapshot.crit.multiplier).toBe(BASE_PLAYER_STATS.critMultiplier);
  });

  it("combines run modifiers and future equipment modifiers", () => {
    const rules = new RuleEngine();
    const vitals = new PlayerVitals();
    const status = new PlayerStatus(rules, vitals);

    rules.meleeDamageMultiplier = 1.25;
    rules.meleeCooldownMultiplier = 0.82;
    rules.meleeRangeBonus = 0.45;
    rules.rangedDamageMultiplier = 1.2;
    rules.rangedCooldownMultiplier = 0.9;
    rules.projectileSpeedMultiplier = 1.35;
    rules.projectilePierceBonus = 1;
    rules.critChance += 0.1;
    rules.critMultiplier += 0.5;
    rules.playerDamageReduction = 0.15;
    rules.miningSpeedMultiplier = 1.3;
    rules.resourceYieldBonus = 1;
    rules.repairMultiplier = 1.25;
    rules.playerBurnChance = 0.3;
    rules.playerShockChance = 0.2;
    rules.playerMarkDuration = 4;
    rules.lowHealthDamageBonus = 0.45;

    status.setEquipmentModifiers({
      walkSpeedMultiplier: 1.1,
      sprintSpeedMultiplier: 1.05,
      meleeDamageMultiplier: 1.2,
      meleeCooldownMultiplier: 0.9,
      meleeRangeBonus: 0.2,
      rangedDamageMultiplier: 1.15,
      rangedCooldownMultiplier: 0.85,
      projectileSpeedMultiplier: 1.1,
      projectilePierceBonus: 1,
      critChanceBonus: 0.05,
      critMultiplierBonus: 0.25,
      damageReductionBonus: 0.1,
      miningSpeedMultiplier: 1.1,
      resourceYieldBonus: 1,
      repairMultiplier: 1.2,
      burnChanceBonus: 0.1,
      shockChanceBonus: 0.1,
      markDurationBonus: 2,
      lowHealthDamageBonus: 0.15,
    });

    const snapshot = status.snapshot();

    expect(snapshot.mobility.walkSpeed).toBeCloseTo(5.94);
    expect(snapshot.melee.damage).toBeCloseTo(51);
    expect(snapshot.melee.cooldown).toBeCloseTo(0.35424);
    expect(snapshot.melee.range).toBeCloseTo(3.1);

    expect(snapshot.ranged.damage).toBeCloseTo(33.12);
    expect(snapshot.ranged.cooldown).toBeCloseTo(0.2601);
    expect(snapshot.ranged.projectileSpeed).toBeCloseTo(37.125);
    expect(snapshot.ranged.pierce).toBe(2);

    expect(snapshot.crit.chance).toBeCloseTo(0.2);
    expect(snapshot.crit.multiplier).toBeCloseTo(2.5);
    expect(snapshot.defense.damageReduction).toBeCloseTo(0.25);

    expect(snapshot.utility.miningSpeedMultiplier).toBeCloseTo(1.43);
    expect(snapshot.utility.resourceYieldBonus).toBe(2);
    expect(snapshot.utility.repairMultiplier).toBeCloseTo(1.5);

    expect(snapshot.statuses.burnChance).toBeCloseTo(0.4);
    expect(snapshot.statuses.shockChance).toBeCloseTo(0.3);
    expect(snapshot.statuses.markDuration).toBe(6);
    expect(snapshot.conditional.lowHealthDamageBonus).toBeCloseTo(0.6);
  });

  it("drives gameplay helpers from the same final snapshot", () => {
    const rules = new RuleEngine();
    const vitals = new PlayerVitals();
    const status = new PlayerStatus(rules, vitals);

    rules.playerDamageReduction = 0.2;
    rules.miningSpeedMultiplier = 1.25;
    rules.repairMultiplier = 1.5;
    rules.lowHealthDamageBonus = 0.4;

    status.setEquipmentModifiers({
      damageReductionBonus: 0.1,
      miningSpeedMultiplier: 1.2,
      repairMultiplier: 1.1,
      lowHealthDamageBonus: 0.1,
    });

    expect(status.modifyIncomingDamage(100)).toBeCloseTo(70);
    expect(status.modifyMiningDuration(1.5)).toBeCloseTo(1);
    expect(status.modifyRepairAmount(20)).toBeCloseTo(33);

    expect(status.outgoingDamageMultiplier()).toBe(1);

    vitals.damage(80);

    expect(status.snapshot().conditional.lowHealthActive).toBe(true);
    expect(status.outgoingDamageMultiplier()).toBeCloseTo(1.5);
  });

  it("produces explainable rows for the status UI", () => {
    const rules = new RuleEngine();
    const status = new PlayerStatus(rules, new PlayerVitals());

    rules.meleeDamageMultiplier = 1.25;

    const damage = status.explain().find(
      (line) => line.category === "Blade" && line.label === "Damage",
    );

    expect(damage).toBeDefined();
    expect(damage?.base).toBe("34");
    expect(damage?.run).toBe("×1.25");
    expect(damage?.equipment).toBe("×1");
    expect(damage?.final).toBe("42.5");
  });
});
