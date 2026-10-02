import { describe, expect, it } from "vitest";
import { BlockId } from "../voxel/blocks";
import { miningDuration } from "./Mining";
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
