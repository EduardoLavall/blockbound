import type { EnemySystem } from "../ai/EnemySystem";
import type { FlowField } from "../ai/navigation/FlowField";
import type { NavigationGrid } from "../ai/navigation/NavigationGrid";
import {
  DayPhase,
  type DayNightSystem,
} from "../defense/DayNightSystem";
import type { WaveDirector } from "../defense/WaveDirector";

export class HordeHUD {
  private previousMarkup = "";
  constructor(
    private readonly element: HTMLDivElement,
    private readonly dayNight: DayNightSystem,
    private readonly waves: WaveDirector,
    private readonly enemies: EnemySystem,
    private readonly navigation: NavigationGrid,
    private readonly flow: FlowField,
  ) {}

  update(): void {
    const phase = this.dayNight.phase;
    const stats = this.waves.stats;
    const seconds = Math.ceil(this.dayNight.timeRemaining);
    const boss = this.enemies.boss;

    this.element.classList.toggle(
      "night",
      phase === DayPhase.Night,
    );
    this.element.classList.toggle("boss-active", Boolean(boss));

    const phaseLabel =
      phase === DayPhase.Day
        ? `PREPARAR · ${this.dayNight.night + 1}/5`
        : stats.bossNight
          ? "NOITE 5 · ÚLTIMO CERCO"
          : "NOITE " + this.dayNight.night + " / 5";

    const timeLabel =
      phase === DayPhase.Night
        ? `${this.enemies.aliveCount + stats.remainingToSpawn} restantes`
        : seconds + "s · N para iniciar";

    const bossMarkup = boss
      ? `
        <div class="boss-line">
          <div>
            <strong>${boss.definition.name}</strong>
            <span>${Math.ceil(boss.health.current)} / ${Math.ceil(boss.health.max)}</span>
          </div>
          <div class="boss-health-track">
            <div class="boss-health-fill" style="width:${Math.round(boss.health.ratio * 100)}%"></div>
          </div>
        </div>
      `
      : "";

    const progress = phase === DayPhase.Day ? this.dayNight.phaseProgress :
      1 - (this.enemies.aliveCount + stats.remainingToSpawn) / Math.max(1, stats.total);
    const markup = `
      <div class="phase-title">
        <strong>${phaseLabel}</strong>
        <span>${timeLabel}</span>
      </div>
      <div class="phase-track">
        <div class="phase-fill" style="width:${Math.round(progress * 100)}%"></div>
      </div>
      ${bossMarkup}
      <div class="wave-line">
        ${phase === DayPhase.Day ? "Torres ao lado da rota · espinhos sobre ela" :
          `Em combate <b>${this.enemies.aliveCount}</b> · chegando <b>${stats.remainingToSpawn}</b>`}
      </div>
    `;
    if (markup !== this.previousMarkup) {
      this.element.innerHTML = markup;
      this.previousMarkup = markup;
    }
  }
}
