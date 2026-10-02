import type {
  NavigationCell,
  NavigationGridSource,
} from "./NavigationGrid";

interface HeapNode {
  x: number;
  z: number;
  cost: number;
}

class MinHeap {
  private readonly items: HeapNode[] = [];

  get size(): number {
    return this.items.length;
  }

  push(node: HeapNode): void {
    this.items.push(node);
    this.bubbleUp(this.items.length - 1);
  }

  pop(): HeapNode | null {
    if (this.items.length === 0) return null;
    const root = this.items[0]!;
    const last = this.items.pop()!;
    if (this.items.length > 0) {
      this.items[0] = last;
      this.bubbleDown(0);
    }
    return root;
  }

  private bubbleUp(index: number): void {
    while (index > 0) {
      const parent = Math.floor((index - 1) / 2);
      if (this.items[parent]!.cost <= this.items[index]!.cost) break;
      [this.items[parent], this.items[index]] = [
        this.items[index]!,
        this.items[parent]!,
      ];
      index = parent;
    }
  }

  private bubbleDown(index: number): void {
    while (true) {
      const left = index * 2 + 1;
      const right = left + 1;
      let smallest = index;

      if (
        left < this.items.length &&
        this.items[left]!.cost < this.items[smallest]!.cost
      ) {
        smallest = left;
      }
      if (
        right < this.items.length &&
        this.items[right]!.cost < this.items[smallest]!.cost
      ) {
        smallest = right;
      }
      if (smallest === index) break;

      [this.items[index], this.items[smallest]] = [
        this.items[smallest]!,
        this.items[index]!,
      ];
      index = smallest;
    }
  }
}

export class FlowField {
  private readonly integration: Float32Array;
  private sourceRevision = -1;
  private rebuildMsValue = 0;

  constructor(
    private readonly grid: NavigationGridSource,
    private readonly targetX: number,
    private readonly targetZ: number,
  ) {
    this.integration = new Float32Array(grid.width * grid.depth);
    this.rebuild();
  }

  get rebuildMs(): number {
    return this.rebuildMsValue;
  }

  updateIfNeeded(): boolean {
    if (this.sourceRevision === this.grid.revision) return false;
    this.rebuild();
    return true;
  }

  costAt(x: number, z: number): number {
    const index = this.indexOf(x, z);
    return index < 0 ? Infinity : this.integration[index]!;
  }

  nextCell(x: number, z: number): NavigationCell | null {
    const current = this.grid.getCell(x, z);
    if (!current?.walkable) return null;

    let best: NavigationCell | null = null;
    let bestCost = this.costAt(x, z);

    for (const [dx, dz] of CARDINALS) {
      const cell = this.grid.getCell(x + dx, z + dz);
      if (!cell?.walkable) continue;
      if (!canTraverse(this.grid, current, cell)) continue;

      const cost = this.costAt(cell.x, cell.z);
      if (cost + 0.0001 < bestCost) {
        best = cell;
        bestCost = cost;
      }
    }

    return best;
  }

  rebuild(): void {
    const started = performance.now();
    this.integration.fill(Infinity);

    const heap = new MinHeap();
    const target = this.grid.getCell(this.targetX, this.targetZ);
    if (target?.walkable) {
      const index = this.indexOf(target.x, target.z);
      this.integration[index] = 0;
      heap.push({ x: target.x, z: target.z, cost: 0 });
    } else {
      for (let radius = 1; radius <= 4 && heap.size === 0; radius++) {
        for (let dz = -radius; dz <= radius; dz++) {
          for (let dx = -radius; dx <= radius; dx++) {
            if (
              Math.abs(dx) !== radius &&
              Math.abs(dz) !== radius
            ) {
              continue;
            }

            const cell = this.grid.getCell(
              this.targetX + dx,
              this.targetZ + dz,
            );
            if (!cell?.walkable) continue;
            const index = this.indexOf(cell.x, cell.z);
            this.integration[index] = 0;
            heap.push({ x: cell.x, z: cell.z, cost: 0 });
          }
        }
      }
    }

    while (heap.size > 0) {
      const node = heap.pop()!;
      const nodeIndex = this.indexOf(node.x, node.z);
      if (node.cost > this.integration[nodeIndex]! + 0.0001) continue;

      const current = this.grid.getCell(node.x, node.z);
      if (!current) continue;

      for (const [dx, dz] of CARDINALS) {
        const neighbor = this.grid.getCell(node.x + dx, node.z + dz);
        if (!neighbor?.walkable) continue;
        if (!canTraverse(this.grid, current, neighbor)) continue;

        const slopeCost = Math.abs(current.groundY - neighbor.groundY) * 0.35;
        const nextCost =
          node.cost + neighbor.traversalCost + slopeCost;
        const neighborIndex = this.indexOf(neighbor.x, neighbor.z);

        if (nextCost + 0.0001 < this.integration[neighborIndex]!) {
          this.integration[neighborIndex] = nextCost;
          heap.push({
            x: neighbor.x,
            z: neighbor.z,
            cost: nextCost,
          });
        }
      }
    }

    this.sourceRevision = this.grid.revision;
    this.rebuildMsValue = performance.now() - started;
  }

  private indexOf(x: number, z: number): number {
    const localX = x - this.grid.bounds.minX;
    const localZ = z - this.grid.bounds.minZ;
    if (
      localX < 0 ||
      localX >= this.grid.width ||
      localZ < 0 ||
      localZ >= this.grid.depth
    ) {
      return -1;
    }
    return localX + this.grid.width * localZ;
  }
}

const CARDINALS = [
  [1, 0],
  [-1, 0],
  [0, 1],
  [0, -1],
] as const;

function canTraverse(
  grid: NavigationGridSource,
  from: NavigationCell,
  to: NavigationCell,
): boolean {
  if ("canTraverse" in grid && typeof grid.canTraverse === "function") {
    return grid.canTraverse(from, to);
  }
  return Math.abs(from.groundY - to.groundY) <= 1;
}
