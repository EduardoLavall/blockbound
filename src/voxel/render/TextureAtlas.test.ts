import { describe, expect, it } from "vitest";
import { atlasUvForLocal } from "./TextureAtlas";

describe("voxel tiled atlas UVs", () => {
  it("repeats the same atlas tile for each integer local UV", () => {
    const a = atlasUvForLocal(2, 0.25, 0.25);
    const b = atlasUvForLocal(2, 1.25, 0.25);
    const c = atlasUvForLocal(2, 4.25, 3.25);

    expect(b.u).toBeCloseTo(a.u);
    expect(b.v).toBeCloseTo(a.v);
    expect(c.u).toBeCloseTo(a.u);
    expect(c.v).toBeCloseTo(a.v);
  });

  it("keeps sampling inside the selected atlas tile", () => {
    const bottomLeft = atlasUvForLocal(7, 0, 0);
    const nearTopRight = atlasUvForLocal(7, 0.999, 0.999);

    // Tile 7 is column 3, row 1 in a 4x2 atlas.
    expect(bottomLeft.u).toBeGreaterThan(3 / 4);
    expect(nearTopRight.u).toBeLessThan(1);
    expect(bottomLeft.v).toBeGreaterThan(0);
    expect(nearTopRight.v).toBeLessThan(0.5);
  });
});
