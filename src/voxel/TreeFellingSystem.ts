import * as THREE from "three";
import { materialTexture } from "../engine/render/MaterialTextures";
import type { ResourceDropSystem } from "../survival/ResourceDropSystem";
import { ResourceId } from "../survival/Resources";
import { BlockId } from "./blocks";
import { CHUNK_HEIGHT, CHUNK_SIZE } from "./constants";
import type { ChunkManager } from "./render/ChunkManager";
import type { NaturalTree, TreeBlock } from "./Trees";
import type { VoxelEditEvent, VoxelWorld } from "./VoxelWorld";

interface FallingTree {
  group: THREE.Group;
  blocks: readonly TreeBlock[];
  pivot: THREE.Vector3;
  axis: THREE.Vector3;
  impactAngle: number;
  settleAngle: number;
  elapsed: number;
  impacted: boolean;
  yieldPerBlock: number;
}
interface Leaf {
  position: THREE.Vector3;
  velocity: THREE.Vector3;
  rotation: THREE.Euler;
  age: number;
  life: number;
  size: number;
  phase: number;
  floor: number;
}
const FALL_SECONDS = 1.45;
const REST_SECONDS = 0.65;
const MAX_LEAVES = 160;

/** Natural trees leave the voxel world once, then animate as one textured object. */
export class TreeFellingSystem {
  private readonly falling: FallingTree[] = [];
  private readonly cube = new THREE.BoxGeometry(1, 1, 1);
  private readonly wood = new THREE.MeshStandardMaterial({ map: materialTexture("wood"), roughness: 0.95 });
  private readonly foliage = new THREE.MeshStandardMaterial({ map: materialTexture("leaves"), roughness: 1 });
  private readonly leaves: Leaf[] = [];
  private readonly leafMesh: THREE.InstancedMesh;
  private readonly dummy = new THREE.Object3D();
  private readonly unsubscribe: () => void;
  effects = true;

  constructor(
    private readonly scene: THREE.Scene,
    private readonly world: VoxelWorld,
    private readonly chunks: Pick<ChunkManager, "requestRebuild">,
    private readonly drops: Pick<ResourceDropSystem, "spawn">,
    private readonly playerPosition: () => { x: number; y: number; z: number },
    private readonly resourceYieldBonus: () => number,
    private readonly onFall: (position: THREE.Vector3) => void = () => {},
    private readonly onImpact: (position: THREE.Vector3) => void = () => {},
  ) {
    const shape = new THREE.Shape();
    shape.moveTo(0, 0.65); shape.lineTo(0.32, 0); shape.lineTo(0, -0.65); shape.lineTo(-0.32, 0); shape.closePath();
    const material = new THREE.MeshStandardMaterial({ map: materialTexture("leaves"), color: 0x88bd4f,
      roughness: 1, side: THREE.DoubleSide });
    const geometry = new THREE.ShapeGeometry(shape);
    const positions = geometry.getAttribute("position");
    const uv = geometry.getAttribute("uv");
    for (let i = 0; i < uv.count; i++) uv.setXY(i, (positions.getX(i) + 0.32) / 0.64, (positions.getY(i) + 0.65) / 1.3);
    this.leafMesh = new THREE.InstancedMesh(geometry, material, MAX_LEAVES);
    this.leafMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.leafMesh.count = 0;
    this.leafMesh.frustumCulled = false;
    scene.add(this.leafMesh);
    this.unsubscribe = world.subscribeEdits(event => this.onEdit(event));
  }

  get fallingCount(): number { return this.falling.length; }
  get leafCount(): number { return this.leaves.length; }

  fixedUpdate(dt: number): void {
    if (dt <= 0) return;
    for (let i = this.falling.length - 1; i >= 0; i--) {
      const tree = this.falling[i]!;
      tree.elapsed += dt;
      const progress = Math.min(1, tree.elapsed / FALL_SECONDS);
      tree.group.quaternion.setFromAxisAngle(tree.axis, tree.impactAngle * progress ** 2.3);
      if (progress >= 1 && !tree.impacted) {
        tree.impacted = true;
        this.impact(tree);
      }
      if (tree.impacted) {
        const rest = tree.elapsed - FALL_SECONDS;
        // The crown breaks into leaves at contact; the trunk settles onto the soil.
        const settle = 1 - (1 - Math.min(1, rest / 0.22)) ** 2;
        const bounce = Math.sin(Math.min(rest, 0.25) * Math.PI / 0.25) * 0.035 * Math.exp(-rest * 8);
        tree.group.quaternion.setFromAxisAngle(tree.axis, THREE.MathUtils.lerp(tree.impactAngle, tree.settleAngle, settle) - bounce);
        tree.group.position.y = tree.pivot.y + settle * 0.5;
        tree.group.scale.setScalar(Math.max(0, 1 - Math.max(0, rest - 0.4) / 0.25));
        if (rest >= REST_SECONDS) {
          this.scene.remove(tree.group);
          tree.group.children.forEach(child => (child as THREE.InstancedMesh).dispose());
          this.falling.splice(i, 1);
        }
      }
    }
    this.updateLeaves(dt);
  }

  dispose(): void {
    this.unsubscribe();
    for (const tree of this.falling) {
      this.scene.remove(tree.group);
      tree.group.children.forEach(child => (child as THREE.InstancedMesh).dispose());
    }
    this.falling.length = 0; this.leaves.length = 0;
    this.scene.remove(this.leafMesh);
    this.leafMesh.dispose(); this.leafMesh.geometry.dispose();
    (this.leafMesh.material as THREE.Material).dispose();
    this.cube.dispose(); this.wood.dispose(); this.foliage.dispose();
  }

  private onEdit(event: VoxelEditEvent): void {
    if (event.before !== BlockId.Wood || event.after === BlockId.Wood) return;
    const tree = this.world.trees.atTrunk(event.x, event.y, event.z);
    if (!tree || !this.world.trees.claim(tree)) return;
    const blocks: TreeBlock[] = [];
    const dirty = new Set<string>([`${Math.floor(event.x / CHUNK_SIZE)},${Math.floor(event.z / CHUNK_SIZE)}`]);
    for (const block of tree.blocks) {
      const cut = block.x === event.x && block.y === event.y && block.z === event.z;
      if (cut) { blocks.push(block); continue; }
      // Preserve additions/replacements and skip leaves already harvested individually.
      if (this.world.getBlock(block.x, block.y, block.z) !== block.block) continue;
      const edit = this.world.setBlock(block.x, block.y, block.z, BlockId.Air);
      if (!edit.changed) continue;
      blocks.push(block);
      edit.dirtyChunkKeys.forEach(key => dirty.add(key));
    }
    this.chunks.requestRebuild([...dirty]);
    this.beginFall(tree, blocks);
  }

  private beginFall(tree: NaturalTree, blocks: readonly TreeBlock[]): void {
    const pivot = new THREE.Vector3(tree.root.x + 0.5, tree.root.y, tree.root.z + 0.5);
    const direction = pivot.clone().sub(this.playerPosition()); direction.y = 0;
    if (direction.lengthSq() < 0.01) direction.set(Math.cos(tree.id * 2.4), 0, Math.sin(tree.id * 2.4));
    direction.normalize();
    const axis = new THREE.Vector3(direction.z, 0, -direction.x);
    const group = new THREE.Group(); group.name = "falling-tree"; group.position.copy(pivot);
    for (const [id, material] of [[BlockId.Wood, this.wood], [BlockId.Leaves, this.foliage]] as const) {
      const selected = blocks.filter(block => block.block === id);
      if (!selected.length) continue;
      const mesh = new THREE.InstancedMesh(this.cube, material, selected.length);
      mesh.name = id === BlockId.Wood ? "fallen-trunk" : "falling-crown";
      mesh.castShadow = true; mesh.receiveShadow = true;
      selected.forEach((block, i) => {
        this.dummy.position.copy(this.localPosition(block, pivot));
        this.dummy.rotation.set(0, 0, 0); this.dummy.scale.setScalar(1); this.dummy.updateMatrix();
        mesh.setMatrixAt(i, this.dummy.matrix);
      });
      mesh.instanceMatrix.needsUpdate = true;
      mesh.computeBoundingSphere(); group.add(mesh);
    }
    const impactAngle = this.contactAngle(blocks, pivot, axis);
    const settleAngle = Math.max(impactAngle, this.contactAngle(blocks.filter(block => block.block === BlockId.Wood), pivot, axis, 0.5));
    this.falling.push({ group, blocks, pivot, axis, impactAngle, settleAngle, elapsed: 0, impacted: false,
      yieldPerBlock: 1 + Math.max(0, this.resourceYieldBonus()) });
    this.scene.add(group); this.onFall(pivot.clone());
  }

  private contactAngle(blocks: readonly TreeBlock[], pivot: THREE.Vector3, axis: THREE.Vector3, lift = 0): number {
    const floors = new Map<string, number>();
    // Ignore the stump touching the soil; the upper trunk/canopy determines impact.
    const upper = blocks.filter(block => block.y >= pivot.y + 2);
    const quaternion = new THREE.Quaternion();
    for (let angle = 0.08; angle < Math.PI / 2; angle += 0.025) {
      quaternion.setFromAxisAngle(axis, angle);
      const halfHeight = 0.5 * (Math.abs(axis.z * Math.sin(angle)) + Math.cos(angle) + Math.abs(axis.x * Math.sin(angle)));
      for (const block of upper) {
        const p = this.localPosition(block, pivot).applyQuaternion(quaternion).add(pivot);
        p.y += lift;
        const key = `${Math.floor(p.x)},${Math.floor(p.z)}`;
        let floor = floors.get(key);
        if (floor === undefined) { floor = this.floorY(p.x, p.z); floors.set(key, floor); }
        if (p.y - halfHeight <= floor + 0.03) return Math.max(0.08, angle - 0.025);
      }
    }
    return Math.PI / 2;
  }

  private impact(tree: FallingTree): void {
    const woods = tree.blocks.filter(block => block.block === BlockId.Wood);
    const crown = tree.blocks.filter(block => block.block === BlockId.Leaves);
    const crownMesh = tree.group.getObjectByName("falling-crown");
    if (crownMesh) crownMesh.visible = false;
    const tip = this.localPosition(woods[woods.length - 1]!, tree.pivot).applyQuaternion(tree.group.quaternion).add(tree.pivot);
    tip.y = this.floorY(tip.x, tip.z);
    this.onImpact(tip);
    const settled = new THREE.Quaternion().setFromAxisAngle(tree.axis, tree.settleAngle);
    for (const block of woods) {
      const p = this.localPosition(block, tree.pivot).applyQuaternion(settled).add(tree.pivot);
      // Trees near the finite map edge must not throw their rewards into the void.
      if (this.floorY(p.x, p.z) <= 0) p.copy(tree.pivot);
      this.drops.spawn({ resource: ResourceId.Wood, amount: tree.yieldPerBlock }, p.x - 0.5, this.floorY(p.x, p.z), p.z - 0.5);
    }
    if (!this.effects || !crown.length) return;
    for (let i = 0; i < Math.min(90, crown.length * 2); i++) {
      if (this.leaves.length >= MAX_LEAVES) break;
      const block = crown[i % crown.length]!;
      const position = this.localPosition(block, tree.pivot).applyQuaternion(tree.group.quaternion).add(tree.pivot);
      position.add(new THREE.Vector3(Math.random() - 0.5, Math.random() * 0.7, Math.random() - 0.5));
      const floor = this.floorY(position.x, position.z) + 0.04;
      position.y = Math.max(position.y, floor + 0.2);
      this.leaves.push({ position, floor, velocity: new THREE.Vector3((Math.random() - 0.5) * 4.5, 2 + Math.random() * 3, (Math.random() - 0.5) * 4.5),
        rotation: new THREE.Euler(Math.random() * Math.PI, Math.random() * Math.PI, Math.random() * Math.PI),
        age: 0, life: 2.5 + Math.random() * 1.6, size: 0.28 + Math.random() * 0.3, phase: Math.random() * 6.28 });
    }
  }

  private updateLeaves(dt: number): void {
    if (!this.effects) this.leaves.length = 0;
    for (let i = this.leaves.length - 1; i >= 0; i--) {
      const leaf = this.leaves[i]!; leaf.age += dt;
      if (leaf.age >= leaf.life) { this.leaves.splice(i, 1); continue; }
      leaf.velocity.y = Math.max(-2.5, leaf.velocity.y - 3.5 * dt);
      leaf.velocity.x *= Math.exp(-dt * 0.7); leaf.velocity.z *= Math.exp(-dt * 0.7);
      leaf.position.addScaledVector(leaf.velocity, dt);
      leaf.floor = this.floorY(leaf.position.x, leaf.position.z) + 0.04;
      if (leaf.position.y <= leaf.floor) {
        leaf.position.y = leaf.floor; leaf.velocity.set(0, 0, 0); leaf.rotation.x = -Math.PI / 2;
      } else {
        leaf.position.x += Math.sin(leaf.age * 9 + leaf.phase) * dt * 0.45;
        leaf.rotation.x += dt * 3; leaf.rotation.z += dt * 2;
      }
    }
    this.leaves.forEach((leaf, i) => {
      this.dummy.position.copy(leaf.position); this.dummy.rotation.copy(leaf.rotation);
      this.dummy.scale.setScalar(leaf.size * Math.min(1, (leaf.life - leaf.age) / 0.5));
      this.dummy.updateMatrix(); this.leafMesh.setMatrixAt(i, this.dummy.matrix);
    });
    this.leafMesh.count = this.leaves.length;
    this.leafMesh.instanceMatrix.needsUpdate = true;
  }

  private localPosition(block: TreeBlock, pivot: THREE.Vector3): THREE.Vector3 {
    return new THREE.Vector3(block.x + 0.5 - pivot.x, block.y + 0.5 - pivot.y, block.z + 0.5 - pivot.z);
  }

  private floorY(x: number, z: number): number {
    for (let y = CHUNK_HEIGHT - 1; y >= 0; y--) {
      const block = this.world.getBlock(Math.floor(x), y, Math.floor(z));
      if (block !== BlockId.Air && block !== BlockId.Wood && block !== BlockId.Leaves) return y + 1;
    }
    return 0;
  }
}
