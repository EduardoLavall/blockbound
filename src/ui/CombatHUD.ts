import { PlayerActionMode } from "../combat/CombatTypes";
import type { PlayerVitals } from "../combat/PlayerVitals";

export class CombatHUD {
  private hitTimer = 0;
  private damageTimer = 0;
  private previousHealth: number;
  private previousMarkup = "";
  private damageTrail = 1;

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
    ammunition = 0,
  ): void {
    this.hitTimer = Math.max(0, this.hitTimer - dt);
    this.damageTimer = Math.max(0, this.damageTimer - dt);

    this.hitMarker.classList.toggle("active", this.hitTimer > 0);
    this.damageFlash.classList.toggle("active", this.damageTimer > 0);

    const health = this.vitals.health;
    this.damageTrail = Math.max(health.ratio,
      this.damageTrail - dt * (this.damageTimer > 0 ? 0 : 0.45));
    this.element.classList.toggle("low-health", health.ratio < 0.3);
    this.element.classList.toggle("taking-damage", this.damageTimer > 0);
    const modeLabel =
      mode === PlayerActionMode.Tool
        ? "PICARETA"
        : mode === PlayerActionMode.Blade
          ? "LÂMINA"
          : "REPEATER";

    const markup = `
      <div class="vitals-body">
        <div class="vitals-icon" aria-hidden="true">✚</div>
        <div class="vitals-content">
          <div class="player-health-line">
            <span class="health-label">VITALIDADE</span>
            <span><strong>${Math.ceil(health.current)}</strong><small> / ${health.max}</small></span>
          </div>
          <div class="player-health-track">
            <div class="player-health-trail" style="width:${Math.round(this.damageTrail * 100)}%"></div>
            <div class="player-health-fill" style="width:${Math.round(health.ratio * 100)}%"></div>
            <div class="health-segments"></div>
          </div>
          <div class="health-caption">${health.ratio < 0.3 ? "PERIGO · RECUAR" : "GUARDIÃO DO CRISTAL"}</div>
        </div>
      </div>
      <div class="weapon-line">
        <b>${modeLabel}</b>
        <span>Q · TROCAR</span>
        <span>${mode === PlayerActionMode.Repeater && ammunition === 0 ? "SEM MUNIÇÃO" : cooldown > 0 ? "RECUPERANDO" : "PRONTA"}</span>
      </div>
      ${mode === PlayerActionMode.Repeater ? `<div class="weapon-ammunition ${ammunition === 0 ? "empty" : ""}">CÉLULAS <strong>${ammunition}</strong>${ammunition === 0 ? " · I: FABRICAR" : ""}</div>` : ""}
    `;
    if (markup !== this.previousMarkup) {
      this.element.innerHTML = markup;
      this.previousMarkup = markup;
    }
    document.getElementById("crosshair")?.classList.toggle("recovering", cooldown > 0);
  }
}
