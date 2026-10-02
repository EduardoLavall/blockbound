import type { EnemySystem } from "../ai/EnemySystem";
import type { FlowField } from "../ai/navigation/FlowField";
import type { NavigationGrid } from "../ai/navigation/NavigationGrid";
import {
  DayPhase,
  type DayNightSystem,
} from "../defense/DayNightSystem";
import type { WaveDirector } from "../defense/WaveDirector";

export class HordeHUD {
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
        ? "DAY"
        : stats.bossNight
          ? "NIGHT 5 · FINAL SIEGE"
          : "NIGHT " + this.dayNight.night;

    const timeLabel =
      stats.bossNight && phase === DayPhase.Night && seconds <= 0
        ? "UNTIL CLEARED"
        : seconds + "s";

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

    this.element.innerHTML = `
      <div class="phase-title">
        <strong>${phaseLabel}</strong>
        <span>${timeLabel}</span>
      </div>
      <div class="phase-track">
        <div class="phase-fill" style="width:${Math.round(this.dayNight.phaseProgress * 100)}%"></div>
      </div>
      ${bossMarkup}
      <div class="wave-line">
        enemies <b>${this.enemies.aliveCount}</b>
        · queued <b>${stats.remainingToSpawn}</b>
        · nav <b>${this.navigation.lastRebuildMs.toFixed(1)}ms</b>
        · flow <b>${this.flow.rebuildMs.toFixed(1)}ms</b>
      </div>
    `;
  }
}
