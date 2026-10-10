import { PlayControls } from "../player/PlayControls";
import { RunTelemetry } from "../balance/RunTelemetry";
import { GameSettings } from "./GameSettings";
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
import { simulationActive } from "../core/SimulationState";
import { STARTER_KIT, DAWN_SUPPLIES, grantSupplies } from "../defense/RunEconomy";
import { GameFeel } from "../engine/render/GameFeel";
import { WorldDressing } from "../world/WorldDressing";
import { FieldHUD } from "../ui/FieldHUD";
import { PlayerActionMode } from "../combat/CombatTypes";
import { blockDefinition } from "../voxel/blocks";
import {
  DayNightSystem,
  DayPhase,
} from "../defense/DayNightSystem";
import { DefenseCombatSystem } from "../defense/DefenseCombatSystem";
import { SpawnDirector } from "../defense/SpawnDirector";
import { WaveDirector } from "../defense/WaveDirector";
import { FINAL_NIGHT } from "../defense/VerticalSliceRules";
import { AudioSystem } from "../engine/audio/AudioSystem";
import { PhysicsWorld } from "../engine/physics/PhysicsWorld";
import { Renderer3D } from "../engine/render/Renderer3D";
import { EquipmentSystem } from "../items/EquipmentSystem";
import { ItemInventory } from "../items/ItemInventory";
import { ItemLootSystem } from "../items/ItemLootSystem";
import { RunInventory } from "../inventory/RunInventory";
import { FirstPersonHand } from "../player/FirstPersonHand";
import { Hotbar } from "../player/Hotbar";
import { InteractionMode } from "../player/InteractionMode";
import { PlayerController } from "../player/PlayerController";
import { PlayerStatus } from "../player/PlayerStatus";
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
import { ItemInventoryPanel } from "../ui/ItemInventoryPanel";
import { SurvivalHUD } from "../ui/SurvivalHUD";
import { PlayerStatusPanel } from "../ui/PlayerStatusPanel";
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
  playerStatusPanel: HTMLDivElement;
  itemInventoryPanel: HTMLDivElement;
  hitMarker: HTMLDivElement;
  damageFlash: HTMLDivElement;
  upgradeOverlay: HTMLDivElement;
  defeatOverlay: HTMLDivElement;
  defeatEyebrow: HTMLDivElement;
  defeatTitle: HTMLHeadingElement;
  defeatText: HTMLParagraphElement;
  runSummary: HTMLDivElement;
  restartButton: HTMLButtonElement;
  settingsVolume: HTMLInputElement;
  settingsEffects: HTMLInputElement;
  settingsDebug: HTMLInputElement;
  status: HTMLDivElement;
}

export class GameApp {
  private readonly renderer: Renderer3D;
  private readonly input = new Input();
  private readonly controls: PlayControls;
  private readonly debugOverlay: DebugOverlay;
  private readonly hotbar: Hotbar;
  private readonly runInventory = new RunInventory();
  private readonly inventory = new Inventory(this.runInventory);
  private readonly mode = new InteractionMode();
  private readonly dayNight = new DayNightSystem();
  private readonly rules = new RuleEngine();
  private readonly run = new RunManager();
  private readonly playerVitals = new PlayerVitals();
  private readonly playerStatus = new PlayerStatus(
    this.rules,
    this.playerVitals,
  );
  private readonly itemInventory = new ItemInventory(
    this.runInventory,
  );
  private readonly equipment = new EquipmentSystem(
    this.itemInventory,
    this.playerStatus,
  );
  private readonly settings = new GameSettings();
  private readonly audio = new AudioSystem();

  private physics!: PhysicsWorld;
  private player!: PlayerController;
  private hand!: FirstPersonHand;
  private world!: VoxelWorld;
  private metadata!: WorldMetadata;
  private chunks!: ChunkManager;
  private interaction!: VoxelInteractionController;
  private drops!: ResourceDropSystem;
  private itemLoot!: ItemLootSystem;
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
  private playerStatusPanel!: PlayerStatusPanel;
  private itemInventoryPanel!: ItemInventoryPanel;
  private projectiles!: ProjectileSystem;
  private playerCombat!: PlayerCombatSystem;
  private upgradeDraft!: UpgradeDraft;
  private upgradeUi!: UpgradeDraftUI;
  private runRuleEffects!: RunRuleEffects;
  private telemetry!: RunTelemetry;
  private feel!: GameFeel;
  private dressing!: WorldDressing;
  private fieldHud!: FieldHUD;
  private started = false;

  private loop!: GameLoop;
  private defeated = false;
  private drafting = false;
  private inventoryOpen = false;

  constructor(private readonly options: GameAppOptions) {
    this.renderer = new Renderer3D(options.canvas);
    this.controls = new PlayControls(
      this.renderer.camera,
      options.canvas,
    );
    this.debugOverlay = new DebugOverlay(options.debug);
    this.hotbar = new Hotbar(
      options.hotbar,
      this.runInventory,
      () => this.simulating && !this.mode.buildMode,
    );
    this.bindSettings();

    this.options.restartButton.addEventListener("click", () => {
      const url = new URL(window.location.href);
      url.searchParams.delete("seed");
      window.location.assign(url.href);
    });
    document.getElementById("replay-button")?.addEventListener("click", () => window.location.reload());
  }

  async init(): Promise<void> {
    void this.audio.prepare();
    this.options.playButton.disabled = true;
    document.body.classList.add("game-paused");
    this.options.loadingLabel.textContent = "Inicializando Rapier...";
    this.physics = await PhysicsWorld.create();

    const seed = this.resolveRunSeed();
    this.options.loadingLabel.textContent =
      "Gerando mundo finito · seed " + seed.text + "...";

    const generation = generateWorld(seed);
    this.applyGeneration(generation);
    grantSupplies(this.inventory, STARTER_KIT);

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
    this.dressing = new WorldDressing(this.renderer.scene, this.world, this.metadata);
    this.feel = new GameFeel(this.renderer.scene, this.renderer.camera);

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
      this.playerStatus,
      this.physics,
      {
        x: spawnX,
        y: surfaceY + 2.4,
        z: spawnZ,
      },
    );

    this.hand = new FirstPersonHand(
      this.renderer.viewCamera,
      this.controls,
      this.input,
      this.player,
    );

    this.drops = new ResourceDropSystem(
      this.renderer.scene,
      this.inventory,
      this.player,
      () => this.audio.pickup(),
    );

    this.structures = new StructureSystem(
      this.renderer.scene,
      this.renderer.camera,
      this.input,
      this.player,
      this.world,
      this.physics,
      this.inventory,
      this.playerStatus,
      this.mode,
      this.core,
      this.metadata.bounds,
      this.options.buildBar,
      this.options.buildInfo,
      () => this.audio.build(),
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
      this.playerStatus,
      this.rules,
      this.world,
    );

    this.itemLoot = new ItemLootSystem(
      seed.value,
      this.renderer.scene,
      this.enemies,
      this.player,
      this.itemInventory,
      () => this.audio.pickup(),
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
      this.structures,
    );

    this.playerCombat = new PlayerCombatSystem(
      seed.value,
      this.renderer.camera,
      this.input,
      this.mode,
      this.world,
      this.enemies,
      this.projectiles,
      this.playerStatus,
      this.playerVitals,
      this.hand,
      this.combatHud,
      this.structures,
      (mode) => {
        this.feel.kick(mode === PlayerActionMode.Repeater ? 0.6 : 0.22);
        if (mode === PlayerActionMode.Repeater) this.audio.shoot();
        else this.audio.swing();
      },
      () => this.audio.equip(),
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
      this.playerStatus,
      () => this.playerCombat.canMine,
      this.options.targetInfo,
      this.options.miningProgress,
      (position, block, broken) => {
        this.feel.burst(position, Number.parseInt(blockDefinition(block).swatch.slice(1), 16), broken ? 28 : 4);
        this.feel.kick(broken ? 0.25 : 0.08);
        this.audio.mine(block, broken);
      },
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
      this.world,
    );

    this.survivalHud = new SurvivalHUD(
      this.inventory,
      this.core,
      this.options.inventoryHud,
      this.options.coreHud,
    );

    this.playerStatusPanel = new PlayerStatusPanel(
      this.options.playerStatusPanel,
      this.input,
      this.playerStatus,
      this.run,
    );

    this.itemInventoryPanel = new ItemInventoryPanel(
      this.options.itemInventoryPanel,
      this.runInventory,
      this.itemInventory,
      this.equipment,
      () => this.closeItemInventory(),
    );
    this.bindItemInventoryControls();

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

    this.telemetry = new RunTelemetry(
      seed.text,
      this.playerStatus,
      this.core,
      this.inventory,
      this.equipment,
      this.run,
    );
    this.telemetry.checkpoint("run-start", 0);
    let lastHealth = this.playerVitals.health.current;
    this.playerVitals.subscribe(() => {
      if (this.playerVitals.health.current < lastHealth) { this.feel.hurt(); this.audio.hurt(); }
      lastHealth = this.playerVitals.health.current;
    });
    this.fieldHud = new FieldHUD(this.metadata, this.player, this.renderer.camera,
      this.enemies, this.structures, this.dayNight, this.world);

    this.enemies.subscribeDamage((event) => {
      const playerDamage = event.source.startsWith("player-");
      const position = event.enemy.group.position.clone();
      position.y += 1.2 * event.enemy.definition.scale;
      this.feel.damage(position, event.amount, event.killed, playerDamage);
      if (
        event.source === "player-tool" ||
        event.source === "player-melee" ||
        event.source === "player-projectile"
      ) {
        this.audio.hit(event.killed, position.clone().project(this.renderer.camera).x);
      }
    });

    const size =
      this.metadata.bounds.maxXExclusive - this.metadata.bounds.minX;
    this.options.status.textContent =
      "DAY · " + size + "×" + size + " · SEED " + seed.text;

    this.bindPointerLock();
    await this.audio.prepare();
    this.options.loadingLabel.textContent =
      "Tudo pronto. Seu kit inicial já está na mochila.";
    this.options.playButton.disabled = false;
    this.options.playButton.textContent = "INICIAR EXPEDIÇÃO";

    this.loop = new GameLoop({
      fixedUpdate: (dt) => {
        if (!this.simulating) return;

        this.telemetry.update(dt);
        this.playerVitals.update(dt);
        this.player.fixedUpdate(dt);
        this.physics.step(dt);
        this.player.syncCamera();
        const playerPosition = this.player.getPosition();
        this.audio.updateMovement(playerPosition, this.player.getDebugState().grounded,
          this.world.getBlock(Math.floor(playerPosition.x), Math.floor(playerPosition.y - 0.96), Math.floor(playerPosition.z)));

        this.structures.fixedUpdate(dt);
        this.playerCombat.fixedUpdate(dt);
        this.interaction.fixedUpdate(dt);
        this.projectiles.fixedUpdate(dt);
        this.drops.update(dt);
        this.itemLoot.update(dt);
        this.core.update(dt);

        const transition = this.input.consumePressed("KeyN") && this.dayNight.phase === DayPhase.Day
          ? this.dayNight.startNightEarly() : this.dayNight.update(dt);
        if (transition?.to === DayPhase.Night) {
          this.waves.startNight(transition.night);
          this.dayNight.holdTransition(true);
          this.fieldHud.announce(`NOITE ${transition.night} / ${FINAL_NIGHT}`,
            transition.night >= FINAL_NIGHT ? "O Guardião chegou. Prepare-se para o último cerco." : "A horda se aproxima pelo norte. Defenda o cristal.");
          this.audio.nightStart(
            transition.night >= FINAL_NIGHT,
          );
          this.telemetry.checkpoint("night-start", transition.night);
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

        if (this.core.health.destroyed || this.playerVitals.dead) {
          this.endRun(this.core.health.destroyed ? "CRISTAL DESTRUÍDO" : "VOCÊ CAIU",
            this.core.health.destroyed ? "A horda atravessou suas defesas." : "Sua expedição terminou. Tente outra estratégia.");
          return;
        }

        if (
          this.dayNight.phase === DayPhase.Night &&
          this.waves.complete &&
          this.enemies.aliveCount === 0
        ) {
          const night = this.dayNight.night;
          this.run.completeNight(night);
          this.telemetry.checkpoint("night-complete", night);
          if (night >= FINAL_NIGHT) {
            this.endRun("CERCO VENCIDO", "O Guardião caiu. Você protegeu o cristal por cinco noites.", true);
          } else {
            this.dayNight.completeNight();
            this.waves.endNight();
            this.enemies.cleanupInactive();
            this.playerVitals.heal(35);
            this.core.repair(40);
            for (const overflow of grantSupplies(this.inventory, DAWN_SUPPLIES)) {
              const p = this.core.group.position;
              this.drops.spawn(overflow, p.x + 2, p.y, p.z + 2);
            }
            this.fieldHud.announce("AMANHECER", "+35 vida · +40 cristal · suprimentos de defesa recebidos");
            this.openUpgradeDraft(night);
          }
          return;
        }

      },
      render: (frameMs) => {
        const visualMs = this.simulating ? frameMs : 0;
        this.feel.enabled = this.settings.state.effects;
        this.renderer.effects = this.settings.state.effects;
        this.hand.effects = this.settings.state.effects;
        this.feel.update(Math.min(visualMs / 1000, 0.05));
        this.dressing.update(Math.min(visualMs / 1000, 0.05), this.dayNight.nightFactor, this.settings.state.effects);
        this.fieldHud.update(Math.min(visualMs / 1000, 0.05));
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
        this.playerCombat.renderUpdate(visualMs);
        this.playerStatusPanel.update();
        const mining = this.interaction.miningState;
        this.hand.setMiningState(
          mining.active,
          mining.progress,
          mining.duration,
        );
        this.hand.update(visualMs);

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

        if (this.simulating) this.feel.applyCamera();
        this.renderer.render();
        if (this.simulating) this.feel.restoreCamera();

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
            "SFX READY " + this.audio.loadedCount,
            "NAV DIRTY " + this.navigation.pendingCells,
            "NAV MS    " + this.navigation.lastRebuildMs.toFixed(2),
            "FLOW MS   " + this.flow.rebuildMs.toFixed(2),
            "CORE      " + Math.round(this.core.health.current) +
              "/" + this.core.health.max,
            "LANE      1 · " + this.metadata.lane.cells.length + " cells",
            "BIOMES    P" + this.metadata.biomeCounts[BiomeId.Plains] +
              " F" + this.metadata.biomeCounts[BiomeId.Forest] +
              " R" + this.metadata.biomeCounts[BiomeId.Rocky],
            "DROPS     " + this.drops.count,
            "SLOTS     " +
              this.runInventory.slots.filter(Boolean).length +
              "/36",
            "ITEMS     " + this.itemInventory.all.length +
              " grid / " + this.itemLoot.count + " world",
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

    this.audio.upgrade();
    this.upgradeUi.show(
      night,
      choices,
      (upgrade) => this.chooseUpgrade(upgrade),
    );
  }

  private get simulating(): boolean {
    return simulationActive({ locked: this.controls.isLocked, hidden: document.hidden,
      ended: this.defeated, drafting: this.drafting, inventoryOpen: this.inventoryOpen });
  }

  private chooseUpgrade(upgrade: UpgradeDefinition): void {
    upgrade.apply(this.rules);
    this.run.acquireUpgrade(upgrade.id);
    this.telemetry.checkpoint(
      "upgrade:" + upgrade.id,
      this.dayNight.night,
    );
    this.audio.choose();
    this.drafting = false;

    this.options.overlay.classList.add("hidden");
    this.input.setEnabled(false);
    this.controls.lock();
  }

  private endRun(
    title: string,
    text: string,
    victory = false,
  ): void {
    if (this.defeated) return;

    this.defeated = true;
    this.drafting = false;
    this.inventoryOpen = false;
    this.itemInventoryPanel?.hide();
    this.waves.endNight();
    this.input.setEnabled(false);
    this.options.upgradeOverlay.classList.add("hidden");

    const summary = this.run.summary();
    this.options.defeatOverlay.classList.toggle("victory", victory);
    this.options.defeatEyebrow.textContent =
      victory ? "EXPEDIÇÃO CONCLUÍDA" : "FIM DA EXPEDIÇÃO";
    this.options.defeatTitle.textContent = title;
    this.options.defeatText.textContent = text;
    this.options.restartButton.textContent =
      "NOVA EXPEDIÇÃO";
    this.telemetry.finish(
      victory ? "victory" : "defeat",
      this.dayNight.night,
    );
    this.options.runSummary.innerHTML = `
      <div><span>Noites vencidas</span><strong>${summary.nightsSurvived} / 5</strong></div>
      <div><span>Eliminações</span><strong>${summary.playerKills}</strong></div>
      <div><span>Melhorias</span><strong>${summary.upgrades.length}</strong></div>
      <button id="telemetry-export-button">EXPORTAR RELATÓRIO DA PARTIDA</button>
    `;
    this.options.runSummary
      .querySelector<HTMLButtonElement>("#telemetry-export-button")
      ?.addEventListener("click", () => this.telemetry.download());
    this.options.defeatOverlay.classList.remove("hidden");
    this.audio.pause();
    if (victory) this.audio.victory();
    else this.audio.defeat();

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

  private bindItemInventoryControls(): void {
    window.addEventListener("keydown", (event) => {
      if (
        (event.code !== "KeyI" && !(event.code === "Escape" && this.inventoryOpen)) ||
        event.repeat ||
        this.defeated ||
        this.drafting
      ) {
        return;
      }

      if (!this.inventoryOpen && !this.controls.isLocked) return;

      event.preventDefault();
      if (this.inventoryOpen) this.closeItemInventory();
      else this.openItemInventory();
    });
  }

  private openItemInventory(): void {
    if (
      this.inventoryOpen ||
      this.defeated ||
      this.drafting
    ) {
      return;
    }

    this.inventoryOpen = true;
    this.input.setEnabled(false);
    this.options.overlay.classList.add("hidden");
    this.itemInventoryPanel.show();

    if (this.controls.isLocked) {
      this.controls.unlock();
    }
  }

  private closeItemInventory(): void {
    if (!this.inventoryOpen) return;

    this.inventoryOpen = false;
    this.itemInventoryPanel.hide();
    this.options.overlay.classList.add("hidden");
    this.input.setEnabled(false);
    this.controls.lock();
  }

  private bindSettings(): void {
    const state = this.settings.state;
    this.options.settingsVolume.value = String(state.volume);
    this.options.settingsEffects.checked = state.effects;
    this.options.settingsDebug.checked = state.debug;
    this.applySettings();

    this.options.settingsVolume.addEventListener("input", () => {
      this.settings.update({
        volume: Number(this.options.settingsVolume.value),
      });
      this.applySettings();
    });

    this.options.settingsEffects.addEventListener("change", () => {
      this.settings.update({
        effects: this.options.settingsEffects.checked,
      });
      this.applySettings();
    });

    this.options.settingsDebug.addEventListener("change", () => {
      this.settings.update({
        debug: this.options.settingsDebug.checked,
      });
      this.applySettings();
    });
  }

  private applySettings(): void {
    const state = this.settings.state;
    this.audio.setVolume(state.volume);
    this.audio.setEnabled(true);
    this.options.debug.classList.toggle("hidden", !state.debug);
    document.body.classList.toggle("reduced-fx", !state.effects);
  }

  private bindPointerLock(): void {
    const fallback = document.getElementById("drag-play-button")!;
    fallback.addEventListener("click", () => {
      void this.audio.unlock();
      this.controls.useDragLook();
      this.fieldHud.announce("MOUSE LIVRE", "Segure o botão do meio e arraste para olhar. Esc pausa.");
    });
    this.options.playButton.addEventListener(
      "click",
      () => {
        void this.audio.unlock();
        this.controls.lock();
      },
    );

    this.controls.addEventListener("lock", () => {
      void this.audio.unlock();
      document.body.classList.remove("game-paused");
      if (!this.started) {
        this.started = true;
        this.fieldHud.announce("PROTEJA O CRISTAL", "Monte torres ao lado da rota e espinhos sobre ela. Seu kit já está pronto.");
      }
      this.options.overlay.classList.add("hidden");
      this.input.setEnabled(
        !this.defeated &&
        !this.drafting &&
        !this.inventoryOpen,
      );
    });

    this.controls.addEventListener("unlock", () => {
      if (!this.defeated) this.audio.pause();
      document.body.classList.add("game-paused");
      this.options.playButton.textContent = "CONTINUAR EXPEDIÇÃO";
      if (this.defeated || this.drafting || this.inventoryOpen) {
        this.options.overlay.classList.add("hidden");
        return;
      }

      this.options.overlay.classList.remove("hidden");
      this.input.setEnabled(false);
    });
    document.addEventListener("pointerlockerror", () => {
      this.options.loadingLabel.textContent = "Este navegador bloqueou a captura do mouse. Abra em uma aba normal ou use o modo de mouse livre abaixo.";
      fallback.classList.remove("hidden");
      if (!this.defeated && !this.drafting && !this.inventoryOpen) this.options.overlay.classList.remove("hidden");
    });
    const pause = () => { if (this.controls.isLocked) this.controls.unlock(); };
    window.addEventListener("blur", pause);
    document.addEventListener("visibilitychange", () => { if (document.hidden) pause(); });
  }
}
