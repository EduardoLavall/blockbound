export function hudScale(width: number, height: number, adjustment = 1): number {
  const automatic = Math.max(1, Math.min(2.4, width / 1600, height / 900));
  return Math.max(0.75, Math.min(3, automatic * adjustment));
}
