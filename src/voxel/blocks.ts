export enum BlockId {
  Air = 0,
  Grass = 1,
  Dirt = 2,
  Stone = 3,
  Wood = 4,
  Crystal = 5,
  Bedrock = 6,
  Leaves = 7,
  MetalOre = 8,
}

export interface BlockDefinition {
  id: BlockId;
  name: string;
  atlasTile: number;
  solid: boolean;
  placeable: boolean;
  destructible: boolean;
  swatch: string;
}

export const BLOCKS: Readonly<Record<number, BlockDefinition>> = {
  [BlockId.Air]: { id: BlockId.Air, name: "Air", atlasTile: 0, solid: false, placeable: false, destructible: false, swatch: "#000000" },
  [BlockId.Grass]: { id: BlockId.Grass, name: "Grass", atlasTile: 0, solid: true, placeable: true, destructible: true, swatch: "#6f9148" },
  [BlockId.Dirt]: { id: BlockId.Dirt, name: "Dirt", atlasTile: 1, solid: true, placeable: true, destructible: true, swatch: "#76553b" },
  [BlockId.Stone]: { id: BlockId.Stone, name: "Stone", atlasTile: 2, solid: true, placeable: true, destructible: true, swatch: "#777a73" },
  [BlockId.Wood]: { id: BlockId.Wood, name: "Wood", atlasTile: 3, solid: true, placeable: true, destructible: true, swatch: "#9a7447" },
  [BlockId.Crystal]: { id: BlockId.Crystal, name: "Crystal", atlasTile: 4, solid: true, placeable: true, destructible: true, swatch: "#54c7c9" },
  [BlockId.Bedrock]: { id: BlockId.Bedrock, name: "Bedrock", atlasTile: 5, solid: true, placeable: false, destructible: false, swatch: "#30343a" },
  [BlockId.Leaves]: { id: BlockId.Leaves, name: "Leaves", atlasTile: 6, solid: true, placeable: false, destructible: true, swatch: "#3f7441" },
  [BlockId.MetalOre]: { id: BlockId.MetalOre, name: "Metal Ore", atlasTile: 7, solid: true, placeable: false, destructible: true, swatch: "#a17f69" },
};

export const PLACEABLE_BLOCKS: readonly BlockId[] = [
  BlockId.Grass,
  BlockId.Dirt,
  BlockId.Stone,
  BlockId.Wood,
  BlockId.Crystal,
];

export function blockDefinition(id: number): BlockDefinition {
  return BLOCKS[id] ?? BLOCKS[BlockId.Air]!;
}

export function isSolidBlock(id: number): boolean {
  return blockDefinition(id).solid;
}
