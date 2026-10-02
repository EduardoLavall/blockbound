import { describe, expect, it } from "vitest";
import {
  VOXEL_ATLAS_URL,
  VOXEL_TEXTURE_SOURCES,
} from "./manifest";

describe("voxel texture manifest", () => {
  it("contains eight real 16x16 source tiles in atlas order", () => {
    expect(VOXEL_TEXTURE_SOURCES).toHaveLength(8);
    expect(VOXEL_TEXTURE_SOURCES.map((source) => source.tile)).toEqual(
      [0, 1, 2, 3, 4, 5, 6, 7],
    );
    expect(
      VOXEL_TEXTURE_SOURCES.every(
        (source) => source.width === 16 && source.height === 16,
      ),
    ).toBe(true);
  });

  it("keeps every source URL and the packed atlas as real PNG assets", () => {
    for (const source of VOXEL_TEXTURE_SOURCES) {
      expect(source.url).toContain(".png");
    }
    expect(VOXEL_ATLAS_URL).toContain(".png");
  });
});
