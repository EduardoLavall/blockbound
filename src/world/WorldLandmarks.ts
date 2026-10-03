import * as THREE from "three";
import type { WorldMetadata } from "../voxel/generation/WorldMetadata";
import type { VoxelWorld } from "../voxel/VoxelWorld";

const LANE_TEXTURE_URL = "/textures/lane-indestructible.png";
const LANE_TEXTURE_REPEAT_METERS = 4;

export function createWorldLandmarks(
  scene: THREE.Scene,
  world: VoxelWorld,
  metadata: WorldMetadata,
): THREE.Group {
  const group = new THREE.Group();
  group.name = "world-landmarks";

  createLaneSurface(group, world, metadata);

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

function createLaneSurface(
  group: THREE.Group,
  world: VoxelWorld,
  metadata: WorldMetadata,
): void {
  if (metadata.lane.cells.length === 0) return;

  const rows = [
    ...new Set(metadata.lane.cells.map((cell) => cell.z)),
  ].sort((a, b) => a - b);

  const minZ = rows[0]!;
  const maxZ = rows[rows.length - 1]!;
  const laneLength = maxZ - minZ + 1;
  const laneWidth = Math.max(0.9, metadata.lane.width - 0.08);

  const texture = new THREE.TextureLoader().load(LANE_TEXTURE_URL);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = THREE.ClampToEdgeWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(
    1,
    Math.max(1, laneLength / LANE_TEXTURE_REPEAT_METERS),
  );

  const material = new THREE.MeshBasicMaterial({
    map: texture,
    toneMapped: false,
    polygonOffset: true,
    polygonOffsetFactor: -1,
    polygonOffsetUnits: -1,
  });

  const geometry = new THREE.PlaneGeometry(
    laneWidth,
    laneLength - 0.06,
  );
  geometry.rotateX(-Math.PI / 2);

  const lane = new THREE.Mesh(geometry, material);
  lane.name = "primary-lane-texture";
  lane.position.set(
    metadata.lane.entry.x + 0.5,
    world.highestSolidY(metadata.lane.entry.x, minZ) + 0.035,
    minZ + laneLength / 2,
  );
  lane.renderOrder = 1;

  group.add(lane);
}
