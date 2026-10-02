import { DayPhase } from "./DayNightSystem";
import type { SpawnDirector } from "./SpawnDirector";
import { nightDefinition } from "./VerticalSliceRules";

export interface WaveStats {
  active: boolean;
  complete: boolean;
  night: number;
  total: number;
  remainingToSpawn: number;
  spawned: number;
  bossNight: boolean;
}

export class WaveDirector {
  private active = false;
  private completeValue = false;
  private night = 0;
  private total = 0;
  private remaining = 0;
  private spawned = 0;
  private spawnTimer = 0;
  private maxAlive = 0;
  private spawnInterval = 1;
  private bossNight = false;

  constructor(private readonly spawns: SpawnDirector) {}

  startNight(night: number): void {
    const definition = nightDefinition(night);

    this.active = true;
    this.completeValue = false;
    this.night = night;
    this.total = definition.totalEnemies;
    this.remaining = definition.totalEnemies;
    this.spawned = 0;
    this.spawnTimer = definition.boss ? 0.1 : 0.4;
    this.maxAlive = definition.maxAlive;
    this.spawnInterval = definition.spawnInterval;
    this.bossNight = definition.boss;
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
      if (aliveEnemies === 0) {
        this.active = false;
        this.completeValue = true;
      }
      return;
    }

    if (aliveEnemies >= this.maxAlive) return;

    this.spawnTimer -= dt;
    if (this.spawnTimer > 0) return;

    if (this.spawns.spawnNext(this.night, this.spawned)) {
      this.remaining--;
      this.spawned++;
    }

    this.spawnTimer = this.spawnInterval;
  }

  get complete(): boolean {
    return this.completeValue;
  }

  get stats(): WaveStats {
    return {
      active: this.active,
      complete: this.completeValue,
      night: this.night,
      total: this.total,
      remainingToSpawn: this.remaining,
      spawned: this.spawned,
      bossNight: this.bossNight,
    };
  }
}
