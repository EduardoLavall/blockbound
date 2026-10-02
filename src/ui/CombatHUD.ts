import { PlayerActionMode } from "../combat/CombatTypes";
import type { PlayerVitals } from "../combat/PlayerVitals";

export class CombatHUD {
  private hitTimer = 0;
  private damageTimer = 0;
  private previousHealth: number;

  constructor(
    private readonly element: HTMLDivElement,
    private readonly hitMarker: HTMLDivElement,
    private readonly damageFlash: HTMLDivElement,
    private readonly vitals: PlayerVitals,
  ) {
    this.previousHealth = vitals.health.current;

    vitals.subscribe(() => {
      if (vitals.health.current < this.previousHealth) {
        this.damageTimer = 0.22;
      }
      this.previousHealth = vitals.health.current;
    });
  }

  showHit(killed: boolean, critical: boolean): void {
    this.hitTimer = killed ? 0.24 : 0.13;
    this.hitMarker.classList.toggle("kill", killed);
    this.hitMarker.classList.toggle("critical", critical);
  }

  update(
    dt: number,
    mode: PlayerActionMode,
    cooldown: number,
  ): void {
    this.hitTimer = Math.max(0, this.hitTimer - dt);
    this.damageTimer = Math.max(0, this.damageTimer - dt);

    this.hitMarker.classList.toggle("active", this.hitTimer > 0);
    this.damageFlash.classList.toggle("active", this.damageTimer > 0);

    const health = this.vitals.health;
    const modeLabel =
      mode === PlayerActionMode.Tool
        ? "TOOL"
        : mode === PlayerActionMode.Blade
          ? "BLADE"
          : "REPEATER";

    this.element.innerHTML = `
      <div class="player-health-line">
        <strong>HP</strong>
        <span>${Math.ceil(health.current)} / ${health.max}</span>
      </div>
      <div class="player-health-track">
        <div class="player-health-fill" style="width:${Math.round(health.ratio * 100)}%"></div>
      </div>
      <div class="weapon-line">
        <b>${modeLabel}</b>
        <span>Q · SWITCH</span>
        <span>${cooldown > 0 ? cooldown.toFixed(2) + "s" : "READY"}</span>
      </div>
    `;
  }
}
