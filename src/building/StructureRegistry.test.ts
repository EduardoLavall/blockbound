import { describe, expect, it } from "vitest";
import { ResourceId } from "../survival/Resources";
import {
  STRUCTURES,
  StructureType,
} from "./StructureRegistry";

describe("defensive structure recipes", () => {
  it("requires advanced resources for the turret", () => {
    const turret = STRUCTURES[StructureType.Turret];
    expect(turret.cost[ResourceId.Metal]).toBeGreaterThan(0);
    expect(turret.cost[ResourceId.Crystal]).toBeGreaterThan(0);
    expect(turret.range).toBeGreaterThan(0);
  });

  it("gives every structure health and a repair rule", () => {
    for (const definition of Object.values(STRUCTURES)) {
      expect(definition.maxHealth).toBeGreaterThan(0);
      expect(definition.repairAmount).toBeGreaterThan(0);
      expect(definition.repairHealth).toBeGreaterThan(0);
    }
  });
});
