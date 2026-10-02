import { BlockId } from "../voxel/blocks";
import {
  PICKAXE,
  type MiningToolDefinition,
  toolAdjustedMiningDuration,
} from "./MiningTool";

export const BLOCK_HARDNESS: Readonly<Partial<Record<BlockId, number>>> = {
  [BlockId.Leaves]: 0.2,
  [BlockId.Grass]: 0.28,
  [BlockId.Dirt]: 0.38,
  [BlockId.Wood]: 0.72,
  [BlockId.Stone]: 1.05,
  [BlockId.MetalOre]: 1.45,
  [BlockId.Crystal]: 1.75,
};

export function blockHardness(block: BlockId): number {
  return BLOCK_HARDNESS[block] ?? Infinity;
}

export function miningDuration(
  block: BlockId,
  tool: MiningToolDefinition = PICKAXE,
): number {
  return toolAdjustedMiningDuration(blockHardness(block), tool);
}
