import { describe, expect, it } from "vitest";
import { PlayerVitals } from "../combat/PlayerVitals";
import { PlayerStatus } from "../player/PlayerStatus";
import { RuleEngine } from "../roguelite/RuleEngine";
import { EquipmentSystem } from "./EquipmentSystem";
import { ItemInventory } from "./ItemInventory";

describe("EquipmentSystem", () => {
  it("applies weapon armor and charm modifiers to PlayerStatus", () => {
    const inventory = new ItemInventory();
    const status = new PlayerStatus(
      new RuleEngine(),
      new PlayerVitals(),
    );
    const equipment = new EquipmentSystem(inventory, status);

    const [weapon] = inventory.add("serrated-grip");
    const [armor] = inventory.add("scrap-plating");
    const [charm] = inventory.add("miner-sigil");

    expect(equipment.equip(weapon!.uid)).toBe(true);
    expect(equipment.equip(armor!.uid)).toBe(true);
    expect(equipment.equip(charm!.uid)).toBe(true);

    const snapshot = status.snapshot();

    expect(snapshot.melee.damage).toBeCloseTo(34 * 1.18);
    expect(snapshot.defense.damageReduction).toBeCloseTo(0.12);
    expect(snapshot.mobility.sprintSpeed).toBeCloseTo(8.4 * 0.96);
    expect(snapshot.utility.miningSpeedMultiplier).toBeCloseTo(1.18);
    expect(snapshot.utility.resourceYieldBonus).toBe(1);
  });

  it("replaces only the matching equipment slot", () => {
    const inventory = new ItemInventory();
    const status = new PlayerStatus(
      new RuleEngine(),
      new PlayerVitals(),
    );
    const equipment = new EquipmentSystem(inventory, status);

    const [melee] = inventory.add("serrated-grip");
    const [ranged] = inventory.add("tension-module");
    const [armor] = inventory.add("runner-mesh");

    equipment.equip(melee!.uid);
    equipment.equip(armor!.uid);
    equipment.equip(ranged!.uid);

    expect(equipment.equippedStack("weapon")?.uid).toBe(ranged!.uid);
    expect(equipment.equippedStack("armor")?.uid).toBe(armor!.uid);
    expect(equipment.isEquipped(melee!.uid)).toBe(false);

    const snapshot = status.snapshot();
    expect(snapshot.melee.damage).toBeCloseTo(34);
    expect(snapshot.ranged.damage).toBeCloseTo(24 * 1.18);
    expect(snapshot.ranged.projectileSpeed).toBeCloseTo(25 * 1.15);
    expect(snapshot.mobility.walkSpeed).toBeCloseTo(5.4 * 1.08);
  });

  it("returns the slot to neutral modifiers when unequipped", () => {
    const inventory = new ItemInventory();
    const status = new PlayerStatus(
      new RuleEngine(),
      new PlayerVitals(),
    );
    const equipment = new EquipmentSystem(inventory, status);
    const [armor] = inventory.add("scrap-plating");

    equipment.equip(armor!.uid);
    expect(status.snapshot().defense.damageReduction).toBeCloseTo(0.12);

    expect(equipment.unequip("armor")).toBe(true);
    expect(status.snapshot().defense.damageReduction).toBe(0);
    expect(status.snapshot().mobility.sprintSpeed).toBeCloseTo(8.4);
  });
});
