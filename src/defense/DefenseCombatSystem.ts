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
  private readonly boltMaterial = new THREE.MeshBasicMaterial({
    color: 0x77eee5,
  });

  constructor(
    private readonly scene: THREE.Scene,
    private readonly structures: StructureSystem,
    private readonly enemies: EnemySystem,
  ) {}

  fixedUpdate(dt: number): void {
    this.tickCooldowns(dt);
    this.updateTurrets();
    this.updateSpikes();
    this.updateBolts(dt);
  }

  private updateTurrets(): void {
    for (const structure of this.structures.all) {
      if (structure.type !== StructureType.Turret) continue;

      const cooldown = this.turretCooldowns.get(structure.id) ?? 0;
      if (cooldown > 0) continue;

      const range = structure.definition.range ?? 10;
      const target = this.enemies.findNearest(
        structure.x,
        structure.z,
        range,
      );
      if (!target) continue;

      this.enemies.damage(target, 21);
      this.spawnBolt(structure, target);
      this.turretCooldowns.set(structure.id, 0.72);
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

        this.enemies.damage(enemy, 24);
        this.spikeCooldowns.set(key, 0.62);
      }
    }
  }

  private spawnBolt(
    turret: StructureInstance,
    target: EnemyInstance,
  ): void {
    const from = new THREE.Vector3(
      turret.x,
      turret.y + 1.55,
      turret.z,
    );
    const to = target.group.position.clone();
    to.y += 0.9;

    const mesh = new THREE.Mesh(
      this.boltGeometry,
      this.boltMaterial,
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
