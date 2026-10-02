import type { RuleEngine } from "./RuleEngine";

export type UpgradeRarity = "common" | "rare" | "epic";
export type UpgradeFamily = "player" | "defense" | "economy" | "system";

export interface UpgradeDefinition {
  id: string;
  name: string;
  description: string;
  rarity: UpgradeRarity;
  family: UpgradeFamily;
  tags: readonly string[];
  apply: (rules: RuleEngine) => void;
}

export const UPGRADES: readonly UpgradeDefinition[] = [
  u("sharpened-edge","Sharpened Edge","+25% melee damage","common","player",["melee"],r=>r.meleeDamageMultiplier*=1.25),
  u("fast-hands","Fast Hands","-18% melee cooldown","common","player",["melee"],r=>r.meleeCooldownMultiplier*=0.82),
  u("long-reach","Long Reach","+0.45m melee range","common","player",["melee"],r=>r.meleeRangeBonus+=0.45),
  u("heavy-slash","Heavy Slash","+50% melee damage, +12% melee cooldown","rare","player",["melee"],r=>{r.meleeDamageMultiplier*=1.5;r.meleeCooldownMultiplier*=1.12;}),
  u("repeater-springs","Repeater Springs","-18% ranged cooldown","common","player",["projectile"],r=>r.rangedCooldownMultiplier*=0.82),
  u("high-tension","High Tension","+25% ranged damage","common","player",["projectile"],r=>r.rangedDamageMultiplier*=1.25),
  u("rail-shot","Rail Shot","+1 projectile pierce","rare","player",["projectile"],r=>r.projectilePierceBonus+=1),
  u("quickdraw","Quickdraw","+35% projectile speed","common","player",["projectile"],r=>r.projectileSpeedMultiplier*=1.35),
  u("keen-eye","Keen Eye","+10% critical chance","common","player",["crit"],r=>r.critChance+=0.10),
  u("execution-protocol","Execution Protocol","+0.5 critical multiplier","rare","player",["crit"],r=>r.critMultiplier+=0.5),
  u("reinforced-suit","Reinforced Suit","15% less player damage","rare","player",["survival"],r=>r.playerDamageReduction+=0.15),
  u("blood-circuit","Blood Circuit","Heal 4 HP on player kill","rare","player",["kill"],r=>r.killHeal+=4),
  u("ember-tips","Ember Tips","Player hits gain 30% burn chance","rare","player",["fire","projectile"],r=>r.playerBurnChance+=0.30),
  u("shock-edge","Shock Edge","Player hits gain 35% shock chance","rare","player",["shock","melee"],r=>r.playerShockChance+=0.35),
  u("hunter-mark","Hunter's Mark","Ranged hits mark enemies for 4s","rare","player",["mark","projectile"],r=>r.playerMarkDuration+=4),

  u("calibrated-turrets","Calibrated Turrets","+25% turret damage","common","defense",["tower"],r=>r.turretDamageMultiplier*=1.25),
  u("overclocked-turrets","Overclocked Turrets","-20% turret cooldown","rare","defense",["tower"],r=>r.turretCooldownMultiplier*=0.80),
  u("arc-turrets","Arc Turrets","Turret hits gain 25% shock chance","rare","defense",["tower","shock"],r=>r.turretShockChance+=0.25),
  u("incendiary-turrets","Incendiary Turrets","Turret hits gain 25% burn chance","rare","defense",["tower","fire"],r=>r.turretBurnChance+=0.25),
  u("target-relay","Target Relay","Turrets deal +50% to marked enemies","epic","defense",["tower","mark"],r=>r.markedTurretBonus+=0.50),
  u("serrated-spikes","Serrated Spikes","+35% Spike damage","common","defense",["trap"],r=>r.spikeDamageMultiplier*=1.35),
  u("rapid-traps","Rapid Traps","-25% Spike cooldown","rare","defense",["trap"],r=>r.spikeCooldownMultiplier*=0.75),
  u("conductive-floor","Conductive Floor","Spikes deal +60% to shocked enemies","epic","defense",["trap","shock"],r=>r.shockedSpikeBonus+=0.60),
  u("reinforced-defenses","Reinforced Defenses","20% less structure damage","rare","defense",["wall"],r=>r.structureDamageReduction+=0.20),
  u("emergency-repairs","Emergency Repairs","+50% manual repair amount","common","defense",["repair"],r=>r.repairMultiplier*=1.50),
  u("core-plating","Core Plating","25% less Core damage","rare","defense",["core"],r=>r.coreDamageReduction+=0.25),
  u("auto-maintenance","Auto Maintenance","Player kills repair 4 HP of the most damaged defense","epic","defense",["repair","kill"],r=>r.killRepair+=4),

  u("efficient-mining","Efficient Mining","+30% mining speed","common","economy",["mining"],r=>r.miningSpeedMultiplier*=1.30),
  u("power-drill","Power Drill","+35% additional mining speed","rare","economy",["mining"],r=>r.miningSpeedMultiplier*=1.35),
  u("rich-veins","Rich Veins","+1 resource from every mined block","epic","economy",["resource","mining"],r=>r.resourceYieldBonus+=1),
  u("salvage-protocol","Salvage Protocol","Every 3 player kills grants 1 Metal","rare","economy",["resource","kill"],r=>r.killMetalEvery=positiveMin(r.killMetalEvery,3)),
  u("crystal-recycler","Crystal Recycler","Every 6 player kills grants 1 Crystal","epic","economy",["resource","kill"],r=>r.killCrystalEvery=positiveMin(r.killCrystalEvery,6)),

  u("core-recycling","Core Recycling","Player kills heal the Core by 2","rare","system",["core","kill"],r=>r.killCoreHeal+=2),
  u("combustion-loop","Combustion Loop","+25% defense damage against burning enemies","epic","system",["fire","tower","trap"],r=>r.statusDamageBonus+=0.25),
  u("static-cascade","Static Cascade","Shock slows enemies much harder","epic","system",["shock","slow"],r=>r.shockSlowFactor=Math.min(r.shockSlowFactor,0.48)),
  u("marked-network","Marked Network","+2s mark duration and +25% turret mark bonus","epic","system",["mark","tower"],r=>{r.playerMarkDuration+=2;r.markedTurretBonus+=0.25;}),
  u("siege-doctrine","Siege Doctrine","+10% turret damage and 10% structure damage reduction","rare","system",["tower","wall"],r=>{r.turretDamageMultiplier*=1.10;r.structureDamageReduction+=0.10;}),
  u("berserker-circuit","Berserker Circuit","+45% player damage below 50% HP","epic","system",["survival","melee","projectile"],r=>r.lowHealthDamageBonus+=0.45),
];

function u(
  id:string,
  name:string,
  description:string,
  rarity:UpgradeRarity,
  family:UpgradeFamily,
  tags:readonly string[],
  apply:(rules:RuleEngine)=>void,
):UpgradeDefinition {
  return { id,name,description,rarity,family,tags,apply };
}

function positiveMin(current:number, next:number):number {
  return current <= 0 ? next : Math.min(current,next);
}
