import * as THREE from "three";
import { ATLAS_COLUMNS, ATLAS_ROWS, ATLAS_TILE_SIZE } from "../constants";

interface TileStyle {
  base: string;
  light: string;
  dark: string;
  mode: "noise" | "stripes" | "crystal";
}

const TILES: readonly TileStyle[] = [
  { base: "#668945", light: "#83a955", dark: "#4d6c35", mode: "noise" },
  { base: "#76543a", light: "#90684a", dark: "#593c2a", mode: "noise" },
  { base: "#72766f", light: "#8b9087", dark: "#555a55", mode: "noise" },
  { base: "#936d42", light: "#b58a56", dark: "#6f4d2d", mode: "stripes" },
  { base: "#48aaad", light: "#7ce3dc", dark: "#276b75", mode: "crystal" },
  { base: "#30343a", light: "#464b52", dark: "#202329", mode: "noise" },
];

export function createVoxelTextureAtlas(): THREE.CanvasTexture {
  const canvas = document.createElement("canvas");
  canvas.width = ATLAS_COLUMNS * ATLAS_TILE_SIZE;
  canvas.height = ATLAS_ROWS * ATLAS_TILE_SIZE;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Could not create voxel texture atlas.");

  ctx.imageSmoothingEnabled = false;

  TILES.forEach((style, tile) => {
    const tx = (tile % ATLAS_COLUMNS) * ATLAS_TILE_SIZE;
    const ty = Math.floor(tile / ATLAS_COLUMNS) * ATLAS_TILE_SIZE;

    ctx.fillStyle = style.base;
    ctx.fillRect(tx, ty, ATLAS_TILE_SIZE, ATLAS_TILE_SIZE);

    if (style.mode === "stripes") {
      ctx.fillStyle = style.dark;
      for (let x = 2; x < ATLAS_TILE_SIZE; x += 5) {
        ctx.fillRect(tx + x, ty, 1, ATLAS_TILE_SIZE);
      }
      ctx.fillStyle = style.light;
      for (let y = 3; y < ATLAS_TILE_SIZE; y += 6) {
        ctx.fillRect(tx, ty + y, ATLAS_TILE_SIZE, 1);
      }
    } else if (style.mode === "crystal") {
      ctx.fillStyle = style.light;
      ctx.fillRect(tx + 3, ty + 2, 3, 10);
      ctx.fillRect(tx + 9, ty + 5, 2, 8);
      ctx.fillStyle = style.dark;
      ctx.fillRect(tx + 6, ty + 1, 2, 13);
      ctx.fillRect(tx + 12, ty + 7, 2, 7);
    } else {
      for (let y = 0; y < ATLAS_TILE_SIZE; y++) {
        for (let x = 0; x < ATLAS_TILE_SIZE; x++) {
          const hash = (x * 17 + y * 31 + tile * 47 + x * y * 3) % 19;
          if (hash === 0 || hash === 1) {
            ctx.fillStyle = hash === 0 ? style.light : style.dark;
            ctx.fillRect(tx + x, ty + y, 1, 1);
          }
        }
      }
    }

    ctx.strokeStyle = "rgba(0,0,0,.12)";
    ctx.strokeRect(tx + 0.5, ty + 0.5, ATLAS_TILE_SIZE - 1, ATLAS_TILE_SIZE - 1);
  });

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.magFilter = THREE.NearestFilter;
  texture.minFilter = THREE.NearestFilter;
  texture.generateMipmaps = false;
  texture.needsUpdate = true;
  return texture;
}
