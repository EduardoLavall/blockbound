import type {
  StructureInstance,
  StructureSystem,
} from "../../building/StructureSystem";
import type { NavigationCell } from "./NavigationGrid";

export class BreachPlanner {
  constructor(private readonly structures: StructureSystem) {}

  targetForStep(cell: NavigationCell | null): StructureInstance | null {
    if (!cell || cell.blockerId === null) return null;
    return this.structures.getById(cell.blockerId) ?? null;
  }
}
