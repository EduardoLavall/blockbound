import { describe, expect, it } from "vitest";
import { simulationActive } from "./SimulationState";
import { DayNightSystem } from "../defense/DayNightSystem";

describe("simulation pause", () => {
  const active = { locked: true, hidden: false, ended: false, drafting: false, inventoryOpen: false };
  it("advances only while the player is actually in the game", () => expect(simulationActive(active)).toBe(true));
  it.each([
    { locked: false }, { hidden: true }, { ended: true }, { drafting: true }, { inventoryOpen: true },
  ])("keeps preparation time unchanged while paused: %j", patch => {
    const cycle = new DayNightSystem();
    for (let frame = 0; frame < 7200; frame++) {
      if (simulationActive({ ...active, ...patch })) cycle.update(1 / 60);
    }
    expect(cycle.timeRemaining).toBe(75);
    expect(cycle.night).toBe(0);
  });
});
