import { BlockId } from "../voxel/blocks";
import { CHUNK_HEIGHT } from "../voxel/constants";
import type {
  LaneMetadata,
  SpawnZone,
  WorldBounds,
  WorldPoint,
} from "../voxel/generation/WorldMetadata";
import type { VoxelWorld } from "../voxel/VoxelWorld";

export const PRIMARY_LANE_WIDTH = 3;
export const PRIMARY_LANE_SURFACE_Y = 6;
export const LANE_NAVIGATION_COST = 0.65;

export function buildPrimaryLane(
  world: VoxelWorld,
  bounds: WorldBounds,
  core: WorldPoint,
): LaneMetadata {
  const entry: SpawnZone = {
    id: "north",
    x: core.x,
    z: bounds.minZ + 4,
  };
  const cells: WorldPoint[] = [];
  const halfWidth = Math.floor(PRIMARY_LANE_WIDTH / 2);
  const endZ = core.z - 2;

  for (let z = entry.z; z <= endZ; z++) {
    for (let dx = -halfWidth; dx <= halfWidth; dx++) {
      const x = core.x + dx;
      if (!insideBounds(bounds, x, z)) continue;

      flattenLaneColumn(world, x, z);
      world.protectColumn(x, z, "lane");
      cells.push({ x, z });
    }
  }

  return {
    id: "lane-1",
    width: PRIMARY_LANE_WIDTH,
    entry,
    cells,
  };
}

function flattenLaneColumn(
  world: VoxelWorld,
  x: number,
  z: number,
): void {
  for (let y = 1; y <= PRIMARY_LANE_SURFACE_Y; y++) {
    world.setGeneratedBlock(
      x,
      y,
      z,
      y === PRIMARY_LANE_SURFACE_Y
        ? BlockId.Stone
        : BlockId.Dirt,
    );
  }

  for (
    let y = PRIMARY_LANE_SURFACE_Y + 1;
    y < CHUNK_HEIGHT;
    y++
  ) {
    world.setGeneratedBlock(x, y, z, BlockId.Air);
  }
}

function insideBounds(
  bounds: WorldBounds,
  x: number,
  z: number,
): boolean {
  return (
    x >= bounds.minX &&
    x < bounds.maxXExclusive &&
    z >= bounds.minZ &&
    z < bounds.maxZExclusive
  );
}
