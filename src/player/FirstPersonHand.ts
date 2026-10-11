import * as THREE from "three";
import type { PlayControls } from "./PlayControls";
import { PlayerActionMode } from "../combat/CombatTypes";
import type { Input } from "../core/Input";
import { miningStrokePhase, miningStrokePose, MINING_CONTACT_PHASE, MINING_RECOVERY_SECONDS } from "./MiningStroke";
import type { PlayerController } from "./PlayerController";
import { VIEWMODEL_POSES } from "./ViewmodelPose";
import { materialTexture } from "../engine/render/MaterialTextures";

/** Hand-held silhouettes with independent poses and stable first-person shading. */
export class FirstPersonHand {
  private readonly root = new THREE.Group();
  private readonly pickaxe = new THREE.Group();
  private readonly blade = new THREE.Group();
  private readonly repeater = new THREE.Group();
  private readonly muzzle = new THREE.Mesh(new THREE.OctahedronGeometry(0.12), viewMaterial(0xffe3a0, 4));
  private actionMode = PlayerActionMode.Tool;
  private walkTime = 0;
  private attackTime = 1;
  private attackStrength = 1;
  private equipTime = 1;
  private swayX = 0;
  private swayY = 0;
  private miningActive = false;
  private miningProgress = 0;
  private miningDuration = 0;
  private miningRecovery = 0;
  private readonly miningOffset = new THREE.Vector3();
  private readonly miningRotation = new THREE.Vector3();
  effects = true;

  constructor(camera: THREE.PerspectiveCamera, private readonly controls: PlayControls,
    private readonly input: Input, private readonly player: PlayerController) {
    this.root.name = "first-person-hand";
    this.pickaxe.name = "view-pickaxe"; this.blade.name = "view-blade"; this.repeater.name = "view-repeater";
    this.root.visible = false;
    this.createHand(); this.createPickaxe(); this.createBlade(); this.createRepeater();
    this.root.add(this.pickaxe, this.blade, this.repeater);
    camera.add(this.root);
    this.setActionMode(PlayerActionMode.Tool);
    this.controls.addEventListener("lock", () => { this.root.visible = true; });
    this.controls.addEventListener("unlock", () => { this.root.visible = false; });
  }
  setActionMode(mode: PlayerActionMode): void {
    this.miningRecovery = 0;
    this.miningOffset.setScalar(0); this.miningRotation.setScalar(0);
    this.actionMode = mode;
    this.pickaxe.visible = mode === PlayerActionMode.Tool;
    this.blade.visible = mode === PlayerActionMode.Blade;
    this.repeater.visible = mode === PlayerActionMode.Repeater;
    this.equipTime = 0;
    if (mode !== PlayerActionMode.Tool) this.setMiningState(false, 0, 0);
  }
  setMiningState(active: boolean, progress: number, duration: number): void {
    this.miningActive = active && this.actionMode === PlayerActionMode.Tool;
    this.miningProgress = THREE.MathUtils.clamp(progress, 0, 1);
    this.miningDuration = Math.max(0, duration);
  }
  triggerAttack(strength = 1): void {
    this.miningRecovery = 0;
    this.attackTime = 0; this.attackStrength = strength;
  }
  setHeldVisible(visible: boolean): void { this.root.visible = this.controls.isLocked && visible; }
  triggerMiningImpact(broken: boolean): void {
    if (this.actionMode !== PlayerActionMode.Tool) return;
    const pose = miningStrokePose(MINING_CONTACT_PHASE);
    this.miningOffset.set(...pose.position); this.miningRotation.set(...pose.rotation);
    if (broken) this.miningRecovery = MINING_RECOVERY_SECONDS;
  }
  update(frameMs: number): void {
    const dt = Math.min(frameMs / 1000, 0.05);
    const moving = this.controls.isLocked && ["KeyW", "KeyA", "KeyS", "KeyD"].some(key => this.input.isDown(key));
    const grounded = this.player.getDebugState().grounded;
    const sprinting = this.input.isDown("ShiftLeft") || this.input.isDown("ShiftRight");
    if (moving && grounded) this.walkTime += dt * (sprinting ? 12 : 8);
    const bob = moving && grounded ? (sprinting ? 0.022 : 0.013) : 0;
    const pointer = this.input.consumePointerDelta();
    const smoothing = 1 - Math.exp(-dt * 18);
    this.swayX = THREE.MathUtils.lerp(this.swayX, THREE.MathUtils.clamp(-pointer.x * 0.0008, -0.025, 0.025), smoothing);
    this.swayY = THREE.MathUtils.lerp(this.swayY, THREE.MathUtils.clamp(-pointer.y * 0.0007, -0.02, 0.02), smoothing);
    this.attackTime = Math.min(1, this.attackTime + dt / 0.24);
    this.equipTime = Math.min(1, this.equipTime + dt / 0.2);
    const attack = Math.sin(this.attackTime * Math.PI) * this.attackStrength;
    let stroke = miningStrokePose(this.miningActive ? miningStrokePhase(this.miningProgress, this.miningDuration) : 0);
    if (this.miningRecovery > 0) {
      this.miningRecovery = Math.max(0, this.miningRecovery - dt);
      stroke = miningStrokePose(MINING_CONTACT_PHASE + (1 - MINING_CONTACT_PHASE) *
        (1 - this.miningRecovery / MINING_RECOVERY_SECONDS));
    }
    const relax = 1 - Math.exp(-dt * 30);
    for (const [axis, index] of [["x", 0], ["y", 1], ["z", 2]] as const) {
      this.miningOffset[axis] = THREE.MathUtils.lerp(this.miningOffset[axis], stroke.position[index], relax);
      this.miningRotation[axis] = THREE.MathUtils.lerp(this.miningRotation[axis], stroke.rotation[index], relax);
    }
    const tool = attack;
    const miningMode = this.actionMode === PlayerActionMode.Tool;
    const pose = VIEWMODEL_POSES[this.actionMode];
    const [px, py, pz] = pose.position;
    const [rx, ry, rz] = pose.rotation;
    const gun = this.actionMode === PlayerActionMode.Repeater;
    const sword = this.actionMode === PlayerActionMode.Blade;
    this.root.position.set(px + Math.sin(this.walkTime) * bob + this.swayX - (sword ? attack * 0.12 : 0) + (miningMode ? this.miningOffset.x : 0),
      py - Math.abs(Math.cos(this.walkTime)) * bob + this.swayY - (1 - this.equipTime) * 0.18 - (gun ? 0 : tool * 0.045) + (miningMode ? this.miningOffset.y : 0),
      pz + (gun ? attack * 0.1 : -tool * 0.12) + (miningMode ? this.miningOffset.z : 0));
    this.root.rotation.set(rx + (gun ? attack * 0.07 : -tool * 0.75) + (miningMode ? this.miningRotation.x : 0),
      ry + this.swayX + (miningMode ? this.miningRotation.y : 0),
      rz + (sword ? attack * 1.05 : gun ? 0 : tool * 0.22) + (miningMode ? this.miningRotation.z : 0));
    this.muzzle.visible = this.effects && gun && this.attackTime < 0.18;
    this.muzzle.rotation.z += dt * 30;
  }
  private createHand(): void {
    const glove = viewMaterial(0xe0f3f5), inset = viewMaterial(0x253e4b);
    glove.map = materialTexture("cloth");
    const skin = viewMaterial(0xc3916c), cuff = viewMaterial(0xa99461);
    const arm = box(this.root, [0.135, 0.18, 0.3], [0.035, -0.14, 0.1], glove);
    arm.rotation.x = -0.25;
    box(this.root, [0.15, 0.05, 0.12], [0.015, -0.075, 0.045], cuff);
    box(this.root, [0.145, 0.15, 0.13], [0, 0.005, 0.015], glove);
    box(this.root, [0.11, 0.085, 0.016], [0, 0.03, 0.088], inset);
    for (let i = 0; i < 3; i++) box(this.root, [0.11, 0.027, 0.05], [0.006, 0.048 - i * 0.034, -0.067], skin);
    const thumb = box(this.root, [0.055, 0.08, 0.065], [-0.065, 0.02, -0.04], skin);
    thumb.rotation.z = -0.35;
  }
  private createPickaxe(): void {
    const wood = viewMaterial(0xf1dcc3), wrap = viewMaterial(0x34515a);
    wood.map = materialTexture("wood");
    const steel = viewMaterial(0x718d97), edge = viewMaterial(0xbdcfd0);
    steel.map = materialTexture("steel");
    box(this.pickaxe, [0.055, 0.69, 0.055], [0, 0.23, -0.04], wood);
    for (const y of [-0.035, 0.015, 0.065]) box(this.pickaxe, [0.069, 0.025, 0.069], [0, y, -0.04], wrap);
    box(this.pickaxe, [0.095, 0.17, 0.115], [0, 0.54, -0.04], steel);
    box(this.pickaxe, [0.39, 0.09, 0.1], [0, 0.57, -0.04], steel);
    box(this.pickaxe, [0.31, 0.022, 0.105], [0, 0.62, -0.04], edge);
    for (const side of [-1, 1]) {
      const tip = box(this.pickaxe, [0.19, 0.055, 0.07], [side * 0.24, 0.53, -0.04], edge);
      tip.rotation.z = side * -0.35;
    }
    box(this.pickaxe, [0.026, 0.035, 0.12], [0, 0.54, -0.04], viewMaterial(0xd6b875));
  }
  private createBlade(): void {
    const handle = viewMaterial(0x38525b), steel = viewMaterial(0x7e9ba7);
    const bright = viewMaterial(0xc5dadc), energy = viewMaterial(0x70ead5, 1.7);
    box(this.blade, [0.06, 0.19, 0.06], [0, 0.015, -0.04], handle);
    box(this.blade, [0.085, 0.065, 0.085], [0, -0.12, -0.04], steel);
    box(this.blade, [0.28, 0.045, 0.1], [0, 0.13, -0.04], steel);
    box(this.blade, [0.095, 0.5, 0.035], [0, 0.405, -0.04], steel);
    box(this.blade, [0.021, 0.5, 0.039], [-0.056, 0.405, -0.04], bright);
    box(this.blade, [0.012, 0.42, 0.039], [0.05, 0.395, -0.04], energy);
    const tip = box(this.blade, [0.068, 0.095, 0.035], [-0.013, 0.699, -0.04], bright);
    tip.rotation.z = -0.3;
    box(this.blade, [0.07, 0.025, 0.073], [0, 0.025, -0.04], viewMaterial(0xccad70));
  }
  private createRepeater(): void {
    const shell = viewMaterial(0xc0d6df), panel = viewMaterial(0x638997);
    shell.map = materialTexture("steel");
    const dark = viewMaterial(0x253f4c), steel = viewMaterial(0x9aafb4);
    const energy = viewMaterial(0x7df0d9, 1.8);
    box(this.repeater, [0.09, 0.16, 0.12], [0, -0.015, -0.05], dark);
    box(this.repeater, [0.21, 0.17, 0.48], [0, 0.12, -0.24], shell);
    box(this.repeater, [0.15, 0.025, 0.45], [0, 0.215, -0.24], panel);
    box(this.repeater, [0.018, 0.09, 0.26], [0.113, 0.13, -0.25], panel);
    for (let i = 0; i < 3; i++) box(this.repeater, [0.024, 0.025, 0.04], [0.115, 0.14, -0.19 - i * 0.07], dark);
    box(this.repeater, [0.11, 0.1, 0.55], [0, 0.135, -0.69], dark);
    for (const z of [-0.55, -0.69, -0.83]) box(this.repeater, [0.125, 0.115, 0.025], [0, 0.135, z], steel);
    box(this.repeater, [0.14, 0.13, 0.075], [0, 0.135, -1], shell);
    box(this.repeater, [0.065, 0.067, 0.005], [0, 0.135, -1.04], dark);
    box(this.repeater, [0.085, 0.06, 0.12], [0, 0.255, -0.3], energy);
    box(this.repeater, [0.04, 0.075, 0.035], [0, 0.25, -0.085], dark);
    box(this.repeater, [0.045, 0.035, 0.025], [0, 0.205, -0.94], energy);
    box(this.repeater, [0.125, 0.15, 0.15], [0, -0.015, -0.37], dark);
    box(this.repeater, [0.13, 0.032, 0.14], [0, -0.092, -0.37], panel);
    this.muzzle.name = "repeater-muzzle-flash";
    this.muzzle.position.set(0, 0.135, -1.07);
    this.muzzle.renderOrder = 1001;
    this.muzzle.visible = false;
    this.repeater.add(this.muzzle);
  }
}
function viewMaterial(color: number, glow = 1): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({ color, roughness: 0.72, metalness: 0.12,
    emissive: glow > 1 ? color : 0, emissiveIntensity: glow > 1 ? glow : 0 });
}
function box(group: THREE.Group, size: [number, number, number], position: [number, number, number], material: THREE.Material): THREE.Mesh {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(...size), material);
  mesh.position.set(...position); mesh.frustumCulled = false; mesh.renderOrder = 1000;
  group.add(mesh); return mesh;
}
