import { PointerLockControls } from "three/examples/jsm/controls/PointerLockControls.js";
import { GameLoop } from "../core/GameLoop";
import { Input } from "../core/Input";
import { PhysicsWorld } from "../engine/physics/PhysicsWorld";
import { Renderer3D } from "../engine/render/Renderer3D";
import { createTestArena } from "../world/createTestArena";
import { PlayerController } from "../player/PlayerController";
import { DebugOverlay } from "../ui/DebugOverlay";

interface GameAppOptions {
  canvas: HTMLCanvasElement;
  overlay: HTMLDivElement;
  playButton: HTMLButtonElement;
  loadingLabel: HTMLElement;
  debug: HTMLDivElement;
}

export class GameApp {
  private readonly renderer: Renderer3D;
  private readonly input = new Input();
  private readonly controls: PointerLockControls;
  private readonly debugOverlay: DebugOverlay;
  private physics!: PhysicsWorld;
  private player!: PlayerController;
  private loop!: GameLoop;

  constructor(private readonly options: GameAppOptions) {
    this.renderer = new Renderer3D(options.canvas);
    this.controls = new PointerLockControls(this.renderer.camera, options.canvas);
    this.debugOverlay = new DebugOverlay(options.debug);
  }

  async init(): Promise<void> {
    this.physics = await PhysicsWorld.create();
    createTestArena(this.renderer.scene, this.physics);

    this.player = new PlayerController(
      this.renderer.camera,
      this.controls,
      this.input,
      this.physics,
    );

    this.bindPointerLock();
    this.options.loadingLabel.textContent = "Three.js + Rapier prontos.";

    this.loop = new GameLoop({
      fixedUpdate: (dt) => {
        this.player.fixedUpdate(dt);
        this.physics.step(dt);
        this.player.syncCamera();
      },
      render: (frameMs) => {
        this.renderer.render();
        this.debugOverlay.update({
          frameMs,
          renderer: this.renderer.renderer,
          player: this.player,
          locked: this.controls.isLocked,
        });
      },
    });

    this.loop.start();
  }

  private bindPointerLock(): void {
    this.options.playButton.addEventListener("click", () => this.controls.lock());

    this.controls.addEventListener("lock", () => {
      this.options.overlay.classList.add("hidden");
      this.input.setEnabled(true);
    });

    this.controls.addEventListener("unlock", () => {
      this.options.overlay.classList.remove("hidden");
      this.input.setEnabled(false);
    });
  }
}
