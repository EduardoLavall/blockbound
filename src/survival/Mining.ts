import { BlockId } from "../voxel/blocks";

export function miningDuration(block: BlockId): number {
  switch (block) {
    case BlockId.Leaves:
      return 0.2;
    case BlockId.Grass:
      return 0.28;
    case BlockId.Dirt:
      return 0.38;
    case BlockId.Wood:
      return 0.72;
    case BlockId.Stone:
      return 1.05;
    case BlockId.MetalOre:
      return 1.45;
    case BlockId.Crystal:
      return 1.75;
    default:
      return Infinity;
  }
}
