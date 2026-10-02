import type { EquipmentSystem } from "../items/EquipmentSystem";
import type {
  ItemInventory,
  ItemStack,
} from "../items/ItemInventory";
import {
  itemDefinition,
  type EquipmentSlot,
  type ItemDefinition,
} from "../items/ItemRegistry";

export class ItemInventoryPanel {
  private selectedUid: string | null = null;
  private openValue = false;
  private signature = "";

  constructor(
    private readonly element: HTMLDivElement,
    private readonly inventory: ItemInventory,
    private readonly equipment: EquipmentSystem,
    private readonly onClose: () => void,
  ) {
    this.element.addEventListener("click", (event) => {
      const target = event.target as HTMLElement;

      if (target.closest("[data-inventory-close]")) {
        this.onClose();
        return;
      }

      const itemButton = target.closest<HTMLElement>("[data-item-uid]");
      if (itemButton?.dataset.itemUid) {
        this.selectedUid = itemButton.dataset.itemUid;
        this.render(true);
        return;
      }

      const equipButton = target.closest<HTMLElement>("[data-equip-selected]");
      if (equipButton && this.selectedUid) {
        this.equipment.equip(this.selectedUid);
        this.render(true);
        return;
      }

      const unequipButton = target.closest<HTMLElement>("[data-unequip-slot]");
      const slot = unequipButton?.dataset.unequipSlot as
        | EquipmentSlot
        | undefined;
      if (slot) {
        this.equipment.unequip(slot);
        this.render(true);
      }
    });

    this.inventory.subscribe(() => this.render());
    this.equipment.subscribe(() => this.render());
  }

  get isOpen(): boolean {
    return this.openValue;
  }

  show(): void {
    this.openValue = true;
    if (
      this.selectedUid &&
      !this.inventory.get(this.selectedUid)
    ) {
      this.selectedUid = null;
    }
    this.element.classList.remove("hidden");
    this.render(true);
  }

  hide(): void {
    this.openValue = false;
    this.element.classList.add("hidden");
  }

  private render(force = false): void {
    if (!this.openValue) return;

    const selected =
      (this.selectedUid
        ? this.inventory.get(this.selectedUid)
        : undefined) ??
      this.inventory.all[0] ??
      null;

    if (!this.selectedUid && selected) {
      this.selectedUid = selected.uid;
    }

    const signature = JSON.stringify({
      selected: this.selectedUid,
      items: this.inventory.all,
      equipped: this.equipment.slots,
    });
    if (!force && signature === this.signature) return;
    this.signature = signature;

    const definition = selected
      ? itemDefinition(selected.definitionId)
      : null;

    this.element.innerHTML = `
      <div class="item-inventory-shell">
        <header class="item-inventory-header">
          <div>
            <span class="eyebrow">I · RUN INVENTORY</span>
            <h2>INVENTORY + EQUIPMENT</h2>
          </div>
          <button class="inventory-close" data-inventory-close>CLOSE · I</button>
        </header>

        <div class="equipment-slots">
          ${(["weapon", "armor", "charm"] as EquipmentSlot[])
            .map((slot) => this.renderSlot(slot))
            .join("")}
        </div>

        <div class="item-inventory-content">
          <section class="item-grid-section">
            <div class="inventory-section-title">
              <strong>ITEMS</strong>
              <span>${this.inventory.all.length} stacks</span>
            </div>
            <div class="item-grid">
              ${this.inventory.all.length === 0
                ? '<p class="inventory-empty">Kill enemies and collect their item drops.</p>'
                : this.inventory.all
                    .map((stack) => this.renderItem(stack))
                    .join("")}
            </div>
          </section>

          <aside class="item-details">
            ${definition && selected
              ? this.renderDetails(selected, definition)
              : this.renderEmptyDetails()}
          </aside>
        </div>
      </div>
    `;
  }

  private renderSlot(slot: EquipmentSlot): string {
    const stack = this.equipment.equippedStack(slot);
    const definition = stack
      ? itemDefinition(stack.definitionId)
      : null;

    return `
      <div class="equipment-slot">
        <span class="equipment-slot-name">${slot}</span>
        ${definition
          ? `
            <div class="equipment-slot-item rarity-${definition.rarity}">
              <i style="--item-swatch:${definition.swatch}"></i>
              <div>
                <strong>${definition.name}</strong>
                <small>${definition.rarity}</small>
              </div>
            </div>
            <button data-unequip-slot="${slot}">UNEQUIP</button>
          `
          : '<div class="equipment-slot-empty">EMPTY</div>'}
      </div>
    `;
  }

  private renderItem(stack: ItemStack): string {
    const definition = itemDefinition(stack.definitionId);
    const selected = stack.uid === this.selectedUid;
    const equipped = this.equipment.isEquipped(stack.uid);

    return `
      <button
        class="inventory-item rarity-${definition.rarity} ${selected ? "selected" : ""} ${equipped ? "equipped" : ""}"
        data-item-uid="${stack.uid}"
      >
        <i style="--item-swatch:${definition.swatch}"></i>
        <span>
          <strong>${definition.name}</strong>
          <small>${definition.slot ?? definition.kind} · ${definition.rarity}</small>
        </span>
        ${stack.quantity > 1 ? `<b>×${stack.quantity}</b>` : ""}
        ${equipped ? '<em>EQUIPPED</em>' : ""}
      </button>
    `;
  }

  private renderDetails(
    stack: ItemStack,
    definition: ItemDefinition,
  ): string {
    const slot = definition.slot;
    const equipped = slot
      ? this.equipment.equippedDefinition(slot)
      : null;
    const isEquipped = this.equipment.isEquipped(stack.uid);

    return `
      <div class="item-detail-card rarity-${definition.rarity}">
        <div class="item-detail-heading">
          <i style="--item-swatch:${definition.swatch}"></i>
          <div>
            <small>${definition.rarity} · ${slot ?? definition.kind}</small>
            <h3>${definition.name}</h3>
          </div>
        </div>
        <p>${definition.description}</p>

        <div class="item-modifiers">
          <h4>MODIFIERS</h4>
          ${modifierRows(definition)}
        </div>

        ${slot
          ? `
            <div class="item-comparison">
              <h4>CURRENT ${slot.toUpperCase()}</h4>
              ${equipped
                ? `
                  <strong>${equipped.name}</strong>
                  <div class="comparison-modifiers">${modifierRows(equipped)}</div>
                `
                : '<span>Nothing equipped.</span>'}
            </div>

            <button
              class="equip-action"
              data-equip-selected
              ${isEquipped ? "disabled" : ""}
            >
              ${isEquipped ? "EQUIPPED" : `EQUIP ${slot.toUpperCase()}`}
            </button>
          `
          : ""}
      </div>
    `;
  }

  private renderEmptyDetails(): string {
    return `
      <div class="inventory-empty-details">
        <strong>NO ITEMS</strong>
        <span>The first enemy kill guarantees an equipment drop.</span>
      </div>
    `;
  }
}

const LABELS: Readonly<Record<string, string>> = {
  walkSpeedMultiplier: "Walk speed",
  sprintSpeedMultiplier: "Sprint speed",
  jumpSpeedMultiplier: "Jump",
  meleeDamageMultiplier: "Blade damage",
  meleeCooldownMultiplier: "Blade cooldown",
  meleeRangeBonus: "Blade range",
  rangedDamageMultiplier: "Repeater damage",
  rangedCooldownMultiplier: "Repeater cooldown",
  projectileSpeedMultiplier: "Projectile speed",
  projectilePierceBonus: "Pierce",
  critChanceBonus: "Crit chance",
  critMultiplierBonus: "Crit multiplier",
  damageReductionBonus: "Damage reduction",
  miningSpeedMultiplier: "Mining speed",
  resourceYieldBonus: "Resource yield",
  repairMultiplier: "Repair power",
  burnChanceBonus: "Burn chance",
  shockChanceBonus: "Shock chance",
  markDurationBonus: "Mark duration",
  lowHealthDamageBonus: "Low-HP damage",
};

function modifierRows(definition: ItemDefinition): string {
  const entries = Object.entries(definition.modifiers);
  if (entries.length === 0) {
    return '<span class="modifier-empty">No stat modifiers.</span>';
  }

  return entries
    .map(([key, value]) => {
      const label = LABELS[key] ?? key;
      return `
        <div class="modifier-row">
          <span>${label}</span>
          <strong>${formatModifier(key, value)}</strong>
        </div>
      `;
    })
    .join("");
}

function formatModifier(key: string, value: number): string {
  if (key.endsWith("Multiplier")) {
    const percent = Math.round((value - 1) * 100);
    return (percent >= 0 ? "+" : "") + percent + "%";
  }
  if (key.includes("Chance") || key.includes("Reduction")) {
    const percent = Math.round(value * 100);
    return (percent >= 0 ? "+" : "") + percent + "%";
  }
  if (key.includes("Duration") || key.includes("Range")) {
    return (value >= 0 ? "+" : "") + value.toFixed(1);
  }
  if (key.includes("critMultiplier")) {
    return (value >= 0 ? "+" : "") + value.toFixed(2) + "×";
  }
  return (value >= 0 ? "+" : "") + String(value);
}
