import { describe, expect, it } from "vitest";
import { Inventory } from "./Inventory";
import { ResourceId } from "./Resources";

describe("Inventory", () => {
  it("collects resources and spends a complete recipe atomically", () => {
    const inventory = new Inventory();
    inventory.add(ResourceId.Wood, 4);
    inventory.add(ResourceId.Stone, 3);

    expect(inventory.canAfford({
      [ResourceId.Wood]: 2,
      [ResourceId.Stone]: 2,
    })).toBe(true);

    expect(inventory.spend({
      [ResourceId.Wood]: 2,
      [ResourceId.Stone]: 2,
    })).toBe(true);

    expect(inventory.get(ResourceId.Wood)).toBe(2);
    expect(inventory.get(ResourceId.Stone)).toBe(1);
  });

  it("does not partially spend an unaffordable recipe", () => {
    const inventory = new Inventory();
    inventory.add(ResourceId.Wood, 3);

    expect(inventory.spend({
      [ResourceId.Wood]: 2,
      [ResourceId.Metal]: 1,
    })).toBe(false);

    expect(inventory.get(ResourceId.Wood)).toBe(3);
    expect(inventory.get(ResourceId.Metal)).toBe(0);
  });
});
