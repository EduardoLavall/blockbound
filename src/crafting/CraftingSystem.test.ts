import { describe, expect, it } from "vitest";
import { RunInventory } from "../inventory/RunInventory";
import { ResourceId } from "../survival/Resources";
import { CraftingSystem, RECIPES } from "./CraftingSystem";

describe("crafting into the physical inventory", () => {
  it("requires ingredients and does not grant weapons to an empty bag", () => {
    const bag = new RunInventory(); const crafting = new CraftingSystem(bag);
    expect(crafting.craft("blade")).toBe(false);
    expect(bag.itemStacks()).toHaveLength(0);
  });
  it.each(RECIPES.map(recipe => recipe.id))("consumes exact costs and produces a usable item for %s", id => {
    const bag = new RunInventory(); const crafting = new CraftingSystem(bag); const recipe = crafting.recipe(id)!;
    for (const [resource, amount] of Object.entries(recipe.cost)) bag.addResource(resource as ResourceId, amount!);
    expect(crafting.status(id)).toBe("ready");
    expect(crafting.craft(id)).toBe(true);
    expect(Object.values(ResourceId).every(resource => bag.resourceCount(resource) === 0)).toBe(true);
    expect(bag.itemStacks().map(item => [item.definitionId, item.quantity])).toEqual([[recipe.output, 1]]);
  });
  it("crafts in a full bag when consuming ingredients frees the required slot", () => {
    const bag = new RunInventory(); const crafting = new CraftingSystem(bag);
    bag.addResource(ResourceId.Wood,2); bag.addResource(ResourceId.Stone,3); bag.addResource(ResourceId.Metal,1);
    bag.addResource(ResourceId.Soil,33*64);
    expect(crafting.craft("blade")).toBe(true);
    expect(bag.itemStacks()[0]?.definitionId).toBe("blade");
  });
  it("keeps ingredients untouched when the crafted item would not fit", () => {
    const bag = new RunInventory(); const crafting = new CraftingSystem(bag);
    bag.addResource(ResourceId.Wood,10); bag.addResource(ResourceId.Stone,10); bag.addResource(ResourceId.Metal,10);
    bag.addResource(ResourceId.Soil,33*64);
    const before = JSON.stringify(bag.slots);
    expect(crafting.status("blade")).toBe("space");
    expect(crafting.craft("blade")).toBe(false);
    expect(JSON.stringify(bag.slots)).toBe(before);
  });
  it("stacks defenses and consumes only one placed item", () => {
    const bag = new RunInventory(); const crafting = new CraftingSystem(bag);
    bag.addResource(ResourceId.Wood,4); bag.addResource(ResourceId.Stone,4);
    expect(crafting.craft("defense-wall")).toBe(true); expect(crafting.craft("defense-wall")).toBe(true);
    const slot=bag.slots.findIndex(item=>item?.kind==="item"&&item.definitionId==="defense-wall");
    expect(bag.slot(slot)?.quantity).toBe(2);
    expect(bag.consumeItemAt(slot)).toBe(true); expect(bag.slot(slot)?.quantity).toBe(1);
  });
  it("does not partially insert or duplicate a cursor stack when only partial space remains", () => {
    const bag = new RunInventory(); bag.addResource(ResourceId.Soil,36*64-1);
    expect(bag.insertDetachedStack({kind:"resource",resource:ResourceId.Soil,quantity:2})).toBe(false);
    expect(bag.resourceCount(ResourceId.Soil)).toBe(36*64-1);
  });
});
