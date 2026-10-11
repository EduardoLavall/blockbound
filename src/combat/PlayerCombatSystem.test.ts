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
import type { ProjectileSystem } from "./ProjectileSystem";
import type { FirstPersonHand } from "../player/FirstPersonHand";
import type { CombatHUD } from "../ui/CombatHUD";
import type { StructureSystem } from "../building/StructureSystem";

function fixture() {
  const bag=new RunInventory(); initializeRunInventory(bag);
  let selected=0; const pressed=new Set<string>(); const held=new Set<string>();
  const hotbar={get selectedSlot(){return selected},get selectedStack(){return bag.slot(selected)},select:(i:number)=>{selected=i}} as Hotbar;
  const input={consumePressed:(key:string)=>pressed.delete(key),isDown:(key:string)=>held.has(key)} as unknown as Input;
  const spawn=vi.fn(); const vitals=new PlayerVitals();
  const combat=new PlayerCombatSystem(1,new THREE.PerspectiveCamera(),input,new InteractionMode(),new VoxelWorld(),
    {aliveEnemies:[],damage:vi.fn(),knockback:vi.fn()} as unknown as EnemySystem,{spawn} as unknown as ProjectileSystem,
    new PlayerStatus(new RuleEngine(),vitals),vitals,{setActionMode:vi.fn(),triggerAttack:vi.fn(),setHeldVisible:vi.fn()} as unknown as FirstPersonHand,
    {update:vi.fn(),showHit:vi.fn()} as unknown as CombatHUD,{all:[]} as unknown as StructureSystem,()=>{},()=>{},bag,hotbar);
  return {bag,pressed,held,hotbar,combat,spawn};
}
describe("weapon inventory ownership", () => {
  it("cannot switch to or fire weapons that have not been crafted",()=>{
    const f=fixture(); f.pressed.add("KeyQ"); f.held.add("Mouse0"); f.combat.fixedUpdate(1/60);
    expect(f.combat.mode).toBe(PlayerActionMode.Tool); expect(f.spawn).not.toHaveBeenCalled();
  });
  it("uses a crafted weapon selected from the hotbar and revokes it when removed",()=>{
    const f=fixture(); f.bag.addItem("repeater",1,"hotbar"); f.hotbar.select(1); f.held.add("Mouse0"); f.combat.fixedUpdate(1/60);
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
