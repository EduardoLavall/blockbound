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
  const targetInfo = required<HTMLDivElement>("target-info");

  const app = new GameApp({
    canvas,
    overlay,
    playButton,
    loadingLabel,
    debug,
    hotbar,
    targetInfo,
  });

  await app.init();
}
