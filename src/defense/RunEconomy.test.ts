import { describe, expect, it } from "vitest";
import { Inventory } from "../survival/Inventory";
import { ResourceId } from "../survival/Resources";
import { STRUCTURES, StructureType } from "../building/StructureRegistry";
import { initializeRunInventory, DAWN_SUPPLIES, grantSupplies } from "./RunEconomy";

describe("preparation economy", () => {
  it("starts with only a pickaxe and no materials or weapons", () => {
    const inventory = new Inventory();
    initializeRunInventory(inventory.storage);
    expect(inventory.storage.itemStacks().map(stack => stack.definitionId)).toEqual(["pickaxe"]);
    expect(Object.values(inventory.snapshot())).toEqual([0,0,0,0,0]);
    expect(inventory.canAfford(STRUCTURES[StructureType.Turret].cost)).toBe(false);
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
