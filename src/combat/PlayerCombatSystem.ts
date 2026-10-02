import * as THREE from "three";
import type { EnemyInstance, EnemySystem } from "../ai/EnemySystem";
import { EnemyStatus, PlayerActionMode } from "./CombatTypes";
import type { Input } from "../core/Input";
import type { InteractionMode } from "../player/InteractionMode";
import type { FirstPersonHand } from "../player/FirstPersonHand";
import type { RuleEngine } from "../roguelite/RuleEngine";
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
    private readonly rules: RuleEngine,
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
    const range = 2.45 + this.rules.meleeRangeBonus;
    const target = this.bestMeleeTarget(range);

    this.hand.triggerAttack(1);
    this.cooldown = 0.48 * this.rules.meleeCooldownMultiplier;

    if (!target) return;

    const critical = this.rollCrit();
    const base =
      34 *
      this.rules.meleeDamageMultiplier *
      this.rules.playerOutgoingMultiplier(this.vitals.ratio);
    const damage = critical ? base * this.rules.critMultiplier : base;

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
    const critical = this.rollCrit();
    const base =
      24 *
      this.rules.rangedDamageMultiplier *
      this.rules.playerOutgoingMultiplier(this.vitals.ratio);
    const damage = critical ? base * this.rules.critMultiplier : base;

    const origin = this.camera.position
      .clone()
      .addScaledVector(this.direction, 0.5);

    this.projectiles.spawn({
      origin,
      direction: this.direction,
      speed: 25 * this.rules.projectileSpeedMultiplier,
      damage,
      pierce: this.rules.projectilePierceBonus,
      burnChance: this.rules.playerBurnChance,
      shockChance: this.rules.playerShockChance,
      markDuration: this.rules.playerMarkDuration,
      critical,
    });

    this.hand.triggerAttack(0.45);
    this.cooldown = 0.34 * this.rules.rangedCooldownMultiplier;
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
    if (this.random.range(0, 1) < this.rules.playerBurnChance) {
      this.enemies.applyStatus(enemy, EnemyStatus.Burn, 3.5, 1);
    }

    if (this.random.range(0, 1) < this.rules.playerShockChance) {
      this.enemies.applyStatus(enemy, EnemyStatus.Shock, 2.6, 1);
    }

    if (ranged && this.rules.playerMarkDuration > 0) {
      this.enemies.applyStatus(
        enemy,
        EnemyStatus.Mark,
        this.rules.playerMarkDuration,
        1,
      );
    }
  }

  private rollCrit(): boolean {
    return this.random.range(0, 1) < Math.min(0.75, this.rules.critChance);
  }
}
