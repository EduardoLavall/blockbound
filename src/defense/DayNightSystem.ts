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

  constructor(
    readonly dayDuration = 45,
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
    const fade = 4;

    if (this.phaseValue === DayPhase.Night) {
      return Math.min(1, this.elapsed / fade);
    }

    if (this.nightValue > 0 && this.elapsed < fade) {
      return 1 - this.elapsed / fade;
    }

    if (this.timeRemaining < fade) {
      return 1 - this.timeRemaining / fade;
    }

    return 0;
  }

  update(dt: number): PhaseTransition | null {
    this.elapsed += dt;
    if (this.elapsed < this.currentDuration) return null;

    const from = this.phaseValue;
    this.elapsed -= this.currentDuration;

    if (this.phaseValue === DayPhase.Day) {
      this.phaseValue = DayPhase.Night;
      this.nightValue++;
    } else {
      this.phaseValue = DayPhase.Day;
    }

    return {
      from,
      to: this.phaseValue,
      night: this.nightValue,
    };
  }

  private get currentDuration(): number {
    return this.phaseValue === DayPhase.Day
      ? this.dayDuration
      : this.nightDuration;
  }
}
