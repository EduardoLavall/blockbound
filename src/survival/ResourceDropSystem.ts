import * as THREE from "three";
import { createDropSprite } from "../engine/render/DropSprite";
import type { PlayerController } from "../player/PlayerController";
import { Inventory } from "./Inventory";
import { RESOURCES, type BlockDrop, type ResourceId } from "./Resources";

interface ResourceDropInstance {
  resource: ResourceId;
  amount: number;
  mesh: THREE.Sprite;
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
    private readonly onPickup: () => void = () => {},
  ) {}

  spawn(drop: BlockDrop, x: number, y: number, z: number): void {
    const mesh = createDropSprite(drop.resource);
    const phase = (this.drops.length * 1.913) % (Math.PI * 2);
    const baseY = y + 0.48;
    mesh.position.set(
      x + 0.5 + Math.sin(phase) * 0.12,
      baseY,
      z + 0.5 + Math.cos(phase) * 0.12,
    );
    mesh.rotation.set(0.25, phase, 0.18);
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
      drop.mesh.material.rotation = Math.sin(drop.age * 2) * 0.06;

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
        if (accepted > 0) this.onPickup();
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
    drop.mesh.material.dispose();
    this.drops.splice(index, 1);
  }
}
