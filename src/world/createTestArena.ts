import * as THREE from "three";
import type { PhysicsWorld } from "../engine/physics/PhysicsWorld";

interface Block {
  position: [number, number, number];
  size: [number, number, number];
  color: number;
}

export function createTestArena(scene: THREE.Scene, physics: PhysicsWorld): void {
  const groundMaterial = new THREE.MeshStandardMaterial({
    color: 0x526d3f,
    roughness: 0.95,
  });
  const ground = new THREE.Mesh(new THREE.BoxGeometry(32, 1, 32), groundMaterial);
  ground.position.set(0, -0.5, 0);
  ground.receiveShadow = true;
  scene.add(ground);
  physics.addStaticBox(0, -0.5, 0, 16, 0.5, 16);

  const blocks: Block[] = [
    { position: [0, 0.5, 0], size: [2, 1, 2], color: 0x8f7852 },
    { position: [0, 1.5, -4], size: [4, 3, 1], color: 0x6e6f67 },
    { position: [-5, 0.5, -2], size: [1, 1, 6], color: 0x795d43 },
    { position: [5, 1, -3], size: [2, 2, 2], color: 0x536f76 },
    { position: [7, 2, -3], size: [2, 4, 2], color: 0x536f76 },
    { position: [-6, 0.25, 6], size: [3, 0.5, 3], color: 0xa8864d },
    { position: [-6, 0.75, 3.5], size: [3, 1.5, 2], color: 0xa8864d },
  ];

  for (const block of blocks) {
    const [sx, sy, sz] = block.size;
    const [x, y, z] = block.position;
    const mesh = new THREE.Mesh(
      new THREE.BoxGeometry(sx, sy, sz),
      new THREE.MeshStandardMaterial({ color: block.color, roughness: 0.85 }),
    );
    mesh.position.set(x, y, z);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    scene.add(mesh);

    physics.addStaticBox(x, y, z, sx / 2, sy / 2, sz / 2);
  }

  const grid = new THREE.GridHelper(32, 32, 0xd0b968, 0x65734d);
  grid.position.y = 0.006;
  const materials = Array.isArray(grid.material) ? grid.material : [grid.material];
  for (const material of materials) {
    material.transparent = true;
    material.opacity = 0.18;
  }
  scene.add(grid);
}
