import * as THREE from "three";
import type { Input } from "../core/Input";
import type { InteractionMode } from "./InteractionMode";
import type { Inventory } from "../survival/Inventory";
import { miningDuration } from "../survival/Mining";
import type { ResourceDropSystem } from "../survival/ResourceDropSystem";
import {
  blockDrop,
  formatCost,
  placementCost,
} from "../survival/Resources";
import type { RuleEngine } from "../roguelite/RuleEngine";
import { BlockId, blockDefinition } from "../voxel/blocks";
import { VOXEL_INTERACTION_DISTANCE } from "../voxel/constants";
import type { ChunkManager } from "../voxel/render/ChunkManager";
import {
  raycastVoxels,
  type VoxelRaycastHit,
} from "../voxel/VoxelRaycast";
import type { VoxelWorld } from "../voxel/VoxelWorld";
import type { PlayerController } from "./PlayerController";
import type { Hotbar } from "./Hotbar";

export class VoxelInteractionController {
  private readonly direction = new THREE.Vector3();
  private readonly highlight: THREE.LineSegments;
  private target: VoxelRaycastHit | null = null;
  private miningKey = "";
  private miningElapsed = 0;
  private miningRatio = 0;
  private feedback = "";
  private feedbackTime = 0;

  constructor(
    private readonly camera: THREE.PerspectiveCamera,
    private readonly scene: THREE.Scene,
    private readonly input: Input,
    private readonly player: PlayerController,
    private readonly world: VoxelWorld,
    private readonly chunks: ChunkManager,
    private readonly hotbar: Hotbar,
    private readonly inventory: Inventory,
    private readonly drops: ResourceDropSystem,
    private readonly mode: InteractionMode,
    private readonly rules: RuleEngine,
    private readonly canMinePrimary: () => boolean,
    private readonly targetInfo: HTMLElement,
    private readonly miningProgress: HTMLElement,
  ) {
    const outline = new THREE.EdgesGeometry(
      new THREE.BoxGeometry(1.01, 1.01, 1.01),
    );
    const material = new THREE.LineBasicMaterial({
      color: 0xffe27a,
      transparent: true,
      opacity: 0.95,
    });
    this.highlight = new THREE.LineSegments(outline, material);
    this.highlight.visible = false;
    this.scene.add(this.highlight);
  }

  fixedUpdate(dt: number): void {
    if (this.feedbackTime > 0) {
      this.feedbackTime = Math.max(0, this.feedbackTime - dt);
    }

    if (this.mode.buildMode) {
      this.resetMining();
      return;
    }

    for (let i = 0; i < 5; i++) {
      if (this.input.consumePressed(`Digit${i + 1}`)) {
        this.hotbar.select(i);
      }
    }

    this.refreshTarget();

    if (this.canMinePrimary() && this.input.isDown("Mouse0")) {
      this.mineTarget(dt);
    } else {
      this.resetMining();
    }

    if (this.input.consumePressed("Mouse2")) {
      this.placeAdjacent();
    }
  }

  renderUpdate(): void {
    this.refreshTarget();
    const target = this.target;
    const miningEnabled = this.canMinePrimary();

    this.miningProgress.style.width =
      `${Math.round(this.miningRatio * 100)}%`;
    this.miningProgress.parentElement?.classList.toggle(
      "active",
      this.miningRatio > 0,
    );

    if (this.mode.buildMode) {
      this.highlight.visible = false;
      return;
    }

    if (!miningEnabled) {
      this.highlight.visible = false;
      this.targetInfo.textContent =
        this.feedbackTime > 0
          ? this.feedback
          : "Q · SWITCH TO TOOL FOR MINING";
      return;
    }

    if (!target) {
      this.highlight.visible = false;
      this.targetInfo.textContent =
        this.feedbackTime > 0
          ? this.feedback
          : `MATERIAL · ${this.hotbar.selectedName}`;
      return;
    }

    this.highlight.visible = true;
    this.highlight.position.set(
      target.voxel.x + 0.5,
      target.voxel.y + 0.5,
      target.voxel.z + 0.5,
    );

    const definition = blockDefinition(target.block);
    if (this.feedbackTime > 0) {
      this.targetInfo.textContent = this.feedback;
    } else if (this.miningRatio > 0) {
      this.targetInfo.textContent =
        `MINING ${definition.name.toUpperCase()} · ${Math.round(this.miningRatio * 100)}%`;
    } else {
      const cost = placementCost(this.hotbar.selectedBlock);
      this.targetInfo.textContent =
        `${definition.name.toUpperCase()} · ${target.distance.toFixed(1)}m · PLACE ${cost ? formatCost(cost) : "N/A"}`;
    }
  }

  getDebugLines(): string[] {
    return [
      `BLOCK     ${this.hotbar.selectedName}`,
      `TARGET    ${this.target ? blockDefinition(this.target.block).name : "-"}`,
      `MINING    ${Math.round(this.miningRatio * 100)}%`,
    ];
  }

  private refreshTarget(): void {
    this.camera.getWorldDirection(this.direction);
    this.target = raycastVoxels(
      this.world,
      this.camera.position,
      this.direction,
      VOXEL_INTERACTION_DISTANCE,
    );
  }

  private mineTarget(dt: number): void {
    const target = this.target;
    if (!target) {
      this.resetMining();
      return;
    }

    const definition = blockDefinition(target.block);
    if (!definition.destructible) {
      this.resetMining();
      return;
    }

    const baseDuration = miningDuration(target.block);
    const duration = this.rules.modifyMiningDuration(baseDuration);
    if (!Number.isFinite(duration)) {
      this.resetMining();
      return;
    }

    const key =
      `${target.voxel.x},${target.voxel.y},${target.voxel.z}:${target.block}`;
    if (key !== this.miningKey) {
      this.miningKey = key;
      this.miningElapsed = 0;
    }

    this.miningElapsed += dt;
    this.miningRatio = Math.min(1, this.miningElapsed / duration);

    if (this.miningElapsed < duration) return;

    const drop = blockDrop(target.block);
    const edit = this.world.setBlock(
      target.voxel.x,
      target.voxel.y,
      target.voxel.z,
      BlockId.Air,
    );

    if (edit.changed) {
      this.chunks.requestRebuild(edit.dirtyChunkKeys);
      if (drop) {
        this.drops.spawn(
          {
            ...drop,
            amount: drop.amount + this.rules.resourceYieldBonus,
          },
          target.voxel.x,
          target.voxel.y,
          target.voxel.z,
        );
      }
    }

    this.resetMining();
    this.refreshTarget();
  }

  private placeAdjacent(): void {
    const target = this.target;
    if (!target) return;

    const { x, y, z } = target.adjacent;
    if (this.world.getBlock(x, y, z) !== BlockId.Air) return;
    if (this.intersectsPlayer(x, y, z)) return;

    const cost = placementCost(this.hotbar.selectedBlock);
    if (!cost) {
      this.feedback = "THIS BLOCK CANNOT BE PLACED";
      this.feedbackTime = 1.1;
      return;
    }

    if (!this.inventory.canAfford(cost)) {
      this.feedback = "MISSING RESOURCES · " + formatCost(cost);
      this.feedbackTime = 1.2;
      return;
    }

    const edit = this.world.setBlock(
      x,
      y,
      z,
      this.hotbar.selectedBlock,
    );

    if (!edit.changed) return;

    this.inventory.spend(cost);
    this.chunks.requestRebuild(edit.dirtyChunkKeys);
  }

  private resetMining(): void {
    this.miningKey = "";
    this.miningElapsed = 0;
    this.miningRatio = 0;
  }

  private intersectsPlayer(x: number, y: number, z: number): boolean {
    const player = this.player.getPosition();
    const playerMinX = player.x - 0.4;
    const playerMaxX = player.x + 0.4;
    const playerMinY = player.y - 0.9;
    const playerMaxY = player.y + 0.9;
    const playerMinZ = player.z - 0.4;
    const playerMaxZ = player.z + 0.4;

    return (
      x < playerMaxX &&
      x + 1 > playerMinX &&
      y < playerMaxY &&
      y + 1 > playerMinY &&
      z < playerMaxZ &&
      z + 1 > playerMinZ
    );
  }
}
