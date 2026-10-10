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
varying float vVoxelTile;
varying vec3 vVoxelPosition;
varying vec3 vVoxelNormal;`,
      )
      .replace(
        "#include <uv_vertex>",
        `#include <uv_vertex>
vVoxelLocalUv = uv;
vVoxelTile = voxelTile;
vVoxelPosition = (modelMatrix * vec4(position, 1.0)).xyz;
vVoxelNormal = normal;`,
      );

    shader.fragmentShader = shader.fragmentShader
      .replace(
        "#include <map_pars_fragment>",
        `#include <map_pars_fragment>
varying vec2 vVoxelLocalUv;
varying float vVoxelTile;
uniform vec2 voxelAtlasGrid;
uniform float voxelTileInset;
varying vec3 vVoxelPosition;
varying vec3 vVoxelNormal;
float voxelHash(vec3 p) { return fract(sin(dot(p, vec3(127.1, 311.7, 74.7))) * 43758.5453); }
vec2 tileUv(float tile, vec2 localUv) {
  vec2 safe = mix(vec2(voxelTileInset), vec2(1.0-voxelTileInset), localUv);
  return vec2((mod(tile,voxelAtlasGrid.x)+safe.x)/voxelAtlasGrid.x,
    1.0-(floor(tile/voxelAtlasGrid.x)+1.0-safe.y)/voxelAtlasGrid.y);
}`,
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
  vec3 cell = floor(vVoxelPosition - vVoxelNormal * 0.01);
  float variation = voxelHash(cell);
  float side = 1.0-step(0.5, abs(vVoxelNormal.y));
  // Grass has a soil face with an irregular grassy lip, rather than six green faces.
  if (voxelTileIndex < 0.5 && side > 0.5) {
    vec4 dirt = texture2D(map, tileUv(1.0, voxelRepeatedUv));
    float lip = 0.75 + floor(voxelRepeatedUv.x*8.0+variation*3.0)/40.0;
    sampledDiffuseColor = mix(dirt, sampledDiffuseColor, step(lip, fract(vVoxelPosition.y)));
  }
  // End-grain rings distinguish cut wood from bark on vertical faces.
  if (abs(voxelTileIndex-3.0)<0.5 && side<0.5) {
    float rings = step(0.52, fract(length(voxelRepeatedUv-0.5)*8.0));
    sampledDiffuseColor.rgb = mix(vec3(0.43,0.27,0.12), vec3(0.68,0.48,0.25), rings);
  }
  sampledDiffuseColor.rgb *= 0.88 + variation * 0.24;
  // Fine pixel relief and seams keep neighbouring voxels readable inside greedy quads.
  float grit = voxelHash(vec3(floor(voxelRepeatedUv * 16.0), 0.0) + cell);
  sampledDiffuseColor.rgb *= 0.94 + grit * 0.12;
  float seam = step(0.965, max(voxelRepeatedUv.x, voxelRepeatedUv.y));
  if (abs(voxelTileIndex-2.0)<0.5 || abs(voxelTileIndex-5.0)<0.5) sampledDiffuseColor.rgb *= 1.0-seam*0.22;
  #ifdef DECODE_VIDEO_TEXTURE
    sampledDiffuseColor = sRGBTransferEOTF(sampledDiffuseColor);
  #endif
  diffuseColor *= sampledDiffuseColor;
#endif`,
      );
  };

  material.customProgramCacheKey = () =>
    "blockbound-voxel-faces-v2";

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
