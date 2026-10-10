import * as THREE from "three";
import type { VoxelRaycastHit } from "../voxel/VoxelRaycast";

export class MiningCracks {
  private readonly stages: THREE.CanvasTexture[];
  private readonly material = new THREE.MeshBasicMaterial({ transparent: true,
    depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2,
    polygonOffsetUnits: -2, opacity: 0.85 });
  private readonly mesh = new THREE.Mesh(new THREE.BoxGeometry(1.008, 1.008, 1.008), this.material);
  constructor(scene: THREE.Scene) {
    this.stages = Array.from({ length: 5 }, (_, stage) => {
      const canvas = document.createElement("canvas");
      canvas.width = canvas.height = 64;
      const ctx = canvas.getContext("2d")!;
      ctx.strokeStyle = "rgba(15,25,26,.9)";
      ctx.lineWidth = 2;
      for (let i = 0; i <= stage * 2 + 2; i++) {
        const angle = i * 2.399;
        const radius = 12 + stage * 4;
        ctx.beginPath(); ctx.moveTo(32, 32);
        ctx.lineTo(32 + Math.cos(angle + 0.3) * radius * 0.5, 32 + Math.sin(angle + 0.3) * radius * 0.5);
        ctx.lineTo(32 + Math.cos(angle) * radius, 32 + Math.sin(angle) * radius); ctx.stroke();
      }
      const texture = new THREE.CanvasTexture(canvas);
      texture.magFilter = THREE.NearestFilter;
      return texture;
    });
    this.mesh.visible = false;
    this.mesh.name = "mining-cracks";
    scene.add(this.mesh);
  }
  update(target: VoxelRaycastHit | null, progress: number): void {
    this.mesh.visible = target !== null && progress > 0;
    if (!target || !this.mesh.visible) return;
    this.mesh.position.set(target.voxel.x + 0.5, target.voxel.y + 0.5, target.voxel.z + 0.5);
    const texture = this.stages[Math.min(4, Math.floor(progress * 5))]!;
    if (this.material.map !== texture) { this.material.map = texture; this.material.needsUpdate = true; }
  }
}
