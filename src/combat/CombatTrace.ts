import * as THREE from "three";
import type { EnemyInstance } from "../ai/EnemySystem";
import type { StructureInstance } from "../building/StructureSystem";
import { StructureType } from "../building/StructureRegistry";
import type { VoxelWorld } from "../voxel/VoxelWorld";
import { raycastVoxels } from "../voxel/VoxelRaycast";

/** Distance to first cover along a swept attack, including rotated defences. */
export function coverDistance(world: VoxelWorld, from: THREE.Vector3, direction: THREE.Vector3,
  length: number, structures: readonly StructureInstance[] = []): number {
  let best = raycastVoxels(world, from, direction, length)?.distance ?? Infinity;
  const ray = new THREE.Ray(from, direction.clone().normalize());
  const local = new THREE.Ray();
  const point = new THREE.Vector3();
  const inverse = new THREE.Matrix4();
  for (const structure of structures) {
    if (structure.type === StructureType.Spike) continue;
    structure.group.updateMatrixWorld();
    inverse.copy(structure.group.matrixWorld).invert();
    local.copy(ray).applyMatrix4(inverse);
    const { width, depth, height } = structure.definition;
    // Open gates only block the two posts and lintel.
    const boxes = structure.type === StructureType.Gate && structure.open
      ? [new THREE.Box3(new THREE.Vector3(-1.12, 0, -0.23), new THREE.Vector3(-0.78, 2.4, 0.23)),
        new THREE.Box3(new THREE.Vector3(0.78, 0, -0.23), new THREE.Vector3(1.12, 2.4, 0.23)),
        new THREE.Box3(new THREE.Vector3(-1.12, 2.06, -0.23), new THREE.Vector3(1.12, 2.4, 0.23))]
      : [new THREE.Box3(new THREE.Vector3(-width / 2, 0, -depth / 2),
          new THREE.Vector3(width / 2, height, depth / 2))];
    for (const box of boxes) {
      if (!local.intersectBox(box, point)) continue;
      point.applyMatrix4(structure.group.matrixWorld);
      const distance = point.distanceTo(from);
      if (distance <= length) best = Math.min(best, distance);
    }
  }
  return best;
}

/** Use scaled body volumes, rather than a fixed head sphere for every enemy. */
export function enemyHitDistance(enemy: EnemyInstance, from: THREE.Vector3,
  direction: THREE.Vector3, length: number): number | null {
  const scale = enemy.definition.scale;
  const p = enemy.group.position;
  const box = new THREE.Box3(new THREE.Vector3(p.x - 0.4 * scale, p.y, p.z - 0.4 * scale),
    new THREE.Vector3(p.x + 0.4 * scale, p.y + 1.9 * scale, p.z + 0.4 * scale));
  if (box.containsPoint(from)) return 0;
  const hit = new THREE.Ray(from, direction.clone().normalize()).intersectBox(box, new THREE.Vector3());
  if (!hit) return null;
  const distance = from.distanceTo(hit);
  return distance <= length ? distance : null;
}
