import type { InventoryStack } from "../inventory/RunInventory";
import { itemDefinition } from "../items/ItemRegistry";

const files = import.meta.glob<string>("../assets/icons/*.png", { eager: true, query: "?url", import: "default" });
export function iconUrl(name: string): string {
  return files[`../assets/icons/${name}.png`] ?? files["../assets/icons/chest.png"]!;
}
export function stackIcon(stack: InventoryStack): string {
  if (stack.kind === "resource") return iconUrl(stack.resource);
  const definition = itemDefinition(stack.definitionId);
  if (definition.icon) return iconUrl(definition.icon);
  return iconUrl(definition.slot === "weapon"
    ? definition.tags.includes("projectile") ? "repeater" : "blade"
    : definition.slot ?? "chest");
}
export function iconMarkup(name: string, className = "art-icon"): string {
  return `<img class="${className}" src="${iconUrl(name)}" alt="" draggable="false" />`;
}
