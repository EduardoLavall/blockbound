import * as THREE from "three";
import { describe, expect, it, vi } from "vitest";
import { VoxelWorld } from "../voxel/VoxelWorld";
import { BlockId } from "../voxel/blocks";
import { EnemyType, ENEMIES } from "../ai/EnemyRegistry";
import type { EnemyInstance, EnemySystem } from "../ai/EnemySystem";
import type { StructureSystem, StructureInstance } from "../building/StructureSystem";
import { STRUCTURES, StructureType } from "../building/StructureRegistry";
import { Health } from "../survival/Health";
import { ProjectileSystem } from "./ProjectileSystem";
import { coverDistance, enemyHitDistance } from "./CombatTrace";

function enemy(x: number, id = 1, type = EnemyType.Grunt): EnemyInstance {
  const group = new THREE.Group(); group.position.set(x, 1, 0.5);
  return { id, type, definition: ENEMIES[type], group, health: new Health(100), alive: true,
    statuses: new Map(), speed: 0, attackDamage: 0, attackInterval: 1, attackCooldown: 0, abilityCooldown: 1,
    knockbackVelocity: new THREE.Vector3(), stagger: 0 };
}
function fixture(targets: EnemyInstance[], pierce = 0, speed = 240) {
  const world = new VoxelWorld(); world.ensureChunk(0, 0);
  const damage = vi.fn();
  const enemies = { aliveEnemies: targets, damage, applyStatus: vi.fn(), knockback: vi.fn() } as unknown as EnemySystem;
  const structures = { all: [] } as unknown as StructureSystem;
  const projectiles = new ProjectileSystem(1, new THREE.Scene(), world, enemies, vi.fn(), structures);
  projectiles.spawn({ origin: new THREE.Vector3(0.5, 1.8, 0.5), direction: new THREE.Vector3(1, 0, 0),
    speed, damage: 24, pierce, burnChance: 0, shockChance: 0, markDuration: 0, critical: false });
  return { world, damage, projectiles };
}
describe("swept combat collisions", () => {
  it("stops a fast projectile at cover between frames, before the enemy behind it", () => {
    const f = fixture([enemy(3.5)]);
    f.world.setBlock(2, 1, 0, BlockId.Stone);
    f.projectiles.fixedUpdate(1 / 60);
    expect(f.damage).not.toHaveBeenCalled();
    expect(f.projectiles.count).toBe(0);
  });
  it("hits an enemy before cover without hitting one behind it", () => {
    const front = enemy(1.5, 1), back = enemy(3.5, 2);
    const f = fixture([back, front], 3);
    f.world.setBlock(2, 1, 0, BlockId.Stone);
    f.projectiles.fixedUpdate(1 / 60);
    expect(f.damage).toHaveBeenCalledTimes(1);
    expect(f.damage.mock.calls[0]![0]).toBe(front);
  });
  it("applies piercing in distance order within the same frame", () => {
    const front = enemy(1.5, 1), back = enemy(3.5, 2);
    const f = fixture([back, front], 1);
    f.projectiles.fixedUpdate(1 / 60);
    expect(f.damage.mock.calls.map(call => call[0].id)).toEqual([1, 2]);
    expect(f.projectiles.count).toBe(0);
  });
  it("does not hit the same enemy twice across adjacent frames", () => {
    const f = fixture([enemy(1.5)], 2, 30);
    for (let i = 0; i < 10; i++) f.projectiles.fixedUpdate(1 / 60);
    expect(f.damage).toHaveBeenCalledTimes(1);
  });
  it("uses boss scale so shots to the upper body actually connect", () => {
    const boss = enemy(4, 1, EnemyType.Boss);
    expect(enemyHitDistance(boss, new THREE.Vector3(0.5, 4, 0.5), new THREE.Vector3(1, 0, 0), 8)).not.toBeNull();
    expect(enemyHitDistance(enemy(4), new THREE.Vector3(0.5, 4, 0.5), new THREE.Vector3(1, 0, 0), 8)).toBeNull();
  });
  it("respects rotated structure cover and open gate passages", () => {
    const world = new VoxelWorld();
    const group = new THREE.Group(); group.position.set(3, 1, 0.5);
    const gate = { group, definition: STRUCTURES[StructureType.Gate], type: StructureType.Gate, open: false } as StructureInstance;
    const from = new THREE.Vector3(3, 2, -3), direction = new THREE.Vector3(0, 0, 1);
    expect(coverDistance(world, from, direction, 10, [gate])).toBeLessThan(4);
    gate.open = true;
    expect(coverDistance(world, from, direction, 10, [gate])).toBe(Infinity);
    gate.type = StructureType.Wall; gate.definition = STRUCTURES[StructureType.Wall];
    group.rotation.y = Math.PI / 2;
    expect(coverDistance(world, new THREE.Vector3(0, 2, 0.5), new THREE.Vector3(1, 0, 0), 10, [gate])).toBeLessThan(4);
  });
});
