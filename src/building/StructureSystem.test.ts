import * as THREE from "three";
import { describe, expect, it } from "vitest";
import { StructureSystem } from "./StructureSystem";
import { StructureType } from "./StructureRegistry";
import { PhysicsWorld } from "../engine/physics/PhysicsWorld";
import { VoxelWorld } from "../voxel/VoxelWorld";
import { BlockId } from "../voxel/blocks";
import { Inventory } from "../survival/Inventory";
import { ResourceId } from "../survival/Resources";
import { CraftingSystem } from "../crafting/CraftingSystem";
import { InteractionMode } from "../player/InteractionMode";
import type { Input } from "../core/Input";
import type { PlayerController } from "../player/PlayerController";
import type { PlayerStatus } from "../player/PlayerStatus";
import type { Hotbar } from "../player/Hotbar";
import type { Core } from "./Core";

async function fixture() {
  const physics = await PhysicsWorld.create();
  const world = new VoxelWorld();
  world.ensureChunk(0, 0);
  for (let z = 0; z < 16; z++) for (let x = 0; x < 16; x++) world.setBlock(x, 0, z, BlockId.Stone);
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera();
  camera.position.set(4.5, 3, 6.5);
  camera.lookAt(4.5, 1, 3.5);
  camera.updateMatrixWorld();
  const inventory = new Inventory();
  const pressed = new Set<string>();
  const position = new THREE.Vector3(12, 2, 12);
  const core = new THREE.Group(); core.position.set(14, 1, 14);
  const mode = new InteractionMode();
  const system = new StructureSystem(scene, camera,
    { consumePressed: (key: string) => pressed.delete(key) } as Input,
    { getPosition: () => position } as unknown as PlayerController, world, physics, inventory,
    {} as PlayerStatus, mode, { group: core } as Core,
    { minX: 0, minZ: 0, maxXExclusive: 16, maxZExclusive: 16 },
    { selectedSlot: 0, get selectedStack() { return inventory.storage.slot(0); } } as Hotbar,
    { classList: { toggle: () => {} } } as unknown as HTMLDivElement);
  const craft = () => {
    inventory.add(ResourceId.Wood, 2); inventory.add(ResourceId.Stone, 2);
    expect(new CraftingSystem(inventory.storage).craft("defense-wall")).toBe(true);
  };
  const place = () => { pressed.add("Mouse2"); system.fixedUpdate(1 / 60); };
  return { system, inventory, physics, craft, place, position, mode };
}

describe("crafted defense placement", () => {
  it("places a crafted wall without raw materials, consumes one item and cannot build again for free", async () => {
    const f = await fixture();
    try {
      f.craft(); f.place();
      expect(f.system.all).toHaveLength(1);
      expect(f.system.all[0]!.type).toBe(StructureType.Wall);
      expect(f.inventory.storage.slot(0)).toBeNull();
      expect(f.inventory.get(ResourceId.Wood)).toBe(0);
      f.place(); expect(f.system.all).toHaveLength(1);
      expect(f.mode.buildMode).toBe(false);
    } finally { f.physics.world.free(); }
  });
  it("retains the crafted item when another structure blocks placement", async () => {
    const f = await fixture();
    try {
      f.craft(); f.place(); f.craft(); f.place();
      expect(f.system.all).toHaveLength(1);
      expect(f.inventory.storage.slot(0)?.quantity).toBe(1);
    } finally { f.physics.world.free(); }
  });
  it("does not expose a build mode from raw resources or the old B key", async () => {
    const f = await fixture();
    try {
      f.inventory.add(ResourceId.Wood, 20); f.place();
      expect(f.system.all).toHaveLength(0);
      expect(f.mode.buildMode).toBe(false);
      expect(f.inventory.get(ResourceId.Wood)).toBe(20);
    } finally { f.physics.world.free(); }
  });
});
