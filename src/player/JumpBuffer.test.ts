import { describe, expect, it } from "vitest";
import { JumpBuffer } from "./JumpBuffer";

describe("jump forgiveness", () => {
  it("accepts a press shortly before landing", () => {
    const jump = new JumpBuffer();
    expect(jump.update(0.016, false, true)).toBe(false);
    expect(jump.update(0.06, true, false)).toBe(true);
    expect(jump.update(0.016, false, false)).toBe(false);
  });
  it("accepts a press just after leaving a ledge", () => {
    const jump = new JumpBuffer();
    jump.update(0.016, true, false);
    expect(jump.update(0.05, false, true)).toBe(true);
    expect(jump.update(0.016, false, true)).toBe(false);
  });
  it("never permits a late mid-air jump", () => {
    const jump = new JumpBuffer();
    jump.update(0.016, true, false);
    expect(jump.update(0.15, false, true)).toBe(false);
    expect(jump.update(0.15, true, false)).toBe(false);
  });
});
