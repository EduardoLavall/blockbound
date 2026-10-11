import type { RunInventory } from "../inventory/RunInventory";
import { STRUCTURES } from "../building/StructureRegistry";
import { CRAFTED_ITEMS } from "../items/ItemRegistry";
import { ResourceId, type ResourceCost } from "../survival/Resources";

export interface CraftingRecipe { id: string; output: string; cost: ResourceCost }
export const RECIPES: readonly CraftingRecipe[] = [
  { id: "blade", output: "blade", cost: { [ResourceId.Wood]: 2, [ResourceId.Stone]: 3, [ResourceId.Metal]: 1 } },
  { id: "repeater", output: "repeater", cost: { [ResourceId.Wood]: 3, [ResourceId.Metal]: 4, [ResourceId.Crystal]: 1 } },
  ...CRAFTED_ITEMS.filter(item => item.structure).map(item => ({ id: item.id, output: item.id, cost: STRUCTURES[item.structure!].cost })),
];
export class CraftingSystem {
  constructor(readonly storage: RunInventory) {}
  recipe(id: string): CraftingRecipe | undefined { return RECIPES.find(recipe => recipe.id === id); }
  status(id: string): "ready" | "resources" | "space" {
    const recipe = this.recipe(id);
    if (!recipe || Object.entries(recipe.cost).some(([resource, amount]) => this.storage.resourceCount(resource as ResourceId) < (amount ?? 0))) return "resources";
    return this.storage.canCraftItem(recipe.output, recipe.cost) ? "ready" : "space";
  }
  craft(id: string): boolean {
    const recipe = this.recipe(id);
    return Boolean(recipe && this.storage.craftItem(recipe.output, recipe.cost));
  }
}
