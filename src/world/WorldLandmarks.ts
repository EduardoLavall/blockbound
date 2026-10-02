import * as THREE from "three";
import type { WorldMetadata } from "../voxel/generation/WorldMetadata";
import type { VoxelWorld } from "../voxel/VoxelWorld";

export function createWorldLandmarks(
  scene: THREE.Scene,
  world: VoxelWorld,
  metadata: WorldMetadata,
): THREE.Group {
  const group = new THREE.Group();
  group.name = "world-landmarks";

  const laneMaterial = new THREE.MeshBasicMaterial({
    color: 0xd2a849,
    transparent: true,
    opacity: 0.16,
    depthWrite: false,
  });
  const laneGeometry = new THREE.BoxGeometry(0.94, 0.025, 0.94);
  const lane = new THREE.InstancedMesh(
    laneGeometry,
    laneMaterial,
    metadata.lane.cells.length,
  );
  lane.name = "primary-lane";
  lane.renderOrder = 1;

  const matrix = new THREE.Matrix4();
  metadata.lane.cells.forEach((cell, index) => {
    const y = world.highestSolidY(cell.x, cell.z) + 0.03;
    matrix.makeTranslation(cell.x + 0.5, y, cell.z + 0.5);
    lane.setMatrixAt(index, matrix);
  });
  lane.instanceMatrix.needsUpdate = true;
  group.add(lane);

  const spawnMaterial = new THREE.MeshBasicMaterial({
    color: 0xd45963,
    transparent: true,
    opacity: 0.34,
  });

  for (const spawn of metadata.spawnZones) {
    const y = world.highestSolidY(spawn.x, spawn.z) + 0.15;
    const marker = new THREE.Mesh(
      new THREE.CylinderGeometry(2.3, 2.3, 0.18, 24),
      spawnMaterial,
    );
    marker.position.set(spawn.x + 0.5, y, spawn.z + 0.5);
    group.add(marker);
  }

  scene.add(group);
  return group;
}
