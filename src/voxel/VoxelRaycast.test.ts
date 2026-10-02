import { describe, expect, it } from "vitest";
import { BlockId } from "./blocks";
import { raycastVoxels } from "./VoxelRaycast";
import { VoxelWorld } from "./VoxelWorld";

describe("raycastVoxels", () => {
  it("hits the first solid voxel and reports the entered face", () => {
    const world = new VoxelWorld();
    world.ensureChunk(0, 0);
    world.setBlock(2, 2, 2, BlockId.Stone);

    const hit = raycastVoxels(
      world,
      { x: 0.5, y: 2.5, z: 2.5 },
      { x: 1, y: 0, z: 0 },
      8,
    );

    expect(hit?.voxel).toEqual({ x: 2, y: 2, z: 2 });
    expect(hit?.faceNormal).toEqual({ x: -1, y: 0, z: 0 });
    expect(hit?.adjacent).toEqual({ x: 1, y: 2, z: 2 });
  });
});
