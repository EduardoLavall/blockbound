import { ResourceId, type ResourceCost } from "./Resources";

export class Inventory {
  private readonly counts = new Map<ResourceId, number>();
  private readonly listeners = new Set<() => void>();

  constructor() {
    for (const resource of Object.values(ResourceId)) {
      this.counts.set(resource, 0);
    }
  }

  get(resource: ResourceId): number {
    return this.counts.get(resource) ?? 0;
  }

  add(resource: ResourceId, amount: number): void {
    if (amount <= 0) return;
    this.counts.set(resource, this.get(resource) + amount);
    this.emit();
  }

  canAfford(cost: ResourceCost): boolean {
    return Object.entries(cost).every(([resource, amount]) =>
      this.get(resource as ResourceId) >= (amount ?? 0),
    );
  }

  spend(cost: ResourceCost): boolean {
    if (!this.canAfford(cost)) return false;

    for (const [resource, amount] of Object.entries(cost)) {
      this.counts.set(
        resource as ResourceId,
        this.get(resource as ResourceId) - (amount ?? 0),
      );
    }
    this.emit();
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
    this.listeners.add(listener);
    listener();
    return () => this.listeners.delete(listener);
  }

  private emit(): void {
    for (const listener of this.listeners) listener();
  }
}
