import * as THREE from "three";
import type { PointerLockControls } from "three/examples/jsm/controls/PointerLockControls.js";
import type { Input } from "../core/Input";
import type { PlayerController } from "./PlayerController";

const BASE_POSITION = new THREE.Vector3(0.52, -0.48, -0.82);
const BASE_ROTATION = new THREE.Euler(-0.42, -0.18, -0.16, "XYZ");

export class FirstPersonHand {
  private readonly root = new THREE.Group();
  private readonly arm = new THREE.Group();
  private walkTime = 0;
  private punchTime = 1;
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

    const skin = new THREE.MeshStandardMaterial({
      color: 0xb9825d,
      roughness: 0.88,
      metalness: 0,
      depthTest: false,
      depthWrite: false,
    });
    const glove = new THREE.MeshStandardMaterial({
      color: 0x2c342e,
      roughness: 0.82,
      metalness: 0.04,
      depthTest: false,
      depthWrite: false,
    });
    const cuff = new THREE.MeshStandardMaterial({
      color: 0xc79e43,
      roughness: 0.7,
      metalness: 0.12,
      depthTest: false,
      depthWrite: false,
    });

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
      mesh.frustumCulled = false;
      mesh.renderOrder = 1000;
      this.arm.add(mesh);
    }

    this.root.add(this.arm);
    camera.add(this.root);

    window.addEventListener("pointerdown", (event) => {
      if (event.button === 0 && this.controls.isLocked) {
        this.triggerPunch();
      }
    });

    this.controls.addEventListener("lock", () => {
      this.root.visible = true;
    });

    this.controls.addEventListener("unlock", () => {
      this.root.visible = false;
    });
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

    this.punchTime = Math.min(1, this.punchTime + dt / 0.22);
    const punchWave = Math.sin(this.punchTime * Math.PI);
    const punchForward = punchWave * 0.34;
    const punchDown = punchWave * 0.08;
    const punchPitch = punchWave * -0.72;

    this.root.position.set(
      BASE_POSITION.x + bobX + this.swayX,
      BASE_POSITION.y - bobY + this.swayY - punchDown,
      BASE_POSITION.z - punchForward,
    );

    this.root.rotation.set(
      BASE_ROTATION.x + punchPitch + this.swayY * 0.5,
      BASE_ROTATION.y + this.swayX * 0.65,
      BASE_ROTATION.z - bobX * 1.8,
    );
  }

  triggerPunch(): void {
    this.punchTime = 0;
  }
}
