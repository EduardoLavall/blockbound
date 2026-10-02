import { PointerLockControls } from "three/examples/jsm/controls/PointerLockControls.js";
import { Core } from "../building/Core";
import { StructureSystem } from "../building/StructureSystem";
import { GameLoop } from "../core/GameLoop";
import { Input } from "../core/Input";
import { PhysicsWorld } from "../engine/physics/PhysicsWorld";
import { Renderer3D } from "../engine/render/Renderer3D";
import { FirstPersonHand } from "../player/FirstPersonHand";
import { Hotbar } from "../player/Hotbar";
import { InteractionMode } from "../player/InteractionMode";
import { PlayerController } from "../player/PlayerController";
import { VoxelInteractionController } from "../player/VoxelInteractionController";
import { Inventory } from "../survival/Inventory";
import { ResourceDropSystem } from "../survival/ResourceDropSystem";
import { DebugOverlay } from "../ui/DebugOverlay";
import { SurvivalHUD } from "../ui/SurvivalHUD";
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
  buildBar: HTMLDivElement;
  targetInfo: HTMLDivElement;
  buildInfo: HTMLDivElement;
  miningProgress: HTMLDivElement;
  inventoryHud: HTMLDivElement;
  coreHud: HTMLDivElement;
  status: HTMLDivElement;
}

export class GameApp {
  private readonly renderer: Renderer3D;
  private readonly input = new Input();
  private readonly controls: PointerLockControls;
  private readonly debugOverlay: DebugOverlay;
  private readonly hotbar: Hotbar;
  private readonly inventory = new Inventory();
  private readonly mode = new InteractionMode();

  private physics!: PhysicsWorld;
  private player!: PlayerController;
  private hand!: FirstPersonHand;
  private world!: VoxelWorld;
  private metadata!: WorldMetadata;
  private chunks!: ChunkManager;
  private interaction!: VoxelInteractionController;
  private drops!: ResourceDropSystem;
  private structures!: StructureSystem;
  private core!: Core;
  private survivalHud!: SurvivalHUD;
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

    const coreSurface = this.world.highestSolidY(
      this.metadata.core.x,
      this.metadata.core.z,
    );
    this.core = new Core(
      this.renderer.scene,
      this.physics,
      this.metadata.core.x,
      coreSurface + 1,
      this.metadata.core.z,
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

    this.drops = new ResourceDropSystem(
      this.renderer.scene,
      this.inventory,
      this.player,
    );

    this.structures = new StructureSystem(
      this.renderer.scene,
      this.renderer.camera,
      this.input,
      this.player,
      this.world,
      this.physics,
      this.inventory,
      this.mode,
      this.core,
      this.metadata.bounds,
      this.options.buildBar,
      this.options.buildInfo,
    );

    this.interaction = new VoxelInteractionController(
      this.renderer.camera,
      this.renderer.scene,
      this.input,
      this.player,
      this.world,
      this.chunks,
      this.hotbar,
      this.inventory,
      this.drops,
      this.mode,
      this.options.targetInfo,
      this.options.miningProgress,
    );

    this.survivalHud = new SurvivalHUD(
      this.inventory,
      this.core,
      this.options.inventoryHud,
      this.options.coreHud,
    );

    const size =
      this.metadata.bounds.maxXExclusive - this.metadata.bounds.minX;
    this.options.status.textContent =
      "SURVIVAL " + size + "×" + size + " · SEED " + seed.text;

    this.bindPointerLock();
    this.options.loadingLabel.textContent =
      "Survival loop pronto. Minere, colete e construa.";

    this.loop = new GameLoop({
      fixedUpdate: (dt) => {
        this.player.fixedUpdate(dt);
        this.physics.step(dt);
        this.player.syncCamera();

        this.structures.fixedUpdate(dt);
        this.interaction.fixedUpdate(dt);
        this.drops.update(dt);
        this.core.update(dt);
      },
      render: (frameMs) => {
        this.options.hotbar.classList.toggle(
          "hidden",
          this.mode.buildMode,
        );
        this.options.targetInfo.classList.toggle(
          "hidden",
          this.mode.buildMode,
        );

        this.structures.renderUpdate();
        this.interaction.renderUpdate();
        this.survivalHud.update();
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
            "CORE      " + Math.round(this.core.health.current) +
              "/" + this.core.health.max,
            "DROPS     " + this.drops.count,
            "CHUNKS    " + chunkStats.chunks,
            "DIRTY     " + chunkStats.dirty,
            "WORKERS   " + chunkStats.workersBusy +
              " busy / " + chunkStats.workersPending + " queued",
            ...this.structures.getDebugLines(),
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
