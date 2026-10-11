import { BlockId } from "./blocks";

export interface TreeBlock { x: number; y: number; z: number; block: BlockId.Wood | BlockId.Leaves }
export interface NaturalTree { id: number; root: { x: number; y: number; z: number }; blocks: readonly TreeBlock[] }
export const TREE_TRUNK_HARDNESS_MULTIPLIER = 3;

/** Only generated trunks belong to trees; placed building timber never joins one. */
export class TreeRegistry {
  private readonly trunks = new Map<string, NaturalTree>();
  private readonly standing = new Map<number, NaturalTree>();
  private nextId = 1;
  register(root: NaturalTree["root"], blocks: readonly TreeBlock[]): NaturalTree {
    const tree = { id: this.nextId++, root: { ...root }, blocks: blocks.map(block => ({ ...block })) };
    this.standing.set(tree.id, tree);
    for (const block of blocks) if (block.block === BlockId.Wood) this.trunks.set(key(block), tree);
    return tree;
  }
  atTrunk(x: number, y: number, z: number): NaturalTree | undefined { return this.trunks.get(key({ x, y, z })); }
  claim(tree: NaturalTree): boolean {
    if (!this.standing.delete(tree.id)) return false;
    for (const block of tree.blocks) if (block.block === BlockId.Wood) this.trunks.delete(key(block));
    return true;
  }
  get all(): readonly NaturalTree[] { return [...this.standing.values()]; }
}
function key(position: { x: number; y: number; z: number }): string { return `${position.x},${position.y},${position.z}`; }
