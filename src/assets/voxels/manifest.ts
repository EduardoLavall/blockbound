import atlasUrl from "./atlas.png?url";
import bedrockUrl from "./bedrock.png?url";
import crystalUrl from "./crystal.png?url";
import dirtUrl from "./dirt.png?url";
import grassUrl from "./grass.png?url";
import leavesUrl from "./leaves.png?url";
import metalOreUrl from "./metal_ore.png?url";
import stoneUrl from "./stone.png?url";
import woodUrl from "./wood.png?url";

export interface VoxelTextureSource {
  tile: number;
  name: string;
  url: string;
  width: 16;
  height: 16;
}

export const VOXEL_ATLAS_URL = atlasUrl;

export const VOXEL_TEXTURE_SOURCES: readonly VoxelTextureSource[] = [
  { tile: 0, name: "Grass", url: grassUrl, width: 16, height: 16 },
  { tile: 1, name: "Dirt", url: dirtUrl, width: 16, height: 16 },
  { tile: 2, name: "Stone", url: stoneUrl, width: 16, height: 16 },
  { tile: 3, name: "Wood", url: woodUrl, width: 16, height: 16 },
  { tile: 4, name: "Crystal", url: crystalUrl, width: 16, height: 16 },
  { tile: 5, name: "Bedrock", url: bedrockUrl, width: 16, height: 16 },
  { tile: 6, name: "Leaves", url: leavesUrl, width: 16, height: 16 },
  { tile: 7, name: "Metal Ore", url: metalOreUrl, width: 16, height: 16 },
];
