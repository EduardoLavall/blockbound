import * as THREE from "three";
import type { VoxelRaycastHit } from "../voxel/VoxelRaycast";

/** Fractures stay on the contacted face and grow only when the pickaxe connects. */
export class MiningCracks {
  private readonly stages: THREE.CanvasTexture[];
  private readonly material = new THREE.MeshBasicMaterial({ transparent: true,
    depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2,
    polygonOffsetUnits: -2, opacity: 0.9 });
  private readonly mesh = new THREE.Mesh(new THREE.PlaneGeometry(0.998, 0.998), this.material);
  private readonly normal = new THREE.Vector3();
  private readonly facing = new THREE.Vector3(0, 0, 1);

  constructor(scene: THREE.Scene) {
    this.stages = Array.from({ length: 8 }, (_, stage) => {
      const canvas = document.createElement("canvas"); canvas.width = canvas.height = 64;
      const ctx = canvas.getContext("2d")!;
      const paths: [number, number][][] = [
        [[31,31],[25,26],[27,18],[18,12],[20,3]],
        [[31,31],[38,25],[43,28],[49,18],[62,16]],
        [[31,31],[25,37],[29,44],[19,51],[16,63]],
        [[31,31],[38,38],[46,35],[51,45],[63,49]],
        [[27,18],[36,14],[34,5]], [[25,37],[16,34],[5,38]],
        [[46,35],[47,29],[58,32]], [[29,44],[36,52],[43,63]],
      ];
      paths.slice(0, Math.min(8, stage + 1)).forEach((path, index) => {
        const length = Math.min(path.length, 2 + Math.ceil(stage / 2));
        ctx.beginPath(); ctx.moveTo(...path[0]!);
        for (const point of path.slice(1, length)) ctx.lineTo(...point);
        ctx.strokeStyle = "rgba(233,237,211,.3)"; ctx.lineWidth = 3 + Math.floor(stage / 4); ctx.stroke();
        ctx.strokeStyle = "rgba(7,18,22,.95)"; ctx.lineWidth = index < 4 ? 2 + Math.floor(stage / 5) : 1; ctx.stroke();
      });
      const texture = new THREE.CanvasTexture(canvas); texture.magFilter = THREE.NearestFilter;
      return texture;
    });
    this.mesh.visible = false; this.mesh.name = "mining-cracks"; scene.add(this.mesh);
  }
  update(target: VoxelRaycastHit | null, progress: number): void {
    this.mesh.visible = target !== null && progress > 0;
    if (!target || !this.mesh.visible) return;
    this.normal.set(target.faceNormal.x, target.faceNormal.y, target.faceNormal.z);
    this.mesh.position.set(target.voxel.x + 0.5, target.voxel.y + 0.5, target.voxel.z + 0.5)
      .addScaledVector(this.normal, 0.502);
    this.mesh.quaternion.setFromUnitVectors(this.facing, this.normal);
    const texture = this.stages[Math.min(7, Math.floor(progress * 8))]!;
    if (this.material.map !== texture) { this.material.map = texture; this.material.needsUpdate = true; }
  }
}
