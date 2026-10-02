import { ResourceId, type ResourceCost } from "../survival/Resources";

export enum StructureType {
  Wall = "wall",
  Turret = "turret",
  RapidTurret = "rapid-turret",
  Spike = "spike",
  Gate = "gate",
}

export interface StructureDefinition {
  type: StructureType;
  name: string;
  cost: ResourceCost;
  maxHealth: number;
  width: number;
  depth: number;
  height: number;
  swatch: string;
  repairResource: ResourceId;
  repairAmount: number;
  repairHealth: number;
  range?: number;
}

export const STRUCTURES: Readonly<Record<StructureType, StructureDefinition>> = {
  [StructureType.Wall]: {
    type: StructureType.Wall,
    name: "Wall",
    cost: { [ResourceId.Wood]: 2, [ResourceId.Stone]: 2 },
    maxHealth: 160,
    width: 2,
    depth: 0.45,
    height: 2,
    swatch: "#756451",
    repairResource: ResourceId.Stone,
    repairAmount: 1,
    repairHealth: 40,
  },
  [StructureType.Turret]: {
    type: StructureType.Turret,
    name: "Turret",
    cost: {
      [ResourceId.Wood]: 2,
      [ResourceId.Metal]: 2,
      [ResourceId.Crystal]: 1,
    },
    maxHealth: 120,
    width: 1,
    depth: 1,
    height: 2.1,
    swatch: "#738286",
    repairResource: ResourceId.Metal,
    repairAmount: 1,
    repairHealth: 35,
    range: 12,
  },
  [StructureType.RapidTurret]: {
    type: StructureType.RapidTurret,
    name: "Rapid Turret",
    cost: {
      [ResourceId.Wood]: 2,
      [ResourceId.Metal]: 3,
      [ResourceId.Crystal]: 1,
    },
    maxHealth: 100,
    width: 1,
    depth: 1,
    height: 1.85,
    swatch: "#8e805d",
    repairResource: ResourceId.Metal,
    repairAmount: 1,
    repairHealth: 30,
    range: 9.5,
  },
  [StructureType.Spike]: {
    type: StructureType.Spike,
    name: "Spike Trap",
    cost: {
      [ResourceId.Wood]: 1,
      [ResourceId.Metal]: 1,
    },
    maxHealth: 90,
    width: 1.7,
    depth: 1.7,
    height: 0.45,
    swatch: "#8e795c",
    repairResource: ResourceId.Wood,
    repairAmount: 1,
    repairHealth: 30,
  },
  [StructureType.Gate]: {
    type: StructureType.Gate,
    name: "Gate",
    cost: {
      [ResourceId.Wood]: 4,
      [ResourceId.Metal]: 1,
    },
    maxHealth: 190,
    width: 2.4,
    depth: 0.45,
    height: 2.5,
    swatch: "#7e6546",
    repairResource: ResourceId.Wood,
    repairAmount: 1,
    repairHealth: 45,
  },
};

export const STRUCTURE_ORDER: readonly StructureType[] = [
  StructureType.Wall,
  StructureType.Turret,
  StructureType.Spike,
  StructureType.Gate,
  StructureType.RapidTurret,
];


export function structureAllowedOnLane(
  type: StructureType,
): boolean {
  return type === StructureType.Spike;
}
