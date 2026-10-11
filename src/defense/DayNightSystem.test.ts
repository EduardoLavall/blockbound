import { describe, expect, it } from "vitest";
import { DayNightSystem, DayPhase } from "./DayNightSystem";

describe("DayNightSystem", () => {
  it("never brightens again when dusk crosses into the night phase", () => {
    const cycle = new DayNightSystem();
    cycle.update(71);
    let previous = cycle.nightFactor;
    for (let frame = 0; frame < 8 * 60; frame++) {
      cycle.update(1 / 60);
      expect(cycle.nightFactor).toBeGreaterThanOrEqual(previous - 1e-10);
      previous = cycle.nightFactor;
    }
    expect(cycle.phase).toBe(DayPhase.Night);
    expect(cycle.nightFactor).toBe(1);
  });
  it("keeps full darkness on the exact natural boundary and with a frame overshoot", () => {
    const exact = new DayNightSystem();
    exact.update(75);
    expect(exact.phase).toBe(DayPhase.Night);
    expect(exact.nightFactor).toBe(1);
    const overshoot = new DayNightSystem();
    overshoot.update(75.02);
    expect(overshoot.nightFactor).toBe(1);
  });
  it.each([0, 72, 74])("starts an early night continuously from the current light at %ss", elapsed => {
    const cycle = new DayNightSystem();
    cycle.update(elapsed);
    const before = cycle.nightFactor;
    cycle.startNightEarly();
    expect(cycle.nightFactor).toBe(before);
    cycle.update(1);
    expect(cycle.nightFactor).toBeGreaterThan(before);
    cycle.update(3);
    expect(cycle.nightFactor).toBe(1);
  });
  it("keeps dawn continuous even if a night is cleared before its fade finishes", () => {
    const cycle = new DayNightSystem();
    cycle.startNightEarly(); cycle.update(1);
    const before = cycle.nightFactor;
    cycle.completeNight();
    expect(cycle.nightFactor).toBe(before);
    cycle.update(1);
    expect(cycle.nightFactor).toBeLessThan(before);
    cycle.update(3);
    expect(cycle.nightFactor).toBe(0);
  });
  it("starts early once and cannot skip a live wave", () => {
    const cycle = new DayNightSystem();
    expect(cycle.startNightEarly()?.night).toBe(1);
    expect(cycle.startNightEarly()).toBeNull();
    expect(cycle.night).toBe(1);
  });
  it("keeps every night active until explicitly cleared, then gives a fresh preparation", () => {
    const cycle = new DayNightSystem();
    for (let night = 1; night <= 5; night++) {
      expect(cycle.startNightEarly()?.night).toBe(night);
      cycle.holdTransition(true);
      expect(cycle.update(1000)).toBeNull();
      expect(cycle.phase).toBe(DayPhase.Night);
      expect(cycle.completeNight()?.to).toBe(DayPhase.Day);
      expect(cycle.timeRemaining).toBe(75);
      expect(cycle.completeNight()).toBeNull();
    }
  });
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
