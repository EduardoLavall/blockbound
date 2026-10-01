import { TILE_SIZE, WORLD_H, WORLD_W } from "./content";
import { RNG } from "./rng";
import type { ResourceNode, Tile, TileKind } from "./types";

export class World {
  readonly width = WORLD_W;
  readonly height = WORLD_H;
  readonly tiles: Tile[] = [];
  readonly resources: ResourceNode[] = [];
  readonly seed: number;
  private rng: RNG;
  private nextResourceId = 1;

  constructor(seed: number) {
    this.seed = seed;
    this.rng = new RNG(seed);
    this.generate();
  }

  get centerGrid() {
    return { x: Math.floor(this.width / 2), y: Math.floor(this.height / 2) };
  }

  tile(gx: number, gy: number): Tile | undefined {
    if (gx < 0 || gy < 0 || gx >= this.width || gy >= this.height) return undefined;
    return this.tiles[gy * this.width + gx];
  }

  worldToGrid(x: number, y: number) {
    return {
      x: Math.max(0, Math.min(this.width - 1, Math.floor(x / TILE_SIZE))),
      y: Math.max(0, Math.min(this.height - 1, Math.floor(y / TILE_SIZE)))
    };
  }

  gridToWorld(gx: number, gy: number) {
    return {
      x: gx * TILE_SIZE + TILE_SIZE / 2,
      y: gy * TILE_SIZE + TILE_SIZE / 2
    };
  }

  private generate() {
    const cx = this.width / 2;
    const cy = this.height / 2;

    for (let y = 0; y < this.height; y++) {
      for (let x = 0; x < this.width; x++) {
        const n = this.rng.next();
        let kind: TileKind = "grass";
        if (n < .12) kind = "dirt";
        else if (n < .30) kind = "moss";
        else if (n > .94) kind = "flowers";
        this.tiles.push({ kind, variant: this.rng.int(0, 3) });
      }
    }

    const count = 190;
    for (let i = 0; i < count; i++) {
      const gx = this.rng.int(2, this.width - 3);
      const gy = this.rng.int(2, this.height - 3);
      const dx = gx - cx;
      const dy = gy - cy;
      if (Math.hypot(dx, dy) < 5.8) continue;

      const roll = this.rng.next();
      const kind = roll < .46 ? "tree" : roll < .80 ? "rock" : roll < .95 ? "ore" : "cache";
      const hp = kind === "tree" ? 3 : kind === "rock" ? 5 : kind === "ore" ? 7 : 4;
      const amount = kind === "tree" ? this.rng.int(5, 9)
        : kind === "rock" ? this.rng.int(4, 8)
        : kind === "ore" ? this.rng.int(2, 5)
        : this.rng.int(8, 14);

      const p = this.gridToWorld(gx, gy);
      p.x += this.rng.int(-7, 7);
      p.y += this.rng.int(-7, 7);

      if (this.resources.some(r => Math.hypot(r.pos.x - p.x, r.pos.y - p.y) < 24)) continue;
      this.resources.push({
        id: this.nextResourceId++,
        kind,
        pos: p,
        hp,
        maxHp: hp,
        amount
      });
    }
  }
}
