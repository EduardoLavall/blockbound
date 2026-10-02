import { BlockId } from "./blocks";
import { CHUNK_HEIGHT, CHUNK_SIZE } from "./constants";

export class Chunk {
  readonly blocks = new Uint16Array(CHUNK_SIZE * CHUNK_HEIGHT * CHUNK_SIZE);

  constructor(readonly cx: number, readonly cz: number) {}

  static key(cx: number, cz: number): string {
    return `${cx},${cz}`;
  }

  get key(): string {
    return Chunk.key(this.cx, this.cz);
  }

  get(localX: number, y: number, localZ: number): BlockId {
    if (!Chunk.inBounds(localX, y, localZ)) return BlockId.Air;
    return this.blocks[Chunk.index(localX, y, localZ)] as BlockId;
  }

  set(localX: number, y: number, localZ: number, block: BlockId): boolean {
    if (!Chunk.inBounds(localX, y, localZ)) return false;
    const index = Chunk.index(localX, y, localZ);
    if (this.blocks[index] === block) return false;
    this.blocks[index] = block;
    return true;
  }

  static index(localX: number, y: number, localZ: number): number {
    return localX + CHUNK_SIZE * (y + CHUNK_HEIGHT * localZ);
  }

  static inBounds(localX: number, y: number, localZ: number): boolean {
    return (
      localX >= 0 && localX < CHUNK_SIZE &&
      localZ >= 0 && localZ < CHUNK_SIZE &&
      y >= 0 && y < CHUNK_HEIGHT
    );
  }
}
