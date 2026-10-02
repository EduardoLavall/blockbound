import * as THREE from "three";
import type { Core } from "../building/Core";
import type {
  StructureInstance,
  StructureSystem,
} from "../building/StructureSystem";
import {
  DamageSource,
  EnemyStatus,
  type EnemyStatusState,
} from "../combat/CombatTypes";
import type { PlayerVitals } from "../combat/PlayerVitals";
import type { PlayerController } from "../player/PlayerController";
import type { RuleEngine } from "../roguelite/RuleEngine";
import { Health } from "../survival/Health";
import {
  ENEMIES,
  EnemyType,
  type EnemyDefinition,
} from "./EnemyRegistry";
import type { FlowField } from "./navigation/FlowField";
import type { BreachPlanner } from "./navigation/BreachPlanner";
import type {
  NavigationCell,
  NavigationGrid,
} from "./navigation/NavigationGrid";

export interface EnemyInstance {
  id: number;
  type: EnemyType;
  definition: EnemyDefinition;
  group: THREE.Group;
  health: Health;
  statuses: Map<EnemyStatus, EnemyStatusState>;
  speed: number;
  attackDamage: number;
  attackInterval: number;
  attackCooldown: number;
  abilityCooldown: number;
  alive: boolean;
}

export interface EnemyDamageEvent {
  enemy: EnemyInstance;
  amount: number;
  source: DamageSource;
  killed: boolean;
}

interface EnemyBolt {
  mesh: THREE.Mesh;
  from: THREE.Vector3;
  to: THREE.Vector3;
  age: number;
  duration: number;
}

export class EnemySystem {
  private readonly enemies: EnemyInstance[] = [];
  private readonly damageListeners =
    new Set<(event: EnemyDamageEvent) => void>();
  private readonly materials = new Map<EnemyType, THREE.MeshStandardMaterial>();
  private readonly bolts: EnemyBolt[] = [];
  private nextId = 1;

  private readonly bodyGeometry = new THREE.BoxGeometry(0.62, 0.8, 0.48);
  private readonly headGeometry = new THREE.BoxGeometry(0.52, 0.5, 0.5);
  private readonly legGeometry = new THREE.BoxGeometry(0.18, 0.55, 0.2);
  private readonly detailGeometry = new THREE.BoxGeometry(0.18, 0.18, 0.18);
  private readonly auraGeometry = new THREE.RingGeometry(0.75, 0.88, 20);
  private readonly boltGeometry = new THREE.BoxGeometry(0.06, 0.06, 0.34);
  private readonly boltMaterial = new THREE.MeshBasicMaterial({
    color: 0xff8f72,
  });
  private readonly eyeMaterial = new THREE.MeshBasicMaterial({
    color: 0xffd36a,
  });
  private readonly supportAuraMaterial = new THREE.MeshBasicMaterial({
    color: 0x9bdf70,
    transparent: true,
    opacity: 0.48,
    side: THREE.DoubleSide,
    depthWrite: false,
  });
  private readonly bossAuraMaterial = new THREE.MeshBasicMaterial({
    color: 0xe94b68,
    transparent: true,
    opacity: 0.34,
    side: THREE.DoubleSide,
    depthWrite: false,
  });

  constructor(
    private readonly scene: THREE.Scene,
    private readonly grid: NavigationGrid,
    private readonly flow: FlowField,
    private readonly breachPlanner: BreachPlanner,
    private readonly structures: StructureSystem,
    private readonly core: Core,
    private readonly player: PlayerController,
    private readonly playerVitals: PlayerVitals,
    private readonly rules: RuleEngine,
  ) {}

  spawn(
    type: EnemyType,
    cell: NavigationCell,
    night: number,
  ): EnemyInstance {
    const definition = ENEMIES[type];
    const group = this.createVisual(definition);
    group.position.set(
      cell.x + 0.5,
      cell.groundY + 1.01,
      cell.z + 0.5,
    );
    this.scene.add(group);

    const nightHealthScale =
      type === EnemyType.Boss ? 1 : 1 + Math.max(0, night - 1) * 0.08;
    const nightDamageScale =
      type === EnemyType.Boss ? 1 : 1 + Math.max(0, night - 1) * 0.06;

    const enemy: EnemyInstance = {
      id: this.nextId++,
      type,
      definition,
      group,
      health: new Health(definition.maxHealth * nightHealthScale),
      statuses: new Map(),
      speed: definition.speed,
      attackDamage: definition.attackDamage * nightDamageScale,
      attackInterval: definition.attackInterval,
      attackCooldown: 0,
      abilityCooldown:
        definition.bossPulseInterval ?? 0,
      alive: true,
    };

    group.userData.enemyId = enemy.id;
    group.userData.enemyType = enemy.type;
    this.enemies.push(enemy);
    return enemy;
  }

  fixedUpdate(dt: number): void {
    for (const enemy of this.enemies) {
      if (!enemy.alive) continue;

      enemy.attackCooldown = Math.max(0, enemy.attackCooldown - dt);
      enemy.abilityCooldown = Math.max(0, enemy.abilityCooldown - dt);
      this.updateStatuses(enemy, dt);
      if (!enemy.alive) continue;

      if (enemy.type === EnemyType.Boss && enemy.abilityCooldown <= 0) {
        this.bossPulse(enemy);
        enemy.abilityCooldown =
          enemy.definition.bossPulseInterval ?? 5.5;
      }

      const position = enemy.group.position;
      const player = this.player.getPosition();
      const playerDistance = Math.hypot(
        position.x - player.x,
        position.z - player.z,
      );

      if (
        enemy.type === EnemyType.Archer &&
        !this.playerVitals.dead &&
        playerDistance <= enemy.definition.rangedRange
      ) {
        if (playerDistance < 3.2) {
          this.moveAwayFrom(enemy, player.x, player.z, dt);
        } else {
          this.attackPlayerRanged(enemy);
        }
        continue;
      }

      if (
        !this.playerVitals.dead &&
        playerDistance <= enemy.definition.playerAggroRange &&
        Math.abs(position.y - player.y) < 2.8
      ) {
        this.attackPlayer(enemy);
        continue;
      }

      const corePosition = this.core.group.position;
      const coreDistance = Math.hypot(
        position.x - corePosition.x,
        position.z - corePosition.z,
      );

      if (
        enemy.type === EnemyType.Archer &&
        coreDistance <= enemy.definition.rangedRange &&
        coreDistance > 3
      ) {
        this.attackCoreRanged(enemy);
        continue;
      }

      if (coreDistance <= 2.2 * enemy.definition.scale) {
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

      let next = this.flow.nextCell(current.x, current.z);
      if (!next) continue;

      let blocker = this.breachPlanner.targetForStep(next);

      if (
        blocker &&
        enemy.definition.runnerAvoidsBreach
      ) {
        const detour = this.findOpenDetour(current);
        if (detour) {
          next = detour;
          blocker = null;
        }
      }

      if (blocker && enemy.definition.ignoresBlockers) {
        this.moveToward(
          enemy,
          next.x + 0.5,
          next.z + 0.5,
          next.groundY + 0.65,
          dt,
          0.95,
        );
        continue;
      }

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

    this.updateBolts(dt);
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

  hasAliveType(type: EnemyType): boolean {
    return this.enemies.some(
      (enemy) => enemy.alive && enemy.type === type,
    );
  }

  countByType(type: EnemyType): number {
    return this.enemies.reduce(
      (count, enemy) =>
        count + Number(enemy.alive && enemy.type === type),
      0,
    );
  }

  retreatAll(): number {
    let retreated = 0;
    for (const enemy of this.enemies) {
      if (!enemy.alive) continue;
      enemy.alive = false;
      enemy.group.visible = false;
      retreated++;
    }
    return retreated;
  }

  cleanupInactive(): number {
    let removed = 0;
    for (let index = this.enemies.length - 1; index >= 0; index--) {
      const enemy = this.enemies[index]!;
      if (enemy.alive) continue;
      this.scene.remove(enemy.group);
      this.enemies.splice(index, 1);
      removed++;
    }
    return removed;
  }

  subscribeDamage(
    listener: (event: EnemyDamageEvent) => void,
  ): () => void {
    this.damageListeners.add(listener);
    return () => this.damageListeners.delete(listener);
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

  damage(
    enemy: EnemyInstance,
    amount: number,
    source: DamageSource = "player-melee",
  ): boolean {
    if (!enemy.alive || amount <= 0) return false;

    const dealt = enemy.health.damage(amount);
    const killed = enemy.health.destroyed;

    if (killed) {
      enemy.alive = false;
      enemy.group.visible = false;
    } else {
      const scale = enemy.definition.scale;
      enemy.group.scale.set(
        scale * 1.06,
        scale * 0.96,
        scale * 1.06,
      );
    }

    const event: EnemyDamageEvent = {
      enemy,
      amount: dealt,
      source,
      killed,
    };
    for (const listener of this.damageListeners) listener(event);
    return killed;
  }

  applyStatus(
    enemy: EnemyInstance,
    status: EnemyStatus,
    duration: number,
    magnitude: number,
    source: DamageSource,
  ): void {
    if (!enemy.alive || duration <= 0) return;

    const current = enemy.statuses.get(status);
    enemy.statuses.set(status, {
      remaining: Math.max(duration, current?.remaining ?? 0),
      magnitude: Math.max(magnitude, current?.magnitude ?? 0),
      tick: current?.tick ?? 0.5,
      source,
    });
  }

  private updateStatuses(enemy: EnemyInstance, dt: number): void {
    const scale = enemy.definition.scale;
    enemy.group.scale.lerp(
      new THREE.Vector3(scale, scale, scale),
      Math.min(1, dt * 16),
    );

    for (const [status, state] of enemy.statuses) {
      state.remaining -= dt;

      if (status === EnemyStatus.Burn) {
        state.tick -= dt;
        if (state.tick <= 0) {
          state.tick += 0.5;
          this.damage(enemy, 5 * state.magnitude, state.source);
          if (!enemy.alive) return;
        }
      }

      if (state.remaining <= 0) {
        enemy.statuses.delete(status);
      }
    }
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
      0.72 * enemy.definition.scale;

    if (distance <= attackDistance) {
      if (enemy.attackCooldown <= 0) {
        const support = this.supportModifiers(enemy);
        this.structures.damageStructure(
          blocker.id,
          this.rules.modifyStructureIncomingDamage(
            enemy.attackDamage *
              enemy.definition.structureDamageMultiplier *
              support.damage,
          ),
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
      enemy.type === EnemyType.Brute ? 0.82 : 0.72,
    );
  }

  private attackPlayer(enemy: EnemyInstance): void {
    if (enemy.attackCooldown > 0) return;
    const support = this.supportModifiers(enemy);
    this.playerVitals.damage(
      this.rules.modifyPlayerIncomingDamage(
        enemy.attackDamage * support.damage,
      ),
    );
    enemy.attackCooldown = enemy.attackInterval;
  }

  private attackPlayerRanged(enemy: EnemyInstance): void {
    if (enemy.attackCooldown > 0) return;

    const target = this.player.getPosition();
    const support = this.supportModifiers(enemy);
    this.playerVitals.damage(
      this.rules.modifyPlayerIncomingDamage(
        enemy.attackDamage * support.damage,
      ),
    );
    this.spawnBolt(
      enemy.group.position,
      new THREE.Vector3(target.x, target.y + 0.3, target.z),
    );
    enemy.attackCooldown = enemy.attackInterval;
  }

  private attackCore(enemy: EnemyInstance): void {
    if (enemy.attackCooldown > 0) return;
    const support = this.supportModifiers(enemy);
    this.core.damage(
      this.rules.modifyCoreIncomingDamage(
        enemy.attackDamage *
          enemy.definition.coreDamageMultiplier *
          support.damage,
      ),
    );
    enemy.attackCooldown = enemy.attackInterval;
  }

  private attackCoreRanged(enemy: EnemyInstance): void {
    if (enemy.attackCooldown > 0) return;
    const support = this.supportModifiers(enemy);
    this.core.damage(
      this.rules.modifyCoreIncomingDamage(
        enemy.attackDamage *
          enemy.definition.coreDamageMultiplier *
          support.damage,
      ),
    );
    this.spawnBolt(
      enemy.group.position,
      this.core.group.position.clone().add(new THREE.Vector3(0, 1, 0)),
    );
    enemy.attackCooldown = enemy.attackInterval;
  }

  private bossPulse(enemy: EnemyInstance): void {
    const radius = enemy.definition.bossPulseRadius ?? 0;
    const damage = enemy.definition.bossPulseDamage ?? 0;
    if (radius <= 0 || damage <= 0) return;

    const center = enemy.group.position;
    const player = this.player.getPosition();
    if (
      !this.playerVitals.dead &&
      Math.hypot(center.x - player.x, center.z - player.z) <= radius
    ) {
      this.playerVitals.damage(
        this.rules.modifyPlayerIncomingDamage(damage),
      );
    }

    const corePosition = this.core.group.position;
    if (
      Math.hypot(
        center.x - corePosition.x,
        center.z - corePosition.z,
      ) <= radius
    ) {
      this.core.damage(
        this.rules.modifyCoreIncomingDamage(damage * 0.8),
      );
    }

    for (const structure of [...this.structures.all]) {
      if (
        Math.hypot(
          center.x - structure.x,
          center.z - structure.z,
        ) > radius
      ) {
        continue;
      }
      this.structures.damageStructure(
        structure.id,
        this.rules.modifyStructureIncomingDamage(damage),
      );
    }

    const ring = new THREE.Mesh(
      new THREE.RingGeometry(radius * 0.75, radius, 28),
      this.bossAuraMaterial.clone(),
    );
    ring.rotation.x = -Math.PI / 2;
    ring.position.set(center.x, center.y - 0.9, center.z);
    this.scene.add(ring);
    setTimeout(() => {
      this.scene.remove(ring);
      ring.geometry.dispose();
      const material = ring.material;
      if (material instanceof THREE.Material) material.dispose();
    }, 240);
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

    const shock = enemy.statuses.get(EnemyStatus.Shock);
    const shockScale = shock ? this.rules.shockSlowFactor : 1;
    const support = this.supportModifiers(enemy);

    const distanceStep = Math.min(
      distance,
      enemy.speed * speedScale * shockScale * support.speed * dt,
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

  private moveAwayFrom(
    enemy: EnemyInstance,
    targetX: number,
    targetZ: number,
    dt: number,
  ): void {
    const position = enemy.group.position;
    let dx = position.x - targetX;
    let dz = position.z - targetZ;
    const length = Math.hypot(dx, dz);
    if (length < 0.001) return;

    dx /= length;
    dz /= length;

    const cell = this.grid.findNearestWalkable(
      position.x + dx * 2.5,
      position.z + dz * 2.5,
      3,
    );
    if (!cell) return;

    this.moveToward(
      enemy,
      cell.x + 0.5,
      cell.z + 0.5,
      cell.groundY + 1,
      dt,
      0.9,
    );
  }

  private findOpenDetour(
    current: NavigationCell,
  ): NavigationCell | null {
    let best: NavigationCell | null = null;
    let bestCost = Infinity;

    for (const [dx, dz] of CARDINALS) {
      const cell = this.grid.getCell(current.x + dx, current.z + dz);
      if (!cell?.walkable || cell.blockerId !== null) continue;
      if (!this.grid.canTraverse(current, cell)) continue;

      const cost = this.flow.costAt(cell.x, cell.z);
      if (cost < bestCost) {
        best = cell;
        bestCost = cost;
      }
    }

    return best;
  }

  private supportModifiers(
    enemy: EnemyInstance,
  ): { speed: number; damage: number } {
    let speed = 1;
    let damage = 1;

    for (const other of this.enemies) {
      if (!other.alive || other === enemy) continue;
      const radius = other.definition.supportRadius;
      if (!radius) continue;

      const distance = Math.hypot(
        other.group.position.x - enemy.group.position.x,
        other.group.position.z - enemy.group.position.z,
      );
      if (distance > radius) continue;

      speed = Math.max(
        speed,
        other.definition.supportSpeedMultiplier ?? 1,
      );
      damage = Math.max(
        damage,
        other.definition.supportDamageMultiplier ?? 1,
      );
    }

    return { speed, damage };
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

  private spawnBolt(fromPosition: THREE.Vector3, to: THREE.Vector3): void {
    const from = fromPosition.clone();
    from.y += 0.9;

    const mesh = new THREE.Mesh(
      this.boltGeometry,
      this.boltMaterial,
    );
    mesh.position.copy(from);
    mesh.lookAt(to);
    this.scene.add(mesh);

    this.bolts.push({
      mesh,
      from,
      to,
      age: 0,
      duration: 0.18,
    });
  }

  private updateBolts(dt: number): void {
    for (let index = this.bolts.length - 1; index >= 0; index--) {
      const bolt = this.bolts[index]!;
      bolt.age += dt;
      const t = Math.min(1, bolt.age / bolt.duration);
      bolt.mesh.position.lerpVectors(bolt.from, bolt.to, t);

      if (t >= 1) {
        this.scene.remove(bolt.mesh);
        this.bolts.splice(index, 1);
      }
    }
  }

  private createVisual(definition: EnemyDefinition): THREE.Group {
    const group = new THREE.Group();
    const material = this.materialFor(definition);

    const body = new THREE.Mesh(this.bodyGeometry, material);
    body.position.y = 0.92;
    body.castShadow = true;
    group.add(body);

    const head = new THREE.Mesh(this.headGeometry, material);
    head.position.y = 1.57;
    head.castShadow = true;
    group.add(head);

    for (const x of [-0.17, 0.17]) {
      const leg = new THREE.Mesh(this.legGeometry, material);
      leg.position.set(x, 0.3, 0);
      leg.castShadow = true;
      group.add(leg);
    }

    for (const x of [-0.13, 0.13]) {
      const eye = new THREE.Mesh(this.detailGeometry, this.eyeMaterial);
      eye.scale.set(0.38, 0.38, 0.2);
      eye.position.set(x, 1.62, 0.27);
      group.add(eye);
    }

    if (definition.type === EnemyType.Brute) {
      for (const x of [-0.42, 0.42]) {
        const shoulder = new THREE.Mesh(this.detailGeometry, material);
        shoulder.scale.set(1.7, 1.1, 1.3);
        shoulder.position.set(x, 1.18, 0);
        group.add(shoulder);
      }
    }

    if (definition.type === EnemyType.Archer) {
      const sight = new THREE.Mesh(this.detailGeometry, this.eyeMaterial);
      sight.scale.set(0.35, 1.8, 0.35);
      sight.position.set(0, 1.95, 0);
      group.add(sight);
    }

    if (
      definition.type === EnemyType.Support ||
      definition.type === EnemyType.Boss
    ) {
      const aura = new THREE.Mesh(
        this.auraGeometry,
        definition.type === EnemyType.Boss
          ? this.bossAuraMaterial
          : this.supportAuraMaterial,
      );
      aura.rotation.x = -Math.PI / 2;
      aura.position.y = 0.08;
      group.add(aura);
    }

    if (definition.type === EnemyType.Burrower) {
      group.rotation.z = 0.12;
      body.position.y = 0.65;
      head.position.y = 1.08;
    }

    if (definition.type === EnemyType.Boss) {
      for (const x of [-0.3, 0.3]) {
        const horn = new THREE.Mesh(this.detailGeometry, this.eyeMaterial);
        horn.scale.set(0.65, 2.2, 0.65);
        horn.position.set(x, 2.0, 0);
        horn.rotation.z = x < 0 ? -0.3 : 0.3;
        group.add(horn);
      }
    }

    group.scale.setScalar(definition.scale);
    return group;
  }

  private materialFor(
    definition: EnemyDefinition,
  ): THREE.MeshStandardMaterial {
    let material = this.materials.get(definition.type);
    if (!material) {
      material = new THREE.MeshStandardMaterial({
        color: definition.color,
        emissive: definition.emissive,
        emissiveIntensity: 0.45,
        roughness: 0.82,
      });
      this.materials.set(definition.type, material);
    }
    return material;
  }
}

const CARDINALS = [
  [1, 0],
  [-1, 0],
  [0, 1],
  [0, -1],
] as const;
