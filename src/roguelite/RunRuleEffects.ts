import type { EnemyDamageEvent, EnemySystem } from "../ai/EnemySystem";
import type { Core } from "../building/Core";
import type { StructureSystem } from "../building/StructureSystem";
import type { PlayerVitals } from "../combat/PlayerVitals";
import type { Inventory } from "../survival/Inventory";
import { ResourceId } from "../survival/Resources";
import type { RuleEngine } from "./RuleEngine";
import type { RunManager } from "./RunManager";

export class RunRuleEffects {
  constructor(
    enemies: EnemySystem,
    private readonly rules: RuleEngine,
    private readonly run: RunManager,
    private readonly vitals: PlayerVitals,
    private readonly core: Core,
    private readonly structures: StructureSystem,
    private readonly inventory: Inventory,
  ) {
    enemies.subscribeDamage((event) => this.onEnemyDamage(event));
  }

  private onEnemyDamage(event: EnemyDamageEvent): void {
    if (!event.killed || !isPlayerSource(event.source)) return;

    const kills = this.run.recordPlayerKill();

    if (this.rules.killHeal > 0) {
      this.vitals.heal(this.rules.killHeal);
    }

    if (this.rules.killCoreHeal > 0) {
      this.core.repair(this.rules.killCoreHeal);
    }

    if (this.rules.killRepair > 0) {
      this.structures.repairMostDamaged(this.rules.killRepair);
    }

    if (
      this.rules.killMetalEvery > 0 &&
      kills % this.rules.killMetalEvery === 0
    ) {
      this.inventory.add(ResourceId.Metal, 1);
    }

    if (
      this.rules.killCrystalEvery > 0 &&
      kills % this.rules.killCrystalEvery === 0
    ) {
      this.inventory.add(ResourceId.Crystal, 1);
    }
  }
}

function isPlayerSource(source: EnemyDamageEvent["source"]): boolean {
  return source === "player-melee" || source === "player-projectile";
}
