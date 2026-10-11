import { afterEach, describe, expect, it, vi } from "vitest";
import { AudioSystem } from "./AudioSystem";
import { BLOCKS, BlockId } from "../../voxel/blocks";
import { BLOCK_SOUNDS, SOUND_ASSETS, SOUND_GROUPS } from "./SoundBank";

class Node {
  connect = vi.fn(); disconnect = vi.fn();
  gain = { value: 0, setTargetAtTime: vi.fn() };
  pan = { value: 0 };
  frequency = { value: 0 };
}
class Source extends Node {
  buffer: unknown = null; playbackRate = { value: 1 }; onended: (() => void) | null = null;
  started = false; stopped = false;
  start(): void { this.started = true; }
  stop(): void { this.stopped = true; }
}
class Context {
  static latest: Context;
  state = "running"; currentTime = 0; destination = new Node(); sources: Source[] = [];
  constructor() { Context.latest = this; }
  createGain() { return new Node(); }
  createStereoPanner() { return new Node(); }
  createBiquadFilter() { return new Node(); }
  createDynamicsCompressor() { return { ...new Node(), connect: vi.fn(), threshold: { value: 0 }, knee: { value: 0 },
    ratio: { value: 0 }, attack: { value: 0 }, release: { value: 0 } }; }
  createBufferSource() { const source = new Source(); this.sources.push(source); return source; }
  async decodeAudioData(data: ArrayBuffer) { return { asset: new Uint8Array(data)[0] }; }
  async resume() { this.state = "running"; }
}
async function ready(): Promise<AudioSystem> {
  vi.stubGlobal("AudioContext", Context);
  vi.stubGlobal("fetch", vi.fn(async (url: string) => ({ ok: true, arrayBuffer: async () => {
    const bytes = new Uint8Array(8);
    bytes[0] = SOUND_ASSETS.findIndex(asset => url === `/audio/${asset}.ogg`);
    return bytes.buffer;
  } })));
  const audio = new AudioSystem(); await audio.unlock(); return audio;
}
afterEach(() => vi.unstubAllGlobals());
describe("audio lifecycle and mix", () => {
  it.each(Object.values(BLOCKS).filter(block => block.destructible))("plays the correct final rupture for $name, even just after a strike", async block => {
    const audio = await ready(); const context = Context.latest;
    audio.mine(block.id, false);
    expect(context.sources).toHaveLength(1);
    const strike = context.sources[0]!.buffer;
    audio.mine(block.id, true);
    expect(context.sources).toHaveLength(2);
    const name = SOUND_GROUPS[BLOCK_SOUNDS[block.id].broken!][0]!;
    expect(context.sources[1]!.buffer).toEqual({ asset: SOUND_ASSETS.indexOf(name) });
    expect(context.sources[1]!.buffer).not.toEqual(strike);
    audio.setEnabled(false); context.currentTime += 1; audio.mine(block.id, true);
    expect(context.sources).toHaveLength(2);
  });
  it("keeps air and indestructible bedrock silent instead of falling back to stone", async () => {
    const audio = await ready();
    for (const block of [BlockId.Air, BlockId.Bedrock]) {
      audio.mine(block, false); audio.mine(block, true);
    }
    expect(Context.latest.sources).toHaveLength(0);
  });
  it("plays separate fall and impact recordings, honoring volume and mute", async () => {
    const audio = await ready(); const context = Context.latest;
    audio.treeFall(0.5, -0.3); audio.treeImpact(0.5, 0.3);
    expect(context.sources).toHaveLength(2);
    expect(context.sources[0]!.playbackRate.value).toBe(1);
    expect(context.sources[1]!.playbackRate.value).toBe(1);
    audio.setVolume(0); context.currentTime += 1; audio.treeFall(); audio.treeImpact();
    expect(context.sources).toHaveLength(2);
  });
  it("decodes the bank once and reuses it across inventory/menu resume", async () => {
    const audio = await ready(); const requests = vi.mocked(fetch).mock.calls.length;
    expect(audio.loadedCount).toBe(SOUND_ASSETS.length); await audio.unlock(); expect(vi.mocked(fetch).mock.calls.length).toBe(requests);
    audio.shoot(); expect(Context.latest.sources.length).toBe(1);
    audio.pause(); expect(Context.latest.sources[0]!.stopped).toBe(true);
    Context.latest.currentTime += 0.3; audio.shoot(); expect(Context.latest.sources.length).toBe(2);
  });
  it("caps active voices and disconnects sounds evicted from the mix", async () => {
    const audio = await ready(); const context = Context.latest;
    for (let i = 0; i < 40; i++) { context.currentTime += 0.1; audio.shoot(); }
    expect(context.sources.filter(source => !source.stopped)).toHaveLength(24);
    expect(context.sources[0]!.disconnect).toHaveBeenCalled();
    audio.pause(); expect(context.sources.every(source => source.stopped)).toBe(true);
  });
  it("honors mute and suppresses duplicate same-frame hit noise", async () => {
    const audio = await ready(); const context = Context.latest;
    audio.setVolume(0); audio.shoot(); expect(context.sources).toHaveLength(0);
    audio.setVolume(0.4); audio.hit(); audio.hit(); expect(context.sources).toHaveLength(1);
    audio.setEnabled(false); audio.choose(); expect(context.sources).toHaveLength(1);
  });
});
