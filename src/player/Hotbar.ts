import {
  HOTBAR_SIZE,
  type InventoryStack,
  type RunInventory,
} from "../inventory/RunInventory";
import { itemDefinition } from "../items/ItemRegistry";
import {
  RESOURCES,
  resourcePlacementBlock,
} from "../survival/Resources";
import {
  blockDefinition,
  type BlockId,
} from "../voxel/blocks";

export class Hotbar {
  private selectedIndex = 0;

  constructor(
    private readonly element: HTMLDivElement,
    private readonly inventory: RunInventory,
  ) {
    this.inventory.subscribe(() => this.refresh());
    this.bindScroll();
    this.refresh();
  }

  select(index: number): void {
    if (index < 0 || index >= HOTBAR_SIZE) return;
    this.selectedIndex = index;
    this.refresh();
  }

  cycle(direction: number): void {
    const next =
      (this.selectedIndex + Math.sign(direction) + HOTBAR_SIZE) %
      HOTBAR_SIZE;
    this.select(next);
  }

  get selectedSlot(): number {
    return this.selectedIndex;
  }

  get selectedStack(): InventoryStack | null {
    return this.inventory.slot(this.selectedIndex);
  }

  get selectedBlock(): BlockId | null {
    const stack = this.selectedStack;
    if (stack?.kind !== "resource") return null;
    return resourcePlacementBlock(stack.resource);
  }

  get selectedName(): string {
    const stack = this.selectedStack;
    if (!stack) return "Empty";

    if (stack.kind === "resource") {
      const block = resourcePlacementBlock(stack.resource);
      return block === null
        ? RESOURCES[stack.resource].name
        : blockDefinition(block).name;
    }

    return itemDefinition(stack.definitionId).name;
  }

  private bindScroll(): void {
    window.addEventListener(
      "wheel",
      (event) => {
        if (!document.pointerLockElement) return;
        if (Math.abs(event.deltaY) < 0.01) return;
        event.preventDefault();
        this.cycle(event.deltaY > 0 ? 1 : -1);
      },
      { passive: false },
    );
  }

  private refresh(): void {
    this.element.innerHTML = Array.from(
      { length: HOTBAR_SIZE },
      (_, index) => this.renderSlot(index),
    ).join("");
  }

  private renderSlot(index: number): string {
    const stack = this.inventory.slot(index);
    const selected = index === this.selectedIndex;

    if (!stack) {
      return `
        <div class="hotbar-slot ${selected ? "selected" : ""}">
          <span class="hotbar-key">${index + 1}</span>
          <span class="hotbar-empty">—</span>
        </div>
      `;
    }

    if (stack.kind === "resource") {
      const definition = RESOURCES[stack.resource];
      return `
        <div class="hotbar-slot ${selected ? "selected" : ""}">
          <span class="hotbar-key">${index + 1}</span>
          <span
            class="hotbar-swatch"
            style="--swatch:${definition.swatch}"
          ></span>
          <span class="hotbar-name">${definition.name}</span>
          <strong class="hotbar-count">${stack.quantity}</strong>
        </div>
      `;
    }

    const definition = itemDefinition(stack.definitionId);
    return `
      <div class="hotbar-slot rarity-${definition.rarity} ${selected ? "selected" : ""}">
        <span class="hotbar-key">${index + 1}</span>
        <span
          class="hotbar-swatch"
          style="--swatch:${definition.swatch}"
        ></span>
        <span class="hotbar-name">${definition.name}</span>
        ${stack.quantity > 1
          ? `<strong class="hotbar-count">${stack.quantity}</strong>`
          : ""}
      </div>
    `;
  }
}
