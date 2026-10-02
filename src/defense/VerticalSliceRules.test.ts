import { describe, expect, it } from "vitest";
import {
  FINAL_NIGHT,
  NIGHT_DEFINITIONS,
  nightDefinition,
} from "./VerticalSliceRules";

describe("VerticalSliceRules", () => {
  it("defines exactly five authored nights", () => {
    expect(FINAL_NIGHT).toBe(5);
    expect(NIGHT_DEFINITIONS).toHaveLength(5);
    expect(NIGHT_DEFINITIONS.map((night) => night.night)).toEqual([
      1, 2, 3, 4, 5,
    ]);
  });

  it("escalates enemy pressure and reserves the boss for night five", () => {
    for (let night = 2; night <= FINAL_NIGHT; night++) {
      expect(nightDefinition(night).totalEnemies).toBeGreaterThan(
        nightDefinition(night - 1).totalEnemies,
      );
    }

    expect(nightDefinition(4).boss).toBe(false);
    expect(nightDefinition(5).boss).toBe(true);
  });
});
