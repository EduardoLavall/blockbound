import { BlockId } from "../voxel/blocks";

export enum ResourceId {
  Soil = "soil",
  Wood = "wood",
  Stone = "stone",
  Metal = "metal",
  Crystal = "crystal",
}

export interface ResourceDefinition {
  id: ResourceId;
  name: string;
  swatch: string;
}

export type ResourceCost = Partial<Record<ResourceId, number>>;

export const RESOURCES: Readonly<Record<ResourceId, ResourceDefinition>> = {
  [ResourceId.Soil]: { id: ResourceId.Soil, name: "Soil", swatch: "#76553b" },
  [ResourceId.Wood]: { id: ResourceId.Wood, name: "Wood", swatch: "#9a7447" },
  [ResourceId.Stone]: { id: ResourceId.Stone, name: "Stone", swatch: "#777a73" },
  [ResourceId.Metal]: { id: ResourceId.Metal, name: "Metal", swatch: "#bd8f70" },
  [ResourceId.Crystal]: { id: ResourceId.Crystal, name: "Crystal", swatch: "#54c7c9" },
};

export interface BlockDrop {
  resource: ResourceId;
  amount: number;
}

export function blockDrop(block: BlockId): BlockDrop | null {
  switch (block) {
    case BlockId.Grass:
    case BlockId.Dirt:
      return { resource: ResourceId.Soil, amount: 1 };
    case BlockId.Wood:
      return { resource: ResourceId.Wood, amount: 1 };
    case BlockId.Stone:
      return { resource: ResourceId.Stone, amount: 1 };
    case BlockId.MetalOre:
      return { resource: ResourceId.Metal, amount: 1 };
    case BlockId.Crystal:
      return { resource: ResourceId.Crystal, amount: 1 };
    default:
      return null;
  }
}

export function placementCost(block: BlockId): ResourceCost | null {
  switch (block) {
    case BlockId.Grass:
    case BlockId.Dirt:
      return { [ResourceId.Soil]: 1 };
    case BlockId.Wood:
      return { [ResourceId.Wood]: 1 };
    case BlockId.Stone:
      return { [ResourceId.Stone]: 1 };
    case BlockId.Crystal:
      return { [ResourceId.Crystal]: 1 };
    default:
      return null;
  }
}

export function formatCost(cost: ResourceCost): string {
  return Object.entries(cost)
    .filter(([, amount]) => (amount ?? 0) > 0)
    .map(([resource, amount]) => {
      const definition = RESOURCES[resource as ResourceId];
      return `${amount} ${definition.name}`;
    })
    .join(" · ");
}
