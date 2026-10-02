import { BlockId } from "./blocks";
import { Chunk } from "./Chunk";
import { CHUNK_HEIGHT, CHUNK_SIZE } from "./constants";

export interface VoxelEditResult {
  changed: boolean;
  dirtyChunkKeys: string[];
}

export class VoxelWorld {
  private readonly chunks = new Map<string, Chunk>();

  static createTestWorld(radius = 1): VoxelWorld {
    const world = new VoxelWorld();

    for (let cz = -radius; cz <= radius; cz++) {
      for (let cx = -radius; cx <= radius; cx++) {
        world.ensureChunk(cx, cz);
      }
    }

    const min = -radius * CHUNK_SIZE;
    const max = (radius + 1) * CHUNK_SIZE - 1;

    for (let z = min; z <= max; z++) {
      for (let x = min; x <= max; x++) {
        const wave =
          Math.sin(x * 0.17) * 1.25 +
          Math.cos(z * 0.15) * 1.1 +
          Math.sin((x + z) * 0.075) * 0.7;
        const height = Math.max(3, Math.min(8, 5 + Math.round(wave)));

        world.setBlockRaw(x, 0, z, BlockId.Bedrock);
        for (let y = 1; y <= height; y++) {
          const block =
            y === height
              ? BlockId.Grass
              : y >= height - 2
                ? BlockId.Dirt
                : BlockId.Stone;
          world.setBlockRaw(x, y, z, block);
        }
      }
    }

    // A few deliberately artificial landmarks make collision, mining and
    // placement easier to validate before seeded world generation exists.
    for (let y = 6; y <= 10; y++) {
      world.setBlockRaw(-5, y, -4, BlockId.Wood);
    }
    world.setBlockRaw(6, 7, -5, BlockId.Crystal);
    world.setBlockRaw(6, 8, -5, BlockId.Crystal);
    world.setBlockRaw(7, 7, -5, BlockId.Crystal);

    return world;
  }

  ensureChunk(cx: number, cz: number): Chunk {
    const key = Chunk.key(cx, cz);
    let chunk = this.chunks.get(key);
    if (!chunk) {
      chunk = new Chunk(cx, cz);
      this.chunks.set(key, chunk);
    }
    return chunk;
  }

  getChunk(cx: number, cz: number): Chunk | undefined {
    return this.chunks.get(Chunk.key(cx, cz));
  }

  getChunkByKey(key: string): Chunk | undefined {
    return this.chunks.get(key);
  }

  getChunks(): readonly Chunk[] {
    return [...this.chunks.values()];
  }

  getBlock(x: number, y: number, z: number): BlockId {
    if (y < 0 || y >= CHUNK_HEIGHT) return BlockId.Air;
    const cx = Math.floor(x / CHUNK_SIZE);
    const cz = Math.floor(z / CHUNK_SIZE);
    const chunk = this.getChunk(cx, cz);
    if (!chunk) return BlockId.Air;

    const localX = x - cx * CHUNK_SIZE;
    const localZ = z - cz * CHUNK_SIZE;
    return chunk.get(localX, y, localZ);
  }

  setBlock(x: number, y: number, z: number, block: BlockId): VoxelEditResult {
    if (y < 0 || y >= CHUNK_HEIGHT) {
      return { changed: false, dirtyChunkKeys: [] };
    }

    const cx = Math.floor(x / CHUNK_SIZE);
    const cz = Math.floor(z / CHUNK_SIZE);
    const chunk = this.getChunk(cx, cz);
    if (!chunk) return { changed: false, dirtyChunkKeys: [] };

    const localX = x - cx * CHUNK_SIZE;
    const localZ = z - cz * CHUNK_SIZE;
    const changed = chunk.set(localX, y, localZ, block);
    if (!changed) return { changed: false, dirtyChunkKeys: [] };

    const dirty = new Set<string>([chunk.key]);
    if (localX === 0) this.addIfLoaded(dirty, cx - 1, cz);
    if (localX === CHUNK_SIZE - 1) this.addIfLoaded(dirty, cx + 1, cz);
    if (localZ === 0) this.addIfLoaded(dirty, cx, cz - 1);
    if (localZ === CHUNK_SIZE - 1) this.addIfLoaded(dirty, cx, cz + 1);

    return { changed: true, dirtyChunkKeys: [...dirty] };
  }

  highestSolidY(x: number, z: number): number {
    for (let y = CHUNK_HEIGHT - 1; y >= 0; y--) {
      if (this.getBlock(x, y, z) !== BlockId.Air) return y;
    }
    return -1;
  }

  private setBlockRaw(x: number, y: number, z: number, block: BlockId): void {
    const cx = Math.floor(x / CHUNK_SIZE);
    const cz = Math.floor(z / CHUNK_SIZE);
    const chunk = this.getChunk(cx, cz);
    if (!chunk || y < 0 || y >= CHUNK_HEIGHT) return;
    chunk.set(x - cx * CHUNK_SIZE, y, z - cz * CHUNK_SIZE, block);
  }

  private addIfLoaded(target: Set<string>, cx: number, cz: number): void {
    const key = Chunk.key(cx, cz);
    if (this.chunks.has(key)) target.add(key);
  }
}
