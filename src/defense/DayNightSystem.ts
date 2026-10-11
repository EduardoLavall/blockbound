export enum DayPhase {
  Day = "day",
  Night = "night",
}

export interface PhaseTransition {
  from: DayPhase;
  to: DayPhase;
  night: number;
}

export class DayNightSystem {
  private phaseValue = DayPhase.Day;
  private elapsed = 0;
  private nightValue = 0;
  private transitionHeld = false;
  private entryNightFactor = 0;

  constructor(
    readonly dayDuration = 75,
    readonly nightDuration = 55,
  ) {}

  get phase(): DayPhase {
    return this.phaseValue;
  }

  get night(): number {
    return this.nightValue;
  }

  get phaseProgress(): number {
    return Math.min(1, this.elapsed / this.currentDuration);
  }

  get timeRemaining(): number {
    return Math.max(0, this.currentDuration - this.elapsed);
  }

  get nightFactor(): number {
    const fade = Math.min(4, this.dayDuration / 2);

    if (this.phaseValue === DayPhase.Night) {
      return this.entryNightFactor +
        (1 - this.entryNightFactor) * Math.min(1, this.elapsed / fade);
    }

    if (this.nightValue > 0 && this.elapsed < fade) {
      return this.entryNightFactor * (1 - this.elapsed / fade);
    }

    if (this.timeRemaining < fade) {
      return 1 - this.timeRemaining / fade;
    }

    return 0;
  }

  holdTransition(held: boolean): void {
    this.transitionHeld = held;
  }

  startNightEarly(): PhaseTransition | null {
    if (this.phaseValue !== DayPhase.Day) return null;
    return this.transition();
  }

  completeNight(): PhaseTransition | null {
    if (this.phaseValue !== DayPhase.Night) return null;
    return this.transition();
  }

  private transition(): PhaseTransition {
    const from = this.phaseValue;
    // Keep the lighting reached in the previous phase, including an early N.
    this.entryNightFactor = this.nightFactor;
    this.elapsed = 0;
    this.transitionHeld = false;
    this.phaseValue = from === DayPhase.Day ? DayPhase.Night : DayPhase.Day;
    if (this.phaseValue === DayPhase.Night) this.nightValue++;
    return { from, to: this.phaseValue, night: this.nightValue };
  }

  update(dt: number): PhaseTransition | null {
    this.elapsed += dt;
    if (this.elapsed < this.currentDuration) return null;
    if (this.transitionHeld) {
      this.elapsed = this.currentDuration;
      return null;
    }

    const overflow = this.elapsed - this.currentDuration;
    const transition = this.transition();
    this.elapsed = overflow;
    return transition;
  }

  private get currentDuration(): number {
    return this.phaseValue === DayPhase.Day
      ? this.dayDuration
      : this.nightDuration;
  }
}
