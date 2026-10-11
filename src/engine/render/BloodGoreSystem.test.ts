import * as THREE from "three";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { EnemyDamageEvent, EnemyInstance } from "../../ai/EnemySystem";
import { ENEMIES, EnemyType } from "../../ai/EnemyRegistry";
import { BlockId } from "../../voxel/blocks";
import { VoxelWorld } from "../../voxel/VoxelWorld";
import { BLOOD_CAPACITY, BloodGoreSystem } from "./BloodGoreSystem";

function fixture() {
  const world = new VoxelWorld(); world.ensureChunk(0, 0);
  for (let x = 0; x < 16; x++) for (let z = 0; z < 16; z++) world.setGeneratedBlock(x, 0, z, BlockId.Grass);
  const scene = new THREE.Scene(), blood = new BloodGoreSystem(scene, world);
  const group = new THREE.Group(); group.position.set(8.5, 1.01, 8.5);
  const enemy = { id: 1, group, definition: ENEMIES[EnemyType.Grunt] } as EnemyInstance;
  const event = (killed = false): EnemyDamageEvent => ({ enemy, amount: 24, killed, source: "player-projectile",
    impact: { point: new THREE.Vector3(8.5, 2.1, 8.1), direction: new THREE.Vector3(0, 0, 1) } });
  return { world, scene, blood, enemy, event };
}
function positions(mesh: THREE.InstancedMesh): THREE.Vector3[] {
  const matrix = new THREE.Matrix4(), position = new THREE.Vector3(), rotation = new THREE.Quaternion(), scale = new THREE.Vector3();
  const points: THREE.Vector3[] = [];
  for (let i = 0; i < mesh.count; i++) {
    mesh.getMatrixAt(i, matrix);
    if (Math.hypot(matrix.elements[0]!, matrix.elements[1]!, matrix.elements[2]!) < 0.00001) continue;
    matrix.decompose(position, rotation, scale);
    if (scale.length() > 0.001) points.push(position.clone());
  }
  return points;
}
describe("pooled enemy blood and gore", () => {
  afterEach(() => vi.restoreAllMocks());
  it("sprays from the actual hit point and paints the terrain, without dismembering survivors", () => {
    const f = fixture(); f.blood.hit(f.event());
    expect(f.blood.counts.droplets).toBeGreaterThan(10); expect(f.blood.counts.fragments).toBe(0);
    f.blood.fixedUpdate(1 / 60);
    const points = positions(f.scene.getObjectByName("enemy-blood-droplets") as THREE.InstancedMesh);
    expect(points.every(p => p.distanceTo(f.event().impact!.point) < 0.2)).toBe(true);
    for (let i = 0; i < 150; i++) f.blood.fixedUpdate(1 / 60);
    expect(f.blood.counts.droplets).toBe(0); expect(f.blood.counts.stains).toBeGreaterThan(0);
    f.blood.dispose();
  });
  it("uses the incoming direction rather than a random camera-independent burst", () => {
    const random = vi.spyOn(Math, "random").mockReturnValue(0.5);
    const f = fixture(), event = f.event(); event.impact!.direction.set(1, 0, 0);
    f.blood.hit(event); f.blood.fixedUpdate(1 / 60);
    const points = positions(f.scene.getObjectByName("enemy-blood-droplets") as THREE.InstancedMesh);
    expect(points.some(p => p.x < event.impact!.point.x - 0.02)).toBe(true);
    expect(points.every(p => Math.abs(p.z - event.impact!.point.z) < 0.001)).toBe(true);
    f.blood.dispose(); random.mockRestore();
  });
  it("bursts on death, settles flesh/bone fragments and fades all effects away", () => {
    const f = fixture(); f.blood.hit(f.event(true));
    expect(f.blood.counts.fragments).toBe(10); expect(f.blood.counts.stains).toBe(1);
    for (let i = 0; i < 210; i++) f.blood.fixedUpdate(1 / 60);
    const points = positions(f.scene.getObjectByName("enemy-gore-fragments") as THREE.InstancedMesh);
    expect(points).toHaveLength(10);
    expect(points.every(p => p.y > 1 && p.y < 1.25)).toBe(true);
    f.blood.fixedUpdate(30); expect(f.blood.counts).toEqual({ droplets: 0, fragments: 0, stains: 0 });
    f.blood.dispose(); expect(f.scene.children).toHaveLength(0);
  });
  it("splashes voxel walls and removes stains when their supporting block is mined", () => {
    vi.spyOn(Math, "random").mockReturnValue(0.5);
    const f = fixture();
    for (let x = 5; x < 12; x++) for (let y = 1; y < 5; y++) f.world.setGeneratedBlock(x, y, 7, BlockId.Stone);
    const event = f.event(); event.impact!.point.set(8.5, 2.1, 8.1);
    f.blood.hit(event);
    for (let i = 0; i < 100; i++) f.blood.fixedUpdate(1 / 60);
    const stains = positions(f.scene.getObjectByName("enemy-blood-stains") as THREE.InstancedMesh);
    expect(stains.some(p => Math.abs(p.z - 8.009) < 0.01)).toBe(true);
    for (let x = 0; x < 16; x++) for (let z = 0; z < 16; z++) for (let y = 0; y < 5; y++) f.world.setGeneratedBlock(x, y, z, BlockId.Air);
    f.blood.fixedUpdate(1 / 60); expect(f.blood.counts.stains).toBe(0); f.blood.dispose();
  });
  it("pauses lifetime and positions, and clears everything when visual effects are disabled", () => {
    const f = fixture(); f.blood.hit(f.event(true)); f.blood.fixedUpdate(1 / 60);
    const mesh = f.scene.getObjectByName("enemy-blood-droplets") as THREE.InstancedMesh;
    const before = positions(mesh); f.blood.fixedUpdate(0);
    expect(positions(mesh)).toEqual(before);
    f.blood.enabled = false; f.blood.hit(f.event(true));
    expect(f.blood.counts).toEqual({ droplets: 0, fragments: 0, stains: 0 });
    expect(f.scene.children.every(mesh => !mesh.visible)).toBe(true);
    f.blood.enabled = true; expect(positions(mesh)).toHaveLength(0); f.blood.dispose();
  });
  it("keeps GPU pools fixed across a large horde, scales bosses, and ignores zero damage", () => {
    const f = fixture(); f.blood.hit({ ...f.event(), amount: 0 });
    expect(f.blood.counts.droplets).toBe(0);
    f.enemy.definition = ENEMIES[EnemyType.Boss];
    for (let i = 0; i < 120; i++) f.blood.hit(f.event(true));
    expect(f.blood.counts).toEqual(BLOOD_CAPACITY);
    expect(f.scene.children).toHaveLength(3);
    const large = f.blood.counts.droplets; f.blood.enabled = false; f.blood.enabled = true;
    f.enemy.definition = ENEMIES[EnemyType.Runner]; f.blood.hit(f.event(true));
    expect(f.blood.counts.droplets).toBeLessThan(large); f.blood.dispose();
  });
});
