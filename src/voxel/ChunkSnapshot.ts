import type { Chunk } from "./Chunk";
import {
  CHUNK_HEIGHT,
  CHUNK_SIZE,
  PADDED_CHUNK_HEIGHT,
  PADDED_CHUNK_SIZE,
} from "./constants";
import type { VoxelWorld } from "./VoxelWorld";

export function paddedIndex(x: number, y: number, z: number): number {
  return x + PADDED_CHUNK_SIZE * (y + PADDED_CHUNK_HEIGHT * z);
}

export function buildPaddedChunkSnapshot(world: VoxelWorld, chunk: Chunk): Uint16Array {
  const padded = new Uint16Array(
    PADDED_CHUNK_SIZE * PADDED_CHUNK_HEIGHT * PADDED_CHUNK_SIZE,
  );

  const originX = chunk.cx * CHUNK_SIZE;
  const originZ = chunk.cz * CHUNK_SIZE;

  for (let z = -1; z <= CHUNK_SIZE; z++) {
    for (let y = -1; y <= CHUNK_HEIGHT; y++) {
      for (let x = -1; x <= CHUNK_SIZE; x++) {
        padded[paddedIndex(x + 1, y + 1, z + 1)] =
          world.getBlock(originX + x, y, originZ + z);
      }
    }
  }

  return padded;
}
