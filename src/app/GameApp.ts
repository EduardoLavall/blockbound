import { PointerLockControls } from "three/examples/jsm/controls/PointerLockControls.js";
import { EnemySystem } from "../ai/EnemySystem";
import { BreachPlanner } from "../ai/navigation/BreachPlanner";
import { FlowField } from "../ai/navigation/FlowField";
import { NavigationGrid } from "../ai/navigation/NavigationGrid";
import { Core } from "../building/Core";
import { StructureSystem } from "../building/StructureSystem";
import { PlayerCombatSystem } from "../combat/PlayerCombatSystem";
import { PlayerVitals } from "../combat/PlayerVitals";
import { ProjectileSystem } from "../combat/ProjectileSystem";
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
import { RuleEngine } from "../roguelite/RuleEngine";
import { RunManager } from "../roguelite/RunManager";
import { RunRuleEffects } from "../roguelite/RunRuleEffects";
import { UpgradeDraft } from "../roguelite/UpgradeDraft";
import type { UpgradeDefinition } from "../roguelite/UpgradeRegistry";
import { Inventory } from "../survival/Inventory";
import { ResourceDropSystem } from "../survival/ResourceDropSystem";
import { CombatHUD } from "../ui/CombatHUD";
import { DebugOverlay } from "../ui/DebugOverlay";
import { HordeHUD } from "../ui/HordeHUD";
import { SurvivalHUD } from "../ui/SurvivalHUD";
import { UpgradeDraftUI } from "../ui/UpgradeDraftUI";
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
  combatHud: HTMLDivElement;
  hitMarker: HTMLDivElement;
  damageFlash: HTMLDivElement;
  upgradeOverlay: HTMLDivElement;
  defeatOverlay: HTMLDivElement;
  defeatEyebrow: HTMLDivElement;
  defeatTitle: HTMLHeadingElement;
  defeatText: HTMLParagraphElement;
  runSummary: HTMLDivElement;
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
  private readonly rules = new RuleEngine();
  private readonly run = new RunManager();
  private readonly playerVitals = new PlayerVitals();

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

  private combatHud!: CombatHUD;
  private projectiles!: ProjectileSystem;
  private playerCombat!: PlayerCombatSystem;
  private upgradeDraft!: UpgradeDraft;
  private upgradeUi!: UpgradeDraftUI;
  private runRuleEffects!: RunRuleEffects;

  private loop!: GameLoop;
  private defeated = false;
  private drafting = false;

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
      this.rules,
      this.mode,
      this.core,
      this.metadata.bounds,
      this.options.buildBar,
      this.options.buildInfo,
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
      this.player,
      this.playerVitals,
      this.rules,
    );

    this.combatHud = new CombatHUD(
      this.options.combatHud,
      this.options.hitMarker,
      this.options.damageFlash,
      this.playerVitals,
    );

    this.projectiles = new ProjectileSystem(
      seed.value,
      this.renderer.scene,
      this.world,
      this.enemies,
      (_damage, killed, critical) => {
        this.combatHud.showHit(killed, critical);
      },
    );

    this.playerCombat = new PlayerCombatSystem(
      seed.value,
      this.renderer.camera,
      this.input,
      this.mode,
      this.enemies,
      this.projectiles,
      this.rules,
      this.playerVitals,
      this.hand,
      this.combatHud,
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
      this.rules,
      () => this.playerCombat.canMine,
      this.options.targetInfo,
      this.options.miningProgress,
    );

    this.spawns = new SpawnDirector(
      this.metadata.seed.value,
      this.metadata.spawnZones,
      this.navigation,
      this.enemies,
    );
    this.waves = new WaveDirector(this.spawns);
    this.defenseCombat = new DefenseCombatSystem(
      seed.value,
      this.renderer.scene,
      this.structures,
      this.enemies,
      this.rules,
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

    this.upgradeDraft = new UpgradeDraft(seed.value, this.run);
    this.upgradeUi = new UpgradeDraftUI(this.options.upgradeOverlay);
    this.runRuleEffects = new RunRuleEffects(
      this.enemies,
      this.rules,
      this.run,
      this.playerVitals,
      this.core,
      this.structures,
      this.inventory,
    );

    const size =
      this.metadata.bounds.maxXExclusive - this.metadata.bounds.minX;
    this.options.status.textContent =
      "DAY · " + size + "×" + size + " · SEED " + seed.text;

    this.bindPointerLock();
    this.options.loadingLabel.textContent =
      "Prepare a defesa. Q alterna Tool, Blade e Repeater.";

    this.loop = new GameLoop({
      fixedUpdate: (dt) => {
        if (this.defeated || this.drafting) return;

        this.playerVitals.update(dt);
        this.player.fixedUpdate(dt);
        this.physics.step(dt);
        this.player.syncCamera();

        this.structures.fixedUpdate(dt);
        this.playerCombat.fixedUpdate(dt);
        this.interaction.fixedUpdate(dt);
        this.projectiles.fixedUpdate(dt);
        this.drops.update(dt);
        this.core.update(dt);

        const transition = this.dayNight.update(dt);
        if (transition?.to === DayPhase.Night) {
          this.waves.startNight(transition.night);
        } else if (transition?.to === DayPhase.Day) {
          this.waves.endNight();
          this.enemies.retreatAll();
          this.run.completeNight(transition.night);
          this.openUpgradeDraft(transition.night);
          return;
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
          this.endRun(
            "CORE DESTROYED",
            "A horda atravessou suas defesas.",
          );
        } else if (this.playerVitals.dead) {
          this.endRun(
            "PLAYER DOWN",
            "Você caiu antes de conseguir defender o Core.",
          );
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
        this.playerCombat.renderUpdate(frameMs);
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
          " · " +
          this.run.acquiredUpgrades.length +
          " UPGRADES · SEED " +
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
            "PLAYER HP " + Math.ceil(this.playerVitals.health.current) +
              "/" + this.playerVitals.health.max,
            "KILLS     " + this.run.playerKills,
            "UPGRADES  " + this.run.acquiredUpgrades.length,
            "PROJECTILES " + this.projectiles.count,
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
            ...this.playerCombat.getDebugLines(),
            ...this.structures.getDebugLines(),
            ...this.interaction.getDebugLines(),
          ],
        });
      },
    });

    this.loop.start();
  }

  private openUpgradeDraft(night: number): void {
    if (this.defeated) return;

    const choices = this.upgradeDraft.draw(night, 3);
    if (choices.length === 0) return;

    this.drafting = true;
    this.input.setEnabled(false);
    this.options.overlay.classList.add("hidden");

    if (this.controls.isLocked) {
      this.controls.unlock();
    }

    this.upgradeUi.show(
      night,
      choices,
      (upgrade) => this.chooseUpgrade(upgrade),
    );
  }

  private chooseUpgrade(upgrade: UpgradeDefinition): void {
    upgrade.apply(this.rules);
    this.run.acquireUpgrade(upgrade.id);
    this.drafting = false;

    this.options.overlay.classList.add("hidden");
    this.input.setEnabled(true);
    this.controls.lock();
  }

  private endRun(title: string, text: string): void {
    if (this.defeated) return;

    this.defeated = true;
    this.drafting = false;
    this.waves.endNight();
    this.input.setEnabled(false);
    this.options.upgradeOverlay.classList.add("hidden");

    const summary = this.run.summary();
    this.options.defeatEyebrow.textContent = "RUN FAILED";
    this.options.defeatTitle.textContent = title;
    this.options.defeatText.textContent = text;
    this.options.runSummary.innerHTML = `
      <div><span>Nights</span><strong>${summary.nightsSurvived}</strong></div>
      <div><span>Player kills</span><strong>${summary.playerKills}</strong></div>
      <div><span>Upgrades</span><strong>${summary.upgrades.length}</strong></div>
    `;
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
      this.input.setEnabled(!this.defeated && !this.drafting);
    });

    this.controls.addEventListener("unlock", () => {
      if (this.defeated || this.drafting) {
        this.options.overlay.classList.add("hidden");
        return;
      }

      this.options.overlay.classList.remove("hidden");
      this.input.setEnabled(false);
    });
  }
}
