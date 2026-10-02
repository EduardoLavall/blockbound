import { describe, expect, it } from "vitest";
import { BlockId } from "../blocks";
import { buildPaddedChunkSnapshot } from "../ChunkSnapshot";
import { VoxelWorld } from "../VoxelWorld";
import { buildGreedyMesh } from "./GreedyMesher";

describe("buildGreedyMesh", () => {
  it("merges two adjacent blocks into six exterior quads while preserving repeated UV scale", () => {
    const world = new VoxelWorld();
    const chunk = world.ensureChunk(0, 0);
    world.setBlock(1, 1, 1, BlockId.Stone);
    world.setBlock(2, 1, 1, BlockId.Stone);

    const snapshot = buildPaddedChunkSnapshot(world, chunk);
    const mesh = buildGreedyMesh(snapshot);

    expect(mesh.quadCount).toBe(6);
    expect(mesh.indices.length).toBe(36);
    expect(mesh.tiles.length).toBe(mesh.positions.length / 3);
    expect(new Set(Array.from(mesh.tiles))).toEqual(new Set([2]));
    expect(Math.max(...mesh.uvs)).toBe(2);
  });

  it("keeps different block tiles from merging into one greedy face", () => {
    const world = new VoxelWorld();
    const chunk = world.ensureChunk(0, 0);
    world.setBlock(1, 1, 1, BlockId.Stone);
    world.setBlock(2, 1, 1, BlockId.Dirt);

    const snapshot = buildPaddedChunkSnapshot(world, chunk);
    const mesh = buildGreedyMesh(snapshot);
    const tiles = new Set(Array.from(mesh.tiles));

    expect(tiles.has(1)).toBe(true);
    expect(tiles.has(2)).toBe(true);
    expect(mesh.quadCount).toBeGreaterThan(6);
  });
});
