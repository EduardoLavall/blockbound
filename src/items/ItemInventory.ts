import { itemDefinition, type ItemDefinition } from "./ItemRegistry";

export interface ItemStack {
  uid: string;
  definitionId: string;
  quantity: number;
}

export type ItemInventoryListener = () => void;

export class ItemInventory {
  private readonly stacks: ItemStack[] = [];
  private readonly listeners = new Set<ItemInventoryListener>();
  private nextUid = 1;

  get all(): readonly ItemStack[] {
    return this.stacks;
  }

  add(definitionId: string, quantity = 1): readonly ItemStack[] {
    if (quantity <= 0) return [];

    const definition = itemDefinition(definitionId);
    const touched: ItemStack[] = [];
    let remaining = quantity;

    if (definition.stackLimit > 1) {
      for (const stack of this.stacks) {
        if (stack.definitionId !== definitionId) continue;
        if (stack.quantity >= definition.stackLimit) continue;

        const amount = Math.min(
          remaining,
          definition.stackLimit - stack.quantity,
        );
        stack.quantity += amount;
        remaining -= amount;
        touched.push(stack);
        if (remaining <= 0) break;
      }
    }

    while (remaining > 0) {
      const amount = Math.min(remaining, definition.stackLimit);
      const stack: ItemStack = {
        uid: `item-${this.nextUid++}`,
        definitionId,
        quantity: amount,
      };
      this.stacks.push(stack);
      touched.push(stack);
      remaining -= amount;
    }

    this.emit();
    return touched;
  }

  get(uid: string): ItemStack | undefined {
    return this.stacks.find((stack) => stack.uid === uid);
  }

  definition(uid: string): ItemDefinition | undefined {
    const stack = this.get(uid);
    return stack ? itemDefinition(stack.definitionId) : undefined;
  }

  remove(uid: string, quantity = 1): boolean {
    const index = this.stacks.findIndex((stack) => stack.uid === uid);
    if (index < 0 || quantity <= 0) return false;

    const stack = this.stacks[index]!;
    if (quantity >= stack.quantity) {
      this.stacks.splice(index, 1);
    } else {
      stack.quantity -= quantity;
    }

    this.emit();
    return true;
  }

  subscribe(listener: ItemInventoryListener): () => void {
    this.listeners.add(listener);
    listener();
    return () => this.listeners.delete(listener);
  }

  private emit(): void {
    for (const listener of this.listeners) listener();
  }
}
