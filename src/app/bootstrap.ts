import { GameApp } from "./GameApp";

function required<T extends HTMLElement>(id: string): T {
  const element = document.getElementById(id);
  if (!element) throw new Error(`Missing required element #${id}`);
  return element as T;
}

export async function bootstrap(): Promise<void> {
  const canvas = required<HTMLCanvasElement>("game-canvas");
  const overlay = required<HTMLDivElement>("start-overlay");
  const playButton = required<HTMLButtonElement>("play-button");
  const loadingLabel = required<HTMLElement>("loading-label");
  const debug = required<HTMLDivElement>("debug");
  const hotbar = required<HTMLDivElement>("hotbar");
  const buildBar = required<HTMLDivElement>("buildbar");
  const targetInfo = required<HTMLDivElement>("target-info");
  const buildInfo = required<HTMLDivElement>("build-info");
  const miningProgress = required<HTMLDivElement>("mining-progress-fill");
  const inventoryHud = required<HTMLDivElement>("inventory-hud");
  const coreHud = required<HTMLDivElement>("core-hud");
  const hordeHud = required<HTMLDivElement>("horde-hud");
  const defeatOverlay = required<HTMLDivElement>("defeat-overlay");
  const restartButton = required<HTMLButtonElement>("restart-button");
  const status = required<HTMLDivElement>("status");

  const app = new GameApp({
    canvas,
    overlay,
    playButton,
    loadingLabel,
    debug,
    hotbar,
    buildBar,
    targetInfo,
    buildInfo,
    miningProgress,
    inventoryHud,
    coreHud,
    hordeHud,
    defeatOverlay,
    restartButton,
    status,
  });

  await app.init();
}
