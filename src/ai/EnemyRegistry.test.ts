import { describe, expect, it } from "vitest";
import { ENEMIES, EnemyType, rosterForNight } from "./EnemyRegistry";

describe("EnemyRegistry", () => {
  it("unlocks roles progressively across the five-night slice", () => {
    expect(rosterForNight(1).map((entry) => entry.type)).toEqual([
      EnemyType.Grunt,
      EnemyType.Runner,
    ]);

    expect(rosterForNight(2).some((entry) => entry.type === EnemyType.Brute)).toBe(true);
    expect(rosterForNight(3).some((entry) => entry.type === EnemyType.Archer)).toBe(true);
    expect(rosterForNight(4).some((entry) => entry.type === EnemyType.Support)).toBe(true);
    expect(rosterForNight(4).some((entry) => entry.type === EnemyType.Burrower)).toBe(true);
  });

  it("gives every archetype at least one behavior-defining stat", () => {
    expect(ENEMIES[EnemyType.Runner].runnerAvoidsBreach).toBe(true);
    expect(ENEMIES[EnemyType.Brute].structureDamageMultiplier).toBeGreaterThan(2);
    expect(ENEMIES[EnemyType.Archer].rangedRange).toBeGreaterThan(0);
    expect(ENEMIES[EnemyType.Support].supportRadius).toBeGreaterThan(0);
    expect(ENEMIES[EnemyType.Burrower].ignoresBlockers).toBe(true);
    expect(ENEMIES[EnemyType.Boss].bossPulseRadius).toBeGreaterThan(0);
  });
});
