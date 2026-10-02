import * as THREE from "three";
import type { PointerLockControls } from "three/examples/jsm/controls/PointerLockControls.js";
import { PlayerActionMode } from "../combat/CombatTypes";
import type { Input } from "../core/Input";
import type { PlayerController } from "./PlayerController";

const BASE_POSITION = new THREE.Vector3(0.52, -0.48, -0.82);
const BASE_ROTATION = new THREE.Euler(-0.42, -0.18, -0.16, "XYZ");

export class FirstPersonHand {
  private readonly root = new THREE.Group();
  private readonly arm = new THREE.Group();
  private readonly blade = new THREE.Group();
  private readonly repeater = new THREE.Group();

  private actionMode = PlayerActionMode.Tool;
  private walkTime = 0;
  private attackTime = 1;
  private attackStrength = 1;
  private swayX = 0;
  private swayY = 0;

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

    this.createBlade();
    this.createRepeater();

    this.root.add(this.arm, this.blade, this.repeater);
    camera.add(this.root);
    this.setActionMode(PlayerActionMode.Tool);

    window.addEventListener("pointerdown", (event) => {
      if (
        event.button === 0 &&
        this.controls.isLocked &&
        this.actionMode === PlayerActionMode.Tool
      ) {
        this.triggerAttack(1);
      }
    });

    this.controls.addEventListener("lock", () => {
      this.root.visible = true;
    });

    this.controls.addEventListener("unlock", () => {
      this.root.visible = false;
    });
  }

  setActionMode(mode: PlayerActionMode): void {
    this.actionMode = mode;
    this.blade.visible = mode === PlayerActionMode.Blade;
    this.repeater.visible = mode === PlayerActionMode.Repeater;
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

    const bobStrength = moving && grounded ? (sprinting ? 0.038 : 0.026) : 0;
    const bobX = Math.sin(this.walkTime) * bobStrength;
    const bobY = Math.abs(Math.cos(this.walkTime)) * bobStrength * 0.75;

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

    if (Math.abs(pointer.x) < 0.01) this.swayX *= Math.pow(0.001, dt);
    if (Math.abs(pointer.y) < 0.01) this.swayY *= Math.pow(0.001, dt);

    this.attackTime = Math.min(1, this.attackTime + dt / 0.22);
    const wave = Math.sin(this.attackTime * Math.PI) * this.attackStrength;
    const bladeFactor =
      this.actionMode === PlayerActionMode.Blade ? 1.25 : 1;
    const forward = wave * 0.32 * bladeFactor;
    const down = wave * 0.075;
    const pitch = wave * -0.68 * bladeFactor;

    this.root.position.set(
      BASE_POSITION.x + bobX + this.swayX,
      BASE_POSITION.y - bobY + this.swayY - down,
      BASE_POSITION.z - forward,
    );

    this.root.rotation.set(
      BASE_ROTATION.x + pitch + this.swayY * 0.5,
      BASE_ROTATION.y + this.swayX * 0.65,
      BASE_ROTATION.z - bobX * 1.8 +
        (this.actionMode === PlayerActionMode.Blade ? wave * 0.38 : 0),
    );
  }

  triggerAttack(strength = 1): void {
    this.attackTime = 0;
    this.attackStrength = strength;
  }

  triggerPunch(): void {
    this.triggerAttack(1);
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
