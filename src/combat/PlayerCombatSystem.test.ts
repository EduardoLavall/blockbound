import * as THREE from "three";
import { describe, expect, it, vi } from "vitest";
import { RunInventory } from "../inventory/RunInventory";
import { initializeRunInventory } from "../defense/RunEconomy";
import { PlayerCombatSystem } from "./PlayerCombatSystem";
import { PlayerActionMode } from "./CombatTypes";
import { PlayerStatus } from "../player/PlayerStatus";
import { PlayerVitals } from "./PlayerVitals";
import { RuleEngine } from "../roguelite/RuleEngine";
import { InteractionMode } from "../player/InteractionMode";
import { VoxelWorld } from "../voxel/VoxelWorld";
import type { Input } from "../core/Input";
import type { Hotbar } from "../player/Hotbar";
import type { EnemySystem } from "../ai/EnemySystem";
import type { EnemyInstance } from "../ai/EnemySystem";
import { ENEMIES, EnemyType } from "../ai/EnemyRegistry";
import { AMMO_ITEM_ID } from "./Ammunition";
import type { ProjectileSystem } from "./ProjectileSystem";
import type { FirstPersonHand } from "../player/FirstPersonHand";
import type { CombatHUD } from "../ui/CombatHUD";
import type { StructureSystem } from "../building/StructureSystem";

function fixture() {
  const bag=new RunInventory(); initializeRunInventory(bag);
  let selected=0; const pressed=new Set<string>(); const held=new Set<string>();
  const hotbar={get selectedSlot(){return selected},get selectedStack(){return bag.slot(selected)},select:(i:number)=>{selected=i}} as Hotbar;
  const input={consumePressed:(key:string)=>pressed.delete(key),isDown:(key:string)=>held.has(key)} as unknown as Input;
  const spawn=vi.fn(); const damage=vi.fn(); const targets: EnemyInstance[]=[]; const vitals=new PlayerVitals();
  const camera=new THREE.PerspectiveCamera();camera.position.y=1;
  const combat=new PlayerCombatSystem(1,camera,input,new InteractionMode(),new VoxelWorld(),
    {aliveEnemies:targets,damage,knockback:vi.fn()} as unknown as EnemySystem,{spawn} as unknown as ProjectileSystem,
    new PlayerStatus(new RuleEngine(),vitals),vitals,{setActionMode:vi.fn(),triggerAttack:vi.fn(),setHeldVisible:vi.fn()} as unknown as FirstPersonHand,
    {update:vi.fn(),showHit:vi.fn()} as unknown as CombatHUD,{all:[]} as unknown as StructureSystem,()=>{},()=>{},bag,hotbar);
  return {bag,pressed,held,hotbar,combat,spawn,damage,targets};
}
describe("weapon inventory ownership", () => {
  it("requires physical ammunition, spends exactly one per shot and stops at zero", () => {
    const f=fixture(); f.bag.addItem("repeater",1,"hotbar"); f.hotbar.select(1); f.held.add("Mouse0");
    f.combat.fixedUpdate(1/60); expect(f.spawn).not.toHaveBeenCalled();
    f.bag.addItem(AMMO_ITEM_ID,2); f.combat.fixedUpdate(1);
    expect(f.spawn).toHaveBeenCalledTimes(1);expect(f.bag.itemCount(AMMO_ITEM_ID)).toBe(1);
    f.combat.fixedUpdate(1/60);expect(f.spawn).toHaveBeenCalledTimes(1);
    f.combat.fixedUpdate(1);expect(f.spawn).toHaveBeenCalledTimes(2);expect(f.bag.itemCount(AMMO_ITEM_ID)).toBe(0);
    f.combat.fixedUpdate(1);expect(f.spawn).toHaveBeenCalledTimes(2);
  });
  it.each(["pickaxe", "blade"])("passes a contact point and strike direction for %s blood feedback", weapon => {
    const f=fixture();
    const group=new THREE.Group();group.position.set(0,0,-1.5);
    f.targets.push({id:1,alive:true,group,definition:ENEMIES[EnemyType.Grunt]} as EnemyInstance);
    if(weapon==="blade"){f.bag.addItem("blade",1,"hotbar");f.hotbar.select(1)}
    f.held.add("Mouse0");f.combat.fixedUpdate(1/60);
    expect(f.damage).toHaveBeenCalledTimes(1);
    const impact=f.damage.mock.calls[0]![3];
    expect(impact.direction).toEqual(new THREE.Vector3(0,0,-1));
    expect(impact.point.y).toBe(1);expect(impact.point.z).toBeCloseTo(-1.15);
  });
  it("cannot switch to or fire weapons that have not been crafted",()=>{
    const f=fixture(); f.pressed.add("KeyQ"); f.held.add("Mouse0"); f.combat.fixedUpdate(1/60);
    expect(f.combat.mode).toBe(PlayerActionMode.Tool); expect(f.spawn).not.toHaveBeenCalled();
  });
  it("uses a crafted weapon selected from the hotbar and revokes it when removed",()=>{
    const f=fixture(); f.bag.addItem("repeater",1,"hotbar"); f.bag.addItem(AMMO_ITEM_ID,2); f.hotbar.select(1); f.held.add("Mouse0"); f.combat.fixedUpdate(1/60);
    expect(f.combat.mode).toBe(PlayerActionMode.Repeater); expect(f.spawn).toHaveBeenCalledOnce();
    f.bag.consumeItemAt(1); f.combat.fixedUpdate(1);
    expect(f.combat.mode).toBe(PlayerActionMode.Tool); expect(f.spawn).toHaveBeenCalledOnce();
  });
  it("moves an owned backpack weapon into the hotbar when cycling without duplicating it",()=>{
    const f=fixture(); f.bag.addItem("blade"); f.pressed.add("KeyQ"); f.combat.fixedUpdate(1/60);
    expect(f.combat.mode).toBe(PlayerActionMode.Blade);
    expect(f.hotbar.selectedStack?.kind).toBe("item");
    expect(f.bag.itemStacks().map(item=>item.definitionId).sort()).toEqual(["blade","pickaxe"]);
  });
});
