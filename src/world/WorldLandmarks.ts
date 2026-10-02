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
