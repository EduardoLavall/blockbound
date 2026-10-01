export type Vec2 = { x: number; y: number };

export type ResourceKind = "tree" | "rock" | "ore" | "cache";
export type BuildKind = "wall" | "tower" | "spike" | "gate" | "none";
export type StructureKind = Exclude<BuildKind, "none"> | "core";
export type EnemyKind = "grunt" | "runner" | "brute" | "archer" | "shaman" | "burrower" | "boss";
export type WeaponKind = "sword" | "bow";
export type Phase = "day" | "night" | "upgrade" | "gameover";
export type TileKind = "grass" | "moss" | "dirt" | "flowers";

export interface Wallet {
  wood: number;
  stone: number;
  iron: number;
}

export interface Player {
  pos: Vec2;
  radius: number;
  hp: number;
  maxHp: number;
  speed: number;
  attackCooldown: number;
  facing: Vec2;
}

export interface ResourceNode {
  id: number;
  kind: ResourceKind;
  pos: Vec2;
  hp: number;
  maxHp: number;
  amount: number;
}

export interface Structure {
  id: number;
  kind: StructureKind;
  gx: number;
  gy: number;
  hp: number;
  maxHp: number;
  cooldown: number;
}

export interface Enemy {
  id: number;
  kind: EnemyKind;
  pos: Vec2;
  hp: number;
  maxHp: number;
  speed: number;
  radius: number;
  damage: number;
  attackCooldown: number;
  rangedCooldown: number;
  specialCooldown: number;
  burn: number;
  burnTick: number;
}

export interface Projectile {
  id: number;
  pos: Vec2;
  vel: Vec2;
  radius: number;
  damage: number;
  life: number;
  team: "player" | "tower" | "enemy";
  burn?: number;
}

export interface Tile {
  kind: TileKind;
  variant: number;
}

export interface Upgrade {
  id: string;
  icon: string;
  title: string;
  description: string;
}

export interface RunModifiers {
  towerDamage: number;
  towerRange: number;
  towerFire: boolean;
  miningPower: number;
  resourceYield: number;
  wallRegen: number;
  critChance: number;
  attackSpeed: number;
  trapDamage: number;
  moveSpeed: number;
  killHeal: number;
}
