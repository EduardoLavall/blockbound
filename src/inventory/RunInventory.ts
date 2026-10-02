import { itemDefinition } from "../items/ItemRegistry";
import { ResourceId } from "../survival/Resources";

export const HOTBAR_SIZE = 9;
export const BACKPACK_SIZE = 27;
export const RUN_INVENTORY_SIZE = HOTBAR_SIZE + BACKPACK_SIZE;
export const RESOURCE_STACK_LIMIT = 64;

export interface ResourceStack {
  kind: "resource";
  resource: ResourceId;
  quantity: number;
}

export interface ItemStack {
  kind: "item";
  uid: string;
  definitionId: string;
  quantity: number;
}

export type InventoryStack = ResourceStack | ItemStack;
export type InventorySection = "hotbar" | "backpack";
export type InventoryListener = () => void;

export class RunInventory {
  private readonly slotValues: Array<InventoryStack | null> =
    Array.from({ length: RUN_INVENTORY_SIZE }, () => null);
  private readonly listeners = new Set<InventoryListener>();
  private nextUid = 1;

  get slots(): readonly (InventoryStack | null)[] {
    return this.slotValues;
  }

  slot(index: number): InventoryStack | null {
    return this.validIndex(index) ? this.slotValues[index] ?? null : null;
  }

  section(index: number): InventorySection {
    return index < HOTBAR_SIZE ? "hotbar" : "backpack";
  }

  addResource(resource: ResourceId, quantity: number): number {
    if (quantity <= 0) return 0;

    const accepted = this.addStack(
      { kind: "resource", resource, quantity },
      RESOURCE_STACK_LIMIT,
      [
        ...range(0, HOTBAR_SIZE),
        ...range(HOTBAR_SIZE, RUN_INVENTORY_SIZE),
      ],
    );

    if (accepted > 0) this.emit();
    return accepted;
  }

  addItem(
    definitionId: string,
    quantity = 1,
  ): readonly ItemStack[] {
    if (quantity <= 0) return [];

    const definition = itemDefinition(definitionId);
    const inserted: ItemStack[] = [];
    let remaining = quantity;

    while (remaining > 0) {
      const amount = Math.min(remaining, definition.stackLimit);
      const stack: ItemStack = {
        kind: "item",
        uid: this.createUid(),
        definitionId,
        quantity: amount,
      };

      const accepted = this.addStack(
        stack,
        definition.stackLimit,
        [
          ...range(HOTBAR_SIZE, RUN_INVENTORY_SIZE),
          ...range(0, HOTBAR_SIZE),
        ],
      );

      if (accepted <= 0) break;

      inserted.push({
        ...stack,
        quantity: accepted,
      });
      remaining -= accepted;
    }

    if (inserted.length > 0) this.emit();
    return inserted;
  }

  resourceCount(resource: ResourceId): number {
    let total = 0;
    for (const stack of this.slotValues) {
      if (stack?.kind === "resource" && stack.resource === resource) {
        total += stack.quantity;
      }
    }
    return total;
  }

  consumeResource(resource: ResourceId, quantity: number): boolean {
    if (quantity <= 0) return true;
    if (this.resourceCount(resource) < quantity) return false;

    let remaining = quantity;
    for (let index = RUN_INVENTORY_SIZE - 1; index >= 0; index--) {
      const stack = this.slotValues[index];
      if (
        stack?.kind !== "resource" ||
        stack.resource !== resource
      ) {
        continue;
      }

      const amount = Math.min(stack.quantity, remaining);
      stack.quantity -= amount;
      remaining -= amount;
      if (stack.quantity <= 0) this.slotValues[index] = null;
      if (remaining <= 0) break;
    }

    this.emit();
    return true;
  }

  itemStacks(): readonly ItemStack[] {
    return this.slotValues.filter(
      (stack): stack is ItemStack => stack?.kind === "item",
    );
  }

  findItem(uid: string): ItemStack | undefined {
    return this.itemStacks().find((stack) => stack.uid === uid);
  }

  itemSlot(uid: string): number {
    return this.slotValues.findIndex(
      (stack) => stack?.kind === "item" && stack.uid === uid,
    );
  }

  takeItem(uid: string): ItemStack | null {
    const index = this.itemSlot(uid);
    if (index < 0) return null;
    const stack = this.slotValues[index];
    if (stack?.kind !== "item") return null;
    this.slotValues[index] = null;
    this.emit();
    return stack;
  }

  insertDetachedStack(
    stack: InventoryStack,
    prefer: InventorySection = "backpack",
  ): boolean {
    const emptyOrder =
      prefer === "backpack"
        ? [
            ...range(HOTBAR_SIZE, RUN_INVENTORY_SIZE),
            ...range(0, HOTBAR_SIZE),
          ]
        : [
            ...range(0, HOTBAR_SIZE),
            ...range(HOTBAR_SIZE, RUN_INVENTORY_SIZE),
          ];

    const limit = stackLimit(stack);
    const quantity = stack.quantity;
    const accepted = this.addStack(stack, limit, emptyOrder);
    if (accepted > 0) this.emit();
    return accepted === quantity;
  }

  takeAll(index: number): InventoryStack | null {
    if (!this.validIndex(index)) return null;
    const stack = this.slotValues[index];
    if (!stack) return null;
    this.slotValues[index] = null;
    this.emit();
    return stack;
  }

  takeHalf(index: number): InventoryStack | null {
    const stack = this.slot(index);
    if (!stack) return null;

    const amount = Math.ceil(stack.quantity / 2);
    if (amount >= stack.quantity) return this.takeAll(index);

    stack.quantity -= amount;
    const detached = cloneStack(stack, amount, () => this.createUid());
    this.emit();
    return detached;
  }

  placeAll(
    index: number,
    held: InventoryStack,
  ): InventoryStack | null {
    if (!this.validIndex(index)) return held;

    const target = this.slotValues[index];
    if (!target) {
      this.slotValues[index] = held;
      this.emit();
      return null;
    }

    if (sameStackType(target, held)) {
      const limit = stackLimit(target);
      const free = Math.max(0, limit - target.quantity);
      const amount = Math.min(free, held.quantity);
      if (amount > 0) {
        target.quantity += amount;
        held.quantity -= amount;
        this.emit();
      }
      return held.quantity > 0 ? held : null;
    }

    this.slotValues[index] = held;
    this.emit();
    return target;
  }

  placeOne(
    index: number,
    held: InventoryStack,
  ): InventoryStack | null {
    if (!this.validIndex(index)) return held;

    const target = this.slotValues[index];
    if (!target) {
      this.slotValues[index] = cloneStack(
        held,
        1,
        () => this.createUid(),
      );
      held.quantity -= 1;
      this.emit();
      return held.quantity > 0 ? held : null;
    }

    if (!sameStackType(target, held)) return held;
    if (target.quantity >= stackLimit(target)) return held;

    target.quantity += 1;
    held.quantity -= 1;
    this.emit();
    return held.quantity > 0 ? held : null;
  }

  moveAll(from: number, to: number): boolean {
    if (from === to) return false;
    const stack = this.takeAll(from);
    if (!stack) return false;

    const remainder = this.placeAll(to, stack);
    if (remainder) {
      const fallback = this.slotValues[from];
      if (!fallback) {
        this.slotValues[from] = remainder;
        this.emit();
      } else {
        this.insertDetachedStack(remainder, this.section(from));
      }
    }
    return true;
  }

  quickMove(index: number): boolean {
    const stack = this.slot(index);
    if (!stack) return false;

    const targetSection: InventorySection =
      this.section(index) === "hotbar" ? "backpack" : "hotbar";
    const targetIndices =
      targetSection === "hotbar"
        ? range(0, HOTBAR_SIZE)
        : range(HOTBAR_SIZE, RUN_INVENTORY_SIZE);

    return this.moveStackIntoIndices(index, targetIndices);
  }

  moveToHotbar(index: number, hotbarIndex: number): boolean {
    if (
      !this.validIndex(index) ||
      hotbarIndex < 0 ||
      hotbarIndex >= HOTBAR_SIZE
    ) {
      return false;
    }
    return this.moveAll(index, hotbarIndex);
  }

  consolidate(index: number): boolean {
    const target = this.slot(index);
    if (!target) return false;

    const limit = stackLimit(target);
    if (target.quantity >= limit) return false;

    let changed = false;
    for (let sourceIndex = 0; sourceIndex < RUN_INVENTORY_SIZE; sourceIndex++) {
      if (sourceIndex === index) continue;
      const source = this.slotValues[sourceIndex];
      if (!source || !sameStackType(target, source)) continue;

      const free = limit - target.quantity;
      if (free <= 0) break;
      const amount = Math.min(free, source.quantity);
      target.quantity += amount;
      source.quantity -= amount;
      if (source.quantity <= 0) this.slotValues[sourceIndex] = null;
      changed = true;
    }

    if (changed) this.emit();
    return changed;
  }

  subscribe(listener: InventoryListener): () => void {
    this.listeners.add(listener);
    listener();
    return () => this.listeners.delete(listener);
  }

  private addStack(
    incoming: InventoryStack,
    limit: number,
    emptyOrder: readonly number[],
  ): number {
    let remaining = incoming.quantity;

    for (const stack of this.slotValues) {
      if (!stack || !sameStackType(stack, incoming)) continue;
      const free = Math.max(0, limit - stack.quantity);
      if (free <= 0) continue;
      const amount = Math.min(free, remaining);
      stack.quantity += amount;
      remaining -= amount;
      if (remaining <= 0) return incoming.quantity;
    }

    for (const index of emptyOrder) {
      if (remaining <= 0) break;
      if (this.slotValues[index]) continue;

      const amount = Math.min(limit, remaining);
      this.slotValues[index] = cloneStack(
        incoming,
        amount,
        () => this.createUid(),
      );
      remaining -= amount;
    }

    return incoming.quantity - remaining;
  }

  private moveStackIntoIndices(
    sourceIndex: number,
    targetIndices: readonly number[],
  ): boolean {
    const source = this.slotValues[sourceIndex];
    if (!source) return false;
    let changed = false;

    for (const targetIndex of targetIndices) {
      const target = this.slotValues[targetIndex];
      if (!target || !sameStackType(target, source)) continue;

      const free = stackLimit(target) - target.quantity;
      if (free <= 0) continue;
      const amount = Math.min(free, source.quantity);
      target.quantity += amount;
      source.quantity -= amount;
      changed = true;
      if (source.quantity <= 0) {
        this.slotValues[sourceIndex] = null;
        this.emit();
        return true;
      }
    }

    const empty = targetIndices.find(
      (targetIndex) => !this.slotValues[targetIndex],
    );
    if (empty !== undefined) {
      this.slotValues[empty] = source;
      this.slotValues[sourceIndex] = null;
      changed = true;
    }

    if (changed) this.emit();
    return changed;
  }

  private createUid(): string {
    return `item-${this.nextUid++}`;
  }

  private validIndex(index: number): boolean {
    return index >= 0 && index < RUN_INVENTORY_SIZE;
  }

  private emit(): void {
    for (const listener of this.listeners) listener();
  }
}

export function stackLimit(stack: InventoryStack): number {
  return stack.kind === "resource"
    ? RESOURCE_STACK_LIMIT
    : itemDefinition(stack.definitionId).stackLimit;
}

export function sameStackType(
  a: InventoryStack,
  b: InventoryStack,
): boolean {
  if (a.kind !== b.kind) return false;
  if (a.kind === "resource" && b.kind === "resource") {
    return a.resource === b.resource;
  }
  if (a.kind === "item" && b.kind === "item") {
    return a.definitionId === b.definitionId &&
      itemDefinition(a.definitionId).stackLimit > 1;
  }
  return false;
}

function cloneStack(
  stack: InventoryStack,
  quantity: number,
  createUid: () => string,
): InventoryStack {
  if (stack.kind === "resource") {
    return {
      kind: "resource",
      resource: stack.resource,
      quantity,
    };
  }

  if (quantity === stack.quantity) {
    return stack;
  }

  return {
    kind: "item",
    uid: createUid(),
    definitionId: stack.definitionId,
    quantity,
  };
}

function range(start: number, end: number): number[] {
  return Array.from(
    { length: Math.max(0, end - start) },
    (_, offset) => start + offset,
  );
}
