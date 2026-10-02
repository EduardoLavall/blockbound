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

export class PlayerCombatSystem {
  private readonly direction = new THREE.Vector3();
  private readonly random: SeededRandom;
  private modeValue = PlayerActionMode.Tool;
  private cooldown = 0;

  constructor(
    seed: number,
    private readonly camera: THREE.PerspectiveCamera,
    private readonly input: Input,
    private readonly interactionMode: InteractionMode,
    private readonly enemies: EnemySystem,
    private readonly projectiles: ProjectileSystem,
    private readonly status: PlayerStatus,
    private readonly vitals: PlayerVitals,
    private readonly hand: FirstPersonHand,
    private readonly hud: CombatHUD,
  ) {
    this.random = new SeededRandom(seed ^ 0x6d93ac41);
    this.hand.setActionMode(this.modeValue);
  }

  get mode(): PlayerActionMode {
    return this.modeValue;
  }

  get canMine(): boolean {
    return this.modeValue === PlayerActionMode.Tool;
  }

  fixedUpdate(dt: number): void {
    this.cooldown = Math.max(0, this.cooldown - dt);

    if (this.interactionMode.buildMode || this.vitals.dead) return;

    if (this.input.consumePressed("KeyQ")) {
      this.cycleMode();
    }

    if (this.modeValue === PlayerActionMode.Blade) {
      if (this.input.consumePressed("Mouse0") && this.cooldown <= 0) {
        this.swingBlade();
      }
    } else if (this.modeValue === PlayerActionMode.Repeater) {
      if (this.input.isDown("Mouse0") && this.cooldown <= 0) {
        this.fireRepeater();
      }
    }
  }

  renderUpdate(frameMs: number): void {
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
      `PROJECTILE CD ${this.cooldown.toFixed(2)}`,
    ];
  }

  private cycleMode(): void {
    this.modeValue =
      this.modeValue === PlayerActionMode.Tool
        ? PlayerActionMode.Blade
        : this.modeValue === PlayerActionMode.Blade
          ? PlayerActionMode.Repeater
          : PlayerActionMode.Tool;

    this.cooldown = Math.min(this.cooldown, 0.1);
    this.hand.setActionMode(this.modeValue);
  }

  private swingBlade(): void {
    this.camera.getWorldDirection(this.direction);
    const stats = this.status.snapshot();
    const range = stats.melee.range;
    const target = this.bestMeleeTarget(range);

    this.hand.triggerAttack(1);
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

    const origin = this.camera.position
      .clone()
      .addScaledVector(this.direction, 0.5);

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
    this.cooldown = stats.ranged.cooldown;
  }

  private bestMeleeTarget(range: number): EnemyInstance | null {
    const origin = this.camera.position;
    let target: EnemyInstance | null = null;
    let bestScore = -Infinity;

    for (const enemy of this.enemies.aliveEnemies) {
      const center = enemy.group.position.clone();
      center.y += 0.9;

      const offset = center.sub(origin);
      const distance = offset.length();
      if (distance > range || distance <= 0.001) continue;

      const dot = offset.normalize().dot(this.direction);
      if (dot < 0.62) continue;

      const score = dot * 2 - distance / range;
      if (score > bestScore) {
        bestScore = score;
        target = enemy;
      }
    }

    return target;
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
