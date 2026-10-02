import type {
  EquipmentStatModifiers,
} from "../player/PlayerStats";
import {
  NEUTRAL_EQUIPMENT_MODIFIERS,
} from "../player/PlayerStats";
import type { PlayerStatus } from "../player/PlayerStatus";
import type { ItemInventory, ItemStack } from "./ItemInventory";
import {
  itemDefinition,
  type EquipmentSlot,
  type ItemDefinition,
} from "./ItemRegistry";

export type EquipmentListener = () => void;

const MULTIPLIERS: readonly (keyof EquipmentStatModifiers)[] = [
  "walkSpeedMultiplier",
  "sprintSpeedMultiplier",
  "jumpSpeedMultiplier",
  "meleeDamageMultiplier",
  "meleeCooldownMultiplier",
  "rangedDamageMultiplier",
  "rangedCooldownMultiplier",
  "projectileSpeedMultiplier",
  "miningSpeedMultiplier",
  "repairMultiplier",
];

export class EquipmentSystem {
  private readonly equipped = new Map<EquipmentSlot, string>();
  private readonly listeners = new Set<EquipmentListener>();

  constructor(
    private readonly inventory: ItemInventory,
    private readonly playerStatus: PlayerStatus,
  ) {
    this.apply();
  }

  equip(uid: string): boolean {
    const stack = this.inventory.get(uid);
    if (!stack) return false;

    const definition = itemDefinition(stack.definitionId);
    if (definition.kind !== "equipment" || !definition.slot) {
      return false;
    }

    this.equipped.set(definition.slot, uid);
    this.apply();
    this.emit();
    return true;
  }

  unequip(slot: EquipmentSlot): boolean {
    if (!this.equipped.delete(slot)) return false;
    this.apply();
    this.emit();
    return true;
  }

  equippedStack(slot: EquipmentSlot): ItemStack | null {
    const uid = this.equipped.get(slot);
    return uid ? this.inventory.get(uid) ?? null : null;
  }

  equippedDefinition(slot: EquipmentSlot): ItemDefinition | null {
    const stack = this.equippedStack(slot);
    return stack ? itemDefinition(stack.definitionId) : null;
  }

  isEquipped(uid: string): boolean {
    return [...this.equipped.values()].includes(uid);
  }

  get slots(): Readonly<Record<EquipmentSlot, ItemStack | null>> {
    return {
      weapon: this.equippedStack("weapon"),
      armor: this.equippedStack("armor"),
      charm: this.equippedStack("charm"),
    };
  }

  aggregateModifiers(): EquipmentStatModifiers {
    const result: EquipmentStatModifiers = {
      ...NEUTRAL_EQUIPMENT_MODIFIERS,
    };

    for (const uid of this.equipped.values()) {
      const stack = this.inventory.get(uid);
      if (!stack) continue;
      const modifiers = itemDefinition(stack.definitionId).modifiers;

      for (const [key, value] of Object.entries(modifiers) as [
        keyof EquipmentStatModifiers,
        number,
      ][]) {
        if (MULTIPLIERS.includes(key)) {
          result[key] *= value;
        } else {
          result[key] += value;
        }
      }
    }

    return result;
  }

  subscribe(listener: EquipmentListener): () => void {
    this.listeners.add(listener);
    listener();
    return () => this.listeners.delete(listener);
  }

  private apply(): void {
    this.playerStatus.setEquipmentModifiers(
      this.aggregateModifiers(),
    );
  }

  private emit(): void {
    for (const listener of this.listeners) listener();
  }
}
