import { SeededRandom } from "../voxel/generation/SeededRandom";
import type { RunManager } from "./RunManager";
import {
  UPGRADES,
  type UpgradeDefinition,
  type UpgradeRarity,
} from "./UpgradeRegistry";

export class UpgradeDraft {
  private readonly random: SeededRandom;

  constructor(
    seed: number,
    private readonly run: RunManager,
  ) {
    this.random = new SeededRandom(seed ^ 0x4c1d93ef);
  }

  draw(night: number, count = 3): UpgradeDefinition[] {
    const available = UPGRADES.filter(
      (upgrade) => !this.run.hasUpgrade(upgrade.id),
    );
    const selected: UpgradeDefinition[] = [];

    while (available.length > 0 && selected.length < count) {
      const rarity = this.rollRarity(night);
      const pool = available.filter((upgrade) => upgrade.rarity === rarity);
      const source = pool.length > 0 ? pool : available;
      const index = Math.floor(this.random.range(0, source.length));
      const upgrade = source[Math.min(index, source.length - 1)]!;
      selected.push(upgrade);
      available.splice(available.indexOf(upgrade), 1);
    }

    return selected;
  }

  private rollRarity(night: number): UpgradeRarity {
    const epicChance = Math.min(0.18, 0.05 + night * 0.018);
    const rareChance = Math.min(0.42, 0.25 + night * 0.025);
    const roll = this.random.range(0, 1);

    if (roll < epicChance) return "epic";
    if (roll < epicChance + rareChance) return "rare";
    return "common";
  }
}
