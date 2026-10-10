import * as THREE from "three";
import { PointerLockControls } from "three/examples/jsm/controls/PointerLockControls.js";

/** Pointer lock for FPS; explicit drag-look fallback for embedded browsers. */
export class PlayControls extends THREE.EventDispatcher<{ lock: {}; unlock: {} }> {
  private readonly pointer: PointerLockControls;
  private fallback = false;
  private preferDragLook = false;
  private dragging = false;
  private readonly euler = new THREE.Euler(0, 0, 0, "YXZ");
  constructor(private readonly camera: THREE.PerspectiveCamera, canvas: HTMLCanvasElement) {
    super();
    this.pointer = new PointerLockControls(camera, canvas);
    this.pointer.addEventListener("lock", () => this.dispatchEvent({ type: "lock" }));
    this.pointer.addEventListener("unlock", () => this.dispatchEvent({ type: "unlock" }));
    window.addEventListener("pointerdown", event => {
      if (this.fallback && event.button === 1) { this.dragging = true; event.preventDefault(); }
    });
    window.addEventListener("pointerup", event => { if (event.button === 1) this.dragging = false; });
    window.addEventListener("pointermove", event => {
      if (!this.fallback || !this.dragging) return;
      this.euler.setFromQuaternion(camera.quaternion);
      this.euler.y -= event.movementX * 0.002;
      this.euler.x = THREE.MathUtils.clamp(this.euler.x - event.movementY * 0.002,
        -Math.PI / 2 + 0.01, Math.PI / 2 - 0.01);
      camera.quaternion.setFromEuler(this.euler);
    });
    window.addEventListener("keydown", event => {
      if (this.fallback && event.code === "Escape") this.unlock();
    });
    window.addEventListener("blur", () => { this.dragging = false; });
  }
  get isLocked(): boolean { return this.pointer.isLocked || this.fallback; }
  lock(): void {
    if (this.preferDragLook) this.useDragLook();
    else this.pointer.lock();
  }
  useDragLook(): void {
    this.preferDragLook = true;
    this.fallback = true;
    this.dispatchEvent({ type: "lock" });
  }
  unlock(): void {
    if (this.fallback) {
      this.fallback = false;
      this.dragging = false;
      this.dispatchEvent({ type: "unlock" });
    } else this.pointer.unlock();
  }
}
