import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { BLOCKS, BlockId } from "../../voxel/blocks";
import { BLOCK_SOUNDS, SOUND_ASSETS, SOUND_GROUPS } from "./SoundBank";

describe("recorded sound assets", () => {
  it("gives every destructible block an exclusive final rupture recording", () => {
    const destructible = Object.values(BLOCKS).filter(block => block.destructible);
    const recordings = destructible.flatMap(block => {
      const sounds = BLOCK_SOUNDS[block.id];
      expect(sounds.strike, block.name).not.toBeNull();
      expect(sounds.broken, block.name).not.toBeNull();
      expect(sounds.broken, block.name).not.toBe(sounds.strike);
      return [...SOUND_GROUPS[sounds.broken!]];
    });
    expect(new Set(recordings).size).toBe(recordings.length);
    expect(BLOCK_SOUNDS[BlockId.Air].broken).toBeNull();
    expect(BLOCK_SOUNDS[BlockId.Bedrock].broken).toBeNull();
  });
  it("ships every sound referenced by the game as an Ogg recording", () => {
    expect(SOUND_ASSETS.length).toBe(49);
    for (const name of SOUND_ASSETS) {
      const data = readFileSync(new URL(`../../../public/audio/${name}.ogg`, import.meta.url));
      expect(data.length, name).toBeGreaterThan(100);
      expect(data.subarray(0, 4).toString("ascii"), name).toBe("OggS");
    }
  });
});
