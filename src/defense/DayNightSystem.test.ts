import { describe, expect, it } from "vitest";
import { DayNightSystem, DayPhase } from "./DayNightSystem";

describe("DayNightSystem", () => {
  it("advances from day to night and increments the night counter", () => {
    const cycle = new DayNightSystem(2, 3);

    expect(cycle.phase).toBe(DayPhase.Day);
    expect(cycle.night).toBe(0);

    const transition = cycle.update(2.1);

    expect(transition?.from).toBe(DayPhase.Day);
    expect(transition?.to).toBe(DayPhase.Night);
    expect(cycle.phase).toBe(DayPhase.Night);
    expect(cycle.night).toBe(1);
  });

  it("returns to day without incrementing the night twice", () => {
    const cycle = new DayNightSystem(1, 1);
    cycle.update(1.1);
    cycle.update(1.1);

    expect(cycle.phase).toBe(DayPhase.Day);
    expect(cycle.night).toBe(1);
  });

  it("can hold the final night after its timer expires", () => {
    const cycle = new DayNightSystem(1, 1);
    cycle.update(1.1);
    cycle.holdTransition(true);

    expect(cycle.update(2)).toBeNull();
    expect(cycle.phase).toBe(DayPhase.Night);
    expect(cycle.timeRemaining).toBe(0);

    cycle.holdTransition(false);
    const transition = cycle.update(0.01);

    expect(transition?.to).toBe(DayPhase.Day);
  });
});
