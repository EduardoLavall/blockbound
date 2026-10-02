import { describe, expect, it, vi } from "vitest";
import { DayPhase } from "./DayNightSystem";
import type { SpawnDirector } from "./SpawnDirector";
import { WaveDirector } from "./WaveDirector";

describe("WaveDirector", () => {
  it("schedules and emits enemies during a night", () => {
    const spawnNext = vi.fn(() => true);
    const spawns = { spawnNext } as unknown as SpawnDirector;
    const waves = new WaveDirector(spawns);

    waves.startNight(1);
    for (let i = 0; i < 20; i++) {
      waves.update(0.5, DayPhase.Night, 0);
    }

    expect(spawnNext).toHaveBeenCalled();
    expect(waves.stats.spawned).toBeGreaterThan(0);
    expect(waves.stats.total).toBe(11);
  });

  it("does not spawn during the day", () => {
    const spawnNext = vi.fn(() => true);
    const spawns = { spawnNext } as unknown as SpawnDirector;
    const waves = new WaveDirector(spawns);

    waves.startNight(1);
    waves.update(10, DayPhase.Day, 0);

    expect(spawnNext).not.toHaveBeenCalled();
  });
});
