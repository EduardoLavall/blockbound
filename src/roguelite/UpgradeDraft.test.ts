import { describe, expect, it } from "vitest";
import { RuleEngine } from "./RuleEngine";
import { RunManager } from "./RunManager";
import { UpgradeDraft } from "./UpgradeDraft";
import { UPGRADES } from "./UpgradeRegistry";

describe("UpgradeDraft", () => {
  it("draws three unique upgrades", () => {
    const run = new RunManager();
    const draft = new UpgradeDraft(12345, run);

    const choices = draft.draw(1, 3);

    expect(choices).toHaveLength(3);
    expect(new Set(choices.map((choice) => choice.id)).size).toBe(3);
  });

  it("is reproducible for the same seed and run state", () => {
    const a = new UpgradeDraft(777, new RunManager()).draw(2, 3);
    const b = new UpgradeDraft(777, new RunManager()).draw(2, 3);

    expect(a.map((choice) => choice.id)).toEqual(
      b.map((choice) => choice.id),
    );
  });

  it("does not offer already acquired upgrades", () => {
    const run = new RunManager();
    const first = new UpgradeDraft(88, run).draw(1, 3);
    run.acquireUpgrade(first[0]!.id);

    const next = new UpgradeDraft(88, run).draw(1, 12);

    expect(next.some((choice) => choice.id === first[0]!.id)).toBe(false);
  });

  it("applies an upgrade through the central RuleEngine", () => {
    const rules = new RuleEngine();
    const choice = UPGRADES.find(
      (upgrade) => upgrade.id === "calibrated-turrets",
    );

    expect(choice).toBeDefined();
    const before = rules.turretDamageMultiplier;
    choice!.apply(rules);

    expect(rules.turretDamageMultiplier).toBeGreaterThan(before);
  });
});
