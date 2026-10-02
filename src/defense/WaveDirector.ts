import { DayPhase } from "./DayNightSystem";
import type { SpawnDirector } from "./SpawnDirector";

export interface WaveStats {
  active: boolean;
  night: number;
  total: number;
  remainingToSpawn: number;
  spawned: number;
}

export class WaveDirector {
  private active = false;
  private night = 0;
  private total = 0;
  private remaining = 0;
  private spawned = 0;
  private spawnTimer = 0;

  constructor(private readonly spawns: SpawnDirector) {}

  startNight(night: number): void {
    this.active = true;
    this.night = night;
    this.total = Math.min(34, 7 + night * 4);
    this.remaining = this.total;
    this.spawned = 0;
    this.spawnTimer = 0.4;
  }

  endNight(): void {
    this.active = false;
    this.remaining = 0;
  }

  update(
    dt: number,
    phase: DayPhase,
    aliveEnemies: number,
  ): void {
    if (!this.active || phase !== DayPhase.Night) return;

    if (this.remaining <= 0) {
      if (aliveEnemies === 0) this.active = false;
      return;
    }

    const maxAlive = Math.min(22, 8 + this.night * 2);
    if (aliveEnemies >= maxAlive) return;

    this.spawnTimer -= dt;
    if (this.spawnTimer > 0) return;

    if (this.spawns.spawnNext(this.night)) {
      this.remaining--;
      this.spawned++;
    }

    this.spawnTimer = Math.max(0.58, 1.25 - this.night * 0.06);
  }

  get stats(): WaveStats {
    return {
      active: this.active,
      night: this.night,
      total: this.total,
      remainingToSpawn: this.remaining,
      spawned: this.spawned,
    };
  }
}
