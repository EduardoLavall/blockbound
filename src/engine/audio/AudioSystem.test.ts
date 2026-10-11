import { afterEach, describe, expect, it, vi } from "vitest";
import { AudioSystem } from "./AudioSystem";

class Node {
  connect = vi.fn(); disconnect = vi.fn();
  gain = { value: 0, setTargetAtTime: vi.fn() };
  pan = { value: 0 };
  frequency = { value: 0 };
}
class Source extends Node {
  buffer = null; playbackRate = { value: 1 }; onended: (() => void) | null = null;
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
  async decodeAudioData() { return {}; }
  async resume() { this.state = "running"; }
}
async function ready(): Promise<AudioSystem> {
  vi.stubGlobal("AudioContext", Context);
  vi.stubGlobal("fetch", vi.fn(async () => ({ ok: true, arrayBuffer: async () => new ArrayBuffer(8) })));
  const audio = new AudioSystem(); await audio.unlock(); return audio;
}
afterEach(() => vi.unstubAllGlobals());
describe("audio lifecycle and mix", () => {
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
    expect(audio.loadedCount).toBe(42); await audio.unlock(); expect(vi.mocked(fetch).mock.calls.length).toBe(requests);
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
