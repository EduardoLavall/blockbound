import type { UpgradeDefinition } from "../roguelite/UpgradeRegistry";

export class UpgradeDraftUI {
  private openValue = false;

  constructor(private readonly element: HTMLDivElement) {}

  get open(): boolean {
    return this.openValue;
  }

  show(
    night: number,
    choices: readonly UpgradeDefinition[],
    onChoose: (upgrade: UpgradeDefinition) => void,
  ): void {
    this.openValue = true;
    this.element.classList.remove("hidden");
    this.element.innerHTML = `
      <div class="upgrade-panel">
        <div class="eyebrow">NIGHT ${night} SURVIVED</div>
        <h2>CHOOSE ONE UPGRADE</h2>
        <p>A run muda pelas interações entre jogador, defesas, economia e regras do sistema.</p>
        <div class="upgrade-grid"></div>
      </div>
    `;

    const grid = this.element.querySelector(".upgrade-grid");
    if (!(grid instanceof HTMLElement)) return;

    choices.forEach((upgrade) => {
      const button = document.createElement("button");
      button.className =
        `upgrade-card rarity-${upgrade.rarity} family-${upgrade.family}`;
      button.innerHTML = `
        <span class="upgrade-rarity">${upgrade.rarity}</span>
        <strong>${upgrade.name}</strong>
        <span class="upgrade-family">${upgrade.family}</span>
        <p>${upgrade.description}</p>
        <div class="upgrade-tags">
          ${upgrade.tags.map((tag) => `<span>${tag}</span>`).join("")}
        </div>
      `;
      button.addEventListener("click", () => {
        if (!this.openValue) return;
        this.openValue = false;
        this.element.classList.add("hidden");
        onChoose(upgrade);
      });
      grid.append(button);
    });
  }
}
