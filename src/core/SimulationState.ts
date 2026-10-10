/** One gate for physics, combat, waves and timers. */
export function simulationActive(state: {
  locked: boolean;
  hidden: boolean;
  ended: boolean;
  drafting: boolean;
  inventoryOpen: boolean;
}): boolean {
  return state.locked && !state.hidden && !state.ended &&
    !state.drafting && !state.inventoryOpen;
}
