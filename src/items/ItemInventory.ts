import {
  RunInventory,
  type ItemStack,
} from "../inventory/RunInventory";
import { itemDefinition, type ItemDefinition } from "./ItemRegistry";

export type { ItemStack } from "../inventory/RunInventory";
export type ItemInventoryListener = () => void;

export class ItemInventory {
  constructor(
    readonly storage: RunInventory = new RunInventory(),
  ) {}

  get all(): readonly ItemStack[] {
    return this.storage.itemStacks();
  }

  add(
    definitionId: string,
    quantity = 1,
  ): readonly ItemStack[] {
    return this.storage.addItem(definitionId, quantity);
  }

  get(uid: string): ItemStack | undefined {
    return this.storage.findItem(uid);
  }

  definition(uid: string): ItemDefinition | undefined {
    const stack = this.get(uid);
    return stack ? itemDefinition(stack.definitionId) : undefined;
  }

  take(uid: string): ItemStack | null {
    return this.storage.takeItem(uid);
  }

  put(stack: ItemStack): boolean {
    return this.storage.insertDetachedStack(stack, "backpack");
  }

  remove(uid: string, quantity = 1): boolean {
    const stack = this.get(uid);
    if (!stack || quantity <= 0) return false;

    if (quantity >= stack.quantity) {
      return this.take(uid) !== null;
    }

    stack.quantity -= quantity;
    // Use a harmless slot interaction to notify subscribers.
    const index = this.storage.itemSlot(uid);
    if (index >= 0) {
      const detached = this.storage.takeAll(index);
      if (detached) this.storage.placeAll(index, detached);
    }
    return true;
  }

  subscribe(listener: ItemInventoryListener): () => void {
    return this.storage.subscribe(listener);
  }
}
