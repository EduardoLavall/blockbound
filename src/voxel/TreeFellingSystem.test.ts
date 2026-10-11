import * as THREE from "three";
import { describe, expect, it, vi } from "vitest";
import { ResourceId } from "../survival/Resources";
import { VoxelInteractionController } from "../player/VoxelInteractionController";
import { PlayerStatus } from "../player/PlayerStatus";
import { PlayerVitals } from "../combat/PlayerVitals";
import { RuleEngine } from "../roguelite/RuleEngine";
import { Inventory } from "../survival/Inventory";
import { RunInventory } from "../inventory/RunInventory";
import { InteractionMode } from "../player/InteractionMode";
import { BlockId } from "./blocks";
import { TreeFellingSystem } from "./TreeFellingSystem";
import type { TreeBlock } from "./Trees";
import { VoxelWorld } from "./VoxelWorld";

// Crack textures are a browser-only cosmetic; mining and felling remain real here.
vi.mock("../player/MiningCracks", () => ({ MiningCracks: class { update() {} } }));

function fixture(bonus = 0) {
  const world = new VoxelWorld(); const scene = new THREE.Scene();
  for (let cx = -1; cx <= 1; cx++) for (let cz = -1; cz <= 1; cz++) world.ensureChunk(cx, cz);
  for (let x = -12; x < 25; x++) for (let z = -12; z < 25; z++) world.setGeneratedBlock(x, 0, z, BlockId.Grass);
  const chunks = { requestRebuild: vi.fn() }; const drops = { spawn: vi.fn() };
  const onFall = vi.fn(); const onImpact = vi.fn();
  const system = new TreeFellingSystem(scene, world, chunks, drops, () => ({ x: 8.5, y: 2, z: 4 }), () => bonus, onFall, onImpact);
  function plant(x = 8, z = 8) {
    const blocks: TreeBlock[] = [];
    for (let y = 1; y <= 5; y++) blocks.push({ x, y, z, block: BlockId.Wood });
    for (let dx = -2; dx <= 2; dx++) for (let dz = -2; dz <= 2; dz++) {
      if (dx || dz) blocks.push({ x: x + dx, y: 5, z: z + dz, block: BlockId.Leaves });
    }
    blocks.forEach(b => world.setGeneratedBlock(b.x, b.y, b.z, b.block));
    return world.trees.register({ x, y: 1, z }, blocks);
  }
  return { world, scene, system, chunks, drops, onFall, onImpact, plant };
}

describe("natural tree felling", () => {
  it("integrates resistant mining without the old extra single-block reward", () => {
    const f = fixture(2); f.plant();
    const camera = new THREE.PerspectiveCamera(); camera.position.set(8.5, 3.5, 4); camera.lookAt(8.5, 3.5, 8.5);
    const input = { isDown: (key: string) => key === "Mouse0", consumePressed: () => false };
    const rules = new RuleEngine(); rules.resourceYieldBonus = 2;
    const status = new PlayerStatus(rules, new PlayerVitals());
    type Args = ConstructorParameters<typeof VoxelInteractionController>;
    const controller = new VoxelInteractionController(camera, f.scene, input as unknown as Args[2],
      {} as Args[3], f.world, f.chunks as unknown as Args[5], {} as Args[6], new Inventory(new RunInventory()),
      f.drops as unknown as Args[8], new InteractionMode(), status, () => true, {} as HTMLElement, {} as HTMLElement);
    controller.fixedUpdate(2);
    expect(controller.miningState.duration).toBeCloseTo(2.16);
    expect(f.system.fallingCount).toBe(0);
    controller.fixedUpdate(0.2);
    expect(f.system.fallingCount).toBe(1);
    expect(f.drops.spawn).not.toHaveBeenCalled();
    f.system.fixedUpdate(1.5);
    expect(f.drops.spawn).toHaveBeenCalledTimes(5);
    expect(f.drops.spawn.mock.calls.reduce((sum, call) => sum + call[0].amount, 0)).toBe(15);
    f.system.dispose();
  });
  it.each([1, 3, 5])("removes the entire connected tree when trunk %i breaks, then rewards once on impact", y => {
    const f = fixture(2); const tree = f.plant();
    f.world.setBlock(8, y, 8, BlockId.Air);
    expect(tree.blocks.every(b => f.world.getBlock(b.x, b.y, b.z) === BlockId.Air)).toBe(true);
    expect(f.world.trees.all).toHaveLength(0);
    expect(f.system.fallingCount).toBe(1); expect(f.onFall).toHaveBeenCalledTimes(1);
    expect(f.chunks.requestRebuild).toHaveBeenCalledTimes(1);
    expect(f.drops.spawn).not.toHaveBeenCalled(); expect(f.onImpact).not.toHaveBeenCalled();
    f.system.fixedUpdate(1); expect(f.drops.spawn).not.toHaveBeenCalled();
    f.system.fixedUpdate(0.5);
    expect(f.drops.spawn).toHaveBeenCalledTimes(5); expect(f.onImpact).toHaveBeenCalledTimes(1);
    for (const call of f.drops.spawn.mock.calls) expect(call[0]).toEqual({ resource: ResourceId.Wood, amount: 3 });
    expect(f.system.leafCount).toBeGreaterThan(30);
    f.system.fixedUpdate(1);
    expect(f.onImpact).toHaveBeenCalledTimes(1); expect(f.system.fallingCount).toBe(0);
    expect(f.scene.getObjectByName("falling-tree")).toBeUndefined();
    f.system.fixedUpdate(5); expect(f.system.leafCount).toBe(0); f.system.dispose();
  });
  it("preserves neighbors, placed timber and replacements inside a harvested canopy", () => {
    const f = fixture(); f.plant(); const neighbor = f.plant(16, 8);
    f.world.setBlock(6, 5, 6, BlockId.Stone);
    f.world.setGeneratedBlock(7, 2, 8, BlockId.Wood);
    f.world.setBlock(8, 3, 8, BlockId.Air);
    expect(f.world.getBlock(6, 5, 6)).toBe(BlockId.Stone);
    expect(f.world.getBlock(7, 2, 8)).toBe(BlockId.Wood);
    expect(neighbor.blocks.every(b => f.world.getBlock(b.x, b.y, b.z) === b.block)).toBe(true);
    f.world.setBlock(7, 2, 8, BlockId.Air); expect(f.onFall).toHaveBeenCalledTimes(1); f.system.dispose();
  });
  it("allows independent leaf mining and pauses animation/rewards with simulation", () => {
    const f = fixture(); f.plant();
    f.world.setBlock(6, 5, 6, BlockId.Air); expect(f.system.fallingCount).toBe(0);
    f.world.setBlock(8, 2, 8, BlockId.Air);
    f.system.fixedUpdate(0);
    expect(f.scene.getObjectByName("falling-tree")!.quaternion.angleTo(new THREE.Quaternion())).toBe(0);
    expect(f.onImpact).not.toHaveBeenCalled();
    f.system.effects = false; f.system.fixedUpdate(1.5);
    expect(f.onImpact).toHaveBeenCalledTimes(1); expect(f.drops.spawn).toHaveBeenCalledTimes(5);
    expect(f.system.leafCount).toBe(0); f.system.dispose();
  });
  it("stops the fall at raised terrain and handles a large timestep without duplicate loot", () => {
    const f = fixture(); f.plant();
    for (let x = 5; x <= 11; x++) for (let z = 11; z <= 16; z++) f.world.setGeneratedBlock(x, 2, z, BlockId.Stone);
    f.world.setBlock(8, 3, 8, BlockId.Air); f.system.fixedUpdate(1.46);
    const fallen = f.scene.getObjectByName("falling-tree")!;
    expect(fallen.quaternion.angleTo(new THREE.Quaternion())).toBeLessThan(1.2);
    expect(fallen.getObjectByName("falling-crown")!.visible).toBe(false);
    const impact = f.onImpact.mock.calls[0]![0] as THREE.Vector3;
    expect(impact.y).toBeGreaterThanOrEqual(1);
    for (const [, x, y, z] of f.drops.spawn.mock.calls) {
      const terrain = f.world.highestSolidY(Math.floor(x + 0.5), Math.floor(z + 0.5)) + 1;
      expect(y).toBe(terrain);
    }
    f.system.fixedUpdate(20); expect(f.drops.spawn).toHaveBeenCalledTimes(5); f.system.dispose();
  });
  it("bounds leaf particles across simultaneous falls and releases its edit subscription", () => {
    const f = fixture(); f.plant(); f.plant(16, 8); f.plant(8, 16); f.plant(16, 16);
    for (const [x, z] of [[8, 8], [16, 8], [8, 16], [16, 16]]) f.world.setBlock(x!, 2, z!, BlockId.Air);
    f.system.fixedUpdate(1.5); expect(f.system.leafCount).toBe(160);
    f.system.dispose(); f.plant(); f.world.setBlock(8, 2, 8, BlockId.Air);
    expect(f.onFall).toHaveBeenCalledTimes(4); expect(f.scene.children).toHaveLength(0);
  });
  it("keeps timber rewards on terrain when a tree falls beyond the map edge", () => {
    const f = fixture(); f.plant(8, 23);
    f.world.setBlock(8, 2, 23, BlockId.Air); f.system.fixedUpdate(1.5);
    expect(f.drops.spawn).toHaveBeenCalledTimes(5);
    for (const [, x, y, z] of f.drops.spawn.mock.calls) {
      expect(y).toBeGreaterThan(0);
      expect(f.world.getBlock(Math.floor(x + 0.5), y - 1, Math.floor(z + 0.5))).not.toBe(BlockId.Air);
    }
    f.system.dispose();
  });
});
