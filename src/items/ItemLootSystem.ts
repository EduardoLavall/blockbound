import * as THREE from "three";
import { EnemyType } from "../ai/EnemyRegistry";
import type {
  EnemyDamageEvent,
  EnemySystem,
} from "../ai/EnemySystem";
import type { PlayerController } from "../player/PlayerController";
import { SeededRandom } from "../voxel/generation/SeededRandom";
import type { ItemInventory } from "./ItemInventory";
import {
  ITEMS,
  type ItemDefinition,
  type ItemRarity,
} from "./ItemRegistry";

interface ItemDrop {
  definition: ItemDefinition;
  mesh: THREE.Mesh;
  age: number;
  baseY: number;
  phase: number;
}

export class ItemLootSystem {
  private readonly random: SeededRandom;
  private readonly drops: ItemDrop[] = [];
  private killsSeen = 0;
  private readonly geometry = new THREE.BoxGeometry(0.34, 0.34, 0.34);

  constructor(
    seed: number,
    private readonly scene: THREE.Scene,
    enemies: EnemySystem,
    private readonly player: PlayerController,
    private readonly inventory: ItemInventory,
  ) {
    this.random = new SeededRandom(seed ^ 0x4e17b13d);
    enemies.subscribeDamage((event) => this.onEnemyDamage(event));
  }

  update(dt: number): void {
    const player = this.player.getPosition();

    for (let index = this.drops.length - 1; index >= 0; index--) {
      const drop = this.drops[index]!;
      drop.age += dt;
      drop.mesh.rotation.y += dt * 1.6;
      drop.mesh.rotation.x = Math.sin(drop.age * 1.8 + drop.phase) * 0.12;

      const dx = player.x - drop.mesh.position.x;
      const dy = player.y - drop.mesh.position.y;
      const dz = player.z - drop.mesh.position.z;
      const distance = Math.hypot(dx, dy, dz);

      if (distance < 3.4 && distance > 0.001) {
        const pull = Math.max(0, 1 - distance / 3.4);
        const speed = 1.3 + pull * 8.5;
        drop.mesh.position.x += (dx / distance) * speed * dt;
        drop.mesh.position.y += (dy / distance) * speed * dt;
        drop.mesh.position.z += (dz / distance) * speed * dt;
      } else {
        drop.mesh.position.y =
          drop.baseY + Math.sin(drop.age * 2.8 + drop.phase) * 0.1;
      }

      if (distance < 0.78) {
        const inserted = this.inventory.add(
          drop.definition.id,
          1,
        );
        if (inserted.length > 0) {
          this.removeAt(index);
        }
      }
    }
  }

  get count(): number {
    return this.drops.length;
  }

  private onEnemyDamage(event: EnemyDamageEvent): void {
    if (!event.killed) return;

    this.killsSeen++;
    const guaranteedFirstDrop = this.killsSeen === 1;
    const definition = selectLootDefinition(
      this.random,
      event.enemy.type,
      guaranteedFirstDrop,
    );
    if (!definition) return;

    const position = event.enemy.group.position;
    this.spawn(
      definition,
      position.x,
      position.y + 0.4,
      position.z,
    );
  }

  private spawn(
    definition: ItemDefinition,
    x: number,
    y: number,
    z: number,
  ): void {
    const material = new THREE.MeshStandardMaterial({
      color: new THREE.Color(definition.swatch),
      emissive: rarityColor(definition.rarity),
      emissiveIntensity: definition.rarity === "epic" ? 0.7 : 0.32,
      roughness: 0.5,
      metalness: definition.slot === "weapon" ? 0.38 : 0.12,
    });
    const mesh = new THREE.Mesh(this.geometry, material);
    const phase = this.random.range(0, Math.PI * 2);
    const baseY = y;

    mesh.position.set(
      x + Math.sin(phase) * 0.24,
      baseY,
      z + Math.cos(phase) * 0.24,
    );
    mesh.rotation.set(0.35, phase, 0.2);
    mesh.castShadow = true;
    mesh.userData.itemDrop = definition.id;

    this.scene.add(mesh);
    this.drops.push({
      definition,
      mesh,
      age: 0,
      baseY,
      phase,
    });
  }

  private removeAt(index: number): void {
    const drop = this.drops[index]!;
    this.scene.remove(drop.mesh);
    const materials = Array.isArray(drop.mesh.material)
      ? drop.mesh.material
      : [drop.mesh.material];
    for (const material of materials) material.dispose();
    this.drops.splice(index, 1);
  }
}

export function selectLootDefinition(
  random: SeededRandom,
  type: EnemyType,
  guaranteed = false,
): ItemDefinition | null {
  if (!guaranteed && random.next() > itemDropChance(type)) {
    return null;
  }

  const rarity = guaranteed
    ? "common"
    : rollItemRarity(random, type);
  const candidates = ITEMS.filter((item) => item.rarity === rarity);
  const pool = candidates.length > 0 ? candidates : ITEMS;
  return pool[Math.floor(random.range(0, pool.length))] ?? null;
}

export function itemDropChance(type: EnemyType): number {
  switch (type) {
    case EnemyType.Runner:
      return 0.13;
    case EnemyType.Brute:
      return 0.3;
    case EnemyType.Archer:
      return 0.22;
    case EnemyType.Support:
      return 0.34;
    case EnemyType.Burrower:
      return 0.28;
    case EnemyType.Boss:
      return 1;
    default:
      return 0.15;
  }
}

export function rollItemRarity(
  random: SeededRandom,
  type: EnemyType,
): ItemRarity {
  if (type === EnemyType.Boss) return "epic";

  const roll = random.next();
  const epicChance =
    type === EnemyType.Support || type === EnemyType.Burrower
      ? 0.12
      : type === EnemyType.Brute
        ? 0.09
        : 0.04;
  const rareChance =
    type === EnemyType.Support ||
    type === EnemyType.Burrower ||
    type === EnemyType.Brute
      ? 0.42
      : 0.28;

  if (roll < epicChance) return "epic";
  if (roll < epicChance + rareChance) return "rare";
  return "common";
}

function rarityColor(rarity: ItemRarity): THREE.Color {
  if (rarity === "epic") return new THREE.Color(0x6d2d8e);
  if (rarity === "rare") return new THREE.Color(0x245f88);
  return new THREE.Color(0x253025);
}
