import { FixedStepAccumulator } from "./FixedStepAccumulator";

interface GameLoopCallbacks {
  fixedUpdate: (dt: number) => void;
  render: (frameMs: number, alpha: number) => void;
}

export class GameLoop {
  private readonly clock = new FixedStepAccumulator();
  private running = false;
  private lastTime = 0;

  constructor(private readonly callbacks: GameLoopCallbacks) {}

  start(): void {
    if (this.running) return;
    this.running = true;
    this.lastTime = performance.now();
    requestAnimationFrame(this.frame);
  }

  stop(): void {
    this.running = false;
    this.clock.reset();
  }

  private readonly frame = (now: number): void => {
    if (!this.running) return;

    const frameMs = now - this.lastTime;
    this.lastTime = now;
    const steps = this.clock.advance(frameMs / 1000);

    for (let i = 0; i < steps; i++) {
      this.callbacks.fixedUpdate(this.clock.stepSeconds);
    }

    this.callbacks.render(frameMs, this.clock.alpha);
    requestAnimationFrame(this.frame);
  };
}
