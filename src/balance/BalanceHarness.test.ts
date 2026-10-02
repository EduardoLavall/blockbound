import { describe, expect, it } from "vitest";
import { EnemyType } from "../ai/EnemyRegistry";
import {
  createBalanceSnapshot,
  expectedCritMultiplier,
  relativeUpgradePower,
} from "./BalanceHarness";

describe("BalanceHarness", () => {
  it("locks the current weapon baseline", () => {
    const snapshot = createBalanceSnapshot();
    const blade = snapshot.weapons.find((weapon) => weapon.name === "Blade")!;
    const repeater = snapshot.weapons.find((weapon) => weapon.name === "Repeater")!;

    expect(expectedCritMultiplier()).toBeCloseTo(1.0375);
    expect(blade.expectedDps).toBeCloseTo(73.4896, 3);
    expect(repeater.expectedDps).toBeCloseTo(73.2353, 3);
    expect(blade.expectedDps / repeater.expectedDps).toBeCloseTo(1.00347, 3);
  });

  it("captures current breach pressure", () => {
    const snapshot = createBalanceSnapshot();
    const brute = snapshot.enemies.find((enemy) => enemy.type === EnemyType.Brute)!;
    const boss = snapshot.enemies.find((enemy) => enemy.type === EnemyType.Boss)!;
    const burrower = snapshot.enemies.find((enemy) => enemy.type === EnemyType.Burrower)!;

    expect(brute.wallBreachSeconds).toBeCloseTo(2.8395, 3);
    expect(boss.wallBreachSeconds).toBeCloseTo(1.5441, 3);
    expect(burrower.wallBreachSeconds).toBeNull();
    expect(boss.coreKillSeconds).toBeCloseTo(8.5784, 3);
  });

  it("captures authored wave pressure", () => {
    const snapshot = createBalanceSnapshot();

    expect(snapshot.waves).toHaveLength(5);
    expect(snapshot.waves[0]!.approximateTotalHealth).toBeCloseTo(699.6, 1);
    expect(snapshot.waves[4]!.approximateTotalHealth).toBeCloseTo(4771.29, 1);
    expect(snapshot.waves[4]!.playerOnlyClearSeconds).toBeGreaterThan(65);
  });

  it("exposes defense and content baselines", () => {
    const snapshot = createBalanceSnapshot();

    expect(snapshot.defense.turretDps).toBeCloseTo(29.1667, 3);
    expect(snapshot.defense.rapidTurretDps).toBeCloseTo(36.3636, 3);
    expect(snapshot.defense.rapidVsRunnerDps).toBeCloseTo(41.8182, 3);
    expect(snapshot.defense.rapidVsBruteDps).toBeCloseTo(20, 3);
    expect(snapshot.defense.rapidVsBossDps).toBeCloseTo(16.3636, 3);
    expect(snapshot.defense.rapidTurretRange).toBe(9.5);
    expect(snapshot.defense.spikeDps).toBeCloseTo(38.7097, 3);
    expect(snapshot.content.upgrades).toBe(38);
    expect(snapshot.content.items).toBe(12);
  });

  it("makes direct scalar upgrade comparisons reproducible", () => {
    expect(relativeUpgradePower("sharpened-edge")).toBeCloseTo(1.25);
    expect(relativeUpgradePower("fast-hands")).toBeCloseTo(1.2195, 3);
    expect(relativeUpgradePower("heavy-slash")).toBeCloseTo(1.3393, 3);
    expect(relativeUpgradePower("rapid-traps")).toBeCloseTo(1.3333, 3);
    expect(relativeUpgradePower("hunter-mark")).toBeNull();
  });
});
