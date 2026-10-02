import * as THREE from "three";
import RAPIER from "@dimforge/rapier3d-compat";
import type { Input } from "../core/Input";
import type { PhysicsWorld } from "../engine/physics/PhysicsWorld";
import type { InteractionMode } from "../player/InteractionMode";
import type { PlayerController } from "../player/PlayerController";
import type { Inventory } from "../survival/Inventory";
import type { PlayerStatus } from "../player/PlayerStatus";
import { Health } from "../survival/Health";
import { formatCost, type ResourceCost } from "../survival/Resources";
import { VOXEL_INTERACTION_DISTANCE } from "../voxel/constants";
import type { WorldBounds } from "../voxel/generation/WorldMetadata";
import { raycastVoxels } from "../voxel/VoxelRaycast";
import type { VoxelWorld } from "../voxel/VoxelWorld";
import { isTurretStructure } from "../defense/TurretRegistry";
import type { Core } from "./Core";
import {
  STRUCTURES,
  STRUCTURE_ORDER,
  StructureType,
  structureAllowedOnLane,
  type StructureDefinition,
} from "./StructureRegistry";
import {
  createStructureVisual,
  setGhostValidity,
} from "./StructureVisuals";

export interface StructureNavCell {
  structureId: number;
  traversalCost: number;
  hazard: boolean;
}

export interface StructureChangeBounds {
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
}

export interface StructureInstance {
  id: number;
  type: StructureType;
  definition: StructureDefinition;
  group: THREE.Group;
  health: Health;
  body: RAPIER.RigidBody;
  yaw: number;
  open: boolean;
  x: number;
  y: number;
  z: number;
}

interface Placement {
  x: number;
  y: number;
  z: number;
  yaw: number;
  valid: boolean;
}

export class StructureSystem {
  private readonly direction = new THREE.Vector3();
  private readonly instances: StructureInstance[] = [];
  private selectedIndex = 0;
  private nextId = 1;
  private ghost: THREE.Group;
  private placement: Placement | null = null;
  private feedback = "";
  private feedbackTime = 0;
  private readonly navigationListeners =
    new Set<(bounds: StructureChangeBounds) => void>();

  constructor(
    private readonly scene: THREE.Scene,
    private readonly camera: THREE.PerspectiveCamera,
    private readonly input: Input,
    private readonly player: PlayerController,
    private readonly world: VoxelWorld,
    private readonly physics: PhysicsWorld,
    private readonly inventory: Inventory,
    private readonly status: PlayerStatus,
    private readonly mode: InteractionMode,
    private readonly core: Core,
    private readonly bounds: WorldBounds,
    private readonly buildBar: HTMLDivElement,
    private readonly buildInfo: HTMLDivElement,
  ) {
    this.ghost = createStructureVisual(this.selectedType, true);
    this.ghost.visible = false;
    this.scene.add(this.ghost);
    this.buildBar.classList.add("hidden");
    this.renderBuildBar();
  }

  fixedUpdate(dt: number): void {
    if (this.feedbackTime > 0) {
      this.feedbackTime = Math.max(0, this.feedbackTime - dt);
    }

    if (this.input.consumePressed("KeyB")) {
      this.mode.toggleBuild();
      this.buildBar.classList.toggle("hidden", !this.mode.buildMode);
      this.ghost.visible = this.mode.buildMode;
      this.feedback = this.mode.buildMode ? "BUILD MODE ON" : "BUILD MODE OFF";
      this.feedbackTime = 1.2;
    }

    if (!this.mode.buildMode) {
      this.ghost.visible = false;
      if (this.input.consumePressed("KeyE")) this.toggleNearestGate();
      if (this.input.consumePressed("KeyR")) this.repairNearest();
      return;
    }

    for (let i = 0; i < STRUCTURE_ORDER.length; i++) {
      if (this.input.consumePressed(`Digit${i + 1}`)) {
        this.select(i);
      }
    }

    this.refreshPlacement();

    if (this.input.consumePressed("Mouse2")) {
      this.placeSelected();
    }

    if (this.input.consumePressed("KeyR")) {
      this.repairNearest();
    }
  }

  renderUpdate(): void {
    if (this.mode.buildMode) {
      this.refreshPlacement();
      const placement = this.placement;
      if (placement) {
        this.ghost.visible = true;
        this.ghost.position.set(placement.x, placement.y, placement.z);
        this.ghost.rotation.y = placement.yaw;
        setGhostValidity(this.ghost, placement.valid);
      } else {
        this.ghost.visible = false;
      }
    }

    const definition = STRUCTURES[this.selectedType];
    const cost = formatCost(definition.cost);
    const modeText = this.mode.buildMode
      ? `BUILD · ${definition.name} · ${cost}`
      : "B · BUILD MODE";

    this.buildInfo.textContent =
      this.feedbackTime > 0 ? this.feedback : modeText;
  }

  getDebugLines(): string[] {
    return [
      `BUILD     ${this.mode.buildMode ? this.selectedType : "OFF"}`,
      `STRUCTURES ${this.instances.length}`,
    ];
  }

  get all(): readonly StructureInstance[] {
    return this.instances;
  }

  getById(id: number): StructureInstance | undefined {
    return this.instances.find((instance) => instance.id === id);
  }

  subscribeNavigationChanges(
    listener: (bounds: StructureChangeBounds) => void,
  ): () => void {
    this.navigationListeners.add(listener);
    return () => this.navigationListeners.delete(listener);
  }

  navigationAtCell(x: number, z: number): StructureNavCell | null {
    for (const instance of this.instances) {
      if (!this.containsCell(instance, x, z)) continue;

      if (instance.type === StructureType.Spike) {
        return {
          structureId: instance.id,
          traversalCost: 3.5,
          hazard: true,
        };
      }

      if (instance.type === StructureType.Gate && instance.open) {
        return null;
      }

      const ratio = instance.health.ratio;
      const traversalCost =
        instance.type === StructureType.Wall
          ? 18 + ratio * 12
          : instance.type === StructureType.Gate
            ? 10 + ratio * 8
            : 13 + ratio * 8;

      return {
        structureId: instance.id,
        traversalCost,
        hazard: false,
      };
    }

    return null;
  }

  damageStructure(id: number, amount: number): boolean {
    const instance = this.instances.find((item) => item.id === id);
    if (!instance) return false;
    instance.health.damage(amount);
    if (!instance.health.destroyed) {
      this.emitNavigationChanged(instance);
      return false;
    }
    this.destroy(instance);
    return true;
  }

  private get selectedType(): StructureType {
    return STRUCTURE_ORDER[this.selectedIndex]!;
  }

  private select(index: number): void {
    if (index < 0 || index >= STRUCTURE_ORDER.length) return;
    this.selectedIndex = index;
    this.scene.remove(this.ghost);
    disposeGroup(this.ghost);
    this.ghost = createStructureVisual(this.selectedType, true);
    this.scene.add(this.ghost);
    this.renderBuildBar();
  }

  private renderBuildBar(): void {
    this.buildBar.replaceChildren();

    STRUCTURE_ORDER.forEach((type, index) => {
      const definition = STRUCTURES[type];
      const slot = document.createElement("div");
      slot.className = "build-slot";
      slot.classList.toggle("selected", index === this.selectedIndex);
      slot.innerHTML = `
        <span class="build-key">${index + 1}</span>
        <span class="build-swatch" style="--swatch:${definition.swatch}"></span>
        <span class="build-name">${definition.name}</span>
        <span class="build-cost">${formatCost(definition.cost)}</span>
      `;
      this.buildBar.append(slot);
    });
  }

  private refreshPlacement(): void {
    this.camera.getWorldDirection(this.direction);
    const hit = raycastVoxels(
      this.world,
      this.camera.position,
      this.direction,
      VOXEL_INTERACTION_DISTANCE,
    );

    if (!hit) {
      this.placement = null;
      return;
    }

    const x = hit.adjacent.x + 0.5;
    const z = hit.adjacent.z + 0.5;
    const gridX = Math.floor(x);
    const gridZ = Math.floor(z);
    const surface = this.world.highestSolidY(gridX, gridZ);
    if (surface < 0) {
      this.placement = null;
      return;
    }

    const rawYaw = Math.atan2(-this.direction.x, -this.direction.z);
    const yaw = Math.round(rawYaw / (Math.PI / 2)) * (Math.PI / 2);
    const y = surface + 1;
    const valid = this.validatePlacement(x, y, z, yaw);

    this.placement = { x, y, z, yaw, valid };
  }

  private validatePlacement(
    x: number,
    y: number,
    z: number,
    yaw: number,
  ): boolean {
    const definition = STRUCTURES[this.selectedType];
    const quarterTurn =
      Math.abs(Math.round(yaw / (Math.PI / 2))) % 2 === 1;
    const width = quarterTurn ? definition.depth : definition.width;
    const depth = quarterTurn ? definition.width : definition.depth;

    const minX = x - width / 2;
    const maxX = x + width / 2;
    const minZ = z - depth / 2;
    const maxZ = z + depth / 2;

    if (
      minX < this.bounds.minX ||
      maxX >= this.bounds.maxXExclusive ||
      minZ < this.bounds.minZ ||
      maxZ >= this.bounds.maxZExclusive
    ) {
      return false;
    }

    const player = this.player.getPosition();
    if (
      minX < player.x + 0.55 &&
      maxX > player.x - 0.55 &&
      minZ < player.z + 0.55 &&
      maxZ > player.z - 0.55 &&
      y < player.y + 1.2 &&
      y + definition.height > player.y - 1.1
    ) {
      return false;
    }

    const startX = Math.floor(minX + 0.001);
    const endX = Math.floor(maxX - 0.001);
    const startZ = Math.floor(minZ + 0.001);
    const endZ = Math.floor(maxZ - 0.001);

    for (let gridZ = startZ; gridZ <= endZ; gridZ++) {
      for (let gridX = startX; gridX <= endX; gridX++) {
        if (
          this.world.isLaneColumn(gridX, gridZ) &&
          !structureAllowedOnLane(this.selectedType)
        ) {
          return false;
        }

        if (this.world.highestSolidY(gridX, gridZ) >= y) {
          return false;
        }
      }
    }

    const coreX = this.core.group.position.x;
    const coreZ = this.core.group.position.z;
    if (
      minX < coreX + 1.35 &&
      maxX > coreX - 1.35 &&
      minZ < coreZ + 1.35 &&
      maxZ > coreZ - 1.35
    ) {
      return false;
    }

    for (const instance of this.instances) {
      const other = instance.definition;
      const otherQuarter =
        Math.abs(Math.round(instance.yaw / (Math.PI / 2))) % 2 === 1;
      const otherWidth = otherQuarter ? other.depth : other.width;
      const otherDepth = otherQuarter ? other.width : other.depth;

      if (
        minX < instance.x + otherWidth / 2 &&
        maxX > instance.x - otherWidth / 2 &&
        minZ < instance.z + otherDepth / 2 &&
        maxZ > instance.z - otherDepth / 2
      ) {
        return false;
      }
    }

    return this.inventory.canAfford(definition.cost);
  }

  private placeSelected(): void {
    const placement = this.placement;
    if (!placement || !placement.valid) {
      this.feedback = "INVALID PLACEMENT / MISSING RESOURCES";
      this.feedbackTime = 1.2;
      return;
    }

    const definition = STRUCTURES[this.selectedType];
    if (!this.inventory.spend(definition.cost)) {
      this.feedback = "NOT ENOUGH RESOURCES";
      this.feedbackTime = 1.2;
      return;
    }

    const group = createStructureVisual(this.selectedType, false);
    group.position.set(placement.x, placement.y, placement.z);
    group.rotation.y = placement.yaw;
    group.userData.structureId = this.nextId;
    group.traverse((object) => {
      object.userData.structureId = this.nextId;
    });
    this.scene.add(group);

    const body = this.createPhysicsBody(
      this.selectedType,
      placement.x,
      placement.y,
      placement.z,
      placement.yaw,
      false,
    );

    const instanceId = this.nextId++;
    const instance: StructureInstance = {
      id: instanceId,
      type: this.selectedType,
      definition,
      group,
      health: new Health(definition.maxHealth),
      body,
      yaw: placement.yaw,
      open: false,
      x: placement.x,
      y: placement.y,
      z: placement.z,
    };
    this.instances.push(instance);
    this.emitNavigationChanged(instance);

    this.feedback = `${definition.name.toUpperCase()} BUILT`;
    this.feedbackTime = 1.1;
    this.refreshPlacement();
  }

  private createPhysicsBody(
    type: StructureType,
    x: number,
    y: number,
    z: number,
    yaw: number,
    open: boolean,
  ): RAPIER.RigidBody {
    const body = this.physics.createStaticBody(x, y, z, yaw);

    if (type === StructureType.Wall) {
      this.physics.addBoxCollider(body, 1, 1, 0.23, 0, 1, 0);
    } else if (isTurretStructure(type)) {
      this.physics.addBoxCollider(body, 0.45, 0.25, 0.45, 0, 0.25, 0);
      this.physics.addBoxCollider(
        body,
        type === StructureType.RapidTurret ? 0.34 : 0.28,
        type === StructureType.RapidTurret ? 0.58 : 0.75,
        type === StructureType.RapidTurret ? 0.34 : 0.28,
        0,
        type === StructureType.RapidTurret ? 0.78 : 0.95,
        0,
      );
    } else if (type === StructureType.Spike) {
      this.physics.addBoxCollider(body, 0.85, 0.08, 0.85, 0, 0.08, 0);
    } else {
      this.physics.addBoxCollider(body, 0.17, 1.2, 0.23, -0.95, 1.2, 0);
      this.physics.addBoxCollider(body, 0.17, 1.2, 0.23, 0.95, 1.2, 0);
      this.physics.addBoxCollider(body, 1.12, 0.17, 0.23, 0, 2.23, 0);
      if (!open) {
        this.physics.addBoxCollider(body, 0.8, 0.72, 0.16, 0, 0.78, 0);
      }
    }

    return body;
  }

  private toggleNearestGate(): void {
    const player = this.player.getPosition();
    let nearest: StructureInstance | null = null;
    let best = 4.5;

    for (const instance of this.instances) {
      if (instance.type !== StructureType.Gate) continue;
      const distance = Math.hypot(
        instance.x - player.x,
        instance.z - player.z,
      );
      if (distance < best) {
        nearest = instance;
        best = distance;
      }
    }

    if (!nearest) return;

    nearest.open = !nearest.open;
    this.physics.removeBody(nearest.body);
    nearest.body = this.createPhysicsBody(
      nearest.type,
      nearest.x,
      nearest.y,
      nearest.z,
      nearest.yaw,
      nearest.open,
    );

    const door = nearest.group.getObjectByName("gate-door");
    if (door) door.rotation.y = nearest.open ? Math.PI / 2 : 0;

    this.emitNavigationChanged(nearest);
    this.feedback = nearest.open ? "GATE OPEN" : "GATE CLOSED";
    this.feedbackTime = 1.1;
  }

  private repairNearest(): void {
    const player = this.player.getPosition();
    let nearest: StructureInstance | null = null;
    let best = 4;

    for (const instance of this.instances) {
      if (instance.health.current >= instance.health.max) continue;
      const distance = Math.hypot(
        instance.x - player.x,
        instance.z - player.z,
      );
      if (distance < best) {
        nearest = instance;
        best = distance;
      }
    }

    if (!nearest) {
      this.feedback = "NO DAMAGED STRUCTURE NEARBY";
      this.feedbackTime = 1;
      return;
    }

    const cost: ResourceCost = {
      [nearest.definition.repairResource]:
        nearest.definition.repairAmount,
    };

    if (!this.inventory.spend(cost)) {
      this.feedback = "MISSING REPAIR RESOURCE";
      this.feedbackTime = 1;
      return;
    }

    nearest.health.heal(
      this.status.modifyRepairAmount(nearest.definition.repairHealth),
    );
    this.feedback =
      `REPAIRED ${nearest.definition.name.toUpperCase()} · ${Math.round(nearest.health.current)}/${nearest.health.max}`;
    this.feedbackTime = 1.2;
  }

  repairMostDamaged(amount: number): boolean {
    let target: StructureInstance | null = null;
    let missing = 0;

    for (const instance of this.instances) {
      const currentMissing =
        instance.health.max - instance.health.current;
      if (currentMissing > missing) {
        missing = currentMissing;
        target = instance;
      }
    }

    if (!target || missing <= 0) return false;
    target.health.heal(amount);
    return true;
  }

  private destroy(instance: StructureInstance): void {
    const bounds = this.structureBounds(instance);
    this.physics.removeBody(instance.body);
    this.scene.remove(instance.group);
    disposeGroup(instance.group);
    const index = this.instances.indexOf(instance);
    if (index >= 0) this.instances.splice(index, 1);
    this.emitBounds(bounds);
  }

  private containsCell(
    instance: StructureInstance,
    cellX: number,
    cellZ: number,
  ): boolean {
    const bounds = this.structureBounds(instance);
    const centerX = cellX + 0.5;
    const centerZ = cellZ + 0.5;
    return (
      centerX >= bounds.minX &&
      centerX <= bounds.maxX &&
      centerZ >= bounds.minZ &&
      centerZ <= bounds.maxZ
    );
  }

  private structureBounds(
    instance: StructureInstance,
  ): StructureChangeBounds {
    const quarterTurn =
      Math.abs(Math.round(instance.yaw / (Math.PI / 2))) % 2 === 1;
    const width = quarterTurn
      ? instance.definition.depth
      : instance.definition.width;
    const depth = quarterTurn
      ? instance.definition.width
      : instance.definition.depth;

    return {
      minX: instance.x - width / 2,
      maxX: instance.x + width / 2,
      minZ: instance.z - depth / 2,
      maxZ: instance.z + depth / 2,
    };
  }

  private emitNavigationChanged(instance: StructureInstance): void {
    this.emitBounds(this.structureBounds(instance));
  }

  private emitBounds(bounds: StructureChangeBounds): void {
    for (const listener of this.navigationListeners) listener(bounds);
  }
}

function disposeGroup(group: THREE.Group): void {
  group.traverse((object) => {
    if (!(object instanceof THREE.Mesh)) return;
    object.geometry.dispose();
    const materials = Array.isArray(object.material)
      ? object.material
      : [object.material];
    for (const material of materials) material.dispose();
  });
}
