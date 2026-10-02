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

    this.element.classList.toggle(
      "night",
      phase === DayPhase.Night,
    );

    this.element.innerHTML = `
      <div class="phase-title">
        <strong>${phase === DayPhase.Day ? "DAY" : "NIGHT " + this.dayNight.night}</strong>
        <span>${seconds}s</span>
      </div>
      <div class="phase-track">
        <div class="phase-fill" style="width:${Math.round(this.dayNight.phaseProgress * 100)}%"></div>
      </div>
      <div class="wave-line">
        enemies <b>${this.enemies.aliveCount}</b>
        · queued <b>${stats.remainingToSpawn}</b>
        · nav <b>${this.navigation.lastRebuildMs.toFixed(1)}ms</b>
        · flow <b>${this.flow.rebuildMs.toFixed(1)}ms</b>
      </div>
    `;
  }
}
