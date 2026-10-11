import { describe, expect, it } from "vitest";
import { hudScale } from "./HudScale";
describe("HUD sizing", () => {
  it.each([[1920,1080,1.2],[2560,1440,1.6],[3840,2160,2.4],[1366,768,1]])("scales %sx%s consistently", (width,height,expected) => {
    expect(hudScale(width,height)).toBeCloseTo(expected);
  });
  it("applies the user's adjustment without letting ultra-wide HUDs overflow vertically", () => {
    expect(hudScale(3440,1440,1)).toBeCloseTo(1.6);
    expect(hudScale(1920,1080,1.25)).toBeCloseTo(1.5);
  });
});
