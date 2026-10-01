import {
  BUILD_DATA,
  DAY_SECONDS,
  DEFAULT_MODIFIERS,
  ENEMY_DATA,
  TILE_SIZE,
  UPGRADES,
  WORLD_H,
  WORLD_W
} from "./content";
import { Renderer } from "./renderer";
import { RNG } from "./rng";
import type {
  BuildKind,
  Enemy,
  EnemyKind,
  Phase,
  Player,
  Projectile,
  RunModifiers,
  Structure,
  Upgrade,
  Vec2,
  Wallet,
  WeaponKind
} from "./types";
import { World } from "./world";

export interface UIRefs {
  hpBar: HTMLElement;
  hpText: HTMLElement;
  coreBar: HTMLElement;
  coreText: HTMLElement;
  wood: HTMLElement;
  stone: HTMLElement;
  iron: HTMLElement;
  phaseLabel: HTMLElement;
  phaseTimer: HTMLElement;
  waveLabel: HTMLElement;
  seedLabel: HTMLElement;
  weaponLabel: HTMLElement;
  hotbarButtons: HTMLButtonElement[];
  toast: HTMLElement;
  upgradeOverlay: HTMLElement;
  upgradeOptions: HTMLElement;
  gameoverOverlay: HTMLElement;
  gameoverTitle: HTMLElement;
  gameoverStats: HTMLElement;
}

export class Game {
  private renderer: Renderer;
  private rng = new RNG(1);
  private world!: World;
  private player!: Player;
  private structures: Structure[] = [];
  private enemies: Enemy[] = [];
  private projectiles: Projectile[] = [];
  private wallet: Wallet = { wood: 0, stone: 0, iron: 0 };
  private modifiers: RunModifiers = { ...DEFAULT_MODIFIERS };
  private phase: Phase = "day";
  private selectedBuild: BuildKind = "wall";
  private weapon: WeaponKind = "sword";
  private keys = new Set<string>();
  private mouseWorld: Vec2 = { x: 0, y: 0 };
  private mouseDown = false;
  private pathField = new Float32Array(WORLD_W * WORLD_H);
  private dayTimer = DAY_SECONDS;
  private night = 1;
  private spawnRemaining = 0;
  private spawnTimer = 0;
  private bossPending = false;
  private nextEntityId = 10;
  private started = false;
  private lastFrame = performance.now();
  private kills = 0;
  private toastTimer = 0;

  constructor(
    private canvas: HTMLCanvasElement,
    private ui: UIRefs
  ) {
    this.renderer = new Renderer(canvas);
    this.resetRun();
    this.bindInput();
    this.bindHotbar();
    requestAnimationFrame(this.loop);
  }

  start() {
    this.resetRun();
    this.started = true;
    this.lastFrame = performance.now();
    this.ui.gameoverOverlay.classList.remove("overlay--visible");
    this.ui.upgradeOverlay.classList.remove("overlay--visible");
    this.toast("Run iniciada. O relógio já está correndo.");
  }

  setStarted(value: boolean) {
    this.started = value;
  }

  private resetRun() {
    const randomWord = crypto.getRandomValues(new Uint32Array(1))[0] ?? Date.now();
    const seed = (Date.now() ^ randomWord) >>> 0;
    this.rng = new RNG(seed ^ 0xa3c59ac3);
    this.world = new World(seed);

    const center = this.world.centerGrid;
    const core: Structure = {
      id: 1,
      kind: "core",
      gx: center.x,
      gy: center.y,
      hp: 320,
      maxHp: 320,
      cooldown: 0
    };

    const spawn = this.world.gridToWorld(center.x, center.y + 2);
    this.player = {
      pos: { ...spawn },
      radius: 11,
      hp: 100,
      maxHp: 100,
      speed: 145,
      attackCooldown: 0,
      facing: { x: 1, y: 0 }
    };

    this.structures = [core];
    this.enemies = [];
    this.projectiles = [];
    this.wallet = { wood: 18, stone: 10, iron: 1 };
    this.modifiers = { ...DEFAULT_MODIFIERS };
    this.phase = "day";
    this.selectedBuild = "wall";
    this.weapon = "sword";
    this.dayTimer = DAY_SECONDS;
    this.night = 1;
    this.spawnRemaining = 0;
    this.spawnTimer = 0;
    this.bossPending = false;
    this.nextEntityId = 10;
    this.kills = 0;
    this.mouseDown = false;
    this.rebuildPathField();
    this.updateHud();
    this.updateHotbar();
  }

  private loop = (now: number) => {
    const dt = Math.min(.033, Math.max(0, (now - this.lastFrame) / 1000));
    this.lastFrame = now;

    if (this.started && this.phase !== "upgrade" && this.phase !== "gameover") {
      this.update(dt);
    }

    const mouseGrid = this.world.worldToGrid(this.mouseWorld.x, this.mouseWorld.y);
    this.renderer.render({
      world: this.world,
      player: this.player,
      structures: this.structures,
      enemies: this.enemies,
      projectiles: this.projectiles,
      phase: this.phase,
      selectedBuild: this.selectedBuild,
      mouseWorld: this.mouseWorld,
      buildValid: this.selectedBuild !== "none"
        ? this.canBuild(mouseGrid.x, mouseGrid.y, this.selectedBuild, true)
        : false,
      night: this.night
    });

    requestAnimationFrame(this.loop);
  };

  private update(dt: number) {
    if (this.phase === "day") {
      this.dayTimer -= dt;
      this.regenerateStructures(dt);
      if (this.dayTimer <= 0) this.startNight();
    } else if (this.phase === "night") {
      this.updateSpawning(dt);
    }

    this.updatePlayer(dt);
    this.updateStructures(dt);
    this.updateEnemies(dt);
    this.updateProjectiles(dt);
    this.cleanupDead();

    if (this.player.hp <= 0) {
      this.gameOver("Você caiu defendendo a base.");
    } else if (this.core.hp <= 0) {
      this.gameOver("O núcleo foi destruído.");
    } else if (
      this.phase === "night" &&
      this.spawnRemaining <= 0 &&
      !this.bossPending &&
      this.enemies.length === 0
    ) {
      this.finishNight();
    }

    this.updateHud();
  }

  private updatePlayer(dt: number) {
    this.player.attackCooldown = Math.max(0, this.player.attackCooldown - dt);

    let mx = 0;
    let my = 0;
    if (this.keys.has("KeyA")) mx -= 1;
    if (this.keys.has("KeyD")) mx += 1;
    if (this.keys.has("KeyW")) my -= 1;
    if (this.keys.has("KeyS")) my += 1;

    if (mx || my) {
      const len = Math.hypot(mx, my) || 1;
      const speed = this.player.speed * this.modifiers.moveSpeed;
      const dx = mx / len * speed * dt;
      const dy = my / len * speed * dt;
      this.tryMovePlayer(dx, 0);
      this.tryMovePlayer(0, dy);
    }

    const fx = this.mouseWorld.x - this.player.pos.x;
    const fy = this.mouseWorld.y - this.player.pos.y;
    const fl = Math.hypot(fx, fy);
    if (fl > 1) this.player.facing = { x: fx / fl, y: fy / fl };

    if (this.mouseDown && this.player.attackCooldown <= 0) {
      this.performPlayerAction();
    }
  }

  private tryMovePlayer(dx: number, dy: number) {
    const nx = Math.max(this.player.radius, Math.min(WORLD_W * TILE_SIZE - this.player.radius, this.player.pos.x + dx));
    const ny = Math.max(this.player.radius, Math.min(WORLD_H * TILE_SIZE - this.player.radius, this.player.pos.y + dy));
    if (!this.playerBlocked(nx, ny)) {
      this.player.pos.x = nx;
      this.player.pos.y = ny;
    }
  }

  private playerBlocked(x: number, y: number) {
    return this.structures.some(s => {
      if (s.kind !== "wall" && s.kind !== "tower") return false;
      const p = this.world.gridToWorld(s.gx, s.gy);
      return Math.abs(x - p.x) < TILE_SIZE / 2 + this.player.radius - 3 &&
        Math.abs(y - p.y) < TILE_SIZE / 2 + this.player.radius - 3;
    });
  }

  private performPlayerAction() {
    const resource = this.findAimedResource(80);
    if (resource) {
      resource.hp -= this.modifiers.miningPower;
      this.player.attackCooldown = .32 / this.modifiers.attackSpeed;
      if (resource.hp <= 0) this.harvestResource(resource.id);
      return;
    }

    if (this.weapon === "sword") {
      let hit = false;
      const damage = this.rollPlayerDamage(22);
      for (const enemy of this.enemies) {
        const dx = enemy.pos.x - this.player.pos.x;
        const dy = enemy.pos.y - this.player.pos.y;
        const dist = Math.hypot(dx, dy);
        if (dist > 76) continue;
        const dot = dist > 0
          ? (dx / dist) * this.player.facing.x + (dy / dist) * this.player.facing.y
          : 1;
        if (dot < .15) continue;
        enemy.hp -= damage;
        hit = true;
      }
      this.player.attackCooldown = (hit ? .38 : .30) / this.modifiers.attackSpeed;
    } else {
      this.spawnProjectile(
        this.player.pos,
        this.player.facing,
        410,
        this.rollPlayerDamage(14),
        "player",
        2.1,
        4
      );
      this.player.attackCooldown = .56 / this.modifiers.attackSpeed;
    }
  }

  private rollPlayerDamage(base: number) {
    return this.rng.chance(this.modifiers.critChance) ? base * 2 : base;
  }

  private findAimedResource(range: number) {
    let best: { score: number; node: typeof this.world.resources[number] } | undefined;
    for (const node of this.world.resources) {
      const dx = node.pos.x - this.player.pos.x;
      const dy = node.pos.y - this.player.pos.y;
      const dist = Math.hypot(dx, dy);
      if (dist > range || dist < 1) continue;
      const dot = (dx / dist) * this.player.facing.x + (dy / dist) * this.player.facing.y;
      if (dot < .55) continue;
      const score = dot * 100 - dist;
      if (!best || score > best.score) best = { score, node };
    }
    return best?.node;
  }

  private harvestResource(id: number) {
    const index = this.world.resources.findIndex(r => r.id === id);
    if (index < 0) return;
    const node = this.world.resources[index]!;
    const amount = Math.max(1, Math.round(node.amount * this.modifiers.resourceYield));

    if (node.kind === "tree") {
      this.wallet.wood += amount;
      this.toast("+" + amount + " madeira");
    } else if (node.kind === "rock") {
      this.wallet.stone += amount;
      this.toast("+" + amount + " pedra");
    } else if (node.kind === "ore") {
      this.wallet.iron += amount;
      this.wallet.stone += Math.ceil(amount / 2);
      this.toast("+" + amount + " ferro");
    } else {
      this.wallet.wood += amount;
      this.wallet.stone += amount;
      this.wallet.iron += Math.max(1, Math.floor(amount / 3));
      this.toast("Cache raro encontrado.");
    }

    this.world.resources.splice(index, 1);
  }

  private updateStructures(dt: number) {
    for (const structure of this.structures) {
      structure.cooldown = Math.max(0, structure.cooldown - dt);

      if (structure.kind === "tower" && structure.cooldown <= 0 && this.enemies.length > 0) {
        const origin = this.world.gridToWorld(structure.gx, structure.gy);
        const range = 195 * this.modifiers.towerRange;
        let target: Enemy | undefined;
        let bestDistance = Infinity;

        for (const enemy of this.enemies) {
          const distance = Math.hypot(enemy.pos.x - origin.x, enemy.pos.y - origin.y);
          if (distance <= range && distance < bestDistance) {
            bestDistance = distance;
            target = enemy;
          }
        }

        if (target) {
          const direction = this.normalized(target.pos.x - origin.x, target.pos.y - origin.y);
          this.spawnProjectile(
            origin,
            direction,
            325,
            15 * this.modifiers.towerDamage,
            "tower",
            2.3,
            4,
            this.modifiers.towerFire ? 3.2 : 0
          );
          structure.cooldown = .72;
        }
      }

      if (structure.kind === "spike" && structure.cooldown <= 0) {
        const p = this.world.gridToWorld(structure.gx, structure.gy);
        const victim = this.enemies.find(e => Math.hypot(e.pos.x - p.x, e.pos.y - p.y) < e.radius + 17);
        if (victim) {
          victim.hp -= 13 * this.modifiers.trapDamage;
          structure.cooldown = .42;
        }
      }
    }
  }

  private regenerateStructures(dt: number) {
    if (this.modifiers.wallRegen <= 0) return;
    for (const s of this.structures) {
      if (s.kind !== "wall" && s.kind !== "gate") continue;
      s.hp = Math.min(s.maxHp, s.hp + this.modifiers.wallRegen * dt);
    }
  }

  private startNight() {
    this.phase = "night";
    this.spawnRemaining = 8 + this.night * 4 + Math.floor(Math.pow(this.night, 1.16));
    this.spawnTimer = .25;
    this.bossPending = this.night % 5 === 0;
    this.toast(this.bossPending ? "Algo enorme está vindo..." : "A horda começou.");
  }

  private updateSpawning(dt: number) {
    this.spawnTimer -= dt;
    if (this.spawnTimer > 0) return;

    const shouldSpawnBoss = this.bossPending &&
      this.spawnRemaining <= Math.max(2, Math.floor((8 + this.night * 4) * .45));

    if (shouldSpawnBoss) {
      this.spawnEnemy("boss");
      this.bossPending = false;
      this.spawnTimer = 1.2;
      return;
    }

    if (this.spawnRemaining > 0) {
      this.spawnEnemy(this.rollEnemyKind());
      this.spawnRemaining--;
      this.spawnTimer = Math.max(.22, .78 - this.night * .025);
    }
  }

  private rollEnemyKind(): EnemyKind {
    const r = this.rng.next();
    if (this.night >= 5 && r < .10) return "burrower";
    if (this.night >= 4 && r < .21) return "shaman";
    if (this.night >= 3 && r < .36) return "archer";
    if (this.night >= 3 && r < .51) return "brute";
    if (this.night >= 2 && r < .71) return "runner";
    return "grunt";
  }

  private spawnEnemy(kind: EnemyKind) {
    const data = ENEMY_DATA[kind];
    const edge = this.rng.int(0, 3);
    let gx = 1;
    let gy = 1;
    if (edge === 0) { gx = this.rng.int(1, WORLD_W - 2); gy = 1; }
    if (edge === 1) { gx = WORLD_W - 2; gy = this.rng.int(1, WORLD_H - 2); }
    if (edge === 2) { gx = this.rng.int(1, WORLD_W - 2); gy = WORLD_H - 2; }
    if (edge === 3) { gx = 1; gy = this.rng.int(1, WORLD_H - 2); }

    const p = this.world.gridToWorld(gx, gy);
    const hpScale = 1 + (this.night - 1) * .13;
    const damageScale = 1 + (this.night - 1) * .075;

    this.enemies.push({
      id: this.nextEntityId++,
      kind,
      pos: p,
      hp: data.hp * hpScale,
      maxHp: data.hp * hpScale,
      speed: data.speed,
      radius: data.radius,
      damage: data.damage * damageScale,
      attackCooldown: this.rng.next() * .4,
      rangedCooldown: this.rng.next(),
      specialCooldown: kind === "boss" ? 2.5 : 0,
      burn: 0,
      burnTick: .5
    });
  }

  private updateEnemies(dt: number) {
    const corePos = this.world.gridToWorld(this.core.gx, this.core.gy);

    for (const enemy of this.enemies) {
      enemy.attackCooldown = Math.max(0, enemy.attackCooldown - dt);
      enemy.rangedCooldown = Math.max(0, enemy.rangedCooldown - dt);
      enemy.specialCooldown = Math.max(0, enemy.specialCooldown - dt);

      if (enemy.burn > 0) {
        enemy.burn -= dt;
        enemy.burnTick -= dt;
        if (enemy.burnTick <= 0) {
          enemy.hp -= 3;
          enemy.burnTick = .5;
        }
      }
      if (enemy.hp <= 0) continue;

      const shamanBuff = this.enemies.some(other =>
        other.id !== enemy.id &&
        other.kind === "shaman" &&
        other.hp > 0 &&
        Math.hypot(other.pos.x - enemy.pos.x, other.pos.y - enemy.pos.y) < 118
      ) ? 1.18 : 1;

      if (enemy.kind === "boss" && enemy.specialCooldown <= 0) {
        this.bossShockwave(enemy);
        enemy.specialCooldown = 4.5;
      }

      const playerDistance = Math.hypot(this.player.pos.x - enemy.pos.x, this.player.pos.y - enemy.pos.y);
      const targetPlayer = enemy.kind !== "boss" && enemy.kind !== "burrower" && playerDistance < 105;

      if (enemy.kind === "archer") {
        const target = targetPlayer ? this.player.pos : corePos;
        const targetDistance = Math.hypot(target.x - enemy.pos.x, target.y - enemy.pos.y);
        if (targetDistance < 215 && targetDistance > 65) {
          if (enemy.rangedCooldown <= 0) {
            const direction = this.normalized(target.x - enemy.pos.x, target.y - enemy.pos.y);
            this.spawnProjectile(enemy.pos, direction, 245, enemy.damage, "enemy", 2.4, 4);
            enemy.rangedCooldown = 1.35;
          }
          continue;
        }
      }

      if (targetPlayer && playerDistance <= enemy.radius + this.player.radius + 7) {
        if (enemy.attackCooldown <= 0) {
          this.player.hp -= enemy.damage;
          enemy.attackCooldown = ENEMY_DATA[enemy.kind].attackRate;
        }
        continue;
      }

      let direction: Vec2;
      if (targetPlayer) {
        direction = this.normalized(this.player.pos.x - enemy.pos.x, this.player.pos.y - enemy.pos.y);
      } else if (enemy.kind === "burrower") {
        direction = this.normalized(corePos.x - enemy.pos.x, corePos.y - enemy.pos.y);
      } else {
        direction = this.flowDirection(enemy);
      }

      const speed = enemy.speed * shamanBuff * dt;
      const nx = enemy.pos.x + direction.x * speed;
      const ny = enemy.pos.y + direction.y * speed;

      if (enemy.kind !== "burrower") {
        const blocker = this.blockingStructureAt(nx, ny, enemy.radius);
        if (blocker) {
          if (enemy.attackCooldown <= 0) {
            const structureBonus = enemy.kind === "brute" ? 1.8 : enemy.kind === "boss" ? 2.2 : 1;
            blocker.hp -= enemy.damage * structureBonus;
            enemy.attackCooldown = ENEMY_DATA[enemy.kind].attackRate;
          }
          continue;
        }
      }

      enemy.pos.x = Math.max(enemy.radius, Math.min(WORLD_W * TILE_SIZE - enemy.radius, nx));
      enemy.pos.y = Math.max(enemy.radius, Math.min(WORLD_H * TILE_SIZE - enemy.radius, ny));

      const coreDistance = Math.hypot(corePos.x - enemy.pos.x, corePos.y - enemy.pos.y);
      if (coreDistance <= enemy.radius + 25 && enemy.attackCooldown <= 0) {
        this.core.hp -= enemy.damage;
        enemy.attackCooldown = ENEMY_DATA[enemy.kind].attackRate;
      }
    }
  }

  private bossShockwave(enemy: Enemy) {
    for (const structure of this.structures) {
      if (structure.kind === "core") continue;
      const p = this.world.gridToWorld(structure.gx, structure.gy);
      if (Math.hypot(p.x - enemy.pos.x, p.y - enemy.pos.y) < 94) {
        structure.hp -= enemy.damage * .75;
      }
    }
    if (Math.hypot(this.player.pos.x - enemy.pos.x, this.player.pos.y - enemy.pos.y) < 112) {
      this.player.hp -= enemy.damage * .6;
    }
    this.toast("O Colosso lançou uma onda de impacto!");
  }

  private flowDirection(enemy: Enemy): Vec2 {
    const grid = this.world.worldToGrid(enemy.pos.x, enemy.pos.y);
    const currentIndex = grid.y * WORLD_W + grid.x;
    let bestIndex = currentIndex;
    let best = this.pathField[currentIndex] ?? Infinity;

    const neighbors = [
      [grid.x + 1, grid.y],
      [grid.x - 1, grid.y],
      [grid.x, grid.y + 1],
      [grid.x, grid.y - 1]
    ];

    for (const [x, y] of neighbors) {
      if (x < 0 || y < 0 || x >= WORLD_W || y >= WORLD_H) continue;
      const index = y * WORLD_W + x;
      const value = this.pathField[index] ?? Infinity;
      if (value < best) {
        best = value;
        bestIndex = index;
      }
    }

    if (bestIndex === currentIndex) {
      const corePos = this.world.gridToWorld(this.core.gx, this.core.gy);
      return this.normalized(corePos.x - enemy.pos.x, corePos.y - enemy.pos.y);
    }

    const tx = bestIndex % WORLD_W;
    const ty = Math.floor(bestIndex / WORLD_W);
    const target = this.world.gridToWorld(tx, ty);
    return this.normalized(target.x - enemy.pos.x, target.y - enemy.pos.y);
  }

  private blockingStructureAt(x: number, y: number, radius: number) {
    return this.structures.find(s => {
      if (s.kind === "spike") return false;
      const p = this.world.gridToWorld(s.gx, s.gy);
      return Math.abs(x - p.x) < TILE_SIZE / 2 + radius - 2 &&
        Math.abs(y - p.y) < TILE_SIZE / 2 + radius - 2;
    });
  }

  private updateProjectiles(dt: number) {
    for (const projectile of this.projectiles) {
      projectile.life -= dt;
      projectile.pos.x += projectile.vel.x * dt;
      projectile.pos.y += projectile.vel.y * dt;
      if (projectile.life <= 0) continue;

      if (projectile.team === "enemy") {
        if (Math.hypot(projectile.pos.x - this.player.pos.x, projectile.pos.y - this.player.pos.y) < projectile.radius + this.player.radius) {
          this.player.hp -= projectile.damage;
          projectile.life = 0;
          continue;
        }

        const structure = this.blockingStructureAt(projectile.pos.x, projectile.pos.y, projectile.radius);
        if (structure) {
          structure.hp -= projectile.damage;
          projectile.life = 0;
        }
      } else {
        const enemy = this.enemies.find(e =>
          e.hp > 0 &&
          Math.hypot(projectile.pos.x - e.pos.x, projectile.pos.y - e.pos.y) < projectile.radius + e.radius
        );
        if (enemy) {
          enemy.hp -= projectile.damage;
          if (projectile.burn) enemy.burn = Math.max(enemy.burn, projectile.burn);
          projectile.life = 0;
        }
      }
    }

    this.projectiles = this.projectiles.filter(p =>
      p.life > 0 &&
      p.pos.x > -40 &&
      p.pos.y > -40 &&
      p.pos.x < WORLD_W * TILE_SIZE + 40 &&
      p.pos.y < WORLD_H * TILE_SIZE + 40
    );
  }

  private spawnProjectile(
    origin: Vec2,
    direction: Vec2,
    speed: number,
    damage: number,
    team: Projectile["team"],
    life: number,
    radius: number,
    burn = 0
  ) {
    this.projectiles.push({
      id: this.nextEntityId++,
      pos: { x: origin.x + direction.x * 12, y: origin.y + direction.y * 12 },
      vel: { x: direction.x * speed, y: direction.y * speed },
      radius,
      damage,
      life,
      team,
      burn
    });
  }

  private cleanupDead() {
    const deadEnemies = this.enemies.filter(e => e.hp <= 0);
    if (deadEnemies.length) {
      for (const enemy of deadEnemies) {
        this.kills++;
        if (this.modifiers.killHeal > 0) {
          this.player.hp = Math.min(this.player.maxHp, this.player.hp + this.modifiers.killHeal);
        }

        const dropChance = enemy.kind === "boss" ? 1 : .28;
        if (this.rng.chance(dropChance)) {
          const mult = enemy.kind === "boss" ? 6 : 1;
          if (this.rng.chance(.5)) this.wallet.wood += mult;
          else this.wallet.stone += mult;
          if (enemy.kind === "brute" || enemy.kind === "boss") this.wallet.iron += enemy.kind === "boss" ? 3 : 1;
        }
      }
      this.enemies = this.enemies.filter(e => e.hp > 0);
    }

    const before = this.structures.length;
    this.structures = this.structures.filter(s => s.kind === "core" || s.hp > 0);
    if (this.structures.length !== before) this.rebuildPathField();
  }

  private finishNight() {
    this.phase = "upgrade";
    this.player.hp = Math.min(this.player.maxHp, this.player.hp + 14);
    this.showUpgradeChoices();
  }

  private showUpgradeChoices() {
    const choices = this.rng.shuffle(UPGRADES).slice(0, 3);
    this.ui.upgradeOptions.replaceChildren();

    for (const upgrade of choices) {
      const button = document.createElement("button");
      button.className = "upgrade-option";

      const icon = document.createElement("span");
      icon.className = "icon";
      icon.textContent = upgrade.icon;

      const title = document.createElement("strong");
      title.textContent = upgrade.title;

      const description = document.createElement("small");
      description.textContent = upgrade.description;

      button.append(icon, title, description);
      button.addEventListener("click", () => this.chooseUpgrade(upgrade), { once: true });
      this.ui.upgradeOptions.append(button);
    }

    this.ui.upgradeOverlay.classList.add("overlay--visible");
  }

  private chooseUpgrade(upgrade: Upgrade) {
    switch (upgrade.id) {
      case "tower-damage": this.modifiers.towerDamage *= 1.25; break;
      case "tower-range": this.modifiers.towerRange *= 1.18; break;
      case "tower-fire": this.modifiers.towerFire = true; break;
      case "mining": this.modifiers.miningPower *= 1.35; break;
      case "yield": this.modifiers.resourceYield *= 1.30; break;
      case "health":
        this.player.maxHp += 30;
        this.player.hp = Math.min(this.player.maxHp, this.player.hp + 30);
        break;
      case "regen": this.modifiers.wallRegen += 2.2; break;
      case "crit": this.modifiers.critChance = Math.min(.65, this.modifiers.critChance + .10); break;
      case "attack-speed": this.modifiers.attackSpeed *= 1.15; break;
      case "traps": this.modifiers.trapDamage *= 1.35; break;
      case "move": this.modifiers.moveSpeed *= 1.10; break;
      case "vamp": this.modifiers.killHeal += 2; break;
    }

    this.ui.upgradeOverlay.classList.remove("overlay--visible");
    this.night++;
    this.phase = "day";
    this.dayTimer = DAY_SECONDS;
    this.toast(upgrade.title + " adquirido.");
  }

  private gameOver(reason: string) {
    if (this.phase === "gameover") return;
    this.phase = "gameover";
    this.mouseDown = false;
    this.ui.gameoverTitle.textContent = reason;
    this.ui.gameoverStats.textContent =
      "Noite alcançada: " + this.night + " · Inimigos derrotados: " + this.kills + " · Seed: " + this.world.seed;
    this.ui.gameoverOverlay.classList.add("overlay--visible");
  }

  private tryBuild() {
    if (!this.started || this.phase === "upgrade" || this.phase === "gameover" || this.selectedBuild === "none") return;
    const grid = this.world.worldToGrid(this.mouseWorld.x, this.mouseWorld.y);

    if (!this.canBuild(grid.x, grid.y, this.selectedBuild, true)) {
      this.toast("Não dá para construir aí — ou faltam recursos.");
      return;
    }

    const kind = this.selectedBuild;
    const data = BUILD_DATA[kind];
    this.wallet.wood -= data.cost.wood;
    this.wallet.stone -= data.cost.stone;
    this.wallet.iron -= data.cost.iron;

    this.structures.push({
      id: this.nextEntityId++,
      kind,
      gx: grid.x,
      gy: grid.y,
      hp: data.hp,
      maxHp: data.hp,
      cooldown: 0
    });

    this.rebuildPathField();
    this.updateHud();
  }

  private canBuild(gx: number, gy: number, kind: Exclude<BuildKind, "none">, checkWallet: boolean) {
    if (gx <= 0 || gy <= 0 || gx >= WORLD_W - 1 || gy >= WORLD_H - 1) return false;
    const target = this.world.gridToWorld(gx, gy);
    if (Math.hypot(target.x - this.player.pos.x, target.y - this.player.pos.y) > 280) return false;
    if (this.structures.some(s => s.gx === gx && s.gy === gy)) return false;
    if (this.world.resources.some(r => Math.hypot(r.pos.x - target.x, r.pos.y - target.y) < 22)) return false;

    if (checkWallet) {
      const cost = BUILD_DATA[kind].cost;
      if (this.wallet.wood < cost.wood || this.wallet.stone < cost.stone || this.wallet.iron < cost.iron) return false;
    }
    return true;
  }

  private rebuildPathField() {
    const size = WORLD_W * WORLD_H;
    const dist = new Float32Array(size);
    dist.fill(Infinity);

    const penalty = new Float32Array(size);
    for (const s of this.structures) {
      if (s.kind === "core") continue;
      const index = s.gy * WORLD_W + s.gx;
      penalty[index] = BUILD_DATA[s.kind].pathCost;
    }

    const source = this.core.gy * WORLD_W + this.core.gx;
    dist[source] = 0;

    const heapIndex: number[] = [source];
    const heapDistance: number[] = [0];

    const push = (index: number, value: number) => {
      let i = heapIndex.length;
      heapIndex.push(index);
      heapDistance.push(value);
      while (i > 0) {
        const parent = Math.floor((i - 1) / 2);
        if ((heapDistance[parent] ?? Infinity) <= value) break;
        heapIndex[i] = heapIndex[parent]!;
        heapDistance[i] = heapDistance[parent]!;
        i = parent;
      }
      heapIndex[i] = index;
      heapDistance[i] = value;
    };

    const pop = () => {
      if (!heapIndex.length) return undefined;
      const index = heapIndex[0]!;
      const value = heapDistance[0]!;
      const lastIndex = heapIndex.pop()!;
      const lastDistance = heapDistance.pop()!;
      if (heapIndex.length) {
        let i = 0;
        heapIndex[0] = lastIndex;
        heapDistance[0] = lastDistance;
        while (true) {
          const left = i * 2 + 1;
          const right = left + 1;
          if (left >= heapIndex.length) break;
          let child = left;
          if (right < heapIndex.length && (heapDistance[right] ?? Infinity) < (heapDistance[left] ?? Infinity)) child = right;
          if ((heapDistance[i] ?? Infinity) <= (heapDistance[child] ?? Infinity)) break;
          [heapIndex[i], heapIndex[child]] = [heapIndex[child]!, heapIndex[i]!];
          [heapDistance[i], heapDistance[child]] = [heapDistance[child]!, heapDistance[i]!];
          i = child;
        }
      }
      return { index, value };
    };

    while (heapIndex.length) {
      const node = pop();
      if (!node || node.value !== dist[node.index]) continue;
      const x = node.index % WORLD_W;
      const y = Math.floor(node.index / WORLD_W);
      const neighbors = [
        [x + 1, y],
        [x - 1, y],
        [x, y + 1],
        [x, y - 1]
      ];

      for (const [nx, ny] of neighbors) {
        if (nx < 0 || ny < 0 || nx >= WORLD_W || ny >= WORLD_H) continue;
        const next = ny * WORLD_W + nx;
        const candidate = node.value + 1 + penalty[next]!;
        if (candidate < dist[next]!) {
          dist[next] = candidate;
          push(next, candidate);
        }
      }
    }

    this.pathField = dist;
  }

  private bindInput() {
    window.addEventListener("keydown", event => {
      this.keys.add(event.code);
      if (event.repeat) return;
      if (event.code === "Digit1") this.selectBuild("wall");
      if (event.code === "Digit2") this.selectBuild("tower");
      if (event.code === "Digit3") this.selectBuild("spike");
      if (event.code === "Digit4") this.selectBuild("gate");
      if (event.code === "Escape") this.selectBuild("none");
      if (event.code === "KeyQ") this.toggleWeapon();
    });

    window.addEventListener("keyup", event => this.keys.delete(event.code));

    this.canvas.addEventListener("mousemove", event => {
      this.mouseWorld = this.renderer.screenToWorld(event.clientX, event.clientY);
    });

    this.canvas.addEventListener("mousedown", event => {
      this.mouseWorld = this.renderer.screenToWorld(event.clientX, event.clientY);
      if (event.button === 0) this.mouseDown = true;
      if (event.button === 2) this.tryBuild();
    });

    window.addEventListener("mouseup", event => {
      if (event.button === 0) this.mouseDown = false;
    });

    this.canvas.addEventListener("contextmenu", event => event.preventDefault());
  }

  private bindHotbar() {
    for (const button of this.ui.hotbarButtons) {
      button.addEventListener("click", () => {
        const value = button.dataset.build as BuildKind | undefined;
        if (value === "none") this.toggleWeapon();
        else if (value) this.selectBuild(value);
      });
    }
  }

  private selectBuild(kind: BuildKind) {
    this.selectedBuild = kind;
    this.updateHotbar();
  }

  private toggleWeapon() {
    this.weapon = this.weapon === "sword" ? "bow" : "sword";
    this.ui.weaponLabel.textContent = this.weapon === "sword" ? "Espada" : "Arco";
    this.toast(this.weapon === "sword" ? "Espada equipada." : "Arco equipado.");
  }

  private updateHotbar() {
    for (const button of this.ui.hotbarButtons) {
      button.classList.toggle("active", button.dataset.build === this.selectedBuild);
    }
    this.ui.weaponLabel.textContent = this.weapon === "sword" ? "Espada" : "Arco";
  }

  private updateHud() {
    const hpRatio = Math.max(0, this.player.hp / this.player.maxHp);
    const coreRatio = Math.max(0, this.core.hp / this.core.maxHp);
    this.ui.hpBar.style.width = (hpRatio * 100).toFixed(1) + "%";
    this.ui.coreBar.style.width = (coreRatio * 100).toFixed(1) + "%";
    this.ui.hpText.textContent = Math.ceil(Math.max(0, this.player.hp)) + "/" + this.player.maxHp;
    this.ui.coreText.textContent = Math.ceil(Math.max(0, this.core.hp)) + "/" + this.core.maxHp;
    this.ui.wood.textContent = String(this.wallet.wood);
    this.ui.stone.textContent = String(this.wallet.stone);
    this.ui.iron.textContent = String(this.wallet.iron);
    this.ui.seedLabel.textContent = "#" + this.world.seed.toString(16).toUpperCase();

    if (this.phase === "day") {
      this.ui.phaseLabel.textContent = "DIA · NOITE " + this.night;
      this.ui.phaseTimer.textContent = this.formatTime(this.dayTimer);
      this.ui.waveLabel.textContent = "Explore, colete e prepare a defesa.";
    } else if (this.phase === "night") {
      this.ui.phaseLabel.textContent = "NOITE " + this.night;
      this.ui.phaseTimer.textContent = "⚔ " + (this.enemies.length + this.spawnRemaining + (this.bossPending ? 1 : 0));
      this.ui.waveLabel.textContent = this.spawnRemaining + " ainda vêm · " + this.enemies.length + " em campo";
    } else if (this.phase === "upgrade") {
      this.ui.phaseLabel.textContent = "NOITE " + this.night + " VENCIDA";
      this.ui.phaseTimer.textContent = "UPGRADE";
      this.ui.waveLabel.textContent = "Escolha como sua build evolui.";
    } else {
      this.ui.phaseLabel.textContent = "RUN ENCERRADA";
      this.ui.phaseTimer.textContent = "☠";
      this.ui.waveLabel.textContent = "Tente uma build diferente.";
    }
  }

  private get core() {
    return this.structures.find(s => s.kind === "core")!;
  }

  private normalized(x: number, y: number): Vec2 {
    const length = Math.hypot(x, y);
    return length > .0001 ? { x: x / length, y: y / length } : { x: 0, y: 0 };
  }

  private formatTime(seconds: number) {
    const safe = Math.max(0, Math.ceil(seconds));
    return "00:" + String(safe).padStart(2, "0");
  }

  private toast(message: string) {
    this.ui.toast.textContent = message;
    this.ui.toast.classList.add("visible");
    window.clearTimeout(this.toastTimer);
    this.toastTimer = window.setTimeout(() => this.ui.toast.classList.remove("visible"), 1350);
  }
}
