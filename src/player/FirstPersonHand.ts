import * as THREE from "three";
import type { PointerLockControls } from "three/examples/jsm/controls/PointerLockControls.js";
import { PlayerActionMode } from "../combat/CombatTypes";
import type { Input } from "../core/Input";
import { miningSwingCount } from "../survival/MiningTool";
import type { PlayerController } from "./PlayerController";

const BASE_POSITION = new THREE.Vector3(0.52, -0.48, -0.82);
const BASE_ROTATION = new THREE.Euler(-0.42, -0.18, -0.16, "XYZ");

export class FirstPersonHand {
  private readonly root = new THREE.Group();
  private readonly arm = new THREE.Group();
  private readonly pickaxe = new THREE.Group();
  private readonly blade = new THREE.Group();
  private readonly repeater = new THREE.Group();

  private actionMode = PlayerActionMode.Tool;
  private walkTime = 0;
  private attackTime = 1;
  private attackStrength = 1;
  private swayX = 0;
  private swayY = 0;
  private miningActive = false;
  private miningProgress = 0;
  private miningDuration = 0;

  constructor(
    camera: THREE.PerspectiveCamera,
    private readonly controls: PointerLockControls,
    private readonly input: Input,
    private readonly player: PlayerController,
  ) {
    this.root.name = "first-person-hand";
    this.root.position.copy(BASE_POSITION);
    this.root.rotation.copy(BASE_ROTATION);
    this.root.visible = false;

    const skin = viewMaterial(0xb9825d, 0.88, 0);
    const glove = viewMaterial(0x2c342e, 0.82, 0.04);
    const cuff = viewMaterial(0xc79e43, 0.7, 0.12);

    const forearm = new THREE.Mesh(
      new THREE.BoxGeometry(0.24, 0.24, 0.62),
      glove,
    );
    forearm.position.set(0, 0, -0.2);
    forearm.rotation.x = 0.08;

    const wrist = new THREE.Mesh(
      new THREE.BoxGeometry(0.27, 0.27, 0.14),
      cuff,
    );
    wrist.position.set(0, 0, -0.52);

    const hand = new THREE.Mesh(
      new THREE.BoxGeometry(0.29, 0.25, 0.32),
      skin,
    );
    hand.position.set(0, -0.01, -0.73);

    const knuckle = new THREE.Mesh(
      new THREE.BoxGeometry(0.3, 0.12, 0.12),
      skin,
    );
    knuckle.position.set(0, 0.07, -0.9);

    for (const mesh of [forearm, wrist, hand, knuckle]) {
      prepareViewMesh(mesh);
      this.arm.add(mesh);
    }

    this.createPickaxe();
    this.createBlade();
    this.createRepeater();

    this.root.add(
      this.arm,
      this.pickaxe,
      this.blade,
      this.repeater,
    );
    camera.add(this.root);
    this.setActionMode(PlayerActionMode.Tool);

    this.controls.addEventListener("lock", () => {
      this.root.visible = true;
    });

    this.controls.addEventListener("unlock", () => {
      this.root.visible = false;
    });
  }

  setActionMode(mode: PlayerActionMode): void {
    this.actionMode = mode;
    this.pickaxe.visible = mode === PlayerActionMode.Tool;
    this.blade.visible = mode === PlayerActionMode.Blade;
    this.repeater.visible = mode === PlayerActionMode.Repeater;

    if (mode !== PlayerActionMode.Tool) {
      this.setMiningState(false, 0, 0);
    }
  }

  setMiningState(
    active: boolean,
    progress: number,
    duration: number,
  ): void {
    this.miningActive =
      active && this.actionMode === PlayerActionMode.Tool;
    this.miningProgress = THREE.MathUtils.clamp(progress, 0, 1);
    this.miningDuration = Math.max(0, duration);
  }

  update(frameMs: number): void {
    const dt = Math.min(frameMs / 1000, 0.05);

    const moving =
      this.controls.isLocked &&
      (
        this.input.isDown("KeyW") ||
        this.input.isDown("KeyA") ||
        this.input.isDown("KeyS") ||
        this.input.isDown("KeyD")
      );

    const grounded = this.player.getDebugState().grounded;
    const sprinting =
      this.input.isDown("ShiftLeft") || this.input.isDown("ShiftRight");

    if (moving && grounded) {
      this.walkTime += dt * (sprinting ? 12 : 8);
    }

    const bobStrength =
      moving && grounded ? (sprinting ? 0.038 : 0.026) : 0;
    const bobX = Math.sin(this.walkTime) * bobStrength;
    const bobY =
      Math.abs(Math.cos(this.walkTime)) * bobStrength * 0.75;

    const pointer = this.input.consumePointerDelta();
    this.swayX = THREE.MathUtils.lerp(
      this.swayX,
      THREE.MathUtils.clamp(pointer.x * -0.0018, -0.055, 0.055),
      0.38,
    );
    this.swayY = THREE.MathUtils.lerp(
      this.swayY,
      THREE.MathUtils.clamp(pointer.y * -0.0015, -0.045, 0.045),
      0.38,
    );

    if (Math.abs(pointer.x) < 0.01) {
      this.swayX *= Math.pow(0.001, dt);
    }
    if (Math.abs(pointer.y) < 0.01) {
      this.swayY *= Math.pow(0.001, dt);
    }

    this.attackTime = Math.min(1, this.attackTime + dt / 0.22);
    const attackWave =
      Math.sin(this.attackTime * Math.PI) * this.attackStrength;

    const miningCycles = miningSwingCount(this.miningDuration);
    const miningPhase =
      (this.miningProgress * miningCycles) % 1;
    const miningWave =
      this.miningActive
        ? Math.sin(miningPhase * Math.PI)
        : 0;

    const toolWave =
      this.actionMode === PlayerActionMode.Tool
        ? Math.max(attackWave, miningWave)
        : 0;
    const bladeFactor =
      this.actionMode === PlayerActionMode.Blade ? 1.25 : 1;

    const forward =
      attackWave * 0.32 * bladeFactor +
      toolWave * 0.12;
    const down =
      attackWave * 0.075 +
      toolWave * 0.1;
    const pitch =
      attackWave * -0.68 * bladeFactor +
      toolWave * -0.92;
    const toolRoll = toolWave * 0.28;

    this.root.position.set(
      BASE_POSITION.x + bobX + this.swayX,
      BASE_POSITION.y - bobY + this.swayY - down,
      BASE_POSITION.z - forward,
    );

    this.root.rotation.set(
      BASE_ROTATION.x + pitch + this.swayY * 0.5,
      BASE_ROTATION.y + this.swayX * 0.65,
      BASE_ROTATION.z -
        bobX * 1.8 +
        (this.actionMode === PlayerActionMode.Blade
          ? attackWave * 0.38
          : toolRoll),
    );
  }

  triggerAttack(strength = 1): void {
    this.attackTime = 0;
    this.attackStrength = strength;
  }

  private createPickaxe(): void {
    const handle = viewMaterial(0x725038, 0.88, 0.02);
    const grip = viewMaterial(0x2d342f, 0.85, 0.04);
    const metal = viewMaterial(0x9ba7a5, 0.38, 0.62);
    const edge = viewMaterial(0xc5d2cf, 0.26, 0.74);

    const shaft = new THREE.Mesh(
      new THREE.BoxGeometry(0.12, 0.12, 0.95),
      handle,
    );
    shaft.position.set(0, 0.02, -1.28);

    const lowerGrip = new THREE.Mesh(
      new THREE.BoxGeometry(0.15, 0.15, 0.28),
      grip,
    );
    lowerGrip.position.set(0, 0.02, -0.92);

    const head = new THREE.Mesh(
      new THREE.BoxGeometry(0.78, 0.17, 0.2),
      metal,
    );
    head.position.set(0, 0.02, -1.76);

    const leftTip = new THREE.Mesh(
      new THREE.BoxGeometry(0.26, 0.1, 0.12),
      edge,
    );
    leftTip.position.set(-0.48, 0.02, -1.76);
    leftTip.rotation.z = -0.22;

    const rightTip = new THREE.Mesh(
      new THREE.BoxGeometry(0.26, 0.1, 0.12),
      edge,
    );
    rightTip.position.set(0.48, 0.02, -1.76);
    rightTip.rotation.z = 0.22;

    for (const mesh of [
      shaft,
      lowerGrip,
      head,
      leftTip,
      rightTip,
    ]) {
      prepareViewMesh(mesh);
      this.pickaxe.add(mesh);
    }
  }

  private createBlade(): void {
    const handle = viewMaterial(0x4b3429, 0.8, 0.05);
    const metal = viewMaterial(0xbac1ba, 0.34, 0.58);
    const energy = viewMaterial(0x76ddd5, 0.28, 0.1, 0x174b4a);

    const grip = new THREE.Mesh(
      new THREE.BoxGeometry(0.16, 0.16, 0.5),
      handle,
    );
    grip.position.set(0, 0.02, -0.98);

    const guard = new THREE.Mesh(
      new THREE.BoxGeometry(0.46, 0.12, 0.12),
      metal,
    );
    guard.position.set(0, 0.02, -1.22);

    const blade = new THREE.Mesh(
      new THREE.BoxGeometry(0.13, 0.08, 0.92),
      metal,
    );
    blade.position.set(0, 0.04, -1.72);

    const edge = new THREE.Mesh(
      new THREE.BoxGeometry(0.035, 0.055, 0.78),
      energy,
    );
    edge.position.set(0.08, 0.04, -1.72);

    for (const mesh of [grip, guard, blade, edge]) {
      prepareViewMesh(mesh);
      this.blade.add(mesh);
    }
  }

  private createRepeater(): void {
    const body = viewMaterial(0x485653, 0.62, 0.28);
    const dark = viewMaterial(0x232b29, 0.8, 0.14);
    const energy = viewMaterial(0xe0b95f, 0.35, 0.18, 0x4a3310);

    const receiver = new THREE.Mesh(
      new THREE.BoxGeometry(0.34, 0.3, 0.7),
      body,
    );
    receiver.position.set(0, 0.01, -1.12);

    const barrel = new THREE.Mesh(
      new THREE.BoxGeometry(0.11, 0.11, 0.86),
      dark,
    );
    barrel.position.set(0, 0.03, -1.86);

    const side = new THREE.Mesh(
      new THREE.BoxGeometry(0.62, 0.11, 0.42),
      body,
    );
    side.position.set(0, 0.1, -1.25);

    const cell = new THREE.Mesh(
      new THREE.BoxGeometry(0.16, 0.16, 0.22),
      energy,
    );
    cell.position.set(0, 0.24, -1.18);

    for (const mesh of [receiver, barrel, side, cell]) {
      prepareViewMesh(mesh);
      this.repeater.add(mesh);
    }
  }
}

function viewMaterial(
  color: number,
  roughness: number,
  metalness: number,
  emissive = 0x000000,
): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({
    color,
    emissive,
    emissiveIntensity: emissive ? 1.5 : 0,
    roughness,
    metalness,
    depthTest: false,
    depthWrite: false,
  });
}

function prepareViewMesh(mesh: THREE.Mesh): void {
  mesh.frustumCulled = false;
  mesh.renderOrder = 1000;
}
