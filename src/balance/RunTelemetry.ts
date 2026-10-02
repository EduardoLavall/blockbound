import type { Core } from "../building/Core";
import type { EquipmentSystem } from "../items/EquipmentSystem";
import { itemDefinition } from "../items/ItemRegistry";
import type { PlayerStatus } from "../player/PlayerStatus";
import type { RunManager } from "../roguelite/RunManager";
import type { Inventory } from "../survival/Inventory";

export interface TelemetryCheckpoint {
  event: string;
  night: number;
  elapsedSeconds: number;
  playerHealth: number;
  coreHealth: number;
  playerKills: number;
  resources: ReturnType<Inventory["snapshot"]>;
  upgrades: readonly string[];
  equipment: Record<string, string | null>;
  playerStatus: ReturnType<PlayerStatus["snapshot"]>;
}

export interface RunTelemetryExport {
  version: 1;
  seed: string;
  result: "active" | "victory" | "defeat";
  checkpoints: readonly TelemetryCheckpoint[];
}

export class RunTelemetry {
  private elapsed = 0;
  private result: RunTelemetryExport["result"] = "active";
  private readonly checkpoints: TelemetryCheckpoint[] = [];

  constructor(
    private readonly seed: string,
    private readonly playerStatus: PlayerStatus,
    private readonly core: Core,
    private readonly inventory: Inventory,
    private readonly equipment: EquipmentSystem,
    private readonly run: RunManager,
  ) {}

  update(dt: number): void {
    this.elapsed += dt;
  }

  checkpoint(event: string, night: number): void {
    const slots = this.equipment.slots;
    this.checkpoints.push({
      event,
      night,
      elapsedSeconds: round(this.elapsed),
      playerHealth: round(this.playerStatus.snapshot().health.current),
      coreHealth: round(this.core.health.current),
      playerKills: this.run.playerKills,
      resources: this.inventory.snapshot(),
      upgrades: [...this.run.acquiredUpgrades],
      equipment: {
        weapon: slots.weapon
          ? itemDefinition(slots.weapon.definitionId).id
          : null,
        armor: slots.armor
          ? itemDefinition(slots.armor.definitionId).id
          : null,
        charm: slots.charm
          ? itemDefinition(slots.charm.definitionId).id
          : null,
      },
      playerStatus: this.playerStatus.snapshot(),
    });
  }

  finish(
    result: "victory" | "defeat",
    night: number,
  ): void {
    this.result = result;
    this.checkpoint("run-end", night);
  }

  export(): RunTelemetryExport {
    return {
      version: 1,
      seed: this.seed,
      result: this.result,
      checkpoints: [...this.checkpoints],
    };
  }

  download(): void {
    const json = JSON.stringify(this.export(), null, 2);
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `blockfall-${this.seed}-telemetry.json`;
    anchor.click();
    URL.revokeObjectURL(url);
  }
}

function round(value: number): number {
  return Math.round(value * 100) / 100;
}
