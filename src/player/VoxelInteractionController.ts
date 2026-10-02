import * as THREE from "three";
import type { Input } from "../core/Input";
import { BlockId, blockDefinition } from "../voxel/blocks";
import { VOXEL_INTERACTION_DISTANCE } from "../voxel/constants";
import type { ChunkManager } from "../voxel/render/ChunkManager";
import { raycastVoxels, type VoxelRaycastHit } from "../voxel/VoxelRaycast";
import type { VoxelWorld } from "../voxel/VoxelWorld";
import type { PlayerController } from "./PlayerController";
import type { Hotbar } from "./Hotbar";

export class VoxelInteractionController {
  private readonly direction = new THREE.Vector3();
  private readonly highlight: THREE.LineSegments;
  private target: VoxelRaycastHit | null = null;

  constructor(
    private readonly camera: THREE.PerspectiveCamera,
    private readonly scene: THREE.Scene,
    private readonly input: Input,
    private readonly player: PlayerController,
    private readonly world: VoxelWorld,
    private readonly chunks: ChunkManager,
    private readonly hotbar: Hotbar,
    private readonly targetInfo: HTMLElement,
  ) {
    const outline = new THREE.EdgesGeometry(new THREE.BoxGeometry(1.01, 1.01, 1.01));
    const material = new THREE.LineBasicMaterial({
      color: 0xffe27a,
      transparent: true,
      opacity: 0.95,
    });
    this.highlight = new THREE.LineSegments(outline, material);
    this.highlight.visible = false;
    this.scene.add(this.highlight);
  }

  fixedUpdate(): void {
    for (let i = 0; i < 5; i++) {
      if (this.input.consumePressed(`Digit${i + 1}`)) this.hotbar.select(i);
    }

    this.refreshTarget();

    if (this.input.consumePressed("Mouse0")) {
      this.breakTarget();
    }

    if (this.input.consumePressed("Mouse2")) {
      this.placeAdjacent();
    }
  }

  renderUpdate(): void {
    this.refreshTarget();
    const target = this.target;

    if (!target) {
      this.highlight.visible = false;
      this.targetInfo.textContent = `BUILD · ${this.hotbar.selectedName}`;
      return;
    }

    this.highlight.visible = true;
    this.highlight.position.set(
      target.voxel.x + 0.5,
      target.voxel.y + 0.5,
      target.voxel.z + 0.5,
    );

    const definition = blockDefinition(target.block);
    this.targetInfo.textContent =
      `${definition.name.toUpperCase()} · ${target.voxel.x},${target.voxel.y},${target.voxel.z} · ${target.distance.toFixed(1)}m`;
  }

  getDebugLines(): string[] {
    return [
      `BLOCK     ${this.hotbar.selectedName}`,
      `TARGET    ${this.target ? blockDefinition(this.target.block).name : "-"}`,
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

  private breakTarget(): void {
    const target = this.target;
    if (!target) return;
    const definition = blockDefinition(target.block);
    if (!definition.destructible) return;

    const edit = this.world.setBlock(
      target.voxel.x,
      target.voxel.y,
      target.voxel.z,
      BlockId.Air,
    );
    if (edit.changed) this.chunks.requestRebuild(edit.dirtyChunkKeys);
  }

  private placeAdjacent(): void {
    const target = this.target;
    if (!target) return;

    const { x, y, z } = target.adjacent;
    if (this.world.getBlock(x, y, z) !== BlockId.Air) return;
    if (this.intersectsPlayer(x, y, z)) return;

    const edit = this.world.setBlock(x, y, z, this.hotbar.selectedBlock);
    if (edit.changed) this.chunks.requestRebuild(edit.dirtyChunkKeys);
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
      x < playerMaxX && x + 1 > playerMinX &&
      y < playerMaxY && y + 1 > playerMinY &&
      z < playerMaxZ && z + 1 > playerMinZ
    );
  }
}
