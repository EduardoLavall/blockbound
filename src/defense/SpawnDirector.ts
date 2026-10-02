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

  spawnNext(night: number): boolean {
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

    const health = 64 + night * 8;
    const speed = Math.min(3.4, 2.2 + night * 0.08);
    const enemy = this.enemies.spawn(cell, health, speed);
    enemy.attackDamage = 11 + night * 1.5;
    return true;
  }
}
