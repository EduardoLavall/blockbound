import { describe, expect, it } from "vitest";
import { FlowField } from "./FlowField";
import type {
  NavigationCell,
  NavigationGridSource,
} from "./NavigationGrid";

class TestGrid implements NavigationGridSource {
  readonly bounds = {
    minX: 0,
    maxXExclusive: 5,
    minZ: 0,
    maxZExclusive: 3,
  };
  readonly width = 5;
  readonly depth = 3;
  revision = 1;

  private readonly cells = new Map<string, NavigationCell>();

  constructor() {
    for (let z = 0; z < 3; z++) {
      for (let x = 0; x < 5; x++) {
        this.cells.set(`${x},${z}`, {
          x,
          z,
          groundY: 0,
          walkable: true,
          traversalCost: 1,
          lane: false,
          blockerId: null,
          hazardStructureId: null,
        });
      }
    }
  }

  getCell(x: number, z: number): NavigationCell | null {
    return this.cells.get(`${x},${z}`) ?? null;
  }

  setBarrierCost(cost: number): void {
    const cell = this.getCell(2, 1)!;
    cell.traversalCost = cost;
    cell.blockerId = 99;
    this.revision++;
  }
}

describe("FlowField breach economics", () => {
  it("routes around an expensive wall", () => {
    const grid = new TestGrid();
    grid.setBarrierCost(30);
    const flow = new FlowField(grid, 4, 1);

    const next = flow.nextCell(1, 1);

    expect(next).not.toBeNull();
    expect(next?.x === 2 && next?.z === 1).toBe(false);
  });

  it("routes through a cheap blocker when breaching costs less than detouring", () => {
    const grid = new TestGrid();
    grid.setBarrierCost(1.1);
    const flow = new FlowField(grid, 4, 1);

    const next = flow.nextCell(1, 1);

    expect(next?.x).toBe(2);
    expect(next?.z).toBe(1);
    expect(next?.blockerId).toBe(99);
  });
});
