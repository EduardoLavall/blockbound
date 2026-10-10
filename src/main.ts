import "./style.css";
import { bootstrap } from "./app/bootstrap";

void bootstrap().catch((error: unknown) => {
  console.error("Game initialization failed", error);
  const label = document.getElementById("loading-label");
  if (label) label.textContent = "Não foi possível preparar o mundo. Recarregue a página; verifique se o navegador oferece WebGL.";
  const button = document.getElementById("play-button") as HTMLButtonElement | null;
  if (button) { button.disabled = false; button.textContent = "TENTAR NOVAMENTE";
    button.addEventListener("click", () => window.location.reload()); }
});
