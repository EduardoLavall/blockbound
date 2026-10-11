import * as THREE from "three";
import { describe, expect, it, vi } from "vitest";
import { ResourceDropSystem } from "./ResourceDropSystem";
import { ResourceId } from "./Resources";
import { Inventory } from "./Inventory";
import type { PlayerController } from "../player/PlayerController";

describe("resource pickup presentation", () => {
  it("spawns only a sprite and removes it once the resource reaches inventory", () => {
    const scene = new THREE.Scene();
    const position = new THREE.Vector3(20, 2, 20);
    const inventory = new Inventory(); const onPickup = vi.fn();
    const drops = new ResourceDropSystem(scene, inventory, { getPosition: () => position } as unknown as PlayerController, onPickup);
    drops.spawn({ resource: ResourceId.Stone, amount: 2 }, 0, 1, 0);
    expect(scene.children).toHaveLength(1);
    expect(scene.children[0]).toBeInstanceOf(THREE.Sprite);
    expect(scene.children[0]!.children).toHaveLength(0);
    const sprite = scene.children[0] as THREE.Sprite;
    position.copy(sprite.position); drops.update(1 / 60);
    expect(inventory.get(ResourceId.Stone)).toBe(2);
    expect(drops.count).toBe(0); expect(scene.children).toHaveLength(0);
    expect(onPickup).toHaveBeenCalledOnce();
  });
});
