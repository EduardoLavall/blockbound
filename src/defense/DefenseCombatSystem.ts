import * as THREE from "three";
import type {
  EnemyInstance,
  EnemySystem,
} from "../ai/EnemySystem";
import type {
  StructureInstance,
  StructureSystem,
} from "../building/StructureSystem";
import { StructureType } from "../building/StructureRegistry";
import {
  isTurretStructure,
  turretDamageAgainst,
  turretDefinition,
  turretTargetPriority,
  type TurretCombatDefinition,
} from "./TurretRegistry";
import { EnemyStatus } from "../combat/CombatTypes";
import type { RuleEngine } from "../roguelite/RuleEngine";
import { SeededRandom } from "../voxel/generation/SeededRandom";

interface Bolt {
  mesh: THREE.Mesh;
  from: THREE.Vector3;
  to: THREE.Vector3;
  age: number;
  duration: number;
}

export class DefenseCombatSystem {
  private readonly turretCooldowns = new Map<number, number>();
  private readonly spikeCooldowns = new Map<string, number>();
  private readonly bolts: Bolt[] = [];
  private readonly boltGeometry = new THREE.BoxGeometry(0.08, 0.08, 0.28);
  private readonly boltMaterials = new Map<number, THREE.MeshBasicMaterial>();
  private readonly random: SeededRandom;

  constructor(
    seed: number,
    private readonly scene: THREE.Scene,
    private readonly structures: StructureSystem,
    private readonly enemies: EnemySystem,
    private readonly rules: RuleEngine,
  ) {
    this.random = new SeededRandom(seed ^ 0x39af1d2c);
  }

  fixedUpdate(dt: number): void {
    this.tickCooldowns(dt);
    this.updateTurrets();
    this.updateSpikes();
    this.updateBolts(dt);
  }

  private updateTurrets(): void {
    for (const structure of this.structures.all) {
      if (!isTurretStructure(structure.type)) continue;

      const cooldown = this.turretCooldowns.get(structure.id) ?? 0;
      if (cooldown > 0) continue;

      const definition = turretDefinition(structure.type);
      if (!definition) continue;

      const target = this.selectTurretTarget(structure, definition);
      if (!target) continue;

      const baseDamage = turretDamageAgainst(
        structure.type,
        target.type,
      );
      const damage = this.rules.modifyTurretDamage(
        baseDamage,
        target,
      );

      this.enemies.damage(target, damage, "turret");
      this.applyTurretStatuses(target);
      this.spawnBolt(
        structure,
        target,
        definition.boltColor,
      );
      this.turretCooldowns.set(
        structure.id,
        definition.cooldown *
          this.rules.turretCooldownMultiplier,
      );
    }
  }

  private updateSpikes(): void {
    for (const structure of this.structures.all) {
      if (structure.type !== StructureType.Spike) continue;

      const victims = this.enemies.withinRadius(
        structure.x,
        structure.z,
        1.05,
      );

      for (const enemy of victims) {
        const key = `${structure.id}:${enemy.id}`;
        if ((this.spikeCooldowns.get(key) ?? 0) > 0) continue;

        const damage = this.rules.modifySpikeDamage(24, enemy);
        this.enemies.damage(enemy, damage, "spike");
        this.spikeCooldowns.set(
          key,
          0.62 * this.rules.spikeCooldownMultiplier,
        );
      }
    }
  }

  private selectTurretTarget(
    turret: StructureInstance,
    definition: TurretCombatDefinition,
  ): EnemyInstance | null {
    let target: EnemyInstance | null = null;
    let bestScore = -Infinity;

    for (const enemy of this.enemies.aliveEnemies) {
      const distance = Math.hypot(
        enemy.group.position.x - turret.x,
        enemy.group.position.z - turret.z,
      );
      if (distance > definition.range) continue;

      const score =
        turretTargetPriority(turret.type, enemy.type) * 4 -
        distance;

      if (score > bestScore) {
        target = enemy;
        bestScore = score;
      }
    }

    return target;
  }

  private applyTurretStatuses(enemy: EnemyInstance): void {
    if (this.random.range(0, 1) < this.rules.turretBurnChance) {
      this.enemies.applyStatus(
        enemy,
        EnemyStatus.Burn,
        3.5,
        1,
        "turret",
      );
    }
    if (this.random.range(0, 1) < this.rules.turretShockChance) {
      this.enemies.applyStatus(
        enemy,
        EnemyStatus.Shock,
        2.6,
        1,
        "turret",
      );
    }
  }

  private spawnBolt(
    turret: StructureInstance,
    target: EnemyInstance,
    color: number,
  ): void {
    const from = new THREE.Vector3(
      turret.x,
      turret.y +
        (turret.type === StructureType.RapidTurret
          ? 1.12
          : 1.55),
      turret.z,
    );
    const to = target.group.position.clone();
    to.y += 0.9;

    const mesh = new THREE.Mesh(
      this.boltGeometry,
      this.materialForBolt(color),
    );
    mesh.position.copy(from);
    mesh.lookAt(to);
    mesh.renderOrder = 4;
    this.scene.add(mesh);

    this.bolts.push({
      mesh,
      from,
      to,
      age: 0,
      duration: 0.13,
    });
  }

  private materialForBolt(color: number): THREE.MeshBasicMaterial {
    let material = this.boltMaterials.get(color);
    if (!material) {
      material = new THREE.MeshBasicMaterial({ color });
      this.boltMaterials.set(color, material);
    }
    return material;
  }

  private updateBolts(dt: number): void {
    for (let i = this.bolts.length - 1; i >= 0; i--) {
      const bolt = this.bolts[i]!;
      bolt.age += dt;
      const t = Math.min(1, bolt.age / bolt.duration);
      bolt.mesh.position.lerpVectors(bolt.from, bolt.to, t);

      if (t >= 1) {
        this.scene.remove(bolt.mesh);
        this.bolts.splice(i, 1);
      }
    }
  }

  private tickCooldowns(dt: number): void {
    for (const [id, value] of this.turretCooldowns) {
      const next = value - dt;
      if (next <= 0) this.turretCooldowns.delete(id);
      else this.turretCooldowns.set(id, next);
    }

    for (const [key, value] of this.spikeCooldowns) {
      const next = value - dt;
      if (next <= 0) this.spikeCooldowns.delete(key);
      else this.spikeCooldowns.set(key, next);
    }
  }
}
