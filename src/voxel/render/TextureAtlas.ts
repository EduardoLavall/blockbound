import * as THREE from "three";
import { VOXEL_ATLAS_URL } from "../../assets/voxels/manifest";
import {
  ATLAS_COLUMNS,
  ATLAS_ROWS,
  ATLAS_TILE_SIZE,
} from "../constants";

const TILE_INSET = 0.5 / ATLAS_TILE_SIZE;

export async function loadVoxelTextureAtlas(): Promise<THREE.Texture> {
  const texture = await new THREE.TextureLoader().loadAsync(
    VOXEL_ATLAS_URL,
  );
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.magFilter = THREE.NearestFilter;
  texture.minFilter = THREE.NearestFilter;
  texture.generateMipmaps = false;
  texture.wrapS = THREE.ClampToEdgeWrapping;
  texture.wrapT = THREE.ClampToEdgeWrapping;
  texture.needsUpdate = true;
  return texture;
}

export function createVoxelMaterial(): THREE.MeshStandardMaterial {
  const material = new THREE.MeshStandardMaterial({
    roughness: 0.92,
    metalness: 0,
  });

  material.onBeforeCompile = (shader) => {
    shader.uniforms.voxelAtlasGrid = {
      value: new THREE.Vector2(ATLAS_COLUMNS, ATLAS_ROWS),
    };
    shader.uniforms.voxelTileInset = {
      value: TILE_INSET,
    };

    shader.vertexShader = shader.vertexShader
      .replace(
        "#include <uv_pars_vertex>",
        `#include <uv_pars_vertex>
attribute float voxelTile;
varying vec2 vVoxelLocalUv;
varying float vVoxelTile;`,
      )
      .replace(
        "#include <uv_vertex>",
        `#include <uv_vertex>
vVoxelLocalUv = uv;
vVoxelTile = voxelTile;`,
      );

    shader.fragmentShader = shader.fragmentShader
      .replace(
        "#include <map_pars_fragment>",
        `#include <map_pars_fragment>
varying vec2 vVoxelLocalUv;
varying float vVoxelTile;
uniform vec2 voxelAtlasGrid;
uniform float voxelTileInset;`,
      )
      .replace(
        "#include <map_fragment>",
        `#ifdef USE_MAP
  float voxelTileIndex = floor(vVoxelTile + 0.5);
  float voxelTileColumn = mod(voxelTileIndex, voxelAtlasGrid.x);
  float voxelTileRow = floor(voxelTileIndex / voxelAtlasGrid.x);

  vec2 voxelRepeatedUv = fract(vVoxelLocalUv);
  vec2 voxelSafeUv = mix(
    vec2(voxelTileInset),
    vec2(1.0 - voxelTileInset),
    voxelRepeatedUv
  );

  vec2 voxelAtlasUv = vec2(
    (voxelTileColumn + voxelSafeUv.x) / voxelAtlasGrid.x,
    1.0 -
      (voxelTileRow + (1.0 - voxelSafeUv.y)) /
      voxelAtlasGrid.y
  );

  vec4 sampledDiffuseColor = texture2D(map, voxelAtlasUv);
  #ifdef DECODE_VIDEO_TEXTURE
    sampledDiffuseColor = sRGBTransferEOTF(sampledDiffuseColor);
  #endif
  diffuseColor *= sampledDiffuseColor;
#endif`,
      );
  };

  material.customProgramCacheKey = () =>
    "blockfall-voxel-tiled-atlas-v1";

  return material;
}

export function atlasUvForLocal(
  tile: number,
  localU: number,
  localV: number,
): { u: number; v: number } {
  const column = tile % ATLAS_COLUMNS;
  const row = Math.floor(tile / ATLAS_COLUMNS);

  const repeatedU = positiveFract(localU);
  const repeatedV = positiveFract(localV);
  const safeU =
    TILE_INSET + repeatedU * (1 - TILE_INSET * 2);
  const safeV =
    TILE_INSET + repeatedV * (1 - TILE_INSET * 2);

  return {
    u: (column + safeU) / ATLAS_COLUMNS,
    v:
      1 -
      (row + (1 - safeV)) /
        ATLAS_ROWS,
  };
}

function positiveFract(value: number): number {
  return value - Math.floor(value);
}
