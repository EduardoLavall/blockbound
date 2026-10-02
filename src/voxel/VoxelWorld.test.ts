import { describe, expect, it } from "vitest";
import { BlockId } from "./blocks";
import { VoxelWorld } from "./VoxelWorld";

describe("VoxelWorld", () => {
  it("maps negative world coordinates into negative chunks", () => {
    const world = new VoxelWorld();
    world.ensureChunk(-1, 0);

    const edit = world.setBlock(-1, 3, 2, BlockId.Stone);
    expect(edit.changed).toBe(true);
    expect(world.getBlock(-1, 3, 2)).toBe(BlockId.Stone);
  });

  it("prevents player edits in protected lane columns", () => {
    const world = new VoxelWorld();
    world.ensureChunk(0, 0);
    world.setGeneratedBlock(4, 2, 4, BlockId.Stone);
    world.protectColumn(4, 4, "lane");

    const remove = world.setBlock(4, 2, 4, BlockId.Air);
    const place = world.setBlock(4, 3, 4, BlockId.Wood);

    expect(remove.changed).toBe(false);
    expect(place.changed).toBe(false);
    expect(world.getBlock(4, 2, 4)).toBe(BlockId.Stone);
    expect(world.getBlock(4, 3, 4)).toBe(BlockId.Air);
    expect(world.isLaneColumn(4, 4)).toBe(true);
  });

  it("marks neighboring chunks dirty when editing a border voxel", () => {
    const world = new VoxelWorld();
    world.ensureChunk(0, 0);
    world.ensureChunk(1, 0);

    const edit = world.setBlock(15, 2, 4, BlockId.Wood);
    expect(edit.dirtyChunkKeys.sort()).toEqual(["0,0", "1,0"]);
  });
});
