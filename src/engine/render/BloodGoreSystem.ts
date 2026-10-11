import * as THREE from "three";
import type { EnemyDamageEvent } from "../../ai/EnemySystem";
import { isSolidBlock } from "../../voxel/blocks";
import { raycastVoxels, type VoxelRaycastHit } from "../../voxel/VoxelRaycast";
import type { VoxelWorld } from "../../voxel/VoxelWorld";
import { materialTexture } from "./MaterialTextures";

export const BLOOD_CAPACITY = { droplets: 256, fragments: 96, stains: 64 } as const;
interface Particle {
  position: THREE.Vector3;
  velocity: THREE.Vector3;
  rotation: THREE.Euler;
  size: THREE.Vector3;
  life: number;
  spin: number;
  settled: boolean;
  paint: boolean;
}
interface Stain {
  position: THREE.Vector3;
  orientation: THREE.Quaternion;
  anchor: THREE.Vector3;
  size: number;
  aspect: number;
  life: number;
  maxLife: number;
}
function particle(): Particle {
  return { position: new THREE.Vector3(), velocity: new THREE.Vector3(), rotation: new THREE.Euler(),
    size: new THREE.Vector3(), life: 0, spin: 0, settled: false, paint: false };
}

/** Three fixed instanced pools: directional blood, flesh/bone chunks and surface splashes. */
export class BloodGoreSystem {
  private readonly droplets = Array.from({ length: BLOOD_CAPACITY.droplets }, particle);
  private readonly fragments = Array.from({ length: BLOOD_CAPACITY.fragments }, particle);
  private readonly stains: Stain[] = Array.from({ length: BLOOD_CAPACITY.stains }, () => ({
    position: new THREE.Vector3(), orientation: new THREE.Quaternion(), anchor: new THREE.Vector3(),
    size: 0, aspect: 1, life: 0, maxLife: 1,
  }));
  private readonly bloodMesh: THREE.InstancedMesh;
  private readonly fragmentMesh: THREE.InstancedMesh;
  private readonly stainMesh: THREE.InstancedMesh;
  private readonly stainAlpha = new THREE.InstancedBufferAttribute(new Float32Array(BLOOD_CAPACITY.stains), 1);
  private readonly dummy = new THREE.Object3D();
  private readonly color = new THREE.Color();
  private readonly oldPosition = new THREE.Vector3();
  private readonly travel = new THREE.Vector3();
  private readonly contact = new THREE.Vector3();
  private readonly normal = new THREE.Vector3();
  private readonly up = new THREE.Vector3(0, 1, 0);
  private readonly forward = new THREE.Vector3(0, 0, 1);
  private bloodCursor = 0;
  private fragmentCursor = 0;
  private stainCursor = 0;
  private enabledValue = true;

  constructor(private readonly scene: THREE.Scene, private readonly world?: VoxelWorld) {
    this.bloodMesh = new THREE.InstancedMesh(new THREE.OctahedronGeometry(1),
      new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.38 }), BLOOD_CAPACITY.droplets);
    this.fragmentMesh = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1),
      new THREE.MeshStandardMaterial({ map: materialTexture("bone"), roughness: 0.58 }), BLOOD_CAPACITY.fragments);
    this.fragmentMesh.castShadow = true; this.fragmentMesh.receiveShadow = true;
    const shape = new THREE.Shape();
    for (let i = 0; i <= 40; i++) {
      const angle = i / 40 * Math.PI * 2;
      const radius = 0.36 + Math.sin(angle * 7) * 0.07 + Math.cos(angle * 13) * 0.06;
      const x = Math.cos(angle) * radius, y = Math.sin(angle) * radius;
      if (i === 0) shape.moveTo(x, y); else shape.lineTo(x, y);
    }
    shape.closePath();
    const geometry = new THREE.ShapeGeometry(shape);
    geometry.setAttribute("bloodOpacity", this.stainAlpha);
    const material = new THREE.MeshBasicMaterial({ transparent: true, depthWrite: false,
      polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2, side: THREE.DoubleSide });
    material.onBeforeCompile = shader => {
      shader.vertexShader = shader.vertexShader.replace("#include <common>",
        "#include <common>\nattribute float bloodOpacity;\nvarying float vBloodOpacity;")
        .replace("#include <begin_vertex>", "#include <begin_vertex>\nvBloodOpacity = bloodOpacity;");
      shader.fragmentShader = shader.fragmentShader.replace("#include <common>",
        "#include <common>\nvarying float vBloodOpacity;")
        .replace("#include <opaque_fragment>", "diffuseColor.a *= vBloodOpacity;\n#include <opaque_fragment>");
    };
    material.customProgramCacheKey = () => "blockbound-blood-stain-alpha-v1";
    this.stainMesh = new THREE.InstancedMesh(geometry, material, BLOOD_CAPACITY.stains);
    for (const [mesh, name] of [[this.bloodMesh, "enemy-blood-droplets"],
      [this.fragmentMesh, "enemy-gore-fragments"], [this.stainMesh, "enemy-blood-stains"]] as const) {
      mesh.name = name; mesh.frustumCulled = false;
      mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
      for (let i = 0; i < mesh.count; i++) {
        this.dummy.scale.setScalar(0); this.dummy.updateMatrix(); mesh.setMatrixAt(i, this.dummy.matrix);
        mesh.setColorAt(i, this.color.set(0xffffff));
      }
      scene.add(mesh);
    }
  }

  get enabled(): boolean { return this.enabledValue; }
  set enabled(value: boolean) {
    if (value === this.enabledValue) return;
    this.enabledValue = value;
    for (const mesh of [this.bloodMesh, this.fragmentMesh, this.stainMesh]) mesh.visible = value;
    if (!value) {
      for (const p of [...this.droplets, ...this.fragments, ...this.stains]) p.life = 0;
      this.syncMeshes();
    }
  }
  get counts(): { droplets: number; fragments: number; stains: number } {
    return { droplets: this.droplets.filter(p => p.life > 0).length,
      fragments: this.fragments.filter(p => p.life > 0).length, stains: this.stains.filter(p => p.life > 0).length };
  }

  hit(event: EnemyDamageEvent): void {
    if (!this.enabled || !Number.isFinite(event.amount) || event.amount <= 0) return;
    const scale = THREE.MathUtils.clamp(event.enemy.definition.scale, 0.6, 2.5);
    const feet = event.enemy.group.position;
    const origin = event.impact?.point.clone() ?? feet.clone().add(new THREE.Vector3(0, 1.05 * scale, 0));
    const direction = event.impact?.direction.clone() ?? new THREE.Vector3(Math.cos(event.enemy.id), 0, Math.sin(event.enemy.id));
    if (direction.lengthSq() < 0.0001) direction.set(0, 0, -1);
    direction.normalize();
    const count = event.killed ? Math.min(64, Math.round(38 * scale))
      : event.source === "burn" ? 4 : Math.min(22, 10 + Math.round(event.amount / 8));
    for (let i = 0; i < count; i++) {
      const slot = this.bloodCursor++ % this.droplets.length, p = this.droplets[slot]!;
      p.position.copy(origin).addScaledVector(direction, -0.03);
      // Most droplets spray toward the entry face; some continue through with the blow.
      p.velocity.copy(direction).multiplyScalar((i % 3 === 0 ? 1 : -1) * (1.2 + Math.random() * 2.5));
      p.velocity.x += (Math.random() - 0.5) * (event.killed ? 6 : 3);
      p.velocity.z += (Math.random() - 0.5) * (event.killed ? 6 : 3);
      p.velocity.y += 1.5 + Math.random() * (event.killed ? 4.5 : 2.5);
      const size = (0.035 + Math.random() * 0.035) * Math.sqrt(scale);
      p.size.set(size, size * 1.8, size); p.life = 1.4 + Math.random() * 0.6;
      p.settled = false; p.paint = i % 4 === 0;
      this.bloodMesh.setColorAt(slot, this.color.set(i % 3 ? 0xb51e32 : 0x731125));
    }
    this.bloodMesh.instanceColor!.needsUpdate = true;
    if (event.killed) {
      this.spawnFragments(feet, direction, scale, event.enemy.definition.color);
      const from = feet.clone().add(new THREE.Vector3(0, scale, 0));
      const down = new THREE.Vector3(0, -1, 0);
      const hit = this.world ? raycastVoxels(this.world, from, down, 6 * scale) : null;
      if (hit) this.paint(from.addScaledVector(down, hit.distance), new THREE.Vector3(0, 1, 0), 1.25 * scale, hit);
    }
  }

  fixedUpdate(dt: number): void {
    if (!this.enabled || dt <= 0) return;
    // Collision sweeps remain reliable even if a caller delivers a long frame.
    let remaining = Math.min(dt, 0.25);
    while (remaining > 0.00001) {
      const step = Math.min(remaining, 1 / 60); remaining -= step;
      this.move(this.droplets, step, false); this.move(this.fragments, step, true);
    }
    for (const stain of this.stains) {
      stain.life = Math.max(0, stain.life - dt);
      if (stain.life > 0 && this.world && !isSolidBlock(this.world.getBlock(stain.anchor.x, stain.anchor.y, stain.anchor.z))) stain.life = 0;
    }
    if (dt > 0.25) for (const p of [...this.droplets, ...this.fragments]) p.life = Math.max(0, p.life - (dt - 0.25));
    this.syncMeshes();
  }

  dispose(): void {
    this.enabled = false;
    for (const mesh of [this.bloodMesh, this.fragmentMesh, this.stainMesh]) {
      this.scene.remove(mesh); mesh.dispose(); mesh.geometry.dispose();
      (mesh.material as THREE.Material).dispose();
    }
  }

  private spawnFragments(feet: THREE.Vector3, direction: THREE.Vector3, scale: number, bodyColor: number): void {
    for (let i = 0; i < 10; i++) {
      const slot = this.fragmentCursor++ % this.fragments.length, p = this.fragments[slot]!;
      p.position.copy(feet).add(new THREE.Vector3((Math.random() - 0.5) * 0.5 * scale,
        (0.45 + Math.random() * 1.15) * scale, (Math.random() - 0.5) * 0.5 * scale));
      p.velocity.copy(direction).multiplyScalar(1.8).add(new THREE.Vector3((Math.random() - 0.5) * 5, 2.5 + Math.random() * 4, (Math.random() - 0.5) * 5));
      const size = (0.12 + Math.random() * 0.1) * scale;
      p.size.set(size, size * 0.7, size * (i % 3 === 0 ? 2 : 1.25));
      p.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, Math.random() * Math.PI);
      p.spin = (Math.random() - 0.5) * 12;
      p.life = 7 + Math.random() * 3; p.settled = false; p.paint = true;
      this.fragmentMesh.setColorAt(slot, this.color.set(i % 4 === 0 ? 0xd4b99e : i % 4 === 1 ? bodyColor : 0x8f142b));
    }
    this.fragmentMesh.instanceColor!.needsUpdate = true;
  }

  private move(pool: Particle[], dt: number, gib: boolean): void {
    for (const p of pool) {
      p.life = Math.max(0, p.life - dt);
      if (p.life <= 0 || p.settled) continue;
      p.velocity.y -= dt * (gib ? 13 : 12);
      this.oldPosition.copy(p.position);
      p.position.addScaledVector(p.velocity, dt);
      this.travel.copy(p.position).sub(this.oldPosition);
      const length = this.travel.length();
      const hit = this.world && length > 0 ? raycastVoxels(this.world, this.oldPosition, this.travel, length) : null;
      if (hit) {
        this.contact.copy(this.oldPosition).addScaledVector(this.travel.normalize(), hit.distance);
        this.normal.set(hit.faceNormal.x, hit.faceNormal.y, hit.faceNormal.z);
        if (this.normal.lengthSq() < 0.1) this.normal.copy(this.up);
        if (p.paint) this.paint(this.contact, this.normal, gib ? p.size.x * 1.5 : p.size.x * 3, hit);
        if (!gib) { p.life = 0; continue; }
        p.position.copy(this.contact).addScaledVector(this.normal, this.normal.y > 0.5 ? p.size.y / 2 + 0.008 : p.size.length() / 2);
        p.velocity.reflect(this.normal).multiplyScalar(0.22);
        if (this.normal.y > 0.5 && p.velocity.y < 1.5) {
          p.settled = true; p.velocity.set(0, 0, 0); p.rotation.set(0, p.rotation.y, 0);
        }
      }
      if (gib && !p.settled) { p.rotation.x += dt * p.spin; p.rotation.z += dt * p.spin * 0.7; }
    }
  }

  private paint(point: THREE.Vector3, normal: THREE.Vector3, size: number, hit: VoxelRaycastHit): void {
    const slot = this.stainCursor++ % this.stains.length, stain = this.stains[slot]!;
    stain.position.copy(point).addScaledVector(normal, 0.009);
    stain.orientation.setFromUnitVectors(this.forward, normal);
    stain.orientation.multiply(new THREE.Quaternion().setFromAxisAngle(this.forward, Math.random() * Math.PI * 2));
    stain.anchor.set(hit.voxel.x, hit.voxel.y, hit.voxel.z);
    stain.size = size; stain.aspect = 0.7 + Math.random() * 0.7;
    stain.life = stain.maxLife = 16 + Math.random() * 6;
    this.stainMesh.setColorAt(slot, this.color.set(size > 0.8 ? 0x70132b : 0x951a30));
    this.stainMesh.instanceColor!.needsUpdate = true;
  }

  private syncMeshes(): void {
    for (const [pool, mesh, gib] of [[this.droplets, this.bloodMesh, false], [this.fragments, this.fragmentMesh, true]] as const) {
      pool.forEach((p, i) => {
        this.dummy.position.copy(p.position);
        if (gib) this.dummy.rotation.copy(p.rotation);
        else this.dummy.quaternion.setFromUnitVectors(this.up, this.travel.copy(p.velocity).normalize());
        const fade = gib ? Math.min(1, p.life / 1.3) : Math.min(1, p.life * 4);
        this.dummy.scale.copy(p.size).multiplyScalar(p.life > 0 ? fade : 0);
        this.dummy.updateMatrix(); mesh.setMatrixAt(i, this.dummy.matrix);
      });
      mesh.instanceMatrix.needsUpdate = true;
    }
    this.stains.forEach((stain, i) => {
      this.dummy.position.copy(stain.position); this.dummy.quaternion.copy(stain.orientation);
      this.dummy.scale.set(stain.size * stain.aspect, stain.size, 1).multiplyScalar(stain.life > 0 ? 1 : 0);
      this.stainAlpha.setX(i, Math.min(1, stain.life / 3) * 0.85);
      this.dummy.updateMatrix(); this.stainMesh.setMatrixAt(i, this.dummy.matrix);
    });
    this.stainMesh.instanceMatrix.needsUpdate = true; this.stainAlpha.needsUpdate = true;
  }
}
