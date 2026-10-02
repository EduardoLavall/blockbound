import { describe, expect, it } from "vitest";
import {
  BACKPACK_SIZE,
  HOTBAR_SIZE,
  RESOURCE_STACK_LIMIT,
  RUN_INVENTORY_SIZE,
  RunInventory,
} from "./RunInventory";
import { ResourceId } from "../survival/Resources";

describe("RunInventory", () => {
  it("provides 9 hotbar and 27 backpack slots", () => {
    const inventory = new RunInventory();

    expect(HOTBAR_SIZE).toBe(9);
    expect(BACKPACK_SIZE).toBe(27);
    expect(RUN_INVENTORY_SIZE).toBe(36);
    expect(inventory.slots).toHaveLength(36);
  });

  it("stacks resources to 64 and spills into another slot", () => {
    const inventory = new RunInventory();

    expect(inventory.addResource(ResourceId.Stone, 70)).toBe(70);
    expect(inventory.slot(0)).toMatchObject({
      kind: "resource",
      resource: ResourceId.Stone,
      quantity: RESOURCE_STACK_LIMIT,
    });
    expect(inventory.slot(1)).toMatchObject({
      kind: "resource",
      resource: ResourceId.Stone,
      quantity: 6,
    });
  });

  it("keeps equipment items as unique non-stackable instances", () => {
    const inventory = new RunInventory();
    const [a] = inventory.addItem("serrated-grip");
    const [b] = inventory.addItem("serrated-grip");

    expect(a?.uid).toBeDefined();
    expect(b?.uid).toBeDefined();
    expect(a?.uid).not.toBe(b?.uid);
    expect(inventory.itemStacks()).toHaveLength(2);
  });

  it("supports left-click style take/place and swap", () => {
    const inventory = new RunInventory();
    inventory.addResource(ResourceId.Wood, 8);
    inventory.addResource(ResourceId.Stone, 4);

    const held = inventory.takeAll(0);
    expect(held).toMatchObject({
      kind: "resource",
      resource: ResourceId.Wood,
      quantity: 8,
    });
    expect(inventory.slot(0)).toBeNull();

    const swapped = inventory.placeAll(1, held!);
    expect(inventory.slot(1)).toMatchObject({
      kind: "resource",
      resource: ResourceId.Wood,
    });
    expect(swapped).toMatchObject({
      kind: "resource",
      resource: ResourceId.Stone,
    });
  });

  it("supports right-click style half split and place one", () => {
    const inventory = new RunInventory();
    inventory.addResource(ResourceId.Wood, 9);

    let held = inventory.takeHalf(0);
    expect(held?.quantity).toBe(5);
    expect(inventory.slot(0)?.quantity).toBe(4);

    held = inventory.placeOne(1, held!);
    expect(inventory.slot(1)?.quantity).toBe(1);
    expect(held?.quantity).toBe(4);
  });

  it("quick-moves between hotbar and backpack", () => {
    const inventory = new RunInventory();
    inventory.addResource(ResourceId.Crystal, 3);

    expect(inventory.section(0)).toBe("hotbar");
    expect(inventory.quickMove(0)).toBe(true);
    expect(inventory.slot(0)).toBeNull();
    expect(inventory.slot(HOTBAR_SIZE)).toMatchObject({
      kind: "resource",
      resource: ResourceId.Crystal,
      quantity: 3,
    });

    expect(inventory.quickMove(HOTBAR_SIZE)).toBe(true);
    expect(inventory.slot(0)).toMatchObject({
      kind: "resource",
      resource: ResourceId.Crystal,
      quantity: 3,
    });
  });

  it("consolidates matching stacks without crossing stack limit", () => {
    const inventory = new RunInventory();
    inventory.addResource(ResourceId.Stone, 70);

    expect(inventory.slot(0)?.quantity).toBe(64);
    expect(inventory.slot(1)?.quantity).toBe(6);

    let held = inventory.takeHalf(0);
    expect(held?.quantity).toBe(32);
    held = inventory.placeAll(2, held!);
    expect(held).toBeNull();

    expect(inventory.consolidate(1)).toBe(true);
    expect(inventory.slot(1)?.quantity).toBe(38);
    expect(inventory.slot(2)).toBeNull();
  });

  it("rejects new equipment when all 36 slots are occupied", () => {
    const inventory = new RunInventory();

    for (let index = 0; index < RUN_INVENTORY_SIZE; index++) {
      const inserted = inventory.addItem("serrated-grip");
      expect(inserted).toHaveLength(1);
    }

    expect(inventory.slots.every(Boolean)).toBe(true);
    expect(inventory.addItem("runner-mesh")).toHaveLength(0);
  });

  it("refuses excess resources when every stack and slot is full", () => {
    const inventory = new RunInventory();

    for (let index = 0; index < RUN_INVENTORY_SIZE; index++) {
      inventory.addItem("serrated-grip");
    }

    expect(inventory.addResource(ResourceId.Wood, 1)).toBe(0);
  });
});
