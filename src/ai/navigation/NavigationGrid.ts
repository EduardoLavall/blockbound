import type { StructureSystem } from "../../building/StructureSystem";
import { BlockId, isSolidBlock } from "../../voxel/blocks";
import { CHUNK_HEIGHT } from "../../voxel/constants";
import type { WorldBounds } from "../../voxel/generation/WorldMetadata";
import type { VoxelWorld } from "../../voxel/VoxelWorld";
import { LANE_NAVIGATION_COST } from "../../world/LaneSystem";

export interface NavigationCell {
  x: number;
  z: number;
  groundY: number;
  walkable: boolean;
  traversalCost: number;
  lane: boolean;
  blockerId: number | null;
  hazardStructureId: number | null;
}

export interface NavigationGridSource {
  readonly bounds: WorldBounds;
  readonly width: number;
  readonly depth: number;
  readonly revision: number;
  getCell(x: number, z: number): NavigationCell | null;
}

export class NavigationGrid implements NavigationGridSource {
  readonly width: number;
  readonly depth: number;
  private readonly cells: NavigationCell[];
  private readonly dirty = new Set<number>();
  private revisionValue = 0;
  private lastUpdateMs = 0;

  constructor(
    private readonly world: VoxelWorld,
    private readonly structures: StructureSystem,
    readonly bounds: WorldBounds,
  ) {
    this.width = bounds.maxXExclusive - bounds.minX;
    this.depth = bounds.maxZExclusive - bounds.minZ;
    this.cells = Array.from(
      { length: this.width * this.depth },
      (_, index) => {
        const localX = index % this.width;
        const localZ = Math.floor(index / this.width);
        return {
          x: bounds.minX + localX,
          z: bounds.minZ + localZ,
          groundY: -1,
          walkable: false,
          traversalCost: Infinity,
          lane: false,
          blockerId: null,
          hazardStructureId: null,
        };
      },
    );

    this.markRect(
      bounds.minX,
      bounds.minZ,
      bounds.maxXExclusive - 1,
      bounds.maxZExclusive - 1,
    );
    this.updateDirty();

    this.world.subscribeEdits((event) => {
      this.markRect(
        event.x - 1,
        event.z - 1,
        event.x + 1,
        event.z + 1,
      );
    });

    this.structures.subscribeNavigationChanges((changed) => {
      this.markRect(
        Math.floor(changed.minX) - 1,
        Math.floor(changed.minZ) - 1,
        Math.ceil(changed.maxX) + 1,
        Math.ceil(changed.maxZ) + 1,
      );
    });
  }

  get revision(): number {
    return this.revisionValue;
  }

  get pendingCells(): number {
    return this.dirty.size;
  }

  get lastRebuildMs(): number {
    return this.lastUpdateMs;
  }

  getCell(x: number, z: number): NavigationCell | null {
    const index = this.indexOf(x, z);
    return index < 0 ? null : this.cells[index]!;
  }

  updateDirty(): boolean {
    if (this.dirty.size === 0) return false;

    const started = performance.now();
    for (const index of this.dirty) {
      const cell = this.cells[index]!;
      this.rebuildCell(cell);
    }
    this.dirty.clear();
    this.revisionValue++;
    this.lastUpdateMs = performance.now() - started;
    return true;
  }

  markRect(
    minX: number,
    minZ: number,
    maxX: number,
    maxZ: number,
  ): void {
    const clampedMinX = Math.max(this.bounds.minX, Math.floor(minX));
    const clampedMaxX = Math.min(
      this.bounds.maxXExclusive - 1,
      Math.floor(maxX),
    );
    const clampedMinZ = Math.max(this.bounds.minZ, Math.floor(minZ));
    const clampedMaxZ = Math.min(
      this.bounds.maxZExclusive - 1,
      Math.floor(maxZ),
    );

    for (let z = clampedMinZ; z <= clampedMaxZ; z++) {
      for (let x = clampedMinX; x <= clampedMaxX; x++) {
        const index = this.indexOf(x, z);
        if (index >= 0) this.dirty.add(index);
      }
    }
  }

  canTraverse(
    from: NavigationCell,
    to: NavigationCell,
  ): boolean {
    if (!from.walkable || !to.walkable) return false;
    return Math.abs(from.groundY - to.groundY) <= 1;
  }

  findNearestWalkable(
    x: number,
    z: number,
    radius = 6,
  ): NavigationCell | null {
    const originX = Math.floor(x);
    const originZ = Math.floor(z);
    let best: NavigationCell | null = null;
    let bestDistance = Infinity;

    for (let dz = -radius; dz <= radius; dz++) {
      for (let dx = -radius; dx <= radius; dx++) {
        const cell = this.getCell(originX + dx, originZ + dz);
        if (!cell?.walkable) continue;
        if (cell.blockerId !== null) continue;

        const distance = dx * dx + dz * dz;
        if (distance < bestDistance) {
          best = cell;
          bestDistance = distance;
        }
      }
    }

    return best;
  }

  private rebuildCell(cell: NavigationCell): void {
    const groundY = this.findStandableSurface(cell.x, cell.z);
    if (groundY < 0) {
      cell.groundY = -1;
      cell.walkable = false;
      cell.traversalCost = Infinity;
      cell.lane = false;
      cell.blockerId = null;
      cell.hazardStructureId = null;
      return;
    }

    const structure = this.structures.navigationAtCell(cell.x, cell.z);

    const lane = this.world.isLaneColumn(cell.x, cell.z);

    cell.groundY = groundY;
    cell.walkable = true;
    cell.lane = lane;
    cell.traversalCost =
      structure?.traversalCost ??
      (lane ? LANE_NAVIGATION_COST : 1);
    cell.blockerId =
      structure && !structure.hazard ? structure.structureId : null;
    cell.hazardStructureId =
      structure?.hazard ? structure.structureId : null;
  }

  private findStandableSurface(x: number, z: number): number {
    for (let y = CHUNK_HEIGHT - 3; y >= 0; y--) {
      const block = this.world.getBlock(x, y, z);
      if (!isSolidBlock(block)) continue;

      if (
        block === BlockId.Leaves ||
        block === BlockId.Wood ||
        block === BlockId.Crystal
      ) {
        return -1;
      }

      if (
        !isSolidBlock(this.world.getBlock(x, y + 1, z)) &&
        !isSolidBlock(this.world.getBlock(x, y + 2, z))
      ) {
        return y;
      }
    }

    return -1;
  }

  private indexOf(x: number, z: number): number {
    if (
      x < this.bounds.minX ||
      x >= this.bounds.maxXExclusive ||
      z < this.bounds.minZ ||
      z >= this.bounds.maxZExclusive
    ) {
      return -1;
    }

    return (
      (x - this.bounds.minX) +
      this.width * (z - this.bounds.minZ)
    );
  }
}
