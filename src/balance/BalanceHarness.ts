import { ENEMIES, type EnemyDefinition, EnemyType, rosterForNight } from "../ai/EnemyRegistry";
import { STRUCTURES, StructureType } from "../building/StructureRegistry";
import { NIGHT_DEFINITIONS } from "../defense/VerticalSliceRules";
import { ITEMS } from "../items/ItemRegistry";
import { BASE_PLAYER_STATS } from "../player/PlayerStats";
import { UPGRADES } from "../roguelite/UpgradeRegistry";

export interface WeaponMetric {
  name: "Blade" | "Repeater";
  damage: number;
  cooldown: number;
  attacksPerSecond: number;
  dpsBeforeCrit: number;
  expectedDps: number;
}

export interface EnemyMetric {
  type: EnemyType;
  health: number;
  dps: number;
  playerHitsToKill: number;
  bladeTtk: number;
  repeaterTtk: number;
  wallBreachSeconds: number | null;
  coreKillSeconds: number;
}

export interface WaveMetric {
  night: number;
  totalEnemies: number;
  maxAlive: number;
  expectedNormalHealth: number;
  approximateTotalHealth: number;
  playerOnlyClearSeconds: number;
}

export interface BalanceSnapshot {
  weapons: readonly WeaponMetric[];
  enemies: readonly EnemyMetric[];
  waves: readonly WaveMetric[];
  defense: {
    turretDps: number;
    spikeDps: number;
    turretRange: number;
    wallHealth: number;
    gateHealth: number;
  };
  content: {
    upgrades: number;
    items: number;
  };
}

export function createBalanceSnapshot(): BalanceSnapshot {
  const weapons = weaponMetrics();
  const repeater = weapons.find((weapon) => weapon.name === "Repeater")!;

  return {
    weapons,
    enemies: Object.values(ENEMIES).map((enemy) =>
      enemyMetric(enemy, weapons),
    ),
    waves: NIGHT_DEFINITIONS.map((night) => {
      const scale = 1 + Math.max(0, night.night - 1) * 0.08;
      const roster = rosterForNight(night.night);
      const expectedNormalHealth = roster.reduce(
        (sum, entry) => sum + ENEMIES[entry.type].maxHealth * scale * entry.weight,
        0,
      );
      const normalCount = night.boss
        ? night.totalEnemies - 1
        : night.totalEnemies;
      const approximateTotalHealth =
        expectedNormalHealth * normalCount +
        (night.boss ? ENEMIES[EnemyType.Boss].maxHealth : 0);

      return {
        night: night.night,
        totalEnemies: night.totalEnemies,
        maxAlive: night.maxAlive,
        expectedNormalHealth,
        approximateTotalHealth,
        playerOnlyClearSeconds:
          approximateTotalHealth / repeater.expectedDps,
      };
    }),
    defense: {
      turretDps: 21 / 0.72,
      spikeDps: 24 / 0.62,
      turretRange: STRUCTURES[StructureType.Turret].range ?? 0,
      wallHealth: STRUCTURES[StructureType.Wall].maxHealth,
      gateHealth: STRUCTURES[StructureType.Gate].maxHealth,
    },
    content: {
      upgrades: UPGRADES.length,
      items: ITEMS.length,
    },
  };
}

export function expectedCritMultiplier(): number {
  return (
    1 +
    BASE_PLAYER_STATS.critChance *
      (BASE_PLAYER_STATS.critMultiplier - 1)
  );
}

function weaponMetrics(): WeaponMetric[] {
  const crit = expectedCritMultiplier();
  const bladeDps =
    BASE_PLAYER_STATS.meleeDamage / BASE_PLAYER_STATS.meleeCooldown;
  const repeaterDps =
    BASE_PLAYER_STATS.rangedDamage / BASE_PLAYER_STATS.rangedCooldown;

  return [
    {
      name: "Blade",
      damage: BASE_PLAYER_STATS.meleeDamage,
      cooldown: BASE_PLAYER_STATS.meleeCooldown,
      attacksPerSecond: 1 / BASE_PLAYER_STATS.meleeCooldown,
      dpsBeforeCrit: bladeDps,
      expectedDps: bladeDps * crit,
    },
    {
      name: "Repeater",
      damage: BASE_PLAYER_STATS.rangedDamage,
      cooldown: BASE_PLAYER_STATS.rangedCooldown,
      attacksPerSecond: 1 / BASE_PLAYER_STATS.rangedCooldown,
      dpsBeforeCrit: repeaterDps,
      expectedDps: repeaterDps * crit,
    },
  ];
}

function enemyMetric(
  enemy: EnemyDefinition,
  weapons: readonly WeaponMetric[],
): EnemyMetric {
  const blade = weapons.find((weapon) => weapon.name === "Blade")!;
  const repeater = weapons.find((weapon) => weapon.name === "Repeater")!;
  const dps = enemy.attackDamage / enemy.attackInterval;
  const wallDps = dps * enemy.structureDamageMultiplier;
  const coreDps = dps * enemy.coreDamageMultiplier;

  return {
    type: enemy.type,
    health: enemy.maxHealth,
    dps,
    playerHitsToKill: Math.ceil(enemy.maxHealth / BASE_PLAYER_STATS.rangedDamage),
    bladeTtk: enemy.maxHealth / blade.expectedDps,
    repeaterTtk: enemy.maxHealth / repeater.expectedDps,
    wallBreachSeconds:
      enemy.ignoresBlockers
        ? null
        : STRUCTURES[StructureType.Wall].maxHealth / wallDps,
    coreKillSeconds: 500 / coreDps,
  };
}

export function relativeUpgradePower(id: string): number | null {
  switch (id) {
    case "sharpened-edge":
      return 1.25;
    case "fast-hands":
      return 1 / 0.82;
    case "heavy-slash":
      return 1.5 / 1.12;
    case "repeater-springs":
      return 1 / 0.82;
    case "high-tension":
      return 1.25;
    case "calibrated-turrets":
      return 1.25;
    case "overclocked-turrets":
      return 1 / 0.8;
    case "serrated-spikes":
      return 1.35;
    case "rapid-traps":
      return 1 / 0.75;
    default:
      return null;
  }
}
