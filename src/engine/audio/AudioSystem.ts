import { BlockId } from "../../voxel/blocks";
import { BLOCK_SOUNDS, SOUND_ASSETS, SOUND_GROUPS, soundUrl, type SoundGroup } from "./SoundBank";

interface Voice { source: AudioBufferSourceNode; gain: GainNode; pan: StereoPannerNode; priority: number }

/** Cached recordings, material-aware foley and a bounded, compressed mix. */
export class AudioSystem {
  private context: AudioContext | null = null;
  private master: GainNode | null = null;
  private compressor: DynamicsCompressorNode | null = null;
  private readonly raw = new Map<string, ArrayBuffer>();
  private readonly buffers = new Map<string, AudioBuffer>();
  private readonly voices = new Set<Voice>();
  private readonly lastVariant = new Map<SoundGroup, number>();
  private readonly lastPlayed = new Map<SoundGroup, number>();
  private volumeValue = 0.28;
  private enabled = true;
  private preload: Promise<void> | null = null;
  private decoding: Promise<void> | null = null;
  private previousPosition: { x: number; y: number; z: number } | null = null;
  private previousGrounded = false;
  private distanceWalked = 0;
  private fallDistance = 0;
  get loadedCount(): number { return this.buffers.size; }

  prepare(): Promise<void> {
    this.preload ??= Promise.all(SOUND_ASSETS.map(async name => {
      try {
        const response = await fetch(soundUrl(name));
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        this.raw.set(name, await response.arrayBuffer());
      } catch (error) { console.warn(`Sound unavailable: ${name}`, error); }
    })).then(() => {});
    return this.preload;
  }
  setVolume(value: number): void {
    this.volumeValue = Number.isFinite(value) ? Math.max(0, Math.min(1, value)) : 0.28;
    if (this.master && this.context) this.master.gain.setTargetAtTime(this.volumeValue, this.context.currentTime, 0.03);
  }
  setEnabled(enabled: boolean): void { this.enabled = enabled; if (!enabled) this.pause(); }
  async unlock(): Promise<void> {
    if (!this.context) {
      this.context = new AudioContext();
      this.master = this.context.createGain(); this.master.gain.value = this.volumeValue;
      this.compressor = this.context.createDynamicsCompressor();
      this.compressor.threshold.value = -18; this.compressor.knee.value = 12;
      this.compressor.ratio.value = 3; this.compressor.attack.value = 0.003; this.compressor.release.value = 0.18;
      const lowpass = this.context.createBiquadFilter(); lowpass.type = "lowpass"; lowpass.frequency.value = 14000;
      this.compressor.connect(lowpass); lowpass.connect(this.master); this.master.connect(this.context.destination);
    }
    if (this.context.state === "suspended") await this.context.resume();
    this.decoding ??= this.prepare().then(async () => {
      await Promise.all([...this.raw].map(async ([name, data]) => {
        try { this.buffers.set(name, await this.context!.decodeAudioData(data.slice(0))); }
        catch (error) { console.warn(`Sound could not be decoded: ${name}`, error); }
      }));
      this.raw.clear();
    });
    await this.decoding;
  }
  pause(): void {
    for (const voice of this.voices) { voice.source.stop(); this.disposeVoice(voice); }
    this.voices.clear();
    this.distanceWalked = 0;
    this.previousPosition = null;
    this.fallDistance = 0;
  }
  shoot(): void { this.play("shoot", 0.46, 1, 0, 0.06); }
  swing(): void { this.play("swing", 0.5, 1, 0.1); }
  equip(): void { this.play("equip", 0.26); }
  hurt(): void { this.play("hurt", 0.52, 1, 0, 0.15); }
  build(): void { this.play("build", 0.4); }
  pickup(): void { this.play("pickup", 0.18, 1.15, 0, 0.12); }
  treeFall(volume = 1, pan = 0): void { this.play("treeFall", 0.65 * volume, 1, pan, 0.08, 2); }
  treeImpact(volume = 1, pan = 0): void { this.play("treeImpact", 0.8 * volume, 1, pan, 0.08, 2); }
  hit(killed = false, pan = 0): void {
    this.play(killed ? "kill" : "hit", killed ? 0.56 : 0.36, 1, pan, 0.055);
  }
  mine(block = BlockId.Stone, broken = true): void {
    const sounds = BLOCK_SOUNDS[block];
    const group = broken ? sounds?.broken : sounds?.strike;
    if (!group) return;
    // A dedicated rupture replaces the strike on completion, so no generic hit masks it.
    this.play(group, broken ? 0.52 : 0.32, broken ? 0.97 : 1, 0, broken ? 0.035 : 0.08);
  }
  nightStart(finalNight = false): void { this.play(finalNight ? "boss" : "night", 0.46, finalNight ? 0.9 : 0.78, 0, 1, 2); }
  upgrade(): void { this.play("draft", 0.22, 1, 0, 0.1, 2); this.play("dawn", 0.25, 1, 0, 1, 2); }
  choose(): void { this.play("choose", 0.34, 1, 0, 0.1, 2); }
  victory(): void { this.play("victory", 0.44, 1, 0, 1, 3); }
  defeat(): void { this.play("defeat", 0.42, 1, 0, 1, 3); }

  updateMovement(position: { x: number; y: number; z: number }, grounded: boolean, surface: BlockId): void {
    if (this.previousPosition) {
      const distance = Math.hypot(position.x - this.previousPosition.x, position.z - this.previousPosition.z);
      if (!grounded) this.fallDistance += Math.max(0, this.previousPosition.y - position.y);
      else {
        if (!this.previousGrounded && this.fallDistance > 0.7) this.play("mineEarth", 0.28);
        this.fallDistance = 0;
        if (distance > 0.001 && distance < 1) this.distanceWalked += distance;
        if (this.distanceWalked > 1.8) {
          this.distanceWalked %= 1.8;
          const group = surface === BlockId.Wood ? "stepWood"
            : surface === BlockId.Stone || surface === BlockId.Bedrock || surface === BlockId.MetalOre ? "stepStone" : "stepGrass";
          this.play(group, 0.28, 1, 0, 0.16);
        }
      }
    }
    this.previousPosition = { ...position }; this.previousGrounded = grounded;
  }

  private play(group: SoundGroup, volume: number, pitch = 1, pan = 0, interval = 0.05, priority = 1): void {
    const context = this.context;
    if (!this.enabled || !context || !this.compressor || this.volumeValue === 0 || context.state !== "running") return;
    const now = context.currentTime;
    if (now - (this.lastPlayed.get(group) ?? -Infinity) < interval) return;
    const names = SOUND_GROUPS[group];
    let index = Math.floor(Math.random() * names.length);
    if (names.length > 1 && index === this.lastVariant.get(group)) index = (index + 1) % names.length;
    const buffer = this.buffers.get(names[index]!); if (!buffer) return;
    if (this.voices.size >= 24) {
      const oldest = [...this.voices].find(voice => voice.priority <= priority);
      if (!oldest) return;
      oldest.source.stop(); this.disposeVoice(oldest); this.voices.delete(oldest);
    }
    this.lastVariant.set(group, index); this.lastPlayed.set(group, now);
    const source = context.createBufferSource(); source.buffer = buffer;
    source.playbackRate.value = pitch * (priority > 1 ? 1 : 0.96 + Math.random() * 0.08);
    const gain = context.createGain(); gain.gain.value = volume;
    const stereo = context.createStereoPanner(); stereo.pan.value = Math.max(-0.75, Math.min(0.75, pan));
    source.connect(gain); gain.connect(stereo); stereo.connect(this.compressor);
    const voice: Voice = { source, gain, pan: stereo, priority }; this.voices.add(voice);
    source.onended = () => { this.disposeVoice(voice); this.voices.delete(voice); };
    source.start();
  }
  private disposeVoice(voice: Voice): void {
    voice.source.onended = null; voice.source.disconnect(); voice.gain.disconnect(); voice.pan.disconnect();
  }
}
