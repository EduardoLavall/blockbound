import * as THREE from "three";
import { BlockId } from "../voxel/blocks";
import type { VoxelWorld } from "../voxel/VoxelWorld";
import type { WorldMetadata } from "../voxel/generation/WorldMetadata";
import { SeededRandom } from "../voxel/generation/SeededRandom";

/** Instanced ground detail and a small, fixed budget of local lights. */
export class WorldDressing {
  private readonly grass: THREE.InstancedMesh;
  private readonly locations: { x: number; y: number; z: number; size: number; yaw: number }[] = [];
  private readonly dummy = new THREE.Object3D();
  private readonly lights: THREE.PointLight[] = [];
  private readonly motes: THREE.Points;
  private time = 0;

  constructor(scene: THREE.Scene, private readonly world: VoxelWorld, metadata: WorldMetadata) {
    const random = new SeededRandom(metadata.seed.value ^ 0x815ded);
    this.grass = new THREE.InstancedMesh(new THREE.ConeGeometry(0.12, 0.42, 3),
      new THREE.MeshStandardMaterial({ color: 0x739755, roughness: 1 }), 420);
    this.grass.name = "ground-detail";
    const tint = new THREE.Color();
    for (let i = 0; i < 420; i++) {
      const x = random.range(metadata.bounds.minX + 2, metadata.bounds.maxXExclusive - 2);
      const z = random.range(metadata.bounds.minZ + 2, metadata.bounds.maxZExclusive - 2);
      const y = world.highestSolidY(Math.floor(x), Math.floor(z));
      const valid = !world.isLaneColumn(Math.floor(x), Math.floor(z)) &&
        world.getBlock(Math.floor(x), y, Math.floor(z)) === BlockId.Grass &&
        Math.hypot(x - metadata.core.x, z - metadata.core.z) > 5;
      const size = valid ? random.range(0.7, 1.6) : 0;
      this.locations.push({ x, y, z, size, yaw: random.range(0, Math.PI) });
      this.setGrass(i);
      tint.setHSL(random.range(0.2, 0.27), 0.3, random.range(0.28, 0.48));
      this.grass.setColorAt(i, tint);
    }
    scene.add(this.grass);
    world.subscribeEdits(({ x, z }) => {
      this.locations.forEach((location, i) => {
        if (Math.floor(location.x) === x && Math.floor(location.z) === z) {
          location.size = 0;
          this.setGrass(i);
          this.grass.instanceMatrix.needsUpdate = true;
        }
      });
    });

    const metal = new THREE.MeshStandardMaterial({ color: 0x334648, metalness: 0.4, roughness: 0.6 });
    const glow = new THREE.MeshStandardMaterial({ color: 0xffd28b, emissive: 0xffad43, emissiveIntensity: 2.5 });
    const postGeometry = new THREE.BoxGeometry(0.16, 1.8, 0.16);
    const lampGeometry = new THREE.BoxGeometry(0.32, 0.35, 0.32);
    let row = 0;
    for (let z = metadata.lane.entry.z + 5; z < metadata.core.z - 4; z += 9) {
      for (const side of [-1, 1]) {
        const x = metadata.lane.entry.x + side * 3 + 0.5;
        const y = world.highestSolidY(Math.floor(x), z) + 1;
        const post = new THREE.Mesh(postGeometry, metal);
        post.position.set(x, y + 0.9, z + 0.5);
        post.castShadow = true;
        const lamp = new THREE.Mesh(lampGeometry, glow);
        lamp.position.set(x, y + 1.9, z + 0.5);
        scene.add(post, lamp);
        if (side === 1 && row < 3) {
          const light = new THREE.PointLight(0xffba69, 0, 10, 2);
          light.position.copy(lamp.position);
          this.lights.push(light);
          scene.add(light);
        }
      }
      row++;
    }
    const positions = new Float32Array(64 * 3);
    for (let i = 0; i < 64; i++) {
      const x = metadata.core.x + random.range(-15, 15);
      const z = metadata.core.z + random.range(-15, 15);
      positions.set([x, world.highestSolidY(Math.floor(x), Math.floor(z)) + random.range(1.5, 4), z], i * 3);
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    this.motes = new THREE.Points(geometry, new THREE.PointsMaterial({ color: 0x83ffcf,
      size: 0.07, transparent: true, opacity: 0, depthWrite: false }));
    scene.add(this.motes);
  }

  update(dt: number, night: number, effects: boolean): void {
    this.time += dt;
    this.lights.forEach(light => { light.intensity = 12 * night; });
    (this.motes.material as THREE.PointsMaterial).opacity = effects ? night * 0.65 : 0;
    this.motes.position.y = Math.sin(this.time * 0.6) * 0.15;
  }
  private setGrass(i: number): void {
    const p = this.locations[i]!;
    this.dummy.position.set(p.x, p.y + 1 + 0.21 * p.size, p.z);
    this.dummy.rotation.y = p.yaw;
    this.dummy.scale.set(p.size, p.size, p.size);
    this.dummy.updateMatrix();
    this.grass.setMatrixAt(i, this.dummy.matrix);
  }
}
