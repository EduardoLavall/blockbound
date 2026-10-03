import { describe, expect, it } from "vitest";
import { GAME_VERSION, GAME_VERSION_LABEL } from "./version";

describe("game version", () => {
  it("uses semantic versioning from package.json", () => {
    expect(GAME_VERSION).toMatch(/^\d+\.\d+\.\d+(?:[-+][0-9A-Za-z.-]+)?$/);
    expect(GAME_VERSION_LABEL).toBe(`v${GAME_VERSION}`);
  });
});
