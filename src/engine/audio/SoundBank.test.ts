import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { SOUND_ASSETS } from "./SoundBank";

describe("recorded sound assets", () => {
  it("ships every sound referenced by the game as an Ogg recording", () => {
    expect(SOUND_ASSETS.length).toBe(42);
    for (const name of SOUND_ASSETS) {
      const data = readFileSync(new URL(`../../../public/audio/${name}.ogg`, import.meta.url));
      expect(data.length, name).toBeGreaterThan(100);
      expect(data.subarray(0, 4).toString("ascii"), name).toBe("OggS");
    }
  });
});
