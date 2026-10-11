import { BlockId } from "../../voxel/blocks";

export const SOUND_GROUPS = {
  shoot: ["laserSmall_000", "laserSmall_001", "laserSmall_002"],
  swing: ["knifeSlice", "knifeSlice2"],
  hit: ["impactPunch_medium_000", "impactPunch_medium_001"],
  kill: ["impactPunch_heavy_000"],
  hurt: ["impactSoft_medium_000", "impactSoft_medium_001"],
  mineStone: ["impactMining_000", "impactMining_001", "impactMining_002"],
  mineWood: ["impactWood_medium_000", "impactWood_medium_001"],
  mineLeaves: ["cloth3", "cloth4"],
  mineEarth: ["impactSoft_medium_000", "impactSoft_medium_001"],
  mineMetal: ["impactMetal_light_000", "impactMetal_light_001"],
  mineCrystal: ["impactGlass_light_000", "impactGlass_light_001"],
  breakCrystal: ["impactGlass_heavy_000"],
  breakWood: ["chop"],
  breakGrass: ["breakGrass"],
  breakDirt: ["breakDirt"],
  breakStone: ["breakStone"],
  breakLeaves: ["breakLeaves"],
  breakMetal: ["breakMetal"],
  treeFall: ["treeFall"],
  treeImpact: ["treeImpact"],
  stepGrass: ["footstep_grass_000", "footstep_grass_001", "footstep_grass_002"],
  stepStone: ["footstep_concrete_000", "footstep_concrete_001"],
  stepWood: ["footstep_wood_000", "footstep_wood_001"],
  equip: ["drawKnife1", "cloth1"],
  build: ["impactWood_medium_000", "impactMetal_light_000"],
  pickup: ["glass_001"],
  night: ["forceField_000"],
  boss: ["lowFrequency_explosion_000"],
  draft: ["open_001"],
  choose: ["confirmation_001"],
  click: ["click_001", "select_001"],
  dawn: ["jingles_PIZZI00"],
  victory: ["jingles_PIZZI09"],
  defeat: ["jingles_PIZZI15"],
} as const;
export type SoundGroup = keyof typeof SOUND_GROUPS;
interface BlockSound { strike: SoundGroup | null; broken: SoundGroup | null }
/** Exhaustive mapping: new block types must choose their own audible feedback. */
export const BLOCK_SOUNDS: Readonly<Record<BlockId, BlockSound>> = {
  [BlockId.Air]: { strike: null, broken: null },
  [BlockId.Bedrock]: { strike: null, broken: null },
  [BlockId.Grass]: { strike: "mineEarth", broken: "breakGrass" },
  [BlockId.Dirt]: { strike: "mineEarth", broken: "breakDirt" },
  [BlockId.Stone]: { strike: "mineStone", broken: "breakStone" },
  [BlockId.Wood]: { strike: "mineWood", broken: "breakWood" },
  [BlockId.Leaves]: { strike: "mineLeaves", broken: "breakLeaves" },
  [BlockId.MetalOre]: { strike: "mineMetal", broken: "breakMetal" },
  [BlockId.Crystal]: { strike: "mineCrystal", broken: "breakCrystal" },
};
export const SOUND_ASSETS = [...new Set(Object.values(SOUND_GROUPS).flat())];
export function soundUrl(name: string): string { return `/audio/${name}.ogg`; }
