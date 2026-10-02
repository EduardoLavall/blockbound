import type { BiomeId } from "./Biomes";
import type { RunSeed } from "./Seed";

export interface WorldBounds {
  minX: number;
  maxXExclusive: number;
  minZ: number;
  maxZExclusive: number;
}

export interface WorldPoint {
  x: number;
  z: number;
}

export interface SpawnZone extends WorldPoint {
  id: "north" | "south" | "west" | "east";
}

export interface PoiMarker extends WorldPoint {
  type: "ruin" | "altar" | "mine";
}

export interface WorldMetadata {
  seed: RunSeed;
  bounds: WorldBounds;
  core: WorldPoint;
  playerSpawn: WorldPoint;
  spawnZones: SpawnZone[];
  pois: PoiMarker[];
  biomeCounts: Record<BiomeId, number>;
  chunkRadius: number;
  chunksPerAxis: number;
}
