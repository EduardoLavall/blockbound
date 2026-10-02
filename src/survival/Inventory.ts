import { RunInventory } from "../inventory/RunInventory";
import { ResourceId, type ResourceCost } from "./Resources";

export class Inventory {
  constructor(
    readonly storage: RunInventory = new RunInventory(),
  ) {}

  get(resource: ResourceId): number {
    return this.storage.resourceCount(resource);
  }

  add(resource: ResourceId, amount: number): number {
    return this.storage.addResource(resource, amount);
  }

  canAfford(cost: ResourceCost): boolean {
    return Object.entries(cost).every(([resource, amount]) =>
      this.get(resource as ResourceId) >= (amount ?? 0),
    );
  }

  spend(cost: ResourceCost): boolean {
    if (!this.canAfford(cost)) return false;

    for (const [resource, amount] of Object.entries(cost)) {
      const requested = amount ?? 0;
      if (requested <= 0) continue;
      this.storage.consumeResource(
        resource as ResourceId,
        requested,
      );
    }
    return true;
  }

  snapshot(): Record<ResourceId, number> {
    return {
      [ResourceId.Soil]: this.get(ResourceId.Soil),
      [ResourceId.Wood]: this.get(ResourceId.Wood),
      [ResourceId.Stone]: this.get(ResourceId.Stone),
      [ResourceId.Metal]: this.get(ResourceId.Metal),
      [ResourceId.Crystal]: this.get(ResourceId.Crystal),
    };
  }

  subscribe(listener: () => void): () => void {
    return this.storage.subscribe(listener);
  }
}
