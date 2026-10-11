import { stackIcon, iconMarkup } from "./ArtIcons";
import type { EquipmentSystem } from "../items/EquipmentSystem";
import {
  BACKPACK_SIZE,
  HOTBAR_SIZE,
  RUN_INVENTORY_SIZE,
  type InventoryStack,
  type RunInventory,
} from "../inventory/RunInventory";
import type { ItemInventory } from "../items/ItemInventory";
import {
  itemDefinition,
  type EquipmentSlot,
  type ItemDefinition,
} from "../items/ItemRegistry";
import {
  RESOURCES,
  resourcePlacementBlock,
} from "../survival/Resources";
import { blockDefinition } from "../voxel/blocks";
import { CraftingSystem, RECIPES } from "../crafting/CraftingSystem";
import { ResourceId } from "../survival/Resources";

export class ItemInventoryPanel {
  private selectedIndex: number | null = null;
  private held: InventoryStack | null = null;
  private openValue = false;
  private signature = "";
  private readonly crafting: CraftingSystem;
  private craftMessage = "Minere os materiais e fabrique seus itens aqui.";

  constructor(
    private readonly element: HTMLDivElement,
    private readonly storage: RunInventory,
    private readonly itemInventory: ItemInventory,
    private readonly equipment: EquipmentSystem,
    private readonly onClose: () => void,
    private readonly onCrafted: (definitionId: string) => void = () => {},
  ) {
    this.crafting = new CraftingSystem(storage);
    this.bindPointerInteractions();
    this.bindHotbarKeys();
    this.storage.subscribe(() => this.render());
    this.equipment.subscribe(() => this.render());
  }

  get isOpen(): boolean {
    return this.openValue;
  }

  show(): void {
    this.openValue = true;
    this.element.classList.remove("hidden");
    this.render(true);
  }

  hide(): boolean {
    if (this.held) {
      if (!this.storage.insertDetachedStack(this.held, "backpack")) {
        this.craftMessage = "Libere espaço para guardar o item do cursor.";
        this.render(true);
        return false;
      }
      this.held = null;
    }
    this.openValue = false;
    this.element.classList.add("hidden");
    return true;
  }

  private bindPointerInteractions(): void {
    this.element.addEventListener("click", (event) => {
      const target = event.target as HTMLElement;

      if (target.closest("[data-inventory-close]")) {
        this.onClose();
        return;
      }
      const recipe = target.closest<HTMLElement>("[data-craft]")?.dataset.craft;
      if (recipe) {
        if (this.held) this.craftMessage = "Guarde o item do cursor antes de fabricar.";
        else if (this.crafting.craft(recipe)) {
          const quantity = this.crafting.recipe(recipe)?.quantity ?? 1;
          const ammunition = itemDefinition(recipe).tags.includes("ammunition");
          this.craftMessage = `Fabricado: ${quantity}× ${itemDefinition(recipe).name}. ${ammunition ? "Repeater usa do inventário. Mire na torre e pressione E para abastecer." : "Selecione na hotbar para usar."}`;
          this.onCrafted(recipe);
        } else this.craftMessage = this.crafting.status(recipe) === "space" ? "Mochila cheia." : "Faltam materiais.";
        this.render(true);
        return;
      }

      const unequipButton =
        target.closest<HTMLElement>("[data-unequip-slot]");
      const equipmentSlot =
        unequipButton?.dataset.unequipSlot as
          | EquipmentSlot
          | undefined;
      if (equipmentSlot) {
        this.equipment.unequip(equipmentSlot);
        this.render(true);
        return;
      }

      if (target.closest("[data-equip-selected]")) {
        this.equipSelected();
        return;
      }

      const slot = target.closest<HTMLElement>("[data-run-slot]");
      if (!slot?.dataset.runSlot) return;
      const index = Number(slot.dataset.runSlot);
      if (!Number.isInteger(index)) return;

      this.selectedIndex = index;

      if ((event as MouseEvent).shiftKey) {
        this.storage.quickMove(index);
        this.render(true);
        return;
      }

      if (this.held) {
        this.held = this.storage.placeAll(index, this.held);
      } else {
        this.held = this.storage.takeAll(index);
      }
      this.render(true);
    });

    this.element.addEventListener("contextmenu", (event) => {
      const target = event.target as HTMLElement;
      const slot = target.closest<HTMLElement>("[data-run-slot]");
      if (!slot?.dataset.runSlot) return;

      event.preventDefault();
      const index = Number(slot.dataset.runSlot);
      if (!Number.isInteger(index)) return;

      this.selectedIndex = index;
      if (this.held) {
        this.held = this.storage.placeOne(index, this.held);
      } else {
        this.held = this.storage.takeHalf(index);
      }
      this.render(true);
    });

    this.element.addEventListener("dblclick", (event) => {
      const target = event.target as HTMLElement;
      const slot = target.closest<HTMLElement>("[data-run-slot]");
      if (!slot?.dataset.runSlot) return;

      const index = Number(slot.dataset.runSlot);
      if (!Number.isInteger(index)) return;

      this.selectedIndex = index;
      this.storage.consolidate(index);
      this.render(true);
    });

    this.element.addEventListener("dragstart", (event) => {
      const drag = event as DragEvent;
      const target = drag.target as HTMLElement;
      const slot = target.closest<HTMLElement>("[data-run-slot]");
      if (!slot?.dataset.runSlot || !drag.dataTransfer) return;

      const index = Number(slot.dataset.runSlot);
      if (!this.storage.slot(index)) {
        drag.preventDefault();
        return;
      }

      drag.dataTransfer.setData(
        "application/x-blockfall-slot",
        String(index),
      );
      drag.dataTransfer.effectAllowed = "move";
    });

    this.element.addEventListener("dragover", (event) => {
      const target = event.target as HTMLElement;
      if (target.closest("[data-run-slot]")) event.preventDefault();
    });

    this.element.addEventListener("drop", (event) => {
      const drag = event as DragEvent;
      const target = drag.target as HTMLElement;
      const slot = target.closest<HTMLElement>("[data-run-slot]");
      if (!slot?.dataset.runSlot || !drag.dataTransfer) return;

      event.preventDefault();
      const from = Number(
        drag.dataTransfer.getData("application/x-blockfall-slot"),
      );
      const to = Number(slot.dataset.runSlot);
      if (!Number.isInteger(from) || !Number.isInteger(to)) return;

      this.storage.moveAll(from, to);
      this.selectedIndex = to;
      this.render(true);
    });
  }

  private bindHotbarKeys(): void {
    window.addEventListener("keydown", (event) => {
      if (!this.openValue || event.repeat) return;
      if (!event.code.startsWith("Digit")) return;

      const hotbarIndex = Number(event.code.slice(5)) - 1;
      if (
        hotbarIndex < 0 ||
        hotbarIndex >= HOTBAR_SIZE
      ) {
        return;
      }

      event.preventDefault();
      if (this.held) {
        this.held = this.storage.placeAll(
          hotbarIndex,
          this.held,
        );
      } else if (this.selectedIndex !== null) {
        this.storage.moveToHotbar(
          this.selectedIndex,
          hotbarIndex,
        );
      }
      this.selectedIndex = hotbarIndex;
      this.render(true);
    });
  }

  private equipSelected(): void {
    let uid: string | null = null;

    if (this.held?.kind === "item") {
      uid = this.held.uid;
      if (!this.storage.insertDetachedStack(this.held, "backpack")) {
        return;
      }
      this.held = null;
    } else if (this.selectedIndex !== null) {
      const stack = this.storage.slot(this.selectedIndex);
      if (stack?.kind === "item") uid = stack.uid;
    }

    if (!uid) return;
    this.equipment.equip(uid);
    this.render(true);
  }

  private render(force = false): void {
    if (!this.openValue) return;

    const signature = JSON.stringify({
      selected: this.selectedIndex,
      held: this.held,
      slots: this.storage.slots,
      equipped: this.equipment.slots,
      crafting: this.craftMessage,
    });
    if (!force && signature === this.signature) return;
    this.signature = signature;

    const occupied = this.storage.slots.filter(Boolean).length;
    const selected =
      (this.selectedIndex === null
        ? null
        : this.storage.slot(this.selectedIndex)) ??
      this.held;

    this.element.innerHTML = `
      <div class="inventory2-shell">
        <header class="inventory2-header">
          <div>
            <span class="eyebrow">I · EQUIPAMENTO E FABRICAÇÃO</span>
            <h2>INVENTÁRIO</h2>
            <small>${occupied}/${RUN_INVENTORY_SIZE} slots occupied</small>
          </div>
          <div class="inventory2-header-actions">
            ${this.renderHeld()}
            <button class="inventory-close" data-inventory-close>FECHAR · I</button>
          </div>
        </header>

        <div class="inventory2-body">
          <main class="inventory2-storage">
            <section class="inventory2-equipment">
              <div class="inventory-section-title">
                <strong>EQUIPMENT</strong>
                <span>Weapon · Armor · Charm</span>
              </div>
              <div class="equipment-slots">
                ${(["weapon", "armor", "charm"] as EquipmentSlot[])
                  .map((slot) => this.renderEquipmentSlot(slot))
                  .join("")}
              </div>
            </section>

            <section>
              <div class="inventory-section-title">
                <strong>BACKPACK</strong>
                <span>${BACKPACK_SIZE} slots · Shift+Click → hotbar</span>
              </div>
              <div class="inventory2-grid backpack-grid">
                ${Array.from(
                  { length: BACKPACK_SIZE },
                  (_, offset) =>
                    this.renderRunSlot(HOTBAR_SIZE + offset),
                ).join("")}
              </div>
            </section>

            <section>
              <div class="inventory-section-title">
                <strong>HOTBAR</strong>
                <span>1–9 · scroll during gameplay</span>
              </div>
              <div class="inventory2-grid hotbar-inventory-grid">
                ${Array.from(
                  { length: HOTBAR_SIZE },
                  (_, index) => this.renderRunSlot(index, true),
                ).join("")}
              </div>
            </section>

            <div class="inventory2-help">
              <span>LMB pick/place</span>
              <span>RMB split/place one</span>
              <span>Shift+Click quick move</span>
              <span>Double-click consolidate</span>
              <span>Drag & drop swap/move</span>
              <span>1–9 send selected stack to hotbar</span>
            </div>
          </main>

          <aside class="item-details inventory2-details">
            ${this.renderCrafting()}
            ${this.renderDetails(selected)}
          </aside>
        </div>
      </div>
    `;
  }

  private renderRunSlot(
    index: number,
    hotbar = false,
  ): string {
    const stack = this.storage.slot(index);
    const selected = index === this.selectedIndex;
    const section = hotbar ? "hotbar" : "backpack";

    return `
      <button
        class="inventory2-slot ${selected ? "selected" : ""} ${stack ? "occupied" : "empty"}"
        data-run-slot="${index}"
        draggable="${stack ? "true" : "false"}"
        title="${stack ? this.stackTitle(stack) : "Empty slot"}"
      >
        ${hotbar
          ? `<span class="inventory2-slot-key">${index + 1}</span>`
          : ""}
        ${stack ? this.renderStack(stack) : ""}
        <span class="inventory2-slot-section">${section}</span>
      </button>
    `;
  }

  private renderCrafting(): string {
    return `<section class="crafting-panel"><h3>FABRICAÇÃO</h3>
      <p class="craft-message" role="status">${this.craftMessage}</p><div class="crafting-recipes">
      ${RECIPES.map(recipe => {
        const definition = itemDefinition(recipe.output);
        const state = this.crafting.status(recipe.id);
        return `<div class="craft-recipe ${state}">
          <div class="craft-title">${iconMarkup(definition.icon ?? "chest")}<strong>${definition.name}${(recipe.quantity ?? 1) > 1 ? ` ×${recipe.quantity}` : ""}</strong></div>
          <div class="craft-cost">${Object.entries(recipe.cost).map(([resource, amount]) => {
            const owned = this.storage.resourceCount(resource as ResourceId);
            return `<span class="${owned >= (amount ?? 0) ? "enough" : "missing"}" title="${RESOURCES[resource as ResourceId].name}">${iconMarkup(resource)} ${owned}/${amount}</span>`;
          }).join("")}</div>
          <button class="craft-action" data-craft="${recipe.id}" aria-label="Fabricar ${definition.name}" ${state !== "ready" || this.held ? "disabled" : ""}>${this.held ? "Guarde o item do cursor" : state === "space" ? "Mochila cheia" : "FABRICAR"}</button>
        </div>`;
      }).join("")}</div></section>`;
  }

  private renderStack(stack: InventoryStack): string {
    if (stack.kind === "resource") {
      const definition = RESOURCES[stack.resource];
      return `
        <img class="inventory2-icon art-icon" src="${stackIcon(stack)}" alt="" />
        <strong class="inventory2-stack-name">${definition.name}</strong>
        <b class="inventory2-stack-count">${stack.quantity}</b>
      `;
    }

    const definition = itemDefinition(stack.definitionId);
    return `
      <img class="inventory2-icon art-icon" src="${stackIcon(stack)}" alt="" />
      <strong class="inventory2-stack-name">${definition.name}</strong>
      ${stack.quantity > 1
        ? `<b class="inventory2-stack-count">${stack.quantity}</b>`
        : ""}
    `;
  }

  private renderEquipmentSlot(slot: EquipmentSlot): string {
    const stack = this.equipment.equippedStack(slot);
    const definition = stack
      ? itemDefinition(stack.definitionId)
      : null;

    return `
      <div class="equipment-slot inventory2-equipment-slot">
        <span class="equipment-slot-name">${slot}</span>
        ${definition
          ? `
            <div class="equipment-slot-item rarity-${definition.rarity}">
              ${iconMarkup(definition.slot === "weapon" ? "blade" : definition.slot ?? "chest")}
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

  private renderHeld(): string {
    if (!this.held) {
      return '<span class="inventory2-cursor-label">CURSOR · EMPTY</span>';
    }

    return `
      <span class="inventory2-cursor-label held">
        CURSOR · ${this.stackTitle(this.held)} ×${this.held.quantity}
      </span>
    `;
  }

  private renderDetails(stack: InventoryStack | null): string {
    if (!stack) {
      return `
        <div class="inventory-empty-details">
          <strong>SELECT A SLOT</strong>
          <span>Resources and loot now share the same physical inventory.</span>
        </div>
      `;
    }

    if (stack.kind === "resource") {
      const definition = RESOURCES[stack.resource];
      const block = resourcePlacementBlock(stack.resource);
      return `
        <div class="item-detail-card">
          <div class="item-detail-heading">
            <img class="art-icon" src="${stackIcon(stack)}" alt="" />
            <div>
              <small>RESOURCE · STACK 64</small>
              <h3>${definition.name}</h3>
            </div>
          </div>
          <p>
            ${block === null
              ? "Construction resource. Not directly placeable as a voxel."
              : `Select this stack in the hotbar to place ${blockDefinition(block).name} voxels.`}
          </p>
          <div class="item-modifiers">
            <h4>STACK</h4>
            <div class="modifier-row">
              <span>Quantity</span>
              <strong>${stack.quantity} / 64</strong>
            </div>
          </div>
        </div>
      `;
    }

    const definition = itemDefinition(stack.definitionId);
    return this.renderItemDetails(stack.uid, definition);
  }

  private renderItemDetails(
    uid: string,
    definition: ItemDefinition,
  ): string {
    const slot = definition.slot;
    const equipped = slot
      ? this.equipment.equippedDefinition(slot)
      : null;

    return `
      <div class="item-detail-card rarity-${definition.rarity}">
        <div class="item-detail-heading">
          ${iconMarkup(definition.icon ?? (definition.slot === "weapon" ? definition.tags.includes("projectile") ? "repeater" : "blade" : definition.slot ?? "chest"))}
          <div>
            <small>${definition.rarity} · ${slot ?? definition.kind}</small>
            <h3>${definition.name}</h3>
          </div>
        </div>
        <p>${definition.description}</p>

        ${definition.kind === "equipment" ? `<div class="item-modifiers">
          <h4>MODIFIERS</h4>
          ${modifierRows(definition)}
        </div>` : ""}

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
              data-item-uid="${uid}"
            >
              EQUIP ${slot.toUpperCase()}
            </button>
          `
          : ""}
      </div>
    `;
  }

  private stackTitle(stack: InventoryStack): string {
    return stack.kind === "resource"
      ? RESOURCES[stack.resource].name
      : itemDefinition(stack.definitionId).name;
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
