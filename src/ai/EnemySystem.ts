import * as THREE from "three";
import type { Core } from "../building/Core";
import type {
  StructureInstance,
  StructureSystem,
} from "../building/StructureSystem";
import { Health } from "../survival/Health";
import type { FlowField } from "./navigation/FlowField";
import type { BreachPlanner } from "./navigation/BreachPlanner";
import type {
  NavigationCell,
  NavigationGrid,
} from "./navigation/NavigationGrid";

export interface EnemyInstance {
  id: number;
  group: THREE.Group;
  health: Health;
  speed: number;
  attackDamage: number;
  attackInterval: number;
  attackCooldown: number;
  alive: boolean;
}

export class EnemySystem {
  private readonly enemies: EnemyInstance[] = [];
  private nextId = 1;

  private readonly bodyGeometry = new THREE.BoxGeometry(0.62, 0.8, 0.48);
  private readonly headGeometry = new THREE.BoxGeometry(0.52, 0.5, 0.5);
  private readonly legGeometry = new THREE.BoxGeometry(0.18, 0.55, 0.2);
  private readonly bodyMaterial = new THREE.MeshStandardMaterial({
    color: 0x7b403b,
    roughness: 0.86,
  });
  private readonly headMaterial = new THREE.MeshStandardMaterial({
    color: 0xb55a4e,
    emissive: 0x2e0c08,
    emissiveIntensity: 0.45,
    roughness: 0.78,
  });
  private readonly eyeMaterial = new THREE.MeshBasicMaterial({
    color: 0xffd36a,
  });

  constructor(
    private readonly scene: THREE.Scene,
    private readonly grid: NavigationGrid,
    private readonly flow: FlowField,
    private readonly breachPlanner: BreachPlanner,
    private readonly structures: StructureSystem,
    private readonly core: Core,
  ) {}

  spawn(cell: NavigationCell, health = 70, speed = 2.35): EnemyInstance {
    const group = this.createVisual();
    group.position.set(
      cell.x + 0.5,
      cell.groundY + 1.01,
      cell.z + 0.5,
    );
    this.scene.add(group);

    const enemy: EnemyInstance = {
      id: this.nextId++,
      group,
      health: new Health(health),
      speed,
      attackDamage: 13,
      attackInterval: 0.78,
      attackCooldown: 0,
      alive: true,
    };

    group.userData.enemyId = enemy.id;
    this.enemies.push(enemy);
    return enemy;
  }

  fixedUpdate(dt: number): void {
    for (const enemy of this.enemies) {
      if (!enemy.alive) continue;
      enemy.attackCooldown = Math.max(0, enemy.attackCooldown - dt);

      const position = enemy.group.position;
      const corePosition = this.core.group.position;
      const coreDistance = Math.hypot(
        position.x - corePosition.x,
        position.z - corePosition.z,
      );

      if (coreDistance <= 2.2) {
        this.attackCore(enemy);
        continue;
      }

      const current = this.grid.getCell(
        Math.floor(position.x),
        Math.floor(position.z),
      );

      if (!current?.walkable) {
        const recovered = this.grid.findNearestWalkable(
          position.x,
          position.z,
          4,
        );
        if (recovered) {
          this.moveToward(
            enemy,
            recovered.x + 0.5,
            recovered.z + 0.5,
            recovered.groundY + 1,
            dt,
          );
        }
        continue;
      }

      const next = this.flow.nextCell(current.x, current.z);
      if (!next) continue;

      const blocker = this.breachPlanner.targetForStep(next);
      if (blocker) {
        this.handleBlocker(enemy, blocker, next, dt);
        continue;
      }

      this.moveToward(
        enemy,
        next.x + 0.5,
        next.z + 0.5,
        next.groundY + 1,
        dt,
      );
    }
  }

  get aliveCount(): number {
    return this.enemies.reduce(
      (count, enemy) => count + Number(enemy.alive),
      0,
    );
  }

  get aliveEnemies(): readonly EnemyInstance[] {
    return this.enemies.filter((enemy) => enemy.alive);
  }

  findNearest(
    x: number,
    z: number,
    range: number,
  ): EnemyInstance | null {
    let nearest: EnemyInstance | null = null;
    let best = range;

    for (const enemy of this.enemies) {
      if (!enemy.alive) continue;
      const distance = Math.hypot(
        enemy.group.position.x - x,
        enemy.group.position.z - z,
      );
      if (distance < best) {
        best = distance;
        nearest = enemy;
      }
    }

    return nearest;
  }

  withinRadius(
    x: number,
    z: number,
    radius: number,
  ): EnemyInstance[] {
    const radiusSquared = radius * radius;
    return this.enemies.filter((enemy) => {
      if (!enemy.alive) return false;
      const dx = enemy.group.position.x - x;
      const dz = enemy.group.position.z - z;
      return dx * dx + dz * dz <= radiusSquared;
    });
  }

  damage(enemy: EnemyInstance, amount: number): boolean {
    if (!enemy.alive) return false;
    enemy.health.damage(amount);

    if (enemy.health.destroyed) {
      enemy.alive = false;
      enemy.group.visible = false;
      return true;
    }

    return false;
  }

  private handleBlocker(
    enemy: EnemyInstance,
    blocker: StructureInstance,
    next: NavigationCell,
    dt: number,
  ): void {
    const position = enemy.group.position;
    const distance = Math.hypot(
      blocker.x - position.x,
      blocker.z - position.z,
    );

    const attackDistance =
      Math.max(blocker.definition.width, blocker.definition.depth) / 2 +
      0.72;

    if (distance <= attackDistance) {
      if (enemy.attackCooldown <= 0) {
        this.structures.damageStructure(
          blocker.id,
          enemy.attackDamage,
        );
        enemy.attackCooldown = enemy.attackInterval;
      }
      return;
    }

    this.moveToward(
      enemy,
      next.x + 0.5,
      next.z + 0.5,
      next.groundY + 1,
      dt,
      0.72,
    );
  }

  private attackCore(enemy: EnemyInstance): void {
    if (enemy.attackCooldown > 0) return;
    this.core.damage(enemy.attackDamage);
    enemy.attackCooldown = enemy.attackInterval;
  }

  private moveToward(
    enemy: EnemyInstance,
    targetX: number,
    targetZ: number,
    targetY: number,
    dt: number,
    speedScale = 1,
  ): void {
    const position = enemy.group.position;
    let dx = targetX - position.x;
    let dz = targetZ - position.z;
    const distance = Math.hypot(dx, dz);
    if (distance < 0.001) return;

    dx /= distance;
    dz /= distance;

    const steering = this.localSteering(enemy);
    dx += steering.x * 0.45;
    dz += steering.z * 0.45;

    const normalized = Math.hypot(dx, dz);
    if (normalized > 0.001) {
      dx /= normalized;
      dz /= normalized;
    }

    const distanceStep = Math.min(
      distance,
      enemy.speed * speedScale * dt,
    );

    position.x += dx * distanceStep;
    position.z += dz * distanceStep;
    position.y = THREE.MathUtils.lerp(
      position.y,
      targetY,
      Math.min(1, dt * 8),
    );
    enemy.group.rotation.y = Math.atan2(dx, dz);
  }

  private localSteering(
    enemy: EnemyInstance,
  ): { x: number; z: number } {
    let x = 0;
    let z = 0;
    const position = enemy.group.position;

    for (const other of this.enemies) {
      if (other === enemy || !other.alive) continue;
      const dx = position.x - other.group.position.x;
      const dz = position.z - other.group.position.z;
      const distanceSquared = dx * dx + dz * dz;
      if (distanceSquared <= 0.0001 || distanceSquared > 1.15 * 1.15) {
        continue;
      }

      const distance = Math.sqrt(distanceSquared);
      const strength = 1 - distance / 1.15;
      x += (dx / distance) * strength;
      z += (dz / distance) * strength;
    }

    return { x, z };
  }

  private createVisual(): THREE.Group {
    const group = new THREE.Group();

    const body = new THREE.Mesh(
      this.bodyGeometry,
      this.bodyMaterial,
    );
    body.position.y = 0.92;
    body.castShadow = true;
    group.add(body);

    const head = new THREE.Mesh(
      this.headGeometry,
      this.headMaterial,
    );
    head.position.y = 1.57;
    head.castShadow = true;
    group.add(head);

    for (const x of [-0.17, 0.17]) {
      const leg = new THREE.Mesh(
        this.legGeometry,
        this.bodyMaterial,
      );
      leg.position.set(x, 0.3, 0);
      leg.castShadow = true;
      group.add(leg);
    }

    for (const x of [-0.13, 0.13]) {
      const eye = new THREE.Mesh(
        new THREE.BoxGeometry(0.07, 0.07, 0.04),
        this.eyeMaterial,
      );
      eye.position.set(x, 1.62, 0.27);
      group.add(eye);
    }

    return group;
  }
}
