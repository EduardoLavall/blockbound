import { BlockId } from "../blocks";
import { CHUNK_HEIGHT, CHUNK_SIZE } from "../constants";
import { VoxelWorld } from "../VoxelWorld";
import { BiomeId, biomeAt } from "./Biomes";
import { coordinateRandom, coordinateRandom3, fbm2D } from "./Noise";
import { SeededRandom } from "./SeededRandom";
import type { RunSeed } from "./Seed";
import type {
  PoiMarker,
  SpawnZone,
  WorldBounds,
  WorldMetadata,
  WorldPoint,
} from "./WorldMetadata";

export interface WorldGenerationResult {
  world: VoxelWorld;
  metadata: WorldMetadata;
}

export const DEFAULT_WORLD_CHUNK_RADIUS = 2;

const CORE_SURFACE_Y = 6;
const CORE_FLAT_RADIUS = 8;
const CORE_BLEND_RADIUS = 14;

export function generateWorld(
  seed: RunSeed,
  chunkRadius = DEFAULT_WORLD_CHUNK_RADIUS,
): WorldGenerationResult {
  const world = new VoxelWorld();

  for (let cz = -chunkRadius; cz <= chunkRadius; cz++) {
    for (let cx = -chunkRadius; cx <= chunkRadius; cx++) {
      world.ensureChunk(cx, cz);
    }
  }

  const bounds: WorldBounds = {
    minX: -chunkRadius * CHUNK_SIZE,
    maxXExclusive: (chunkRadius + 1) * CHUNK_SIZE,
    minZ: -chunkRadius * CHUNK_SIZE,
    maxZExclusive: (chunkRadius + 1) * CHUNK_SIZE,
  };

  const core: WorldPoint = {
    x: Math.floor((bounds.minX + bounds.maxXExclusive) / 2),
    z: Math.floor((bounds.minZ + bounds.maxZExclusive) / 2),
  };

  const biomeCounts: Record<BiomeId, number> = {
    [BiomeId.Plains]: 0,
    [BiomeId.Forest]: 0,
    [BiomeId.Rocky]: 0,
  };

  for (let z = bounds.minZ; z < bounds.maxZExclusive; z++) {
    for (let x = bounds.minX; x < bounds.maxXExclusive; x++) {
      const biome = biomeAt(seed.value, x, z);
      biomeCounts[biome]++;
      const height = terrainHeight(seed.value, x, z, biome, core);

      world.setGeneratedBlock(x, 0, z, BlockId.Bedrock);
      for (let y = 1; y <= height; y++) {
        let block = BlockId.Stone;

        if (biome !== BiomeId.Rocky) {
          if (y === height) block = BlockId.Grass;
          else if (y >= height - 2) block = BlockId.Dirt;
        }

        if (
          block === BlockId.Stone &&
          y > 1 &&
          y < height &&
          coordinateRandom3(seed.value, x, y, z, 73) > 0.955
        ) {
          block = BlockId.MetalOre;
        }

        world.setGeneratedBlock(x, y, z, block);
      }
    }
  }

  generateTrees(world, seed.value, bounds, core);
  const pois = generatePois(world, seed.value, bounds, core);
  buildCoreClearing(world, core);

  const spawnZones: SpawnZone[] = [
    { id: "north", x: core.x, z: bounds.minZ + 4 },
    { id: "south", x: core.x, z: bounds.maxZExclusive - 5 },
    { id: "west", x: bounds.minX + 4, z: core.z },
    { id: "east", x: bounds.maxXExclusive - 5, z: core.z },
  ];

  const playerSpawn = { x: core.x, z: core.z + 7 };

  return {
    world,
    metadata: {
      seed,
      bounds,
      core,
      playerSpawn,
      spawnZones,
      pois,
      biomeCounts,
      chunkRadius,
      chunksPerAxis: chunkRadius * 2 + 1,
    },
  };
}

function terrainHeight(
  seed: number,
  x: number,
  z: number,
  biome: BiomeId,
  core: WorldPoint,
): number {
  const broad = fbm2D(seed ^ 0x3d20adea, x * 0.025, z * 0.025, 4) * 2.7;
  const detail = fbm2D(seed ^ 0x1298f3ab, x * 0.075, z * 0.075, 3) * 1.35;
  const rockyBoost = biome === BiomeId.Rocky ? 1.5 : 0;

  let height = 6 + broad + detail + rockyBoost;

  const distanceToCore = Math.hypot(x - core.x, z - core.z);
  if (distanceToCore <= CORE_FLAT_RADIUS) {
    height = CORE_SURFACE_Y;
  } else if (distanceToCore < CORE_BLEND_RADIUS) {
    const t =
      (distanceToCore - CORE_FLAT_RADIUS) /
      (CORE_BLEND_RADIUS - CORE_FLAT_RADIUS);
    height = CORE_SURFACE_Y + (height - CORE_SURFACE_Y) * t;
  }

  return Math.max(3, Math.min(13, Math.round(height)));
}

function generateTrees(
  world: VoxelWorld,
  seed: number,
  bounds: WorldBounds,
  core: WorldPoint,
): void {
  const cellSize = 3;

  for (
    let cellZ = bounds.minZ + 3;
    cellZ < bounds.maxZExclusive - 3;
    cellZ += cellSize
  ) {
    for (
      let cellX = bounds.minX + 3;
      cellX < bounds.maxXExclusive - 3;
      cellX += cellSize
    ) {
      const x =
        cellX +
        Math.floor(coordinateRandom(seed, cellX, cellZ, 101) * cellSize);
      const z =
        cellZ +
        Math.floor(coordinateRandom(seed, cellX, cellZ, 102) * cellSize);

      if (Math.hypot(x - core.x, z - core.z) < CORE_BLEND_RADIUS) continue;

      const biome = biomeAt(seed, x, z);
      const chance =
        biome === BiomeId.Forest
          ? 0.68
          : biome === BiomeId.Plains
            ? 0.14
            : 0.02;

      if (coordinateRandom(seed, x, z, 103) > chance) continue;

      const groundY = world.highestSolidY(x, z);
      if (groundY < 1 || groundY + 7 >= CHUNK_HEIGHT) continue;

      const trunkHeight =
        3 + Math.floor(coordinateRandom(seed, x, z, 104) * 3);

      for (let y = 1; y <= trunkHeight; y++) {
        world.setGeneratedBlock(x, groundY + y, z, BlockId.Wood);
      }

      const canopyY = groundY + trunkHeight;
      for (let dy = -1; dy <= 1; dy++) {
        for (let dz = -2; dz <= 2; dz++) {
          for (let dx = -2; dx <= 2; dx++) {
            const manhattan = Math.abs(dx) + Math.abs(dz) + Math.abs(dy);
            if (manhattan > 4) continue;
            if (dx === 0 && dz === 0 && dy <= 0) continue;

            const leafX = x + dx;
            const leafY = canopyY + dy;
            const leafZ = z + dz;
            if (!insideBounds(bounds, leafX, leafZ)) continue;

            if (world.getBlock(leafX, leafY, leafZ) === BlockId.Air) {
              world.setGeneratedBlock(
                leafX,
                leafY,
                leafZ,
                BlockId.Leaves,
              );
            }
          }
        }
      }
    }
  }
}

function generatePois(
  world: VoxelWorld,
  seed: number,
  bounds: WorldBounds,
  core: WorldPoint,
): PoiMarker[] {
  const random = new SeededRandom(seed ^ 0xa5c31f27);
  const types: PoiMarker["type"][] = ["ruin", "altar", "mine"];
  const pois: PoiMarker[] = [];

  for (let i = 0; i < types.length; i++) {
    const angle =
      (Math.PI * 2 * i) / types.length + random.range(-0.45, 0.45);
    const radius = random.range(19, 29);

    const x = clamp(
      Math.round(core.x + Math.cos(angle) * radius),
      bounds.minX + 7,
      bounds.maxXExclusive - 8,
    );
    const z = clamp(
      Math.round(core.z + Math.sin(angle) * radius),
      bounds.minZ + 7,
      bounds.maxZExclusive - 8,
    );

    const marker: PoiMarker = { type: types[i]!, x, z };
    pois.push(marker);

    if (marker.type === "ruin") buildRuin(world, marker);
    else if (marker.type === "altar") buildAltar(world, marker);
    else buildMine(world, marker, seed);
  }

  return pois;
}

function buildRuin(world: VoxelWorld, poi: PoiMarker): void {
  const y = world.highestSolidY(poi.x, poi.z);
  clearArea(world, poi.x, poi.z, y, 3, 5);

  for (let dz = -2; dz <= 2; dz++) {
    for (let dx = -2; dx <= 2; dx++) {
      world.setGeneratedBlock(poi.x + dx, y, poi.z + dz, BlockId.Stone);
    }
  }

  const corners = [
    [-2, -2],
    [2, -2],
    [-2, 2],
    [2, 2],
  ] as const;

  corners.forEach(([dx, dz], index) => {
    const height = index % 2 === 0 ? 4 : 3;
    for (let dy = 1; dy <= height; dy++) {
      world.setGeneratedBlock(
        poi.x + dx,
        y + dy,
        poi.z + dz,
        BlockId.Stone,
      );
    }
  });
}

function buildAltar(world: VoxelWorld, poi: PoiMarker): void {
  const y = world.highestSolidY(poi.x, poi.z);
  clearArea(world, poi.x, poi.z, y, 2, 5);

  for (let dz = -1; dz <= 1; dz++) {
    for (let dx = -1; dx <= 1; dx++) {
      world.setGeneratedBlock(poi.x + dx, y, poi.z + dz, BlockId.Stone);
    }
  }

  for (let dy = 1; dy <= 3; dy++) {
    world.setGeneratedBlock(poi.x, y + dy, poi.z, BlockId.Crystal);
  }
}

function buildMine(
  world: VoxelWorld,
  poi: PoiMarker,
  seed: number,
): void {
  const surface = world.highestSolidY(poi.x, poi.z);

  for (let dz = -3; dz <= 3; dz++) {
    for (let dx = -3; dx <= 3; dx++) {
      const distance = Math.hypot(dx, dz);
      if (distance > 3.2) continue;

      const depth =
        distance < 1.4 ? 3 : distance < 2.4 ? 2 : 1;

      for (let dy = 0; dy < depth; dy++) {
        world.setGeneratedBlock(
          poi.x + dx,
          surface - dy,
          poi.z + dz,
          BlockId.Air,
        );
      }

      if (coordinateRandom(seed, poi.x + dx, poi.z + dz, 141) > 0.45) {
        world.setGeneratedBlock(
          poi.x + dx,
          Math.max(1, surface - depth),
          poi.z + dz,
          BlockId.MetalOre,
        );
      }
    }
  }
}

function buildCoreClearing(world: VoxelWorld, core: WorldPoint): void {
  for (let dz = -4; dz <= 4; dz++) {
    for (let dx = -4; dx <= 4; dx++) {
      for (
        let y = CORE_SURFACE_Y + 1;
        y < Math.min(CHUNK_HEIGHT, CORE_SURFACE_Y + 8);
        y++
      ) {
        world.setGeneratedBlock(core.x + dx, y, core.z + dz, BlockId.Air);
      }

      world.setGeneratedBlock(
        core.x + dx,
        CORE_SURFACE_Y,
        core.z + dz,
        Math.abs(dx) <= 2 && Math.abs(dz) <= 2
          ? BlockId.Stone
          : BlockId.Grass,
      );
    }
  }
}

function clearArea(
  world: VoxelWorld,
  x: number,
  z: number,
  surfaceY: number,
  radius: number,
  height: number,
): void {
  for (let dz = -radius; dz <= radius; dz++) {
    for (let dx = -radius; dx <= radius; dx++) {
      for (let dy = 1; dy <= height; dy++) {
        world.setGeneratedBlock(
          x + dx,
          surfaceY + dy,
          z + dz,
          BlockId.Air,
        );
      }
    }
  }
}

function insideBounds(
  bounds: WorldBounds,
  x: number,
  z: number,
): boolean {
  return (
    x >= bounds.minX &&
    x < bounds.maxXExclusive &&
    z >= bounds.minZ &&
    z < bounds.maxZExclusive
  );
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}
