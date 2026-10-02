export enum EnemyType {
  Grunt = "grunt",
  Runner = "runner",
  Brute = "brute",
  Archer = "archer",
  Support = "support",
  Burrower = "burrower",
  Boss = "boss",
}

export interface EnemyDefinition {
  type: EnemyType;
  name: string;
  maxHealth: number;
  speed: number;
  attackDamage: number;
  attackInterval: number;
  scale: number;
  color: number;
  emissive: number;
  playerAggroRange: number;
  rangedRange: number;
  structureDamageMultiplier: number;
  coreDamageMultiplier: number;
  runnerAvoidsBreach?: boolean;
  ignoresBlockers?: boolean;
  supportRadius?: number;
  supportSpeedMultiplier?: number;
  supportDamageMultiplier?: number;
  bossPulseRadius?: number;
  bossPulseDamage?: number;
  bossPulseInterval?: number;
}

export const ENEMIES: Readonly<Record<EnemyType, EnemyDefinition>> = {
  [EnemyType.Grunt]: {
    type: EnemyType.Grunt,
    name: "Grunt",
    maxHealth: 72,
    speed: 2.35,
    attackDamage: 13,
    attackInterval: 0.78,
    scale: 1,
    color: 0x7b403b,
    emissive: 0x2e0c08,
    playerAggroRange: 1.35,
    rangedRange: 0,
    structureDamageMultiplier: 1,
    coreDamageMultiplier: 1,
  },
  [EnemyType.Runner]: {
    type: EnemyType.Runner,
    name: "Runner",
    maxHealth: 42,
    speed: 3.75,
    attackDamage: 8,
    attackInterval: 0.48,
    scale: 0.8,
    color: 0xc77b42,
    emissive: 0x4e1f08,
    playerAggroRange: 1.15,
    rangedRange: 0,
    structureDamageMultiplier: 0.45,
    coreDamageMultiplier: 0.8,
    runnerAvoidsBreach: true,
  },
  [EnemyType.Brute]: {
    type: EnemyType.Brute,
    name: "Brute",
    maxHealth: 185,
    speed: 1.55,
    attackDamage: 27,
    attackInterval: 1.15,
    scale: 1.35,
    color: 0x6d566f,
    emissive: 0x26122a,
    playerAggroRange: 1.55,
    rangedRange: 0,
    structureDamageMultiplier: 2.4,
    coreDamageMultiplier: 1.35,
  },
  [EnemyType.Archer]: {
    type: EnemyType.Archer,
    name: "Archer",
    maxHealth: 58,
    speed: 1.9,
    attackDamage: 10,
    attackInterval: 1.45,
    scale: 0.94,
    color: 0x47737d,
    emissive: 0x102f37,
    playerAggroRange: 9,
    rangedRange: 8,
    structureDamageMultiplier: 0.6,
    coreDamageMultiplier: 0.8,
  },
  [EnemyType.Support]: {
    type: EnemyType.Support,
    name: "Support",
    maxHealth: 92,
    speed: 2,
    attackDamage: 7,
    attackInterval: 1.1,
    scale: 1.02,
    color: 0x6e8d52,
    emissive: 0x1d3710,
    playerAggroRange: 1.25,
    rangedRange: 0,
    structureDamageMultiplier: 0.75,
    coreDamageMultiplier: 0.7,
    supportRadius: 5.5,
    supportSpeedMultiplier: 1.22,
    supportDamageMultiplier: 1.25,
  },
  [EnemyType.Burrower]: {
    type: EnemyType.Burrower,
    name: "Burrower",
    maxHealth: 88,
    speed: 2.15,
    attackDamage: 16,
    attackInterval: 0.9,
    scale: 0.9,
    color: 0x8d6745,
    emissive: 0x301b0b,
    playerAggroRange: 1.25,
    rangedRange: 0,
    structureDamageMultiplier: 0.25,
    coreDamageMultiplier: 1.2,
    ignoresBlockers: true,
  },
  [EnemyType.Boss]: {
    type: EnemyType.Boss,
    name: "Siege Warden",
    maxHealth: 1450,
    speed: 1.25,
    attackDamage: 34,
    attackInterval: 1.05,
    scale: 2.15,
    color: 0x522d38,
    emissive: 0x6b1024,
    playerAggroRange: 2.3,
    rangedRange: 0,
    structureDamageMultiplier: 3.2,
    coreDamageMultiplier: 1.8,
    supportRadius: 7,
    supportSpeedMultiplier: 1.12,
    supportDamageMultiplier: 1.18,
    bossPulseRadius: 6.5,
    bossPulseDamage: 18,
    bossPulseInterval: 5.5,
  },
};

export interface EnemySpawnProfile {
  type: EnemyType;
  weight: number;
}

export function rosterForNight(night: number): readonly EnemySpawnProfile[] {
  if (night <= 1) {
    return [
      { type: EnemyType.Grunt, weight: 0.72 },
      { type: EnemyType.Runner, weight: 0.28 },
    ];
  }
  if (night === 2) {
    return [
      { type: EnemyType.Grunt, weight: 0.55 },
      { type: EnemyType.Runner, weight: 0.25 },
      { type: EnemyType.Brute, weight: 0.2 },
    ];
  }
  if (night === 3) {
    return [
      { type: EnemyType.Grunt, weight: 0.42 },
      { type: EnemyType.Runner, weight: 0.18 },
      { type: EnemyType.Brute, weight: 0.2 },
      { type: EnemyType.Archer, weight: 0.2 },
    ];
  }
  if (night === 4) {
    return [
      { type: EnemyType.Grunt, weight: 0.3 },
      { type: EnemyType.Runner, weight: 0.15 },
      { type: EnemyType.Brute, weight: 0.18 },
      { type: EnemyType.Archer, weight: 0.16 },
      { type: EnemyType.Support, weight: 0.11 },
      { type: EnemyType.Burrower, weight: 0.1 },
    ];
  }

  return [
    { type: EnemyType.Grunt, weight: 0.25 },
    { type: EnemyType.Runner, weight: 0.12 },
    { type: EnemyType.Brute, weight: 0.19 },
    { type: EnemyType.Archer, weight: 0.14 },
    { type: EnemyType.Support, weight: 0.12 },
    { type: EnemyType.Burrower, weight: 0.18 },
  ];
}
