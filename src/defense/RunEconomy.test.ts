import { describe, expect, it } from "vitest";
import { Inventory } from "../survival/Inventory";
import { ResourceId } from "../survival/Resources";
import { STRUCTURES, StructureType } from "../building/StructureRegistry";
import { STARTER_KIT, DAWN_SUPPLIES, grantSupplies } from "./RunEconomy";

describe("preparation economy", () => {
  it("lets a new player build two turrets and two traps immediately", () => {
    const inventory = new Inventory();
    expect(grantSupplies(inventory, STARTER_KIT)).toEqual([]);
    expect(inventory.spend(STRUCTURES[StructureType.Turret].cost)).toBe(true);
    expect(inventory.spend(STRUCTURES[StructureType.RapidTurret].cost)).toBe(true);
    expect(inventory.spend(STRUCTURES[StructureType.Spike].cost)).toBe(true);
    expect(inventory.spend(STRUCTURES[StructureType.Spike].cost)).toBe(true);
  });
  it("preserves every reward when the backpack is full", () => {
    const inventory = new Inventory();
    inventory.add(ResourceId.Soil, 36 * 64);
    const overflow = grantSupplies(inventory, DAWN_SUPPLIES);
    expect(overflow.reduce((total, drop) => total + drop.amount, 0)).toBe(8);
    expect(inventory.get(ResourceId.Metal)).toBe(0);
  });
  it("returns only the part of a reward that does not fit", () => {
    const inventory = new Inventory();
    inventory.add(ResourceId.Metal, 36 * 64 - 2);
    expect(grantSupplies(inventory, { [ResourceId.Metal]: 3 })).toEqual([{ resource: ResourceId.Metal, amount: 1 }]);
  });
});
