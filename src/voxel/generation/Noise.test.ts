import { describe, expect, it } from "vitest";
import { fbm2D } from "./Noise";

describe("procedural noise", () => {
  it("is deterministic for the same seed and coordinates", () => {
    expect(fbm2D(12345, 1.25, -9.75)).toBe(
      fbm2D(12345, 1.25, -9.75),
    );
  });

  it("changes when the seed changes", () => {
    expect(fbm2D(12345, 4.2, 9.1)).not.toBe(
      fbm2D(54321, 4.2, 9.1),
    );
  });
});
