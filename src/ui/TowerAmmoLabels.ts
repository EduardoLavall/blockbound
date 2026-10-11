import * as THREE from "three";
import type { StructureSystem } from "../building/StructureSystem";
import type { VoxelWorld } from "../voxel/VoxelWorld";
import { turretDefinition } from "../defense/TurretRegistry";
import { coverDistance } from "../combat/CombatTrace";

/** Labels live in the scaled HUD but stay anchored over visible nearby towers. */
export class TowerAmmoLabels {
  private readonly labels = new Map<number, HTMLDivElement>();
  private readonly heights = new Map<number, number>();
  private readonly point = new THREE.Vector3();
  private readonly direction = new THREE.Vector3();
  constructor(private readonly root: HTMLElement, private readonly camera: THREE.PerspectiveCamera,
    private readonly structures: StructureSystem, private readonly world: VoxelWorld) {}
  update(): void {
    const ids = new Set<number>();
    const target = this.structures.targetedTurret();
    for (const tower of this.structures.all) {
      const definition = turretDefinition(tower.type);
      if (!definition) continue;
      ids.add(tower.id);
      let label = this.labels.get(tower.id);
      if (!label) {
        label = document.createElement("div"); label.className = "tower-ammo-label";
        this.labels.set(tower.id, label); this.root.append(label);
        this.heights.set(tower.id, new THREE.Box3().setFromObject(tower.group).max.y - tower.group.position.y + 0.22);
      }
      this.point.copy(tower.group.position); this.point.y += this.heights.get(tower.id)!;
      const distance = this.point.distanceTo(this.camera.position);
      this.direction.copy(this.point).sub(this.camera.position).normalize();
      const blocked = distance > 22 || coverDistance(this.world, this.camera.position, this.direction,
        distance, this.structures.all.filter(other => other.id !== tower.id)) < distance - 0.04;
      this.point.project(this.camera);
      label.hidden = blocked || this.point.z < -1 || this.point.z > 1 || Math.abs(this.point.x) > 1.05 || Math.abs(this.point.y) > 1.05;
      if (label.hidden) continue;
      label.style.left = `${(this.point.x * 0.5 + 0.5) * 100}%`;
      label.style.top = `${(-this.point.y * 0.5 + 0.5) * 100}%`;
      label.classList.toggle("empty", tower.ammo === 0);
      label.classList.toggle("targeted", target?.id === tower.id);
      const text = `${tower.type === "rapid-turret" ? "TORRE RÁPIDA" : "TORRE"} · MUNIÇÃO ${tower.ammo}/${definition.ammoCapacity}`
        + (target?.id === tower.id ? "\nE · ABASTECER" : tower.ammo === 0 ? "\nSEM MUNIÇÃO" : "");
      if (label.textContent !== text) label.textContent = text;
    }
    for (const [id, label] of this.labels) if (!ids.has(id)) { label.remove(); this.labels.delete(id); this.heights.delete(id); }
  }
}
