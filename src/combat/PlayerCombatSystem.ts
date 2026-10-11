import * as THREE from "three";
import type { EnemyInstance, EnemySystem } from "../ai/EnemySystem";
import { EnemyStatus, PlayerActionMode } from "./CombatTypes";
import type { Input } from "../core/Input";
import type { InteractionMode } from "../player/InteractionMode";
import type { FirstPersonHand } from "../player/FirstPersonHand";
import type { PlayerStatus } from "../player/PlayerStatus";
import type { PlayerVitals } from "./PlayerVitals";
import { SeededRandom } from "../voxel/generation/SeededRandom";
import type { CombatHUD } from "../ui/CombatHUD";
import type { ProjectileSystem } from "./ProjectileSystem";
import { PICKAXE } from "../survival/MiningTool";
import { coverDistance } from "./CombatTrace";
import type { StructureSystem } from "../building/StructureSystem";
import type { VoxelWorld } from "../voxel/VoxelWorld";
import type { RunInventory } from "../inventory/RunInventory";
import type { Hotbar } from "../player/Hotbar";
import { itemDefinition } from "../items/ItemRegistry";
import { WEAPON_KNOCKBACK } from "./Knockback";

export class PlayerCombatSystem {
  private readonly direction = new THREE.Vector3();
  private readonly random: SeededRandom;
  private modeValue = PlayerActionMode.Tool;
  private cooldown = 0;
  private toolTargetingEnemy = false;
  private selectedToken = "";

  constructor(
    seed: number,
    private readonly camera: THREE.PerspectiveCamera,
    private readonly input: Input,
    private readonly interactionMode: InteractionMode,
    private readonly world: VoxelWorld,
    private readonly enemies: EnemySystem,
    private readonly projectiles: ProjectileSystem,
    private readonly status: PlayerStatus,
    private readonly vitals: PlayerVitals,
    private readonly hand: FirstPersonHand,
    private readonly hud: CombatHUD,
    private readonly structures: StructureSystem,
    private readonly onAttack: (mode: PlayerActionMode) => void = () => {},
    private readonly onEquip: () => void = () => {},
    private readonly inventory: RunInventory,
    private readonly hotbar: Hotbar,
  ) {
    this.random = new SeededRandom(seed ^ 0x6d93ac41);
    this.hand.setActionMode(this.modeValue);
  }

  get mode(): PlayerActionMode {
    return this.modeValue;
  }

  get canMine(): boolean {
    return (
      this.modeValue === PlayerActionMode.Tool &&
      this.hasAction(PlayerActionMode.Tool) &&
      !this.toolTargetingEnemy
    );
  }

  fixedUpdate(dt: number): void {
    this.cooldown = Math.max(0, this.cooldown - dt);
    const stack = this.hotbar.selectedStack;
    const token = `${this.hotbar.selectedSlot}:${stack?.kind === "item" ? stack.uid : stack?.resource ?? "empty"}`;
    if (token !== this.selectedToken) {
      this.selectedToken = token;
      this.setMode(stack?.kind === "item" ? itemDefinition(stack.definitionId).action ?? PlayerActionMode.Tool : PlayerActionMode.Tool);
    }
    if (!this.hasAction(this.modeValue)) this.setMode(PlayerActionMode.Tool);

    if (this.input.consumePressed("KeyQ")) {
      this.cycleMode();
    }
    if (this.interactionMode.buildMode || this.vitals.dead || !this.hasAction(this.modeValue)) return;

    this.toolTargetingEnemy = false;

    if (this.modeValue === PlayerActionMode.Tool) {
      this.camera.getWorldDirection(this.direction);
      const target = this.bestMeleeTarget(PICKAXE.combatRange);
      if (target && !this.voxelOccludesTarget(target)) {
        this.toolTargetingEnemy = true;
        if (this.input.isDown("Mouse0") && this.cooldown <= 0) {
          this.swingPickaxe(target);
        }
      }
    } else if (this.modeValue === PlayerActionMode.Blade) {
      if (this.input.isDown("Mouse0") && this.cooldown <= 0) {
        this.swingBlade();
      }
    } else if (this.modeValue === PlayerActionMode.Repeater) {
      if (this.input.isDown("Mouse0") && this.cooldown <= 0) {
        this.fireRepeater();
      }
    }
  }

  renderUpdate(frameMs: number): void {
    this.hand.setHeldVisible(!this.interactionMode.buildMode && this.hasAction(this.modeValue));
    this.hud.update(
      Math.min(frameMs / 1000, 0.05),
      this.modeValue,
      this.cooldown,
    );
  }

  getDebugLines(): string[] {
    return [
      `ACTION    ${this.modeValue}`,
      `PLAYER HP ${Math.ceil(this.vitals.health.current)}/${this.vitals.health.max}`,
      `ACTION CD ${this.cooldown.toFixed(2)}`,
      `PICKAXE TARGET ${this.toolTargetingEnemy ? "ENEMY" : "MINING"}`,
    ];
  }

  private cycleMode(): void {
    const available = [PlayerActionMode.Tool, PlayerActionMode.Blade, PlayerActionMode.Repeater].filter(action => this.hasAction(action));
    if (available.length < 2) return;
    const next = available[(available.indexOf(this.modeValue) + 1) % available.length]!;
    const source = this.inventory.slots.findIndex(stack => stack?.kind === "item" && itemDefinition(stack.definitionId).action === next);
    const target = source < 9 ? source : this.hotbar.selectedSlot;
    if (source >= 9 && !this.inventory.moveToHotbar(source, target)) return;
    this.hotbar.select(target);
    this.selectedToken = "";
    this.setMode(next);
  }
  private hasAction(action: PlayerActionMode): boolean {
    return this.inventory.itemStacks().some(stack => itemDefinition(stack.definitionId).action === action);
  }
  private setMode(mode: PlayerActionMode): void {
    if (this.modeValue === mode) return;
    this.modeValue = mode;
    this.onEquip();
    this.hand.setActionMode(mode);
  }

  private swingPickaxe(target: EnemyInstance): void {
    const damage =
      PICKAXE.combatDamage *
      this.status.outgoingDamageMultiplier();

    this.hand.triggerAttack(0.9);
    this.onAttack(PlayerActionMode.Tool);
    this.cooldown = PICKAXE.combatCooldown;

    const killed = this.enemies.damage(
      target,
      damage,
      "player-tool",
    );
    this.enemies.knockback(target, this.direction, WEAPON_KNOCKBACK.pickaxe);
    this.hud.showHit(killed, false);
  }

  private swingBlade(): void {
    this.camera.getWorldDirection(this.direction);
    const stats = this.status.snapshot();
    const range = stats.melee.range;
    const target = this.bestMeleeTarget(range);

    this.hand.triggerAttack(1);
    this.onAttack(PlayerActionMode.Blade);
    this.cooldown = stats.melee.cooldown;

    if (!target) return;

    const critical = this.rollCrit();
    const base =
      stats.melee.damage *
      this.status.outgoingDamageMultiplier();
    const damage = critical ? base * stats.crit.multiplier : base;

    const killed = this.enemies.damage(
      target,
      damage,
      "player-melee",
    );
    this.enemies.knockback(target, this.direction, WEAPON_KNOCKBACK.blade);
    this.applyPlayerStatuses(target, false);
    this.hud.showHit(killed, critical);
  }

  private fireRepeater(): void {
    this.camera.getWorldDirection(this.direction);
    const stats = this.status.snapshot();
    const critical = this.rollCrit();
    const base =
      stats.ranged.damage *
      this.status.outgoingDamageMultiplier();
    const damage = critical ? base * stats.crit.multiplier : base;

    const origin = this.camera.position.clone();

    this.projectiles.spawn({
      origin,
      direction: this.direction,
      speed: stats.ranged.projectileSpeed,
      damage,
      pierce: stats.ranged.pierce,
      burnChance: stats.statuses.burnChance,
      shockChance: stats.statuses.shockChance,
      markDuration: stats.statuses.markDuration,
      critical,
    });

    this.hand.triggerAttack(0.45);
    this.onAttack(PlayerActionMode.Repeater);
    this.cooldown = stats.ranged.cooldown;
  }

  private bestMeleeTarget(range: number): EnemyInstance | null {
    const origin = this.camera.position;
    let target: EnemyInstance | null = null;
    let bestScore = -Infinity;

    for (const enemy of this.enemies.aliveEnemies) {
      const center = enemy.group.position.clone();
      center.y += 0.95 * enemy.definition.scale;

      const offset = center.sub(origin);
      const distance = offset.length();
      if (distance > range || distance <= 0.001) continue;

      const dot = offset.normalize().dot(this.direction);
      if (dot < 0.62) continue;
      if (this.voxelOccludesTarget(enemy)) continue;

      const score = dot * 2 - distance / range;
      if (score > bestScore) {
        bestScore = score;
        target = enemy;
      }
    }

    return target;
  }

  private voxelOccludesTarget(target: EnemyInstance): boolean {
    const center = target.group.position.clone();
    center.y += 0.95 * target.definition.scale;
    const enemyDistance = center.distanceTo(this.camera.position);

    center.sub(this.camera.position).normalize();
    return coverDistance(this.world, this.camera.position, center,
      enemyDistance, this.structures.all) + 0.12 < enemyDistance;
  }

  private applyPlayerStatuses(
    enemy: EnemyInstance,
    ranged: boolean,
  ): void {
    const stats = this.status.snapshot();

    if (this.random.range(0, 1) < stats.statuses.burnChance) {
      this.enemies.applyStatus(
        enemy,
        EnemyStatus.Burn,
        3.5,
        1,
        "player-melee",
      );
    }

    if (this.random.range(0, 1) < stats.statuses.shockChance) {
      this.enemies.applyStatus(
        enemy,
        EnemyStatus.Shock,
        2.6,
        1,
        "player-melee",
      );
    }

    if (ranged && stats.statuses.markDuration > 0) {
      this.enemies.applyStatus(
        enemy,
        EnemyStatus.Mark,
        stats.statuses.markDuration,
        1,
        "player-projectile",
      );
    }
  }

  private rollCrit(): boolean {
    return this.random.range(0, 1) < this.status.snapshot().crit.chance;
  }
}
