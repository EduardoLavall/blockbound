import { describe, expect, it } from "vitest";
import type { StructureSystem } from "../../building/StructureSystem";
import { createRunSeed } from "../../voxel/generation/Seed";
import { generateWorld } from "../../voxel/generation/WorldGenerator";
import { LANE_NAVIGATION_COST } from "../../world/LaneSystem";
import { NavigationGrid } from "./NavigationGrid";

const noStructures = {
  navigationAtCell: () => null,
  subscribeNavigationChanges: () => () => {},
} as unknown as StructureSystem;

describe("NavigationGrid lane awareness", () => {
  it("marks lane cells and gives them preferred traversal cost", () => {
    const { world, metadata } = generateWorld(
      createRunSeed("lane-nav"),
      2,
    );
    const grid = new NavigationGrid(
      world,
      noStructures,
      metadata.bounds,
    );

    const laneCell = metadata.lane.cells.find(
      (cell) =>
        cell.x === metadata.core.x &&
        cell.z === metadata.lane.entry.z + 4,
    );
    expect(laneCell).toBeDefined();

    const navLane = grid.getCell(laneCell!.x, laneCell!.z);
    expect(navLane?.walkable).toBe(true);
    expect(navLane?.lane).toBe(true);
    expect(navLane?.traversalCost).toBe(LANE_NAVIGATION_COST);

    const normal = grid.getCell(
      metadata.core.x + 6,
      metadata.core.z,
    );
    expect(normal?.lane).toBe(false);
    expect(normal?.traversalCost).toBe(1);
  });
});
