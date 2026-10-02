import type { Input } from "../core/Input";
import type { PlayerStatus } from "../player/PlayerStatus";
import type { RunManager } from "../roguelite/RunManager";
import { UPGRADES } from "../roguelite/UpgradeRegistry";

export class PlayerStatusPanel {
  private signature = "";

  constructor(
    private readonly element: HTMLDivElement,
    private readonly input: Input,
    private readonly status: PlayerStatus,
    private readonly run: RunManager,
  ) {}

  update(): void {
    const visible = this.input.isDown("Tab");
    this.element.classList.toggle("hidden", !visible);
    if (!visible) return;

    const lines = this.status.explain();
    const upgrades = this.run.acquiredUpgrades
      .map((id) => UPGRADES.find((upgrade) => upgrade.id === id))
      .filter((upgrade) => upgrade !== undefined);

    const nextSignature = JSON.stringify({
      lines,
      upgrades: upgrades.map((upgrade) => upgrade.id),
    });
    if (nextSignature === this.signature) return;
    this.signature = nextSignature;

    const categories = [...new Set(lines.map((line) => line.category))];

    this.element.innerHTML = `
      <div class="player-status-shell">
        <div class="player-status-header">
          <div>
            <span class="eyebrow">TAB · LIVE BUILD SHEET</span>
            <h2>PLAYER STATUS</h2>
          </div>
          <div class="status-legend">
            <span>BASE</span>
            <span>RUN</span>
            <span>EQUIP</span>
            <strong>FINAL</strong>
          </div>
        </div>

        <div class="player-status-content">
          <div class="status-groups">
            ${categories.map((category) => {
              const rows = lines.filter((line) => line.category === category);
              return `
                <section class="status-group">
                  <h3>${category}</h3>
                  ${rows.map((line) => `
                    <div class="status-row">
                      <span class="status-label">${line.label}</span>
                      <span>${line.base}</span>
                      <span>${line.run}</span>
                      <span>${line.equipment}</span>
                      <strong>${line.final}</strong>
                    </div>
                  `).join("")}
                </section>
              `;
            }).join("")}
          </div>

          <aside class="status-upgrades">
            <h3>RUN UPGRADES · ${upgrades.length}</h3>
            ${upgrades.length === 0
              ? '<p class="status-empty">No upgrades acquired yet.</p>'
              : upgrades.map((upgrade) => `
                  <div class="status-upgrade">
                    <strong>${upgrade.name}</strong>
                    <span>${upgrade.description}</span>
                    <small>${upgrade.rarity} · ${upgrade.family}</small>
                  </div>
                `).join("")}
          </aside>
        </div>
      </div>
    `;
  }
}
