import { PointerLockControls } from "three/examples/jsm/controls/PointerLockControls.js";
import { GameLoop } from "../core/GameLoop";
import { Input } from "../core/Input";
import { PhysicsWorld } from "../engine/physics/PhysicsWorld";
import { Renderer3D } from "../engine/render/Renderer3D";
import { Hotbar } from "../player/Hotbar";
import { PlayerController } from "../player/PlayerController";
import { VoxelInteractionController } from "../player/VoxelInteractionController";
import { DebugOverlay } from "../ui/DebugOverlay";
import { VoxelWorld } from "../voxel/VoxelWorld";
import { ChunkManager } from "../voxel/render/ChunkManager";

interface GameAppOptions {
  canvas: HTMLCanvasElement;
  overlay: HTMLDivElement;
  playButton: HTMLButtonElement;
  loadingLabel: HTMLElement;
  debug: HTMLDivElement;
  hotbar: HTMLDivElement;
  targetInfo: HTMLDivElement;
}

export class GameApp {
  private readonly renderer: Renderer3D;
  private readonly input = new Input();
  private readonly controls: PointerLockControls;
  private readonly debugOverlay: DebugOverlay;
  private readonly hotbar: Hotbar;
  private physics!: PhysicsWorld;
  private player!: PlayerController;
  private world!: VoxelWorld;
  private chunks!: ChunkManager;
  private interaction!: VoxelInteractionController;
  private loop!: GameLoop;

  constructor(private readonly options: GameAppOptions) {
    this.renderer = new Renderer3D(options.canvas);
    this.controls = new PointerLockControls(this.renderer.camera, options.canvas);
    this.debugOverlay = new DebugOverlay(options.debug);
    this.hotbar = new Hotbar(options.hotbar);
  }

  async init(): Promise<void> {
    this.options.loadingLabel.textContent = "Inicializando Rapier...";
    this.physics = await PhysicsWorld.create();

    this.options.loadingLabel.textContent = "Construindo chunks nos Web Workers...";
    this.world = VoxelWorld.createTestWorld(1);
    this.chunks = new ChunkManager(this.world, this.renderer.scene, this.physics);
    await this.chunks.initialize();

    const spawnX = 0.5;
    const spawnZ = 8.5;
    const surfaceY = this.world.highestSolidY(Math.floor(spawnX), Math.floor(spawnZ));

    this.player = new PlayerController(
      this.renderer.camera,
      this.controls,
      this.input,
      this.physics,
      {
        x: spawnX,
        y: surfaceY + 2.4,
        z: spawnZ,
      },
    );

    this.interaction = new VoxelInteractionController(
      this.renderer.camera,
      this.renderer.scene,
      this.input,
      this.player,
      this.world,
      this.chunks,
      this.hotbar,
      this.options.targetInfo,
    );

    this.bindPointerLock();
    this.options.loadingLabel.textContent = "Voxel engine pronta.";

    this.loop = new GameLoop({
      fixedUpdate: (dt) => {
        this.player.fixedUpdate(dt);
        this.physics.step(dt);
        this.player.syncCamera();
        this.interaction.fixedUpdate();
      },
      render: (frameMs) => {
        this.interaction.renderUpdate();
        this.renderer.render();

        const chunkStats = this.chunks.getStats();
        this.debugOverlay.update({
          frameMs,
          renderer: this.renderer.renderer,
          player: this.player,
          locked: this.controls.isLocked,
          extraLines: [
            `CHUNKS    ${chunkStats.chunks}`,
            `DIRTY     ${chunkStats.dirty}`,
            `WORKERS   ${chunkStats.workersBusy} busy / ${chunkStats.workersPending} queued`,
            ...this.interaction.getDebugLines(),
          ],
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
