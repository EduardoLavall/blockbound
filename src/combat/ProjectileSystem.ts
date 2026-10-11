import * as THREE from "three";
import type { EnemySystem } from "../ai/EnemySystem";
import { EnemyStatus } from "./CombatTypes";
import type { VoxelWorld } from "../voxel/VoxelWorld";
import { coverDistance, enemyHitDistance } from "./CombatTrace";
import type { StructureSystem } from "../building/StructureSystem";
import { SeededRandom } from "../voxel/generation/SeededRandom";
import { WEAPON_KNOCKBACK } from "./Knockback";

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
    private readonly structures: StructureSystem,
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

      const direction = projectile.velocity.clone().normalize();
      const length = projectile.previous.distanceTo(next);
      const cover = coverDistance(this.world, projectile.previous, direction,
        length, this.structures.all);
      const hits = this.enemies.aliveEnemies
        .filter(enemy => !projectile.hitIds.has(enemy.id))
        .map(enemy => ({ enemy, distance: enemyHitDistance(enemy, projectile.previous, direction, length) }))
        .filter((hit): hit is { enemy: typeof hit.enemy; distance: number } =>
          hit.distance !== null && hit.distance < cover)
        .sort((a, b) => a.distance - b.distance);
      let consumed = false;
      for (const { enemy: hitEnemy } of hits) {
        projectile.hitIds.add(hitEnemy.id);
        const killed = this.enemies.damage(
          hitEnemy,
          projectile.damage,
          "player-projectile",
        );
        this.enemies.knockback(hitEnemy, direction, WEAPON_KNOCKBACK.repeater);

        this.maybeApplyStatuses(projectile, hitEnemy);
        this.onHit(projectile.damage, killed, projectile.critical);

        if (projectile.pierceLeft <= 0) {
          consumed = true;
          break;
        }
        projectile.pierceLeft--;
      }

      projectile.mesh.position.copy(next);

      if (
        consumed || cover <= length ||
        projectile.ttl <= 0
      ) {
        this.removeAt(i);
      }
    }
  }

  get count(): number {
    return this.projectiles.length;
  }

  private maybeApplyStatuses(
    projectile: Projectile,
    enemy: import("../ai/EnemySystem").EnemyInstance,
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
