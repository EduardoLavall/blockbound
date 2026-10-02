import * as THREE from "three";
import type { PhysicsWorld } from "../engine/physics/PhysicsWorld";
import type { WorldBounds } from "../voxel/generation/WorldMetadata";

export function createWorldBoundary(
  scene: THREE.Scene,
  physics: PhysicsWorld,
  bounds: WorldBounds,
): THREE.Group {
  const group = new THREE.Group();
  group.name = "finite-world-boundary";

  const width = bounds.maxXExclusive - bounds.minX;
  const depth = bounds.maxZExclusive - bounds.minZ;
  const centerX = (bounds.minX + bounds.maxXExclusive) / 2;
  const centerZ = (bounds.minZ + bounds.maxZExclusive) / 2;
  const height = 24;
  const thickness = 0.45;

  const material = new THREE.MeshBasicMaterial({
    color: 0x70548c,
    transparent: true,
    opacity: 0.16,
    depthWrite: false,
    side: THREE.DoubleSide,
  });

  const walls = [
    { x: bounds.minX - thickness / 2, z: centerZ, sx: thickness, sz: depth + 1 },
    { x: bounds.maxXExclusive + thickness / 2, z: centerZ, sx: thickness, sz: depth + 1 },
    { x: centerX, z: bounds.minZ - thickness / 2, sx: width + 1, sz: thickness },
    { x: centerX, z: bounds.maxZExclusive + thickness / 2, sx: width + 1, sz: thickness },
  ];

  for (const wall of walls) {
    const mesh = new THREE.Mesh(
      new THREE.BoxGeometry(wall.sx, height, wall.sz),
      material,
    );
    mesh.position.set(wall.x, height / 2, wall.z);
    group.add(mesh);

    physics.addStaticBox(
      wall.x,
      height / 2,
      wall.z,
      wall.sx / 2,
      height / 2,
      wall.sz / 2,
    );
  }

  scene.add(group);
  return group;
}
