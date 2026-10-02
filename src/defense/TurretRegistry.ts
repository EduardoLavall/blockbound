import { EnemyType } from "../ai/EnemyRegistry";
import { StructureType } from "../building/StructureRegistry";

export interface TurretCombatDefinition {
  type: StructureType.Turret | StructureType.RapidTurret;
  damage: number;
  cooldown: number;
  range: number;
  boltColor: number;
  targetPriority: Readonly<Partial<Record<EnemyType, number>>>;
  damageMultiplier: Readonly<Partial<Record<EnemyType, number>>>;
}

export const TURRETS: Readonly<
  Record<StructureType.Turret | StructureType.RapidTurret, TurretCombatDefinition>
> = {
  [StructureType.Turret]: {
    type: StructureType.Turret,
    damage: 21,
    cooldown: 0.72,
    range: 12,
    boltColor: 0x77eee5,
    targetPriority: {},
    damageMultiplier: {},
  },
  [StructureType.RapidTurret]: {
    type: StructureType.RapidTurret,
    damage: 8,
    cooldown: 0.22,
    range: 9.5,
    boltColor: 0xffc45e,
    targetPriority: {
      [EnemyType.Runner]: 5,
      [EnemyType.Grunt]: 3,
      [EnemyType.Support]: 1.5,
      [EnemyType.Archer]: 1,
      [EnemyType.Burrower]: 0.5,
      [EnemyType.Brute]: -2,
      [EnemyType.Boss]: -4,
    },
    damageMultiplier: {
      [EnemyType.Runner]: 1.15,
      [EnemyType.Grunt]: 1.08,
      [EnemyType.Brute]: 0.55,
      [EnemyType.Boss]: 0.45,
    },
  },
};

export function isTurretStructure(
  type: StructureType,
): type is StructureType.Turret | StructureType.RapidTurret {
  return (
    type === StructureType.Turret ||
    type === StructureType.RapidTurret
  );
}

export function turretDefinition(
  type: StructureType,
): TurretCombatDefinition | null {
  return isTurretStructure(type) ? TURRETS[type] : null;
}

export function turretDamageAgainst(
  type: StructureType,
  enemyType: EnemyType,
): number {
  const definition = turretDefinition(type);
  if (!definition) return 0;
  return (
    definition.damage *
    (definition.damageMultiplier[enemyType] ?? 1)
  );
}

export function turretTargetPriority(
  type: StructureType,
  enemyType: EnemyType,
): number {
  const definition = turretDefinition(type);
  if (!definition) return -Infinity;
  return definition.targetPriority[enemyType] ?? 0;
}
