import { describe, expect, it } from "vitest";
import { PlayerVitals } from "./PlayerVitals";

describe("PlayerVitals", () => {
  it("prevents immediate repeated contact damage", () => {
    const vitals = new PlayerVitals();

    expect(vitals.damage(20)).toBe(20);
    expect(vitals.damage(20)).toBe(0);

    vitals.update(0.25);

    expect(vitals.damage(20)).toBe(20);
  });

  it("reports death at zero HP", () => {
    const vitals = new PlayerVitals();
    vitals.damage(999);

    expect(vitals.dead).toBe(true);
    expect(vitals.health.current).toBe(0);
  });
});
