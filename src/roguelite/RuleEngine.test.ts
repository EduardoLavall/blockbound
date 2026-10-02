import { describe, expect, it } from "vitest";
import type { EnemyInstance } from "../ai/EnemySystem";
import { EnemyStatus } from "../combat/CombatTypes";
import { RuleEngine } from "./RuleEngine";

function enemyWith(status?: EnemyStatus): EnemyInstance {
  const statuses = new Map();
  if (status) {
    statuses.set(status, {
      remaining: 4,
      magnitude: 1,
      tick: 0.5,
      source: "player-projectile",
    });
  }

  return {
    id: 1,
    group: {} as EnemyInstance["group"],
    health: {} as EnemyInstance["health"],
    statuses,
    speed: 1,
    attackDamage: 1,
    attackInterval: 1,
    attackCooldown: 0,
    alive: true,
  };
}

describe("RuleEngine", () => {
  it("boosts turret damage against marked enemies", () => {
    const rules = new RuleEngine();
    rules.markedTurretBonus = 0.5;

    expect(rules.modifyTurretDamage(20, enemyWith())).toBe(20);
    expect(
      rules.modifyTurretDamage(20, enemyWith(EnemyStatus.Mark)),
    ).toBe(30);
  });

  it("boosts spikes against shocked enemies", () => {
    const rules = new RuleEngine();
    rules.shockedSpikeBonus = 0.6;

    expect(rules.modifySpikeDamage(10, enemyWith())).toBe(10);
    expect(
      rules.modifySpikeDamage(10, enemyWith(EnemyStatus.Shock)),
    ).toBe(16);
  });

  it("applies low health player damage bonus only below half HP", () => {
    const rules = new RuleEngine();
    rules.lowHealthDamageBonus = 0.45;

    expect(rules.playerOutgoingMultiplier(0.75)).toBe(1);
    expect(rules.playerOutgoingMultiplier(0.49)).toBe(1.45);
  });
});
