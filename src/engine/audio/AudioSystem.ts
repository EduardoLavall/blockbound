export class AudioSystem {
  private context: AudioContext | null = null;
  private master: GainNode | null = null;
  private volumeValue = 0.28;
  private enabled = true;
  private noiseBuffer: AudioBuffer | null = null;

  setVolume(value: number): void {
    this.volumeValue = Math.max(0, Math.min(1, value));
    if (this.master) {
      this.master.gain.value = this.volumeValue;
    }
  }

  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
  }

  async unlock(): Promise<void> {
    if (!this.enabled) return;

    if (!this.context) {
      this.context = new AudioContext();
      this.master = this.context.createGain();
      this.master.gain.value = this.volumeValue;
      this.master.connect(this.context.destination);
    }

    if (this.context.state === "suspended") {
      await this.context.resume();
    }
  }

  nightStart(finalNight = false): void {
    if (finalNight) {
      this.sequence([
        [82, 0.18],
        [62, 0.22],
        [48, 0.34],
      ], "sawtooth", 0.32);
      return;
    }

    this.sequence([
      [110, 0.12],
      [82, 0.16],
    ], "square", 0.16);
  }

  hit(killed = false): void {
    this.tone(
      killed ? 175 : 260,
      killed ? 0.1 : 0.045,
      killed ? "sawtooth" : "square",
      killed ? 0.16 : 0.07,
    );
  }

  upgrade(): void {
    this.sequence([
      [392, 0.07],
      [523, 0.08],
      [659, 0.11],
    ], "triangle", 0.12);
  }

  choose(): void {
    this.sequence([
      [523, 0.05],
      [784, 0.09],
    ], "triangle", 0.11);
  }

  shoot(): void {
    this.impactNoise(0.065, 1500, 0.18);
    this.tone(120, 0.055, "sawtooth", 0.085);
    this.tone(720, 0.025, "triangle", 0.045);
  }
  swing(): void { this.tone(180, 0.09, "triangle", 0.055); }
  mine(): void {
    this.impactNoise(0.08, 700, 0.12);
    this.tone(320, 0.055, "square", 0.07);
    this.tone(190, 0.075, "triangle", 0.05, 0.025);
  }

  private impactNoise(duration: number, frequency: number, volume: number): void {
    if (!this.enabled || !this.context || !this.master) return;
    if (!this.noiseBuffer) {
      this.noiseBuffer = this.context.createBuffer(1, this.context.sampleRate, this.context.sampleRate);
      const samples = this.noiseBuffer.getChannelData(0);
      for (let i = 0; i < samples.length; i++) samples[i] = Math.random() * 2 - 1;
    }
    const source = this.context.createBufferSource(); source.buffer = this.noiseBuffer;
    const filter = this.context.createBiquadFilter(); filter.type = "bandpass"; filter.frequency.value = frequency;
    const envelope = this.context.createGain();
    const now = this.context.currentTime;
    envelope.gain.setValueAtTime(volume, now);
    envelope.gain.exponentialRampToValueAtTime(0.001, now + duration);
    source.connect(filter); filter.connect(envelope); envelope.connect(this.master);
    source.start(now); source.stop(now + duration);
  }

  victory(): void {
    this.sequence([
      [261, 0.12],
      [329, 0.12],
      [392, 0.14],
      [523, 0.28],
    ], "triangle", 0.2);
  }

  defeat(): void {
    this.sequence([
      [130, 0.16],
      [98, 0.18],
      [65, 0.34],
    ], "sawtooth", 0.18);
  }

  private sequence(
    notes: readonly [number, number][],
    type: OscillatorType,
    gain: number,
  ): void {
    let delay = 0;
    for (const [frequency, duration] of notes) {
      this.tone(frequency, duration, type, gain, delay);
      delay += duration * 0.72;
    }
  }

  private tone(
    frequency: number,
    duration: number,
    type: OscillatorType,
    gainValue: number,
    delay = 0,
  ): void {
    if (!this.enabled || !this.context || !this.master) return;

    const now = this.context.currentTime + delay;
    const oscillator = this.context.createOscillator();
    const gain = this.context.createGain();

    oscillator.type = type;
    oscillator.frequency.setValueAtTime(frequency, now);
    gain.gain.setValueAtTime(gainValue, now);
    gain.gain.exponentialRampToValueAtTime(
      0.001,
      now + duration,
    );

    oscillator.connect(gain);
    gain.connect(this.master);

    oscillator.start(now);
    oscillator.stop(now + duration);
  }
}
