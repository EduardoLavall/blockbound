import { describe, expect, it } from "vitest";
import { EnemyType } from "../ai/EnemyRegistry";
import { SeededRandom } from "../voxel/generation/SeededRandom";
import {
  itemDropChance,
  rollItemRarity,
  selectLootDefinition,
} from "./ItemLootSystem";

describe("equipment loot table", () => {
  it("guarantees a common item for the prototype first-drop rule", () => {
    const item = selectLootDefinition(
      new SeededRandom(44),
      EnemyType.Grunt,
      true,
    );

    expect(item).not.toBeNull();
    expect(item?.rarity).toBe("common");
    expect(item?.slot).toBeDefined();
  });

  it("is deterministic for the same seed and enemy sequence", () => {
    const sequence = [
      EnemyType.Grunt,
      EnemyType.Runner,
      EnemyType.Brute,
      EnemyType.Archer,
      EnemyType.Support,
      EnemyType.Burrower,
    ];

    const run = (seed: number) => {
      const random = new SeededRandom(seed);
      return sequence.map(
        (type) => selectLootDefinition(random, type)?.id ?? null,
      );
    };

    expect(run(991)).toEqual(run(991));
  });

  it("reserves epic rarity for a boss rarity roll", () => {
    expect(
      rollItemRarity(new SeededRandom(2), EnemyType.Boss),
    ).toBe("epic");
  });

  it("gives tougher specialist enemies better drop chances", () => {
    expect(itemDropChance(EnemyType.Brute)).toBeGreaterThan(
      itemDropChance(EnemyType.Grunt),
    );
    expect(itemDropChance(EnemyType.Support)).toBeGreaterThan(
      itemDropChance(EnemyType.Runner),
    );
    expect(itemDropChance(EnemyType.Boss)).toBe(1);
  });
});
