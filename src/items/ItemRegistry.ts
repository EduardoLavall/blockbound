import type { EquipmentStatModifiers } from "../player/PlayerStats";

export type ItemRarity = "common" | "rare" | "epic";
export type ItemKind = "equipment" | "consumable";
export type EquipmentSlot = "weapon" | "armor" | "charm";

export interface ItemDefinition {
  id: string;
  name: string;
  description: string;
  kind: ItemKind;
  rarity: ItemRarity;
  slot?: EquipmentSlot;
  stackLimit: number;
  swatch: string;
  tags: readonly string[];
  modifiers: Partial<EquipmentStatModifiers>;
}

export const ITEMS: readonly ItemDefinition[] = [
  item(
    "serrated-grip",
    "Serrated Grip",
    "A crude grip that turns the Blade into a harder-hitting tool.",
    "common",
    "weapon",
    "#b97055",
    ["melee", "damage"],
    { meleeDamageMultiplier: 1.18 },
  ),
  item(
    "duelist-guard",
    "Duelist Guard",
    "Lighter guard. Faster Blade recovery and a little more reach.",
    "rare",
    "weapon",
    "#cfb46a",
    ["melee", "speed", "range"],
    {
      meleeCooldownMultiplier: 0.88,
      meleeRangeBonus: 0.18,
    },
  ),
  item(
    "tension-module",
    "Tension Module",
    "Reinforced Repeater limbs increase bolt force and velocity.",
    "common",
    "weapon",
    "#6d9bad",
    ["projectile", "damage"],
    {
      rangedDamageMultiplier: 1.18,
      projectileSpeedMultiplier: 1.15,
    },
  ),
  item(
    "rail-coupler",
    "Rail Coupler",
    "A rare alignment module that accelerates cycling and adds pierce.",
    "rare",
    "weapon",
    "#78a7d6",
    ["projectile", "pierce"],
    {
      rangedCooldownMultiplier: 0.9,
      projectilePierceBonus: 1,
    },
  ),
  item(
    "ember-chamber",
    "Ember Chamber",
    "Superheated Repeater chamber with a chance to ignite targets.",
    "epic",
    "weapon",
    "#e17b4d",
    ["projectile", "fire"],
    {
      rangedDamageMultiplier: 1.08,
      burnChanceBonus: 0.22,
    },
  ),

  item(
    "scrap-plating",
    "Scrap Plating",
    "Heavy plates reduce incoming damage but slightly cut sprint speed.",
    "common",
    "armor",
    "#7d7770",
    ["survival", "armor"],
    {
      damageReductionBonus: 0.12,
      sprintSpeedMultiplier: 0.96,
    },
  ),
  item(
    "runner-mesh",
    "Runner Mesh",
    "Flexible armor for repositioning around the Core.",
    "rare",
    "armor",
    "#73947b",
    ["survival", "mobility"],
    {
      damageReductionBonus: 0.06,
      walkSpeedMultiplier: 1.08,
      sprintSpeedMultiplier: 1.1,
    },
  ),
  item(
    "shockweave-coat",
    "Shockweave Coat",
    "Conductive weave offers protection and primes Shock-oriented builds.",
    "rare",
    "armor",
    "#6b79a8",
    ["survival", "shock"],
    {
      damageReductionBonus: 0.09,
      shockChanceBonus: 0.12,
    },
  ),

  item(
    "miner-sigil",
    "Miner Sigil",
    "A field charm tuned to extraction and resource recovery.",
    "common",
    "charm",
    "#9c8353",
    ["mining", "resource"],
    {
      miningSpeedMultiplier: 1.18,
      resourceYieldBonus: 1,
    },
  ),
  item(
    "repair-servo",
    "Repair Servo",
    "Compact actuator that improves manual repair output.",
    "common",
    "charm",
    "#8d9d91",
    ["repair", "defense"],
    {
      repairMultiplier: 1.28,
    },
  ),
  item(
    "hunter-lens",
    "Hunter Lens",
    "Targeting lens that improves critical precision and Mark duration.",
    "rare",
    "charm",
    "#8fb4c4",
    ["crit", "mark"],
    {
      critChanceBonus: 0.07,
      markDurationBonus: 1.5,
    },
  ),
  item(
    "berserker-core",
    "Berserker Core",
    "Unstable crystal that rewards fighting while badly wounded.",
    "epic",
    "charm",
    "#c65768",
    ["survival", "damage"],
    {
      lowHealthDamageBonus: 0.28,
      critMultiplierBonus: 0.2,
    },
  ),
];

export const ITEM_BY_ID: ReadonlyMap<string, ItemDefinition> =
  new Map(ITEMS.map((definition) => [definition.id, definition]));

export function itemDefinition(id: string): ItemDefinition {
  const definition = ITEM_BY_ID.get(id);
  if (!definition) throw new Error(`Unknown item: ${id}`);
  return definition;
}

function item(
  id: string,
  name: string,
  description: string,
  rarity: ItemRarity,
  slot: EquipmentSlot,
  swatch: string,
  tags: readonly string[],
  modifiers: Partial<EquipmentStatModifiers>,
): ItemDefinition {
  return {
    id,
    name,
    description,
    kind: "equipment",
    rarity,
    slot,
    stackLimit: 1,
    swatch,
    tags,
    modifiers,
  };
}
