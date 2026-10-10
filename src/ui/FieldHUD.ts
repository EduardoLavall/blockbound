import * as THREE from "three";
import type { WorldMetadata } from "../voxel/generation/WorldMetadata";
import type { PlayerController } from "../player/PlayerController";
import type { EnemySystem } from "../ai/EnemySystem";
import type { StructureSystem } from "../building/StructureSystem";
import type { DayNightSystem } from "../defense/DayNightSystem";
import { DayPhase } from "../defense/DayNightSystem";
import type { VoxelWorld } from "../voxel/VoxelWorld";
import { coverDistance, enemyHitDistance } from "../combat/CombatTrace";

/** North-up tactical map, context objectives and the enemy under the reticle. */
export class FieldHUD {
  private readonly map = document.getElementById("tactical-map") as HTMLCanvasElement;
  private readonly objective = document.getElementById("objective-hud")!;
  private readonly target = document.getElementById("enemy-target")!;
  private readonly banner = document.getElementById("event-banner")!;
  private readonly ctx = this.map.getContext("2d")!;
  private bannerTime = 0;
  private timer = 0;
  private readonly direction = new THREE.Vector3();
  private previousObjective = "";
  private previousTarget = "";
  constructor(private readonly metadata: WorldMetadata, private readonly player: PlayerController,
    private readonly camera: THREE.PerspectiveCamera, private readonly enemies: EnemySystem,
    private readonly structures: StructureSystem, private readonly cycle: DayNightSystem,
    private readonly world: VoxelWorld) {}

  announce(title: string, subtitle: string): void {
    this.banner.replaceChildren();
    const strong = document.createElement("strong"); strong.textContent = title;
    const small = document.createElement("span"); small.textContent = subtitle;
    this.banner.append(strong, small);
    this.bannerTime = 3;
    this.banner.classList.add("active");
  }
  update(dt: number): void {
    this.bannerTime = Math.max(0, this.bannerTime - dt);
    this.banner.classList.toggle("active", this.bannerTime > 0);
    this.timer -= dt;
    if (this.timer > 0) return;
    this.timer = 0.1;
    const day = this.cycle.phase === DayPhase.Day;
    const objective = day
      ? this.structures.all.length < 2
        ? "PREPARE A DEFESA|B → 2: torre · 3: espinhos na rota · botão direito: construir"
        : "EXPLORE E FORTALEÇA|Minere madeira, metal e cristal. N chama a próxima onda."
      : "DEFENDA O CRISTAL|Q: trocar arma · segure o botão esquerdo para atacar · R: reparar";
    if (objective !== this.previousObjective) {
      this.previousObjective = objective;
      const [title, help] = objective.split("|");
      this.objective.innerHTML = `<span class="eyebrow">${title}</span><p>${help}</p>`;
    }
    const enemies = this.enemies.aliveEnemies;
    this.camera.getWorldDirection(this.direction);
    const cover = coverDistance(this.world, this.camera.position, this.direction, 32, this.structures.all);
    const pointed = enemies.map(enemy => ({ enemy,
      distance: enemyHitDistance(enemy, this.camera.position, this.direction, 32) }))
      .filter((hit): hit is { enemy: typeof hit.enemy; distance: number } => hit.distance !== null && hit.distance < cover)
      .sort((a, b) => a.distance - b.distance)[0]?.enemy;
    const target = pointed ? `${pointed.definition.name}|${Math.ceil(pointed.health.current)}|${Math.ceil(pointed.health.max)}` : "";
    if (target !== this.previousTarget) {
      this.previousTarget = target;
      this.target.classList.toggle("hidden", !pointed);
      if (pointed) this.target.innerHTML = `<strong>${pointed.definition.name}</strong><span>${Math.ceil(pointed.health.current)} / ${Math.ceil(pointed.health.max)}</span><div><i style="width:${pointed.health.ratio * 100}%"></i></div>`;
    }
    this.drawMap(enemies);
  }
  private drawMap(enemies: readonly import("../ai/EnemySystem").EnemyInstance[]): void {
    const ctx = this.ctx;
    const { minX, minZ, maxXExclusive, maxZExclusive } = this.metadata.bounds;
    const x = (value: number) => 8 + (value - minX) / (maxXExclusive - minX) * 144;
    const z = (value: number) => 8 + (value - minZ) / (maxZExclusive - minZ) * 144;
    ctx.clearRect(0, 0, 160, 160);
    ctx.fillStyle = "#111f27"; ctx.fillRect(0, 0, 160, 160);
    ctx.strokeStyle = "#263740"; ctx.lineWidth = 1;
    for (let i = 8; i <= 152; i += 24) { ctx.beginPath(); ctx.moveTo(i, 8); ctx.lineTo(i, 152); ctx.moveTo(8, i); ctx.lineTo(152, i); ctx.stroke(); }
    ctx.strokeStyle = "#aa7552"; ctx.lineWidth = 5;
    ctx.beginPath(); ctx.moveTo(x(this.metadata.lane.entry.x), z(this.metadata.lane.entry.z));
    ctx.lineTo(x(this.metadata.core.x), z(this.metadata.core.z)); ctx.stroke();
    const dot = (px: number, pz: number, color: string, radius: number) => {
      ctx.fillStyle = color; ctx.beginPath(); ctx.arc(x(px), z(pz), radius, 0, Math.PI * 2); ctx.fill();
    };
    this.metadata.pois.forEach(poi => dot(poi.x, poi.z, poi.type === "altar" ? "#9be3da" : "#8a999f", 2.5));
    this.structures.all.forEach(s => dot(s.x, s.z, "#f1bc73", 2));
    enemies.forEach(e => dot(e.group.position.x, e.group.position.z, "#ff6975", e.type === "boss" ? 4 : 2));
    dot(this.metadata.core.x + 0.5, this.metadata.core.z + 0.5, "#6fffe1", 4);
    const player = this.player.getPosition();
    ctx.save(); ctx.translate(x(player.x), z(player.z));
    ctx.rotate(Math.atan2(this.direction.x, -this.direction.z));
    ctx.fillStyle = "#ffffff"; ctx.beginPath(); ctx.moveTo(0, -5); ctx.lineTo(-3, 4); ctx.lineTo(3, 4); ctx.fill(); ctx.restore();
    ctx.fillStyle = "#92aab5"; ctx.font = "bold 9px monospace"; ctx.fillText("N", 76, 10);
  }
}
