import * as THREE from "three";
import type { PhysicsWorld } from "../engine/physics/PhysicsWorld";
import { Health } from "../survival/Health";

export class Core {
  readonly health = new Health(500);
  readonly group = new THREE.Group();

  constructor(
    scene: THREE.Scene,
    physics: PhysicsWorld,
    x: number,
    y: number,
    z: number,
  ) {
    this.group.name = "defense-core";
    this.group.position.set(x + 0.5, y, z + 0.5);

    const baseMaterial = new THREE.MeshStandardMaterial({
      color: 0x3d4845,
      roughness: 0.78,
      metalness: 0.24,
    });
    const crystalMaterial = new THREE.MeshStandardMaterial({
      color: 0x65e4dd,
      emissive: 0x1b6a6a,
      emissiveIntensity: 2.2,
      roughness: 0.28,
      metalness: 0.08,
    });

    const base = new THREE.Mesh(
      new THREE.BoxGeometry(2.4, 0.6, 2.4),
      baseMaterial,
    );
    base.position.y = 0.3;
    base.castShadow = true;
    base.receiveShadow = true;
    this.group.add(base);

    const pedestal = new THREE.Mesh(
      new THREE.BoxGeometry(1.25, 1.15, 1.25),
      baseMaterial,
    );
    pedestal.position.y = 1.12;
    pedestal.castShadow = true;
    this.group.add(pedestal);

    const crystal = new THREE.Mesh(
      new THREE.OctahedronGeometry(0.72, 0),
      crystalMaterial,
    );
    crystal.position.y = 2.25;
    crystal.rotation.y = Math.PI / 4;
    crystal.castShadow = true;
    this.group.add(crystal);

    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(0.95, 0.06, 8, 24),
      crystalMaterial,
    );
    ring.position.y = 2.2;
    ring.rotation.x = Math.PI / 2;
    this.group.add(ring);

    scene.add(this.group);

    const body = physics.createStaticBody(
      this.group.position.x,
      y,
      this.group.position.z,
    );
    physics.addBoxCollider(body, 1.2, 0.3, 1.2, 0, 0.3, 0);
    physics.addBoxCollider(body, 0.63, 0.58, 0.63, 0, 1.18, 0);
  }

  update(dt: number): void {
    const crystal = this.group.children[2];
    if (crystal) crystal.rotation.y += dt * 0.65;
    const ring = this.group.children[3];
    if (ring) ring.rotation.z += dt * 0.42;
  }

  damage(amount: number): void {
    this.health.damage(amount);
  }

  repair(amount: number): void {
    this.health.heal(amount);
  }
}
