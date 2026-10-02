import { describe, expect, it } from "vitest";
import { BlockId } from "../voxel/blocks";
import {
  blockHardness,
  miningDuration,
} from "./Mining";
import { PICKAXE } from "./MiningTool";
import { blockDrop, ResourceId } from "./Resources";

describe("survival mining rules", () => {
  it("makes harder resources slower to mine", () => {
    expect(miningDuration(BlockId.Wood)).toBeGreaterThan(
      miningDuration(BlockId.Dirt),
    );
    expect(miningDuration(BlockId.MetalOre)).toBeGreaterThan(
      miningDuration(BlockId.Stone),
    );
    expect(miningDuration(BlockId.Crystal)).toBeGreaterThan(
      miningDuration(BlockId.MetalOre),
    );
  });

  it("preserves the previous duration baseline through hardness", () => {
    expect(blockHardness(BlockId.Dirt)).toBe(0.38);
    expect(blockHardness(BlockId.Stone)).toBe(1.05);
    expect(blockHardness(BlockId.MetalOre)).toBe(1.45);
    expect(blockHardness(BlockId.Crystal)).toBe(1.75);

    expect(miningDuration(BlockId.Stone, PICKAXE)).toBeCloseTo(1.05);
    expect(miningDuration(BlockId.Crystal, PICKAXE)).toBeCloseTo(1.75);
  });

  it("maps mined resource blocks to inventory resources", () => {
    expect(blockDrop(BlockId.Wood)).toEqual({
      resource: ResourceId.Wood,
      amount: 1,
    });
    expect(blockDrop(BlockId.MetalOre)).toEqual({
      resource: ResourceId.Metal,
      amount: 1,
    });
    expect(blockDrop(BlockId.Bedrock)).toBeNull();
  });
});
