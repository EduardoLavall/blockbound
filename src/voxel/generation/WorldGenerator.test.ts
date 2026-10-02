import { describe, expect, it } from "vitest";
import { CHUNK_SIZE } from "../constants";
import { createRunSeed } from "./Seed";
import { generateWorld } from "./WorldGenerator";

function checksum(seedText: string): number {
  const { world } = generateWorld(createRunSeed(seedText), 1);
  let hash = 2166136261;

  for (const chunk of world.getChunks()) {
    for (const block of chunk.blocks) {
      hash ^= block;
      hash = Math.imul(hash, 16777619);
    }
  }

  return hash >>> 0;
}

describe("generateWorld", () => {
  it("reproduces the same world for the same seed", () => {
    expect(checksum("same-seed")).toBe(checksum("same-seed"));
  });

  it("produces different voxel data for different seeds", () => {
    expect(checksum("alpha")).not.toBe(checksum("beta"));
  });

  it("creates explicit finite bounds", () => {
    const { world, metadata } = generateWorld(
      createRunSeed("finite"),
      1,
    );

    expect(world.getChunks()).toHaveLength(9);
    expect(metadata.chunksPerAxis).toBe(3);
    expect(
      metadata.bounds.maxXExclusive - metadata.bounds.minX,
    ).toBe(CHUNK_SIZE * 3);
    expect(world.getChunk(2, 0)).toBeUndefined();
  });

  it("reserves core, one lane spawn and POIs", () => {
    const { metadata } = generateWorld(
      createRunSeed("landmarks"),
      1,
    );

    expect(metadata.spawnZones).toHaveLength(1);
    expect(metadata.spawnZones[0]).toEqual(metadata.lane.entry);
    expect(metadata.lane.width).toBe(3);
    expect(metadata.lane.cells.length).toBeGreaterThan(20);
    expect(metadata.pois.map((poi) => poi.type).sort()).toEqual([
      "altar",
      "mine",
      "ruin",
    ]);
  });

  it("creates a flat protected lane connected toward the Core", () => {
    const { world, metadata } = generateWorld(
      createRunSeed("lane-check"),
      2,
    );

    for (const cell of metadata.lane.cells) {
      expect(world.isLaneColumn(cell.x, cell.z)).toBe(true);
      expect(world.highestSolidY(cell.x, cell.z)).toBe(6);
    }

    const centerCells = metadata.lane.cells.filter(
      (cell) => cell.x === metadata.core.x,
    );
    const minZ = Math.min(...centerCells.map((cell) => cell.z));
    const maxZ = Math.max(...centerCells.map((cell) => cell.z));

    expect(minZ).toBe(metadata.lane.entry.z);
    expect(maxZ).toBe(metadata.core.z - 2);
  });
});
