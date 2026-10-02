import { fbm2D } from "./Noise";

export enum BiomeId {
  Plains = "plains",
  Forest = "forest",
  Rocky = "rocky",
}

export function biomeAt(seed: number, x: number, z: number): BiomeId {
  const moisture = fbm2D(seed ^ 0x52b31e19, x * 0.022, z * 0.022, 3);
  const rugged = Math.abs(fbm2D(seed ^ 0x7f4a7c15, x * 0.034, z * 0.034, 4));

  if (rugged > 0.38) return BiomeId.Rocky;
  if (moisture > -0.03) return BiomeId.Forest;
  return BiomeId.Plains;
}
