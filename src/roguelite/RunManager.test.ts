import { describe, expect, it } from "vitest";
import { RunManager } from "./RunManager";

describe("RunManager", () => {
  it("tracks nights kills and unique acquired upgrades", () => {
    const run = new RunManager();

    run.completeNight(1);
    run.completeNight(2);
    run.recordPlayerKill();
    run.recordPlayerKill();
    run.acquireUpgrade("alpha");
    run.acquireUpgrade("alpha");
    run.acquireUpgrade("beta");

    expect(run.summary()).toEqual({
      nightsSurvived: 2,
      playerKills: 2,
      upgrades: ["alpha", "beta"],
    });
  });
});
