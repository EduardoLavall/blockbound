import type { Inventory } from "../survival/Inventory";
import { ResourceId } from "../survival/Resources";
import type { RunInventory } from "../inventory/RunInventory";

export function initializeRunInventory(storage: RunInventory): void {
  storage.addItem("pickaxe", 1, "hotbar");
}
export const DAWN_SUPPLIES = {
  [ResourceId.Wood]: 4,
  [ResourceId.Metal]: 3,
  [ResourceId.Crystal]: 1,
};

/** Returns overflow so rewards can remain in the world when the bag is full. */
export function grantSupplies(inventory: Inventory, supplies: Partial<Record<ResourceId, number>>) {
  const overflow: { resource: ResourceId; amount: number }[] = [];
  for (const [key, amount] of Object.entries(supplies)) {
    const resource = key as ResourceId;
    const remaining = amount - inventory.add(resource, amount);
    if (remaining > 0) overflow.push({ resource, amount: remaining });
  }
  return overflow;
}
