import { PointerLockControls } from "three/examples/jsm/controls/PointerLockControls.js";
import { GameLoop } from "../core/GameLoop";
import { Input } from "../core/Input";
import { PhysicsWorld } from "../engine/physics/PhysicsWorld";
import { Renderer3D } from "../engine/render/Renderer3D";
import { FirstPersonHand } from "../player/FirstPersonHand";
import { Hotbar } from "../player/Hotbar";
import { PlayerController } from "../player/PlayerController";
import { VoxelInteractionController } from "../player/VoxelInteractionController";
import { DebugOverlay } from "../ui/DebugOverlay";
import { BiomeId } from "../voxel/generation/Biomes";
import {
  createRandomRunSeed,
  createRunSeed,
  type RunSeed,
} from "../voxel/generation/Seed";
import {
  generateWorld,
  type WorldGenerationResult,
} from "../voxel/generation/WorldGenerator";
import type { WorldMetadata } from "../voxel/generation/WorldMetadata";
import { ChunkManager } from "../voxel/render/ChunkManager";
import type { VoxelWorld } from "../voxel/VoxelWorld";
import { createWorldBoundary } from "../world/WorldBoundary";
import { createWorldLandmarks } from "../world/WorldLandmarks";

interface GameAppOptions {
  canvas: HTMLCanvasElement;
  overlay: HTMLDivElement;
  playButton: HTMLButtonElement;
  loadingLabel: HTMLElement;
  debug: HTMLDivElement;
  hotbar: HTMLDivElement;
  targetInfo: HTMLDivElement;
  status: HTMLDivElement;
}

export class GameApp {
  private readonly renderer: Renderer3D;
  private readonly input = new Input();
  private readonly controls: PointerLockControls;
  private readonly debugOverlay: DebugOverlay;
  private readonly hotbar: Hotbar;
  private physics!: PhysicsWorld;
  private player!: PlayerController;
  private hand!: FirstPersonHand;
  private world!: VoxelWorld;
  private metadata!: WorldMetadata;
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

    const seed = this.resolveRunSeed();
    this.options.loadingLabel.textContent =
      "Gerando mundo finito · seed " + seed.text + "...";

    const generation = generateWorld(seed);
    this.applyGeneration(generation);

    this.options.loadingLabel.textContent =
      "Construindo " + this.world.getChunks().length + " chunks...";
    this.chunks = new ChunkManager(
      this.world,
      this.renderer.scene,
      this.physics,
    );
    await this.chunks.initialize();

    createWorldBoundary(
      this.renderer.scene,
      this.physics,
      this.metadata.bounds,
    );
    createWorldLandmarks(
      this.renderer.scene,
      this.world,
      this.metadata,
    );

    const spawnX = this.metadata.playerSpawn.x + 0.5;
    const spawnZ = this.metadata.playerSpawn.z + 0.5;
    const surfaceY = this.world.highestSolidY(
      this.metadata.playerSpawn.x,
      this.metadata.playerSpawn.z,
    );

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

    this.hand = new FirstPersonHand(
      this.renderer.camera,
      this.controls,
      this.input,
      this.player,
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

    const size =
      this.metadata.bounds.maxXExclusive - this.metadata.bounds.minX;
    this.options.status.textContent =
      "FINITE WORLD " + size + "×" + size + " · SEED " + seed.text;

    this.bindPointerLock();
    this.options.loadingLabel.textContent =
      "Mundo procedural pronto. Use ?seed=" + seed.text + " para reproduzir.";

    this.loop = new GameLoop({
      fixedUpdate: (dt) => {
        this.player.fixedUpdate(dt);
        this.physics.step(dt);
        this.player.syncCamera();
        this.interaction.fixedUpdate();
      },
      render: (frameMs) => {
        this.interaction.renderUpdate();
        this.hand.update(frameMs);
        this.renderer.render();

        const chunkStats = this.chunks.getStats();
        this.debugOverlay.update({
          frameMs,
          renderer: this.renderer.renderer,
          player: this.player,
          locked: this.controls.isLocked,
          extraLines: [
            "SEED      " + this.metadata.seed.text,
            "WORLD     " + size + "x" + size + " finite",
            "BIOMES    P" + this.metadata.biomeCounts[BiomeId.Plains] +
              " F" + this.metadata.biomeCounts[BiomeId.Forest] +
              " R" + this.metadata.biomeCounts[BiomeId.Rocky],
            "POIS      " + this.metadata.pois.length,
            "CHUNKS    " + chunkStats.chunks,
            "DIRTY     " + chunkStats.dirty,
            "WORKERS   " + chunkStats.workersBusy +
              " busy / " + chunkStats.workersPending + " queued",
            ...this.interaction.getDebugLines(),
          ],
        });
      },
    });

    this.loop.start();
  }

  private applyGeneration(generation: WorldGenerationResult): void {
    this.world = generation.world;
    this.metadata = generation.metadata;
  }

  private resolveRunSeed(): RunSeed {
    const params = new URLSearchParams(window.location.search);
    const explicit = params.get("seed");
    if (explicit) return createRunSeed(explicit);

    const seed = createRandomRunSeed();
    params.set("seed", seed.text);
    const query = params.toString();
    const nextUrl =
      window.location.pathname +
      (query ? "?" + query : "") +
      window.location.hash;
    window.history.replaceState(null, "", nextUrl);
    return seed;
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
