import { PointerLockControls } from "three/examples/jsm/controls/PointerLockControls.js";
import { EnemySystem } from "../ai/EnemySystem";
import { BreachPlanner } from "../ai/navigation/BreachPlanner";
import { FlowField } from "../ai/navigation/FlowField";
import { NavigationGrid } from "../ai/navigation/NavigationGrid";
import { Core } from "../building/Core";
import { StructureSystem } from "../building/StructureSystem";
import { GameLoop } from "../core/GameLoop";
import { Input } from "../core/Input";
import {
  DayNightSystem,
  DayPhase,
} from "../defense/DayNightSystem";
import { DefenseCombatSystem } from "../defense/DefenseCombatSystem";
import { SpawnDirector } from "../defense/SpawnDirector";
import { WaveDirector } from "../defense/WaveDirector";
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
import { HordeHUD } from "../ui/HordeHUD";
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
  hordeHud: HTMLDivElement;
  defeatOverlay: HTMLDivElement;
  restartButton: HTMLButtonElement;
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
  private readonly dayNight = new DayNightSystem();

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

  private navigation!: NavigationGrid;
  private flow!: FlowField;
  private breachPlanner!: BreachPlanner;
  private enemies!: EnemySystem;
  private spawns!: SpawnDirector;
  private waves!: WaveDirector;
  private defenseCombat!: DefenseCombatSystem;
  private hordeHud!: HordeHUD;

  private loop!: GameLoop;
  private defeated = false;

  constructor(private readonly options: GameAppOptions) {
    this.renderer = new Renderer3D(options.canvas);
    this.controls = new PointerLockControls(
      this.renderer.camera,
      options.canvas,
    );
    this.debugOverlay = new DebugOverlay(options.debug);
    this.hotbar = new Hotbar(options.hotbar);

    this.options.restartButton.addEventListener("click", () => {
      window.location.reload();
    });
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

    this.navigation = new NavigationGrid(
      this.world,
      this.structures,
      this.metadata.bounds,
    );
    this.flow = new FlowField(
      this.navigation,
      this.metadata.core.x,
      this.metadata.core.z,
    );
    this.breachPlanner = new BreachPlanner(this.structures);

    this.enemies = new EnemySystem(
      this.renderer.scene,
      this.navigation,
      this.flow,
      this.breachPlanner,
      this.structures,
      this.core,
    );

    this.spawns = new SpawnDirector(
      this.metadata.seed.value,
      this.metadata.spawnZones,
      this.navigation,
      this.enemies,
    );
    this.waves = new WaveDirector(this.spawns);
    this.defenseCombat = new DefenseCombatSystem(
      this.renderer.scene,
      this.structures,
      this.enemies,
    );

    this.survivalHud = new SurvivalHUD(
      this.inventory,
      this.core,
      this.options.inventoryHud,
      this.options.coreHud,
    );

    this.hordeHud = new HordeHUD(
      this.options.hordeHud,
      this.dayNight,
      this.waves,
      this.enemies,
      this.navigation,
      this.flow,
    );

    const size =
      this.metadata.bounds.maxXExclusive - this.metadata.bounds.minX;
    this.options.status.textContent =
      "DAY · " + size + "×" + size + " · SEED " + seed.text;

    this.bindPointerLock();
    this.options.loadingLabel.textContent =
      "Prepare a defesa. A primeira noite começa em " +
      Math.ceil(this.dayNight.timeRemaining) +
      "s.";

    this.loop = new GameLoop({
      fixedUpdate: (dt) => {
        if (this.defeated) return;

        this.player.fixedUpdate(dt);
        this.physics.step(dt);
        this.player.syncCamera();

        this.structures.fixedUpdate(dt);
        this.interaction.fixedUpdate(dt);
        this.drops.update(dt);
        this.core.update(dt);

        const transition = this.dayNight.update(dt);
        if (transition?.to === DayPhase.Night) {
          this.waves.startNight(transition.night);
        } else if (transition?.to === DayPhase.Day) {
          this.waves.endNight();
        }

        this.navigation.updateDirty();
        this.flow.updateIfNeeded();

        this.waves.update(
          dt,
          this.dayNight.phase,
          this.enemies.aliveCount,
        );
        this.enemies.fixedUpdate(dt);
        this.defenseCombat.fixedUpdate(dt);

        if (this.core.health.destroyed) {
          this.handleDefeat();
        }
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

        this.renderer.setNightFactor(this.dayNight.nightFactor);
        this.structures.renderUpdate();
        this.interaction.renderUpdate();
        this.survivalHud.update();
        this.hordeHud.update();
        this.hand.update(frameMs);

        const phaseLabel =
          this.dayNight.phase === DayPhase.Day
            ? "DAY"
            : "NIGHT " + this.dayNight.night;
        this.options.status.textContent =
          phaseLabel +
          " · " +
          size +
          "×" +
          size +
          " · SEED " +
          seed.text;

        this.renderer.render();

        const chunkStats = this.chunks.getStats();
        const wave = this.waves.stats;
        this.debugOverlay.update({
          frameMs,
          renderer: this.renderer.renderer,
          player: this.player,
          locked: this.controls.isLocked,
          extraLines: [
            "SEED      " + this.metadata.seed.text,
            "PHASE     " + phaseLabel,
            "ENEMIES   " + this.enemies.aliveCount,
            "WAVE Q    " + wave.remainingToSpawn,
            "NAV DIRTY " + this.navigation.pendingCells,
            "NAV MS    " + this.navigation.lastRebuildMs.toFixed(2),
            "FLOW MS   " + this.flow.rebuildMs.toFixed(2),
            "CORE      " + Math.round(this.core.health.current) +
              "/" + this.core.health.max,
            "BIOMES    P" + this.metadata.biomeCounts[BiomeId.Plains] +
              " F" + this.metadata.biomeCounts[BiomeId.Forest] +
              " R" + this.metadata.biomeCounts[BiomeId.Rocky],
            "DROPS     " + this.drops.count,
            "CHUNKS    " + chunkStats.chunks,
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

  private handleDefeat(): void {
    if (this.defeated) return;
    this.defeated = true;
    this.waves.endNight();
    this.input.setEnabled(false);
    this.options.defeatOverlay.classList.remove("hidden");

    if (this.controls.isLocked) {
      this.controls.unlock();
    }
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
    this.options.playButton.addEventListener(
      "click",
      () => this.controls.lock(),
    );

    this.controls.addEventListener("lock", () => {
      this.options.overlay.classList.add("hidden");
      this.input.setEnabled(!this.defeated);
    });

    this.controls.addEventListener("unlock", () => {
      if (this.defeated) {
        this.options.overlay.classList.add("hidden");
        return;
      }

      this.options.overlay.classList.remove("hidden");
      this.input.setEnabled(false);
    });
  }
}
