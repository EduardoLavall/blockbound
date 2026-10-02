import { PLACEABLE_BLOCKS, blockDefinition, type BlockId } from "../voxel/blocks";

export class Hotbar {
  private selectedIndex = 0;
  private readonly slots: HTMLDivElement[] = [];

  constructor(private readonly element: HTMLDivElement) {
    PLACEABLE_BLOCKS.forEach((block, index) => {
      const definition = blockDefinition(block);
      const slot = document.createElement("div");
      slot.className = "hotbar-slot";
      slot.innerHTML = `
        <span class="hotbar-key">${index + 1}</span>
        <span class="hotbar-swatch" style="--swatch:${definition.swatch}"></span>
        <span class="hotbar-name">${definition.name}</span>
      `;
      this.element.append(slot);
      this.slots.push(slot);
    });
    this.refresh();
  }

  select(index: number): void {
    if (index < 0 || index >= PLACEABLE_BLOCKS.length) return;
    this.selectedIndex = index;
    this.refresh();
  }

  get selectedBlock(): BlockId {
    return PLACEABLE_BLOCKS[this.selectedIndex]!;
  }

  get selectedName(): string {
    return blockDefinition(this.selectedBlock).name;
  }

  private refresh(): void {
    this.slots.forEach((slot, index) => {
      slot.classList.toggle("selected", index === this.selectedIndex);
    });
  }
}
