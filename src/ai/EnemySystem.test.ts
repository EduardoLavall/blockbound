import * as THREE from "three";
import { describe, expect, it, vi } from "vitest";
import { EnemySystem } from "./EnemySystem";
import { EnemyType } from "./EnemyRegistry";
import { NavigationGrid } from "./navigation/NavigationGrid";
import { FlowField } from "./navigation/FlowField";
import { BreachPlanner } from "./navigation/BreachPlanner";
import { generateWorld } from "../voxel/generation/WorldGenerator";
import { createRunSeed } from "../voxel/generation/Seed";
import type { Core } from "../building/Core";
import type { StructureSystem, StructureInstance } from "../building/StructureSystem";
import { STRUCTURES, StructureType } from "../building/StructureRegistry";
import { DefenseCombatSystem } from "../defense/DefenseCombatSystem";
import type { PlayerController } from "../player/PlayerController";
import { PlayerStatus } from "../player/PlayerStatus";
import { PlayerVitals } from "../combat/PlayerVitals";
import { RuleEngine } from "../roguelite/RuleEngine";
import { SpawnDirector } from "../defense/SpawnDirector";
import { WaveDirector } from "../defense/WaveDirector";
import { DayNightSystem, DayPhase } from "../defense/DayNightSystem";
import { Health } from "../survival/Health";
import { BlockId } from "../voxel/blocks";

function fixture(seed = "blockbound-review") {
  const { world, metadata } = generateWorld(createRunSeed(seed));
  const structures = { all: [], subscribeNavigationChanges: () => () => {},
    navigationAtCell: () => null, getById: () => undefined, damageStructure: () => false } as unknown as StructureSystem;
  const grid = new NavigationGrid(world, structures, metadata.bounds);
  const flow = new FlowField(grid, metadata.core.x, metadata.core.z);
  const group = new THREE.Group(); group.position.set(metadata.core.x + 0.5, 7, metadata.core.z + 0.5);
  const health = new Health(500);
  const core = { group, health, damage: (amount: number) => health.damage(amount),
    repair: (amount: number) => health.heal(amount) } as unknown as Core;
  const playerPoint = { x: 38, y: 8, z: 38 };
  const player = { getPosition: () => playerPoint } as unknown as PlayerController;
  const vitals = new PlayerVitals(); const rules = new RuleEngine(); const status = new PlayerStatus(rules, vitals);
  const enemies = new EnemySystem(new THREE.Scene(), grid, flow, new BreachPlanner(structures),
    structures, core, player, vitals, status, rules, world);
  return { world, metadata, grid, flow, core, playerPoint, vitals, enemies, structures, rules };
}

describe("enemy combat and complete siege", () => {
  it("delays archer damage until the bolt arrives and lets the player dodge", () => {
    const f = fixture();
    f.playerPoint.x = 8.5; f.playerPoint.z = 12.5;
    f.enemies.spawn(EnemyType.Archer, f.grid.getCell(8, 16)!, 3);
    f.enemies.fixedUpdate(1 / 60);
    expect(f.vitals.health.current).toBe(140);
    f.playerPoint.x += 4;
    for (let i = 0; i < 30; i++) f.enemies.fixedUpdate(1 / 60);
    expect(f.vitals.health.current).toBe(140);
  });
  it("prevents an archer from attacking through a solid voxel wall", () => {
    const f = fixture();
    f.playerPoint.x = 8.5; f.playerPoint.z = 12.5;
    f.enemies.spawn(EnemyType.Archer, f.grid.getCell(8, 16)!, 3);
    for (let x = 5; x <= 11; x++) for (let y = 7; y <= 10; y++) f.world.setBlock(x, y, 14, BlockId.Stone);
    f.grid.updateDirty(); f.flow.updateIfNeeded();
    f.enemies.fixedUpdate(0.3);
    expect(f.vitals.health.current).toBe(140);
  });
  it.each(["blockbound-review", "blockfall-demo", "siege-regression"])("spawns and clears all five waves without stranded enemies: %s", seed => {
    const f = fixture(seed);
    const spawns = new SpawnDirector(f.metadata.seed.value, f.metadata.spawnZones, f.grid, f.enemies);
    const waves = new WaveDirector(spawns); const cycle = new DayNightSystem();
    const defenseInstances = f.structures.all as StructureInstance[];
    [StructureType.Turret, StructureType.Turret, StructureType.RapidTurret, StructureType.Turret,
      StructureType.Spike, StructureType.Spike].forEach((type, i) => {
      const group = new THREE.Group();
      const x = f.metadata.core.x + (i < 4 ? (i % 2 === 0 ? -3 : 3) : 0) + 0.5;
      const z = f.metadata.core.z - (i < 4 ? (i < 2 ? 7 : 13) : (i === 4 ? 5 : 9)) + 0.5;
      const y = f.world.highestSolidY(Math.floor(x), Math.floor(z)) + 1;
      group.position.set(x, y, z);
      defenseInstances.push({ id: i + 1, type, definition: STRUCTURES[type], group, x, y, z,
        health: new Health(STRUCTURES[type].maxHealth), yaw: 0, open: false } as StructureInstance);
    });
    const defense = new DefenseCombatSystem(f.metadata.seed.value, new THREE.Scene(), f.structures, f.enemies, f.rules, f.world);
    let sawBoss = false;
    for (let night = 1; night <= 5; night++) {
      cycle.startNightEarly(); cycle.holdTransition(true); waves.startNight(night);
      let elapsed = 0;
      while (!waves.complete && elapsed < 180) {
        const dt = 1 / 30; elapsed += dt; cycle.update(dt);
        waves.update(dt, DayPhase.Night, f.enemies.aliveCount);
        f.enemies.fixedUpdate(dt);
        defense.fixedUpdate(dt);
        const boss = f.enemies.boss;
        const bossInRange = boss && Math.hypot(boss.group.position.x - f.metadata.core.x,
          boss.group.position.z - f.metadata.core.z) < 18;
        const target = bossInRange ? boss : f.enemies.findNearest(f.metadata.core.x, f.metadata.core.z, 18);
        // Scripted 80 DPS player, four real turrets and two traps; not human playtesting.
        if (target) f.enemies.damage(target, 80 * dt, "player-projectile");
        if (f.enemies.boss) sawBoss = true;
      }
      expect(waves.complete).toBe(true);
      expect(waves.stats.spawned).toBe(waves.stats.total);
      expect(f.enemies.aliveCount).toBe(0);
      expect(f.core.health.destroyed, `Core lost on night ${night}, seed ${seed}`).toBe(false);
      f.core.repair(40);
      cycle.completeNight(); waves.endNight(); f.enemies.cleanupInactive();
      expect(cycle.timeRemaining).toBe(75);
    }
    expect(sawBoss).toBe(true);
  });
});
