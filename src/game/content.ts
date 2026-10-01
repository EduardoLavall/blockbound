import type { BuildKind, EnemyKind, RunModifiers, StructureKind, Upgrade, Wallet } from "./types";

export const TILE_SIZE = 32;
export const WORLD_W = 48;
export const WORLD_H = 48;
export const DAY_SECONDS = 55;

export const BUILD_DATA: Record<Exclude<BuildKind, "none">, { hp: number; cost: Wallet; pathCost: number }> = {
  wall: { hp: 110, cost: { wood: 4, stone: 0, iron: 0 }, pathCost: 11 },
  tower: { hp: 80, cost: { wood: 6, stone: 5, iron: 0 }, pathCost: 8 },
  spike: { hp: 55, cost: { wood: 3, stone: 2, iron: 0 }, pathCost: 3 },
  gate: { hp: 90, cost: { wood: 5, stone: 2, iron: 0 }, pathCost: 9 }
};

export const STRUCTURE_LABELS: Record<StructureKind, string> = {
  core: "Núcleo",
  wall: "Muralha",
  tower: "Torre",
  spike: "Espinhos",
  gate: "Portão"
};

export const ENEMY_DATA: Record<EnemyKind, {
  hp: number;
  speed: number;
  radius: number;
  damage: number;
  attackRate: number;
  score: number;
}> = {
  grunt: { hp: 34, speed: 45, radius: 12, damage: 8, attackRate: 1.0, score: 1 },
  runner: { hp: 21, speed: 76, radius: 10, damage: 6, attackRate: .72, score: 1 },
  brute: { hp: 105, speed: 29, radius: 16, damage: 22, attackRate: 1.35, score: 3 },
  archer: { hp: 38, speed: 38, radius: 12, damage: 8, attackRate: 1.15, score: 2 },
  shaman: { hp: 48, speed: 34, radius: 13, damage: 6, attackRate: 1.3, score: 3 },
  burrower: { hp: 31, speed: 58, radius: 11, damage: 10, attackRate: .9, score: 3 },
  boss: { hp: 520, speed: 25, radius: 24, damage: 34, attackRate: 1.1, score: 15 }
};

export const UPGRADES: Upgrade[] = [
  { id: "tower-damage", icon: "🎯", title: "Calibração Brutal", description: "+25% de dano para todas as torres." },
  { id: "tower-range", icon: "🔭", title: "Olho do Bastião", description: "+18% de alcance para todas as torres." },
  { id: "tower-fire", icon: "🔥", title: "Piche Incandescente", description: "Projéteis de torre passam a incendiar inimigos." },
  { id: "mining", icon: "⛏️", title: "Ferramentas Afiadas", description: "+35% de poder de coleta." },
  { id: "yield", icon: "📦", title: "Aproveitamento Total", description: "+30% de recursos ao destruir nós do mapa." },
  { id: "health", icon: "❤️", title: "Coração de Ferro", description: "+30 de vida máxima e cura imediata." },
  { id: "regen", icon: "🧱", title: "Argamassa Viva", description: "Muralhas e portões regeneram vida lentamente durante o dia." },
  { id: "crit", icon: "⚔️", title: "Golpe Preciso", description: "+10% de chance de crítico no combate do jogador." },
  { id: "attack-speed", icon: "💨", title: "Ritmo de Caça", description: "+15% de velocidade de ataque." },
  { id: "traps", icon: "🪤", title: "Ponta Serrilhada", description: "+35% de dano dos espinhos." },
  { id: "move", icon: "🥾", title: "Passo do Explorador", description: "+10% de velocidade de movimento." },
  { id: "vamp", icon: "🩸", title: "Segundo Fôlego", description: "Recupere 2 de vida a cada inimigo derrotado." }
];

export const DEFAULT_MODIFIERS: RunModifiers = {
  towerDamage: 1,
  towerRange: 1,
  towerFire: false,
  miningPower: 1,
  resourceYield: 1,
  wallRegen: 0,
  critChance: .05,
  attackSpeed: 1,
  trapDamage: 1,
  moveSpeed: 1,
  killHeal: 0
};
