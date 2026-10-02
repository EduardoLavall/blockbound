export interface RunSummary {
  nightsSurvived: number;
  playerKills: number;
  upgrades: readonly string[];
}

export class RunManager {
  private readonly upgrades = new Set<string>();
  private kills = 0;
  private nights = 0;

  recordPlayerKill(): number {
    this.kills++;
    return this.kills;
  }

  completeNight(night: number): void {
    this.nights = Math.max(this.nights, night);
  }

  acquireUpgrade(id: string): void {
    this.upgrades.add(id);
  }

  hasUpgrade(id: string): boolean {
    return this.upgrades.has(id);
  }

  get playerKills(): number {
    return this.kills;
  }

  get nightsSurvived(): number {
    return this.nights;
  }

  get acquiredUpgrades(): readonly string[] {
    return [...this.upgrades];
  }

  summary(): RunSummary {
    return {
      nightsSurvived: this.nights,
      playerKills: this.kills,
      upgrades: this.acquiredUpgrades,
    };
  }
}
