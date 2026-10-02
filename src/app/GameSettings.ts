export interface GameSettingsState {
  volume: number;
  debug: boolean;
  effects: boolean;
}

const STORAGE_KEY = "blockfall.settings.v1";

export class GameSettings {
  private stateValue: GameSettingsState;

  constructor() {
    this.stateValue = this.load();
  }

  get state(): Readonly<GameSettingsState> {
    return this.stateValue;
  }

  update(patch: Partial<GameSettingsState>): void {
    this.stateValue = {
      ...this.stateValue,
      ...patch,
      volume: clamp(
        patch.volume ?? this.stateValue.volume,
        0,
        1,
      ),
    };
    this.save();
  }

  private load(): GameSettingsState {
    const fallback: GameSettingsState = {
      volume: 0.28,
      debug: false,
      effects: true,
    };

    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return fallback;
      const parsed = JSON.parse(raw) as Partial<GameSettingsState>;
      return {
        volume: clamp(parsed.volume ?? fallback.volume, 0, 1),
        debug: parsed.debug ?? fallback.debug,
        effects: parsed.effects ?? fallback.effects,
      };
    } catch {
      return fallback;
    }
  }

  private save(): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.stateValue));
    } catch {
      // Settings persistence is optional; gameplay must continue.
    }
  }
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}
