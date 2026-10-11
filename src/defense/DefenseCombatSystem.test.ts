import * as THREE from "three";
import { describe, expect, it, vi } from "vitest";
import { DefenseCombatSystem } from "./DefenseCombatSystem";
import { STRUCTURES, StructureType } from "../building/StructureRegistry";
import type { StructureInstance, StructureSystem } from "../building/StructureSystem";
import type { EnemyInstance, EnemySystem } from "../ai/EnemySystem";
import { ENEMIES, EnemyType } from "../ai/EnemyRegistry";
import { RuleEngine } from "../roguelite/RuleEngine";
import { Health } from "../survival/Health";
import { VoxelWorld } from "../voxel/VoxelWorld";
import { BlockId } from "../voxel/blocks";

describe("finite turret ammunition",()=>{
  it.each([StructureType.Turret,StructureType.RapidTurret])("%s spends one cell per actual shot and stops empty",type=>{
    const world=new VoxelWorld();world.ensureChunk(0,0);
    const group=new THREE.Group();group.position.set(4,1,4);
    const tower={id:1,type,definition:STRUCTURES[type],group,x:4,y:1,z:4,ammo:2} as StructureInstance;
    const targetGroup=new THREE.Group();targetGroup.position.set(4,1,8);
    const target={id:1,type:EnemyType.Grunt,definition:ENEMIES[EnemyType.Grunt],group:targetGroup,alive:true,health:new Health(1000),statuses:new Map()} as EnemyInstance;
    const damage=vi.fn(),scene=new THREE.Scene();
    const structures={all:[tower]} as unknown as StructureSystem;
    const enemies={aliveEnemies:[target],damage,applyStatus:vi.fn(),withinRadius:()=>[]} as unknown as EnemySystem;
    const combat=new DefenseCombatSystem(1,scene,structures,enemies,new RuleEngine(),world);
    for(let y=1;y<5;y++)world.setBlock(4,y,6,BlockId.Stone);
    combat.fixedUpdate(1);expect(damage).not.toHaveBeenCalled();expect(tower.ammo).toBe(2);
    for(let y=1;y<5;y++)world.setBlock(4,y,6,BlockId.Air);
    combat.fixedUpdate(.01);expect(damage).toHaveBeenCalledTimes(1);expect(tower.ammo).toBe(1);
    combat.fixedUpdate(.01);expect(damage).toHaveBeenCalledTimes(1);
    combat.fixedUpdate(1);expect(damage).toHaveBeenCalledTimes(2);expect(tower.ammo).toBe(0);
    combat.fixedUpdate(3);expect(damage).toHaveBeenCalledTimes(2);
    tower.ammo=1;combat.fixedUpdate(.01);expect(damage).toHaveBeenCalledTimes(3);expect(tower.ammo).toBe(0);
  });
});
