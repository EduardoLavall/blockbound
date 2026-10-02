import { Health } from "../survival/Health";

export type PlayerVitalsListener = () => void;

export class PlayerVitals {
  readonly health = new Health(140);
  private invulnerability = 0;
  private readonly listeners = new Set<PlayerVitalsListener>();

  get dead(): boolean {
    return this.health.destroyed;
  }

  get ratio(): number {
    return this.health.ratio;
  }

  update(dt: number): void {
    this.invulnerability = Math.max(0, this.invulnerability - dt);
  }

  damage(amount: number): number {
    if (this.dead || this.invulnerability > 0 || amount <= 0) return 0;
    const dealt = this.health.damage(amount);
    if (dealt > 0) {
      this.invulnerability = 0.22;
      this.emit();
    }
    return dealt;
  }

  heal(amount: number): number {
    if (this.dead || amount <= 0) return 0;
    const healed = this.health.heal(amount);
    if (healed > 0) this.emit();
    return healed;
  }

  subscribe(listener: PlayerVitalsListener): () => void {
    this.listeners.add(listener);
    listener();
    return () => this.listeners.delete(listener);
  }

  private emit(): void {
    for (const listener of this.listeners) listener();
  }
}
