import { BlockId } from "./blocks";
import { Chunk } from "./Chunk";
import { CHUNK_HEIGHT, CHUNK_SIZE } from "./constants";

export interface VoxelEditResult {
  changed: boolean;
  dirtyChunkKeys: string[];
}

export interface VoxelEditEvent {
  x: number;
  y: number;
  z: number;
  before: BlockId;
  after: BlockId;
}

export type ProtectedColumnTag = "lane";

export class VoxelWorld {
  private readonly chunks = new Map<string, Chunk>();
  private readonly protectedColumns = new Map<string, ProtectedColumnTag>();
  private readonly editListeners = new Set<(event: VoxelEditEvent) => void>();

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
    if (this.isProtectedColumn(x, z)) {
      return { changed: false, dirtyChunkKeys: [] };
    }

    if (y < 0 || y >= CHUNK_HEIGHT) {
      return { changed: false, dirtyChunkKeys: [] };
    }

    const cx = Math.floor(x / CHUNK_SIZE);
    const cz = Math.floor(z / CHUNK_SIZE);
    const chunk = this.getChunk(cx, cz);
    if (!chunk) return { changed: false, dirtyChunkKeys: [] };

    const localX = x - cx * CHUNK_SIZE;
    const localZ = z - cz * CHUNK_SIZE;
    const before = chunk.get(localX, y, localZ);
    const changed = chunk.set(localX, y, localZ, block);
    if (!changed) return { changed: false, dirtyChunkKeys: [] };

    const dirty = new Set<string>([chunk.key]);
    if (localX === 0) this.addIfLoaded(dirty, cx - 1, cz);
    if (localX === CHUNK_SIZE - 1) this.addIfLoaded(dirty, cx + 1, cz);
    if (localZ === 0) this.addIfLoaded(dirty, cx, cz - 1);
    if (localZ === CHUNK_SIZE - 1) this.addIfLoaded(dirty, cx, cz + 1);

    const event: VoxelEditEvent = { x, y, z, before, after: block };
    for (const listener of this.editListeners) listener(event);

    return { changed: true, dirtyChunkKeys: [...dirty] };
  }

  protectColumn(
    x: number,
    z: number,
    tag: ProtectedColumnTag,
  ): void {
    this.protectedColumns.set(columnKey(x, z), tag);
  }

  protectionAtColumn(
    x: number,
    z: number,
  ): ProtectedColumnTag | null {
    return this.protectedColumns.get(columnKey(x, z)) ?? null;
  }

  isProtectedColumn(x: number, z: number): boolean {
    return this.protectedColumns.has(columnKey(x, z));
  }

  isLaneColumn(x: number, z: number): boolean {
    return this.protectionAtColumn(x, z) === "lane";
  }

  subscribeEdits(listener: (event: VoxelEditEvent) => void): () => void {
    this.editListeners.add(listener);
    return () => this.editListeners.delete(listener);
  }

  setGeneratedBlock(x: number, y: number, z: number, block: BlockId): boolean {
    if (y < 0 || y >= CHUNK_HEIGHT) return false;

    const cx = Math.floor(x / CHUNK_SIZE);
    const cz = Math.floor(z / CHUNK_SIZE);
    const chunk = this.getChunk(cx, cz);
    if (!chunk) return false;

    return chunk.set(x - cx * CHUNK_SIZE, y, z - cz * CHUNK_SIZE, block);
  }

  highestSolidY(x: number, z: number): number {
    for (let y = CHUNK_HEIGHT - 1; y >= 0; y--) {
      if (this.getBlock(x, y, z) !== BlockId.Air) return y;
    }
    return -1;
  }

  private addIfLoaded(target: Set<string>, cx: number, cz: number): void {
    const key = Chunk.key(cx, cz);
    if (this.chunks.has(key)) target.add(key);
  }
}


function columnKey(x: number, z: number): string {
  return `${x},${z}`;
}
