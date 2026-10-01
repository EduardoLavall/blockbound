import "./style.css";
import { Game, type UIRefs } from "./game/game";

function byId<T extends HTMLElement>(id: string): T {
  const element = document.getElementById(id);
  if (!element) throw new Error("Elemento obrigatório não encontrado: #" + id);
  return element as T;
}

const canvas = byId<HTMLCanvasElement>("game");
const ui: UIRefs = {
  hpBar: byId("hp-bar"),
  hpText: byId("hp-text"),
  coreBar: byId("core-bar"),
  coreText: byId("core-text"),
  wood: byId("wood-count"),
  stone: byId("stone-count"),
  iron: byId("iron-count"),
  phaseLabel: byId("phase-label"),
  phaseTimer: byId("phase-timer"),
  waveLabel: byId("wave-label"),
  seedLabel: byId("seed-label"),
  weaponLabel: byId("weapon-label"),
  hotbarButtons: Array.from(document.querySelectorAll<HTMLButtonElement>("#hotbar button")),
  toast: byId("toast"),
  upgradeOverlay: byId("upgrade-overlay"),
  upgradeOptions: byId("upgrade-options"),
  gameoverOverlay: byId("gameover-overlay"),
  gameoverTitle: byId("gameover-title"),
  gameoverStats: byId("gameover-stats")
};

const startOverlay = byId("start-overlay");
const startButton = byId<HTMLButtonElement>("start-button");
const restartButton = byId<HTMLButtonElement>("restart-button");

const game = new Game(canvas, ui);
game.setStarted(false);

startButton.addEventListener("click", () => {
  startOverlay.classList.remove("overlay--visible");
  game.start();
});

restartButton.addEventListener("click", () => {
  game.start();
});
