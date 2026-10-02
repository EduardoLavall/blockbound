import { BlockId } from "./blocks";
import type { VoxelWorld } from "./VoxelWorld";

export interface Vec3Like {
  x: number;
  y: number;
  z: number;
}

export interface VoxelRaycastHit {
  voxel: { x: number; y: number; z: number };
  faceNormal: { x: number; y: number; z: number };
  adjacent: { x: number; y: number; z: number };
  block: BlockId;
  distance: number;
}

export function raycastVoxels(
  world: VoxelWorld,
  origin: Vec3Like,
  direction: Vec3Like,
  maxDistance: number,
): VoxelRaycastHit | null {
  const length = Math.hypot(direction.x, direction.y, direction.z);
  if (length < 1e-8) return null;

  const dx = direction.x / length;
  const dy = direction.y / length;
  const dz = direction.z / length;

  let x = Math.floor(origin.x);
  let y = Math.floor(origin.y);
  let z = Math.floor(origin.z);

  const stepX = Math.sign(dx);
  const stepY = Math.sign(dy);
  const stepZ = Math.sign(dz);

  const tDeltaX = stepX === 0 ? Infinity : Math.abs(1 / dx);
  const tDeltaY = stepY === 0 ? Infinity : Math.abs(1 / dy);
  const tDeltaZ = stepZ === 0 ? Infinity : Math.abs(1 / dz);

  const nextBoundaryX = stepX > 0 ? x + 1 : x;
  const nextBoundaryY = stepY > 0 ? y + 1 : y;
  const nextBoundaryZ = stepZ > 0 ? z + 1 : z;

  let tMaxX = stepX === 0 ? Infinity : (nextBoundaryX - origin.x) / dx;
  let tMaxY = stepY === 0 ? Infinity : (nextBoundaryY - origin.y) / dy;
  let tMaxZ = stepZ === 0 ? Infinity : (nextBoundaryZ - origin.z) / dz;

  let distance = 0;
  let normal = { x: 0, y: 0, z: 0 };

  while (distance <= maxDistance) {
    const block = world.getBlock(x, y, z);
    if (block !== BlockId.Air) {
      return {
        voxel: { x, y, z },
        faceNormal: normal,
        adjacent: {
          x: x + normal.x,
          y: y + normal.y,
          z: z + normal.z,
        },
        block,
        distance,
      };
    }

    if (tMaxX <= tMaxY && tMaxX <= tMaxZ) {
      x += stepX;
      distance = tMaxX;
      tMaxX += tDeltaX;
      normal = { x: -stepX, y: 0, z: 0 };
    } else if (tMaxY <= tMaxZ) {
      y += stepY;
      distance = tMaxY;
      tMaxY += tDeltaY;
      normal = { x: 0, y: -stepY, z: 0 };
    } else {
      z += stepZ;
      distance = tMaxZ;
      tMaxZ += tDeltaZ;
      normal = { x: 0, y: 0, z: -stepZ };
    }
  }

  return null;
}
