import * as THREE from "three";
import type { EnemySystem } from "../ai/EnemySystem";
import { EnemyStatus } from "./CombatTypes";
import type { VoxelWorld } from "../voxel/VoxelWorld";
import { isSolidBlock } from "../voxel/blocks";
import { SeededRandom } from "../voxel/generation/SeededRandom";

export interface PlayerProjectileSpec {
  origin: THREE.Vector3;
  direction: THREE.Vector3;
  speed: number;
  damage: number;
  pierce: number;
  burnChance: number;
  shockChance: number;
  markDuration: number;
  critical: boolean;
}

interface Projectile {
  mesh: THREE.Mesh;
  previous: THREE.Vector3;
  velocity: THREE.Vector3;
  damage: number;
  pierceLeft: number;
  burnChance: number;
  shockChance: number;
  markDuration: number;
  critical: boolean;
  ttl: number;
  hitIds: Set<number>;
}

export type ProjectileHitListener = (
  damage: number,
  killed: boolean,
  critical: boolean,
) => void;

export class ProjectileSystem {
  private readonly projectiles: Projectile[] = [];
  private readonly geometry = new THREE.BoxGeometry(0.07, 0.07, 0.38);
  private readonly material = new THREE.MeshBasicMaterial({
    color: 0xf1d47a,
  });
  private readonly random: SeededRandom;

  constructor(
    seed: number,
    private readonly scene: THREE.Scene,
    private readonly world: VoxelWorld,
    private readonly enemies: EnemySystem,
    private readonly onHit: ProjectileHitListener,
  ) {
    this.random = new SeededRandom(seed ^ 0x2af1b7c3);
  }

  spawn(spec: PlayerProjectileSpec): void {
    const mesh = new THREE.Mesh(this.geometry, this.material);
    mesh.position.copy(spec.origin);
    mesh.lookAt(
      spec.origin.clone().add(spec.direction),
    );
    mesh.renderOrder = 5;
    this.scene.add(mesh);

    this.projectiles.push({
      mesh,
      previous: spec.origin.clone(),
      velocity: spec.direction.clone().normalize().multiplyScalar(spec.speed),
      damage: spec.damage,
      pierceLeft: spec.pierce,
      burnChance: spec.burnChance,
      shockChance: spec.shockChance,
      markDuration: spec.markDuration,
      critical: spec.critical,
      ttl: 3,
      hitIds: new Set(),
    });
  }

  fixedUpdate(dt: number): void {
    for (let i = this.projectiles.length - 1; i >= 0; i--) {
      const projectile = this.projectiles[i]!;
      projectile.ttl -= dt;
      projectile.previous.copy(projectile.mesh.position);

      const next = projectile.mesh.position
        .clone()
        .addScaledVector(projectile.velocity, dt);

      const hitEnemy = this.findSegmentHit(
        projectile.previous,
        next,
        projectile.hitIds,
      );

      if (hitEnemy) {
        projectile.hitIds.add(hitEnemy.id);
        const killed = this.enemies.damage(
          hitEnemy,
          projectile.damage,
          "player-projectile",
        );

        this.maybeApplyStatuses(projectile, hitEnemy);
        this.onHit(projectile.damage, killed, projectile.critical);

        if (projectile.pierceLeft <= 0) {
          this.removeAt(i);
          continue;
        }
        projectile.pierceLeft--;
      }

      projectile.mesh.position.copy(next);

      const vx = Math.floor(next.x);
      const vy = Math.floor(next.y);
      const vz = Math.floor(next.z);
      if (
        isSolidBlock(this.world.getBlock(vx, vy, vz)) ||
        projectile.ttl <= 0
      ) {
        this.removeAt(i);
      }
    }
  }

  get count(): number {
    return this.projectiles.length;
  }

  private findSegmentHit(
    a: THREE.Vector3,
    b: THREE.Vector3,
    excluded: Set<number>,
  ) {
    let best = Infinity;
    let target = null;

    for (const enemy of this.enemies.aliveEnemies) {
      if (excluded.has(enemy.id)) continue;
      const center = enemy.group.position.clone();
      center.y += 0.9;

      const distance = distancePointToSegment(center, a, b);
      if (distance > 0.6) continue;

      const along = center.distanceToSquared(a);
      if (along < best) {
        best = along;
        target = enemy;
      }
    }

    return target;
  }

  private maybeApplyStatuses(
    projectile: Projectile,
    enemy: NonNullable<ReturnType<ProjectileSystem["findSegmentHit"]>>,
  ): void {
    if (this.random.range(0, 1) < projectile.burnChance) {
      this.enemies.applyStatus(
        enemy,
        EnemyStatus.Burn,
        3.5,
        1,
        "player-projectile",
      );
    }
    if (this.random.range(0, 1) < projectile.shockChance) {
      this.enemies.applyStatus(
        enemy,
        EnemyStatus.Shock,
        2.6,
        1,
        "player-projectile",
      );
    }
    if (projectile.markDuration > 0) {
      this.enemies.applyStatus(
        enemy,
        EnemyStatus.Mark,
        projectile.markDuration,
        1,
        "player-projectile",
      );
    }
  }

  private removeAt(index: number): void {
    const projectile = this.projectiles[index]!;
    this.scene.remove(projectile.mesh);
    this.projectiles.splice(index, 1);
  }
}

function distancePointToSegment(
  point: THREE.Vector3,
  a: THREE.Vector3,
  b: THREE.Vector3,
): number {
  const ab = b.clone().sub(a);
  const lengthSquared = ab.lengthSq();
  if (lengthSquared <= 0.000001) return point.distanceTo(a);

  const t = THREE.MathUtils.clamp(
    point.clone().sub(a).dot(ab) / lengthSquared,
    0,
    1,
  );
  const closest = a.clone().addScaledVector(ab, t);
  return point.distanceTo(closest);
}
