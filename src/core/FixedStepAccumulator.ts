export class FixedStepAccumulator {
  private accumulator = 0;

  constructor(
    readonly stepSeconds = 1 / 60,
    readonly maxFrameSeconds = 0.1,
  ) {}

  advance(frameSeconds: number): number {
    this.accumulator += Math.min(Math.max(frameSeconds, 0), this.maxFrameSeconds);

    let steps = 0;
    while (this.accumulator >= this.stepSeconds) {
      this.accumulator -= this.stepSeconds;
      steps++;
    }
    return steps;
  }

  get alpha(): number {
    return this.accumulator / this.stepSeconds;
  }

  reset(): void {
    this.accumulator = 0;
  }
}
