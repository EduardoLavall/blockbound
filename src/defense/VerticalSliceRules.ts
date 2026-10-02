export const FINAL_NIGHT = 5;

export interface NightDefinition {
  night: number;
  totalEnemies: number;
  maxAlive: number;
  spawnInterval: number;
  boss: boolean;
}

export const NIGHT_DEFINITIONS: readonly NightDefinition[] = [
  { night: 1, totalEnemies: 11, maxAlive: 10, spawnInterval: 1.18, boss: false },
  { night: 2, totalEnemies: 15, maxAlive: 12, spawnInterval: 1.05, boss: false },
  { night: 3, totalEnemies: 19, maxAlive: 15, spawnInterval: 0.92, boss: false },
  { night: 4, totalEnemies: 24, maxAlive: 18, spawnInterval: 0.82, boss: false },
  { night: 5, totalEnemies: 28, maxAlive: 20, spawnInterval: 0.76, boss: true },
];

export function nightDefinition(night: number): NightDefinition {
  return (
    NIGHT_DEFINITIONS.find((definition) => definition.night === night) ??
    NIGHT_DEFINITIONS[NIGHT_DEFINITIONS.length - 1]!
  );
}
