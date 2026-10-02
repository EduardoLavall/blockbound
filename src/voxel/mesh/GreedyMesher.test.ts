import { describe, expect, it } from "vitest";
import { BlockId } from "../blocks";
import { buildPaddedChunkSnapshot } from "../ChunkSnapshot";
import { VoxelWorld } from "../VoxelWorld";
import { buildGreedyMesh } from "./GreedyMesher";

describe("buildGreedyMesh", () => {
  it("merges two adjacent blocks into six exterior quads", () => {
    const world = new VoxelWorld();
    const chunk = world.ensureChunk(0, 0);
    world.setBlock(1, 1, 1, BlockId.Stone);
    world.setBlock(2, 1, 1, BlockId.Stone);

    const snapshot = buildPaddedChunkSnapshot(world, chunk);
    const mesh = buildGreedyMesh(snapshot);

    expect(mesh.quadCount).toBe(6);
    expect(mesh.indices.length).toBe(36);
  });
});
