import { describe, expect, it } from "vitest";
import { FixedStepAccumulator } from "./FixedStepAccumulator";

describe("FixedStepAccumulator", () => {
  it("produces deterministic fixed steps", () => {
    const clock = new FixedStepAccumulator(1 / 60, 0.1);
    expect(clock.advance(1 / 30)).toBe(2);
    expect(clock.alpha).toBeCloseTo(0);
  });

  it("caps giant browser frame gaps", () => {
    const clock = new FixedStepAccumulator(1 / 60, 0.1);
    expect(clock.advance(10)).toBe(6);
  });
});
