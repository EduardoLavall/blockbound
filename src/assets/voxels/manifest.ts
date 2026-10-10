import atlasUrl from "./atlas-v2.png?url";
import bedrockUrl from "./bedrock-v2.png?url";
import crystalUrl from "./crystal-v2.png?url";
import dirtUrl from "./dirt-v2.png?url";
import grassUrl from "./grass-v2.png?url";
import leavesUrl from "./leaves-v2.png?url";
import metalOreUrl from "./metal_ore-v2.png?url";
import stoneUrl from "./stone-v2.png?url";
import woodUrl from "./wood-v2.png?url";

export interface VoxelTextureSource {
  tile: number;
  name: string;
  url: string;
  width: 64;
  height: 64;
}

export const VOXEL_ATLAS_URL = atlasUrl;

export const VOXEL_TEXTURE_SOURCES: readonly VoxelTextureSource[] = [
  { tile: 0, name: "Grass", url: grassUrl, width: 64, height: 64 },
  { tile: 1, name: "Dirt", url: dirtUrl, width: 64, height: 64 },
  { tile: 2, name: "Stone", url: stoneUrl, width: 64, height: 64 },
  { tile: 3, name: "Wood", url: woodUrl, width: 64, height: 64 },
  { tile: 4, name: "Crystal", url: crystalUrl, width: 64, height: 64 },
  { tile: 5, name: "Bedrock", url: bedrockUrl, width: 64, height: 64 },
  { tile: 6, name: "Leaves", url: leavesUrl, width: 64, height: 64 },
  { tile: 7, name: "Metal Ore", url: metalOreUrl, width: 64, height: 64 },
];
