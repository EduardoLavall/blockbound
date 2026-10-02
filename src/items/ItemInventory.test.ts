import { describe, expect, it } from "vitest";
import { ItemInventory } from "./ItemInventory";

describe("ItemInventory", () => {
  it("keeps equipment as unique item instances", () => {
    const inventory = new ItemInventory();

    inventory.add("serrated-grip");
    inventory.add("serrated-grip");

    expect(inventory.all).toHaveLength(2);
    expect(inventory.all[0]!.definitionId).toBe("serrated-grip");
    expect(inventory.all[0]!.quantity).toBe(1);
    expect(inventory.all[0]!.uid).not.toBe(inventory.all[1]!.uid);
  });

  it("removes an item instance without touching resource inventory concepts", () => {
    const inventory = new ItemInventory();
    const [stack] = inventory.add("miner-sigil");

    expect(stack).toBeDefined();
    expect(inventory.remove(stack!.uid)).toBe(true);
    expect(inventory.all).toHaveLength(0);
    expect(inventory.remove("missing")).toBe(false);
  });
});
