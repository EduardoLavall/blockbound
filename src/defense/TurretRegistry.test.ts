import { describe, expect, it } from "vitest";
import { EnemyType } from "../ai/EnemyRegistry";
import { StructureType } from "../building/StructureRegistry";
import {
  TURRETS,
  isTurretStructure,
  turretDamageAgainst,
  turretTargetPriority,
} from "./TurretRegistry";

describe("TurretRegistry", () => {
  it("keeps Basic Turret generalist and longer-ranged", () => {
    const basic = TURRETS[StructureType.Turret];
    const rapid = TURRETS[StructureType.RapidTurret];

    expect(basic.range).toBeGreaterThan(rapid.range);
    expect(basic.damage).toBeGreaterThan(rapid.damage);
    expect(basic.cooldown).toBeGreaterThan(rapid.cooldown);
  });

  it("gives Rapid Turret higher raw sustained DPS", () => {
    const basic = TURRETS[StructureType.Turret];
    const rapid = TURRETS[StructureType.RapidTurret];

    expect(rapid.damage / rapid.cooldown).toBeCloseTo(36.3636, 3);
    expect(rapid.damage / rapid.cooldown).toBeGreaterThan(
      basic.damage / basic.cooldown,
    );
  });

  it("specializes Rapid Turret for light targets", () => {
    const cooldown = TURRETS[StructureType.RapidTurret].cooldown;
    const runnerDps =
      turretDamageAgainst(
        StructureType.RapidTurret,
        EnemyType.Runner,
      ) / cooldown;
    const bruteDps =
      turretDamageAgainst(
        StructureType.RapidTurret,
        EnemyType.Brute,
      ) / cooldown;
    const bossDps =
      turretDamageAgainst(
        StructureType.RapidTurret,
        EnemyType.Boss,
      ) / cooldown;

    expect(runnerDps).toBeCloseTo(41.8182, 3);
    expect(bruteDps).toBeCloseTo(20, 3);
    expect(bossDps).toBeCloseTo(16.3636, 3);
    expect(runnerDps).toBeGreaterThan(bruteDps * 2);
  });

  it("prioritizes Runner and Grunt above heavy enemies", () => {
    expect(
      turretTargetPriority(
        StructureType.RapidTurret,
        EnemyType.Runner,
      ),
    ).toBeGreaterThan(
      turretTargetPriority(
        StructureType.RapidTurret,
        EnemyType.Brute,
      ),
    );

    expect(
      turretTargetPriority(
        StructureType.RapidTurret,
        EnemyType.Grunt,
      ),
    ).toBeGreaterThan(
      turretTargetPriority(
        StructureType.RapidTurret,
        EnemyType.Boss,
      ),
    );
  });

  it("recognizes both automatic tower structure types", () => {
    expect(isTurretStructure(StructureType.Turret)).toBe(true);
    expect(isTurretStructure(StructureType.RapidTurret)).toBe(true);
    expect(isTurretStructure(StructureType.Wall)).toBe(false);
  });
});
