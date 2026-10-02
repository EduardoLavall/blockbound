import * as THREE from "three";
import type { PointerLockControls } from "three/examples/jsm/controls/PointerLockControls.js";
import RAPIER from "@dimforge/rapier3d-compat";
import type { Input } from "../core/Input";
import type { PhysicsWorld } from "../engine/physics/PhysicsWorld";

const UP = new THREE.Vector3(0, 1, 0);

export class PlayerController {
  private readonly body: RAPIER.RigidBody;
  private readonly collider: RAPIER.Collider;
  private readonly characterController: RAPIER.KinematicCharacterController;
  private readonly forward = new THREE.Vector3();
  private readonly right = new THREE.Vector3();
  private readonly wish = new THREE.Vector3();
  private verticalVelocity = 0;
  private grounded = false;

  constructor(
    private readonly camera: THREE.PerspectiveCamera,
    private readonly controls: PointerLockControls,
    private readonly input: Input,
    physics: PhysicsWorld,
  ) {
    this.body = physics.world.createRigidBody(
      RAPIER.RigidBodyDesc.kinematicPositionBased()
        .setTranslation(0, 2.2, 8)
        .setCanSleep(false),
    );

    this.collider = physics.world.createCollider(
      RAPIER.ColliderDesc.capsule(0.55, 0.35)
        .setFriction(0)
        .setActiveEvents(RAPIER.ActiveEvents.COLLISION_EVENTS),
      this.body,
    );

    this.characterController = physics.world.createCharacterController(0.02);
    this.characterController.enableAutostep(0.42, 0.18, true);
    this.characterController.enableSnapToGround(0.32);
    this.characterController.setMaxSlopeClimbAngle(50 * Math.PI / 180);
    this.characterController.setMinSlopeSlideAngle(55 * Math.PI / 180);

    this.syncCamera();
  }

  fixedUpdate(dt: number): void {
    if (!this.controls.isLocked) return;

    const walkSpeed = this.input.isDown("ShiftLeft") || this.input.isDown("ShiftRight") ? 8.4 : 5.4;
    this.camera.getWorldDirection(this.forward);
    this.forward.y = 0;
    if (this.forward.lengthSq() < 0.0001) this.forward.set(0, 0, -1);
    this.forward.normalize();
    this.right.crossVectors(this.forward, UP).normalize();

    const forwardAxis = Number(this.input.isDown("KeyW")) - Number(this.input.isDown("KeyS"));
    const rightAxis = Number(this.input.isDown("KeyD")) - Number(this.input.isDown("KeyA"));

    this.wish.set(0, 0, 0)
      .addScaledVector(this.forward, forwardAxis)
      .addScaledVector(this.right, rightAxis);

    if (this.wish.lengthSq() > 1) this.wish.normalize();

    if (this.input.consumePressed("Space") && this.grounded) {
      this.verticalVelocity = 7.2;
      this.grounded = false;
    }

    this.verticalVelocity += -18 * dt;
    if (this.verticalVelocity < -28) this.verticalVelocity = -28;

    const desired = {
      x: this.wish.x * walkSpeed * dt,
      y: this.verticalVelocity * dt,
      z: this.wish.z * walkSpeed * dt,
    };

    this.characterController.computeColliderMovement(this.collider, desired);
    const corrected = this.characterController.computedMovement();
    this.grounded = this.characterController.computedGrounded();

    if (this.grounded && this.verticalVelocity < 0) {
      this.verticalVelocity = 0;
    }

    const current = this.body.translation();
    this.body.setNextKinematicTranslation({
      x: current.x + corrected.x,
      y: current.y + corrected.y,
      z: current.z + corrected.z,
    });
  }

  syncCamera(): void {
    const position = this.body.translation();
    this.camera.position.set(position.x, position.y + 0.55, position.z);
  }

  getDebugState(): { x: number; y: number; z: number; verticalVelocity: number; grounded: boolean } {
    const position = this.body.translation();
    return {
      x: position.x,
      y: position.y,
      z: position.z,
      verticalVelocity: this.verticalVelocity,
      grounded: this.grounded,
    };
  }
}
