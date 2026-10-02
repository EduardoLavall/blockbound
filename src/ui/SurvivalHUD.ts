import type { Core } from "../building/Core";
import type { Inventory } from "../survival/Inventory";
import {
  RESOURCES,
  ResourceId,
} from "../survival/Resources";

export class SurvivalHUD {
  constructor(
    inventory: Inventory,
    private readonly core: Core,
    private readonly inventoryElement: HTMLDivElement,
    private readonly coreElement: HTMLDivElement,
  ) {
    inventory.subscribe(() => {
      const snapshot = inventory.snapshot();
      this.inventoryElement.innerHTML = Object.values(ResourceId)
        .map((resource) => {
          const definition = RESOURCES[resource];
          return `
            <div class="resource-row">
              <span class="resource-swatch" style="--swatch:${definition.swatch}"></span>
              <span class="resource-name">${definition.name}</span>
              <strong>${snapshot[resource]}</strong>
            </div>
          `;
        })
        .join("");
    });

    this.update();
  }

  update(): void {
    const health = this.core.health;
    const percent = Math.round(health.ratio * 100);
    this.coreElement.innerHTML = `
      <div class="core-label">
        <span>CORE</span>
        <strong>${Math.round(health.current)} / ${health.max}</strong>
      </div>
      <div class="core-health-track">
        <div class="core-health-fill" style="width:${percent}%"></div>
      </div>
    `;
  }
}
