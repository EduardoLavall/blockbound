import type * as THREE from "three";
import type { PlayerController } from "../player/PlayerController";

interface DebugState {
  frameMs: number;
  renderer: THREE.WebGLRenderer;
  player: PlayerController;
  locked: boolean;
}

export class DebugOverlay {
  private elapsed = 0;

  constructor(private readonly element: HTMLDivElement) {}

  update(state: DebugState): void {
    this.elapsed += state.frameMs;
    if (this.elapsed < 100) return;
    this.elapsed = 0;

    const player = state.player.getDebugState();
    const fps = state.frameMs > 0 ? 1000 / state.frameMs : 0;
    const info = state.renderer.info.render;

    this.element.textContent = [
      `FPS       ${fps.toFixed(0)}`,
      `FRAME     ${state.frameMs.toFixed(1)} ms`,
      `POS       ${player.x.toFixed(2)} ${player.y.toFixed(2)} ${player.z.toFixed(2)}`,
      `VEL Y     ${player.verticalVelocity.toFixed(2)}`,
      `GROUNDED  ${player.grounded ? "YES" : "NO"}`,
      `LOCKED    ${state.locked ? "YES" : "NO"}`,
      `DRAWS     ${info.calls}`,
      `TRIS      ${info.triangles}`,
    ].join("\n");
  }
}
