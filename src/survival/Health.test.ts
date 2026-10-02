import { describe, expect, it } from "vitest";
import { Health } from "./Health";

describe("Health", () => {
  it("clamps damage and repair between zero and max", () => {
    const health = new Health(100);

    expect(health.damage(35)).toBe(35);
    expect(health.current).toBe(65);

    expect(health.heal(20)).toBe(20);
    expect(health.current).toBe(85);

    health.damage(999);
    expect(health.current).toBe(0);
    expect(health.destroyed).toBe(true);

    health.heal(999);
    expect(health.current).toBe(100);
    expect(health.destroyed).toBe(false);
  });
});
