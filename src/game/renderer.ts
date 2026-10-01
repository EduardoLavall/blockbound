import { TILE_SIZE, WORLD_H, WORLD_W } from "./content";
import type {
  BuildKind,
  Enemy,
  Player,
  Projectile,
  ResourceNode,
  Structure,
  Vec2
} from "./types";
import type { World } from "./world";

export interface RenderState {
  world: World;
  player: Player;
  structures: Structure[];
  enemies: Enemy[];
  projectiles: Projectile[];
  phase: "day" | "night" | "upgrade" | "gameover";
  selectedBuild: BuildKind;
  mouseWorld: Vec2;
  buildValid: boolean;
  night: number;
}

const SPRITE_PATHS = {
  player: "/sprites/player.svg",
  tree: "/sprites/tree.svg",
  rock: "/sprites/rock.svg",
  ore: "/sprites/ore.svg",
  cache: "/sprites/cache.svg",
  tower: "/sprites/tower.svg",
  grunt: "/sprites/grunt.svg",
  runner: "/sprites/runner.svg",
  brute: "/sprites/brute.svg",
  archer: "/sprites/archer.svg",
  shaman: "/sprites/shaman.svg",
  burrower: "/sprites/burrower.svg",
  boss: "/sprites/boss.svg"
} as const;

type SpriteName = keyof typeof SPRITE_PATHS;

export class Renderer {
  private ctx: CanvasRenderingContext2D;
  private sprites = new Map<SpriteName, HTMLImageElement>();
  private camera = { x: 0, y: 0 };
  private dpr = 1;

  constructor(private canvas: HTMLCanvasElement) {
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Canvas 2D não disponível.");
    this.ctx = ctx;
    this.loadSprites();
    this.resize();
    window.addEventListener("resize", () => this.resize());
  }

  screenToWorld(screenX: number, screenY: number): Vec2 {
    const rect = this.canvas.getBoundingClientRect();
    return {
      x: screenX - rect.left + this.camera.x,
      y: screenY - rect.top + this.camera.y
    };
  }

  render(state: RenderState) {
    this.camera.x = state.player.pos.x - this.canvas.clientWidth / 2;
    this.camera.y = state.player.pos.y - this.canvas.clientHeight / 2;
    this.camera.x = Math.max(0, Math.min(WORLD_W * TILE_SIZE - this.canvas.clientWidth, this.camera.x));
    this.camera.y = Math.max(0, Math.min(WORLD_H * TILE_SIZE - this.canvas.clientHeight, this.camera.y));

    const ctx = this.ctx;
    ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    ctx.clearRect(0, 0, this.canvas.clientWidth, this.canvas.clientHeight);
    ctx.save();
    ctx.translate(-Math.round(this.camera.x), -Math.round(this.camera.y));

    this.drawWorld(state.world);
    this.drawResources(state.world.resources);
    this.drawStructures(state.structures);
    this.drawProjectiles(state.projectiles);
    this.drawEnemies(state.enemies);
    this.drawPlayer(state.player);
    this.drawBuildPreview(state);

    ctx.restore();

    if (state.phase === "night") {
      const alpha = Math.min(.45, .24 + state.night * .012);
      ctx.fillStyle = "rgba(16, 25, 54, " + alpha.toFixed(3) + ")";
      ctx.fillRect(0, 0, this.canvas.clientWidth, this.canvas.clientHeight);
      ctx.fillStyle = "rgba(240, 221, 161, .06)";
      for (let i = 0; i < 18; i++) {
        const x = ((i * 173) % this.canvas.clientWidth);
        const y = ((i * 97) % Math.max(1, this.canvas.clientHeight - 100));
        ctx.fillRect(x, y, 2, 2);
      }
    }

    this.drawCrosshair(state);
  }

  private resize() {
    this.dpr = Math.min(2, window.devicePixelRatio || 1);
    const width = Math.max(1, Math.floor(this.canvas.clientWidth * this.dpr));
    const height = Math.max(1, Math.floor(this.canvas.clientHeight * this.dpr));
    if (this.canvas.width !== width || this.canvas.height !== height) {
      this.canvas.width = width;
      this.canvas.height = height;
    }
    this.ctx.imageSmoothingEnabled = false;
  }

  private loadSprites() {
    (Object.entries(SPRITE_PATHS) as [SpriteName, string][]).forEach(([name, src]) => {
      const img = new Image();
      img.src = src;
      this.sprites.set(name, img);
    });
  }

  private drawWorld(world: World) {
    const ctx = this.ctx;
    const minX = Math.max(0, Math.floor(this.camera.x / TILE_SIZE) - 1);
    const minY = Math.max(0, Math.floor(this.camera.y / TILE_SIZE) - 1);
    const maxX = Math.min(WORLD_W - 1, Math.ceil((this.camera.x + this.canvas.clientWidth) / TILE_SIZE) + 1);
    const maxY = Math.min(WORLD_H - 1, Math.ceil((this.camera.y + this.canvas.clientHeight) / TILE_SIZE) + 1);

    for (let y = minY; y <= maxY; y++) {
      for (let x = minX; x <= maxX; x++) {
        const tile = world.tile(x, y);
        if (!tile) continue;
        const colors = tile.kind === "grass"
          ? ["#344a2d", "#384f30", "#31452b", "#3b5131"]
          : tile.kind === "moss"
            ? ["#2c4230", "#304732", "#29402d", "#344a35"]
            : tile.kind === "dirt"
              ? ["#4f4934", "#554d38", "#4a4432", "#59503a"]
              : ["#3b5232", "#405835", "#3a5030", "#455b38"];
        ctx.fillStyle = colors[tile.variant % colors.length]!;
        ctx.fillRect(x * TILE_SIZE, y * TILE_SIZE, TILE_SIZE, TILE_SIZE);

        if (tile.kind === "flowers") {
          ctx.fillStyle = tile.variant % 2 === 0 ? "#d6bd63" : "#b587a5";
          ctx.fillRect(x * TILE_SIZE + 8 + tile.variant * 2, y * TILE_SIZE + 11, 3, 3);
          ctx.fillRect(x * TILE_SIZE + 21, y * TILE_SIZE + 22 - tile.variant, 2, 2);
        }

        ctx.strokeStyle = "rgba(8,12,8,.08)";
        ctx.strokeRect(x * TILE_SIZE + .5, y * TILE_SIZE + .5, TILE_SIZE - 1, TILE_SIZE - 1);
      }
    }

    ctx.strokeStyle = "rgba(238,202,93,.25)";
    ctx.lineWidth = 3;
    ctx.strokeRect(2, 2, WORLD_W * TILE_SIZE - 4, WORLD_H * TILE_SIZE - 4);
  }

  private drawResources(resources: ResourceNode[]) {
    for (const node of resources) {
      const sprite = node.kind as SpriteName;
      const size = node.kind === "tree" ? 44 : node.kind === "cache" ? 30 : 34;
      if (!this.drawSprite(sprite, node.pos.x, node.pos.y, size, size)) {
        const ctx = this.ctx;
        ctx.fillStyle = node.kind === "tree" ? "#527d3c"
          : node.kind === "rock" ? "#7a8077"
          : node.kind === "ore" ? "#8b7b67" : "#c7a747";
        ctx.fillRect(node.pos.x - size / 2, node.pos.y - size / 2, size, size);
      }
      if (node.hp < node.maxHp) this.healthBar(node.pos.x, node.pos.y - 27, node.hp / node.maxHp, 26);
    }
  }

  private drawStructures(structures: Structure[]) {
    const ctx = this.ctx;
    for (const s of structures) {
      const x = s.gx * TILE_SIZE + TILE_SIZE / 2;
      const y = s.gy * TILE_SIZE + TILE_SIZE / 2;

      if (s.kind === "core") {
        ctx.save();
        ctx.translate(x, y);
        ctx.fillStyle = "#262c29";
        ctx.fillRect(-22, -22, 44, 44);
        ctx.fillStyle = "#d8b44f";
        ctx.fillRect(-13, -13, 26, 26);
        ctx.fillStyle = "#fff0a8";
        ctx.fillRect(-5, -5, 10, 10);
        ctx.strokeStyle = "#111713";
        ctx.lineWidth = 3;
        ctx.strokeRect(-22, -22, 44, 44);
        ctx.restore();
      } else if (s.kind === "tower" && this.drawSprite("tower", x, y, 38, 38)) {
        // sprite drawn
      } else if (s.kind === "wall") {
        ctx.fillStyle = "#795c3e";
        ctx.fillRect(x - 15, y - 15, 30, 30);
        ctx.fillStyle = "#a07a50";
        ctx.fillRect(x - 12, y - 12, 24, 8);
        ctx.fillStyle = "#60472f";
        ctx.fillRect(x - 12, y + 2, 24, 10);
        ctx.strokeStyle = "#2e241a";
        ctx.strokeRect(x - 15.5, y - 15.5, 31, 31);
      } else if (s.kind === "gate") {
        ctx.fillStyle = "#68482f";
        ctx.fillRect(x - 14, y - 15, 28, 30);
        ctx.fillStyle = "#a17545";
        for (let gx = -9; gx <= 9; gx += 9) ctx.fillRect(x + gx - 2, y - 13, 4, 26);
        ctx.fillStyle = "#30362d";
        ctx.fillRect(x - 13, y - 2, 26, 4);
      } else if (s.kind === "spike") {
        ctx.fillStyle = "#858d83";
        for (let i = -10; i <= 10; i += 10) {
          ctx.beginPath();
          ctx.moveTo(x + i - 5, y + 10);
          ctx.lineTo(x + i, y - 10);
          ctx.lineTo(x + i + 5, y + 10);
          ctx.fill();
        }
      } else {
        ctx.fillStyle = "#6d725f";
        ctx.fillRect(x - 14, y - 14, 28, 28);
      }

      if (s.hp < s.maxHp) this.healthBar(x, y - 24, s.hp / s.maxHp, 28);
    }
  }

  private drawEnemies(enemies: Enemy[]) {
    const ctx = this.ctx;
    for (const enemy of enemies) {
      const size = enemy.kind === "boss" ? 60 : enemy.radius * 2 + 12;
      const sprite = enemy.kind as SpriteName;
      if (!this.drawSprite(sprite, enemy.pos.x, enemy.pos.y, size, size)) {
        const colors: Record<string, string> = {
          grunt: "#a85a52",
          runner: "#d1784f",
          brute: "#81514a",
          archer: "#9a6f50",
          shaman: "#76568e",
          burrower: "#6d7b53",
          boss: "#b3453f"
        };
        ctx.fillStyle = colors[enemy.kind] ?? "#a85a52";
        ctx.beginPath();
        ctx.arc(enemy.pos.x, enemy.pos.y, enemy.radius, 0, Math.PI * 2);
        ctx.fill();
      }

      if (enemy.burn > 0) {
        ctx.fillStyle = "rgba(255,132,46,.7)";
        ctx.fillRect(enemy.pos.x - 7, enemy.pos.y - enemy.radius - 9, 5, 8);
        ctx.fillRect(enemy.pos.x + 3, enemy.pos.y - enemy.radius - 13, 4, 12);
      }
      if (enemy.hp < enemy.maxHp || enemy.kind === "boss") {
        this.healthBar(enemy.pos.x, enemy.pos.y - enemy.radius - 12, enemy.hp / enemy.maxHp, enemy.kind === "boss" ? 52 : 26);
      }
    }
  }

  private drawProjectiles(projectiles: Projectile[]) {
    const ctx = this.ctx;
    for (const p of projectiles) {
      ctx.fillStyle = p.team === "enemy" ? "#e87568" : p.team === "tower" ? "#efc65f" : "#e6e8db";
      ctx.beginPath();
      ctx.arc(p.pos.x, p.pos.y, p.radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = "rgba(255,255,255,.25)";
      ctx.stroke();
    }
  }

  private drawPlayer(player: Player) {
    const ctx = this.ctx;
    const angle = Math.atan2(player.facing.y, player.facing.x);
    ctx.save();
    ctx.translate(player.pos.x, player.pos.y);
    ctx.rotate(angle + Math.PI / 2);
    const sprite = this.sprites.get("player");
    if (sprite?.complete && sprite.naturalWidth > 0) {
      ctx.drawImage(sprite, -18, -18, 36, 36);
    } else {
      ctx.fillStyle = "#e5c35f";
      ctx.fillRect(-11, -11, 22, 22);
      ctx.fillStyle = "#203027";
      ctx.fillRect(-7, -4, 14, 11);
    }
    ctx.restore();
  }

  private drawBuildPreview(state: RenderState) {
    if (state.selectedBuild === "none" || state.phase === "upgrade" || state.phase === "gameover") return;
    const gx = Math.floor(state.mouseWorld.x / TILE_SIZE);
    const gy = Math.floor(state.mouseWorld.y / TILE_SIZE);
    if (gx < 0 || gy < 0 || gx >= WORLD_W || gy >= WORLD_H) return;
    const ctx = this.ctx;
    ctx.globalAlpha = .52;
    ctx.fillStyle = state.buildValid ? "#91d46f" : "#e2665d";
    ctx.fillRect(gx * TILE_SIZE + 2, gy * TILE_SIZE + 2, TILE_SIZE - 4, TILE_SIZE - 4);
    ctx.globalAlpha = 1;
  }

  private drawCrosshair(state: RenderState) {
    const ctx = this.ctx;
    const x = state.mouseWorld.x - this.camera.x;
    const y = state.mouseWorld.y - this.camera.y;
    ctx.strokeStyle = "rgba(255,244,205,.8)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(x - 7, y);
    ctx.lineTo(x + 7, y);
    ctx.moveTo(x, y - 7);
    ctx.lineTo(x, y + 7);
    ctx.stroke();
  }

  private drawSprite(name: SpriteName, x: number, y: number, w: number, h: number) {
    const img = this.sprites.get(name);
    if (!img?.complete || img.naturalWidth === 0) return false;
    this.ctx.drawImage(img, Math.round(x - w / 2), Math.round(y - h / 2), w, h);
    return true;
  }

  private healthBar(x: number, y: number, ratio: number, width: number) {
    const ctx = this.ctx;
    const clamped = Math.max(0, Math.min(1, ratio));
    ctx.fillStyle = "rgba(8,10,8,.8)";
    ctx.fillRect(x - width / 2 - 1, y - 1, width + 2, 5);
    ctx.fillStyle = clamped > .55 ? "#75b65f" : clamped > .25 ? "#d5a84b" : "#d45d55";
    ctx.fillRect(x - width / 2, y, width * clamped, 3);
  }
}
