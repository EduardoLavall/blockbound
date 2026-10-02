import {
  EnemyType,
  rosterForNight,
  type EnemySpawnProfile,
} from "../ai/EnemyRegistry";
import type { EnemySystem } from "../ai/EnemySystem";
import type { NavigationGrid } from "../ai/navigation/NavigationGrid";
import { SeededRandom } from "../voxel/generation/SeededRandom";
import type { SpawnZone } from "../voxel/generation/WorldMetadata";

export class SpawnDirector {
  private readonly random: SeededRandom;
  private cursor = 0;

  constructor(
    seed: number,
    private readonly zones: readonly SpawnZone[],
    private readonly navigation: NavigationGrid,
    private readonly enemies: EnemySystem,
  ) {
    this.random = new SeededRandom(seed ^ 0x71f3a2d9);
  }

  spawnNext(night: number, spawnedIndex: number): boolean {
    if (this.zones.length === 0) return false;

    const zone = this.zones[this.cursor % this.zones.length]!;
    this.cursor++;

    const jitterX = Math.round(this.random.range(-2.5, 2.5));
    const jitterZ = Math.round(this.random.range(-2.5, 2.5));
    const cell = this.navigation.findNearestWalkable(
      zone.x + jitterX,
      zone.z + jitterZ,
      6,
    );

    if (!cell) return false;

    const type =
      night >= 5 && spawnedIndex === 0
        ? EnemyType.Boss
        : this.pickType(rosterForNight(night));

    this.enemies.spawn(type, cell, night);
    return true;
  }

  private pickType(roster: readonly EnemySpawnProfile[]): EnemyType {
    const total = roster.reduce((sum, entry) => sum + entry.weight, 0);
    let roll = this.random.range(0, total);

    for (const entry of roster) {
      roll -= entry.weight;
      if (roll <= 0) return entry.type;
    }

    return roster[roster.length - 1]!.type;
  }
}
