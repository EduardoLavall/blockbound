import * as THREE from "three";
import type { PlayerController } from "../player/PlayerController";
import { Inventory } from "./Inventory";
import { RESOURCES, type BlockDrop, type ResourceId } from "./Resources";

interface ResourceDropInstance {
  resource: ResourceId;
  amount: number;
  mesh: THREE.Mesh;
  age: number;
  phase: number;
  baseY: number;
}

export class ResourceDropSystem {
  private readonly drops: ResourceDropInstance[] = [];

  constructor(
    private readonly scene: THREE.Scene,
    private readonly inventory: Inventory,
    private readonly player: PlayerController,
  ) {}

  spawn(drop: BlockDrop, x: number, y: number, z: number): void {
    const definition = RESOURCES[drop.resource];
    const mesh = new THREE.Mesh(
      new THREE.BoxGeometry(0.24, 0.24, 0.24),
      new THREE.MeshStandardMaterial({
        color: new THREE.Color(definition.swatch),
        roughness: 0.68,
        metalness: drop.resource === "metal" ? 0.35 : 0.02,
        emissive: drop.resource === "crystal"
          ? new THREE.Color(definition.swatch).multiplyScalar(0.18)
          : new THREE.Color(0x000000),
      }),
    );

    const phase = (this.drops.length * 1.913) % (Math.PI * 2);
    const baseY = y + 0.48;
    mesh.position.set(
      x + 0.5 + Math.sin(phase) * 0.12,
      baseY,
      z + 0.5 + Math.cos(phase) * 0.12,
    );
    mesh.rotation.set(0.25, phase, 0.18);
    mesh.castShadow = true;
    mesh.userData.resourceDrop = drop.resource;

    this.scene.add(mesh);
    this.drops.push({
      resource: drop.resource,
      amount: drop.amount,
      mesh,
      age: 0,
      phase,
      baseY,
    });
  }

  update(dt: number): void {
    const player = this.player.getPosition();

    for (let i = this.drops.length - 1; i >= 0; i--) {
      const drop = this.drops[i]!;
      drop.age += dt;
      drop.mesh.rotation.y += dt * 1.8;

      const dx = player.x - drop.mesh.position.x;
      const dy = player.y - drop.mesh.position.y;
      const dz = player.z - drop.mesh.position.z;
      const distance = Math.hypot(dx, dy, dz);

      if (distance < 3.2 && distance > 0.001) {
        const pull = Math.max(0, 1 - distance / 3.2);
        const speed = 1.5 + pull * 7;
        drop.mesh.position.x += (dx / distance) * speed * dt;
        drop.mesh.position.y += (dy / distance) * speed * dt;
        drop.mesh.position.z += (dz / distance) * speed * dt;
      } else {
        drop.mesh.position.y =
          drop.baseY + Math.sin(drop.age * 3 + drop.phase) * 0.08;
      }

      if (distance < 0.72) {
        const accepted = this.inventory.add(
          drop.resource,
          drop.amount,
        );
        if (accepted >= drop.amount) {
          this.removeAt(i);
        } else if (accepted > 0) {
          drop.amount -= accepted;
        }
      }
    }
  }

  get count(): number {
    return this.drops.length;
  }

  private removeAt(index: number): void {
    const drop = this.drops[index]!;
    this.scene.remove(drop.mesh);
    drop.mesh.geometry.dispose();
    const materials = Array.isArray(drop.mesh.material)
      ? drop.mesh.material
      : [drop.mesh.material];
    for (const material of materials) material.dispose();
    this.drops.splice(index, 1);
  }
}
