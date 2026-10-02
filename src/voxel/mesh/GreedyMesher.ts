import { BlockId, blockDefinition } from "../blocks";
import {
  ATLAS_COLUMNS,
  ATLAS_ROWS,
  CHUNK_HEIGHT,
  CHUNK_SIZE,
  PADDED_CHUNK_HEIGHT,
  PADDED_CHUNK_SIZE,
} from "../constants";
import type { ChunkMeshData } from "./protocol";

type Axis = 0 | 1 | 2;

interface FaceDirection {
  axis: Axis;
  sign: -1 | 1;
  uAxis: Axis;
  vAxis: Axis;
}

const DIMS: [number, number, number] = [CHUNK_SIZE, CHUNK_HEIGHT, CHUNK_SIZE];

const DIRECTIONS: readonly FaceDirection[] = [
  { axis: 0, sign: 1, uAxis: 2, vAxis: 1 },
  { axis: 0, sign: -1, uAxis: 2, vAxis: 1 },
  { axis: 1, sign: 1, uAxis: 0, vAxis: 2 },
  { axis: 1, sign: -1, uAxis: 0, vAxis: 2 },
  { axis: 2, sign: 1, uAxis: 0, vAxis: 1 },
  { axis: 2, sign: -1, uAxis: 0, vAxis: 1 },
];

function paddedBlock(data: Uint16Array, x: number, y: number, z: number): number {
  const px = x + 1;
  const py = y + 1;
  const pz = z + 1;
  if (
    px < 0 || px >= PADDED_CHUNK_SIZE ||
    py < 0 || py >= PADDED_CHUNK_HEIGHT ||
    pz < 0 || pz >= PADDED_CHUNK_SIZE
  ) {
    return BlockId.Air;
  }
  return data[px + PADDED_CHUNK_SIZE * (py + PADDED_CHUNK_HEIGHT * pz)] ?? BlockId.Air;
}

function cross(a: number[], b: number[]): [number, number, number] {
  return [
    a[1]! * b[2]! - a[2]! * b[1]!,
    a[2]! * b[0]! - a[0]! * b[2]!,
    a[0]! * b[1]! - a[1]! * b[0]!,
  ];
}

export function buildGreedyMesh(padded: Uint16Array): ChunkMeshData {
  const positions: number[] = [];
  const normals: number[] = [];
  const uvs: number[] = [];
  const indices: number[] = [];
  let quadCount = 0;

  for (const direction of DIRECTIONS) {
    const dimAxis = DIMS[direction.axis];
    const dimU = DIMS[direction.uAxis];
    const dimV = DIMS[direction.vAxis];
    const mask = new Uint16Array(dimU * dimV);

    for (let slice = 0; slice < dimAxis; slice++) {
      mask.fill(0);

      for (let v = 0; v < dimV; v++) {
        for (let u = 0; u < dimU; u++) {
          const coord: [number, number, number] = [0, 0, 0];
          coord[direction.axis] = slice;
          coord[direction.uAxis] = u;
          coord[direction.vAxis] = v;

          const block = paddedBlock(padded, coord[0], coord[1], coord[2]);
          if (block === BlockId.Air) continue;

          const neighbor = [...coord] as [number, number, number];
          neighbor[direction.axis] += direction.sign;
          if (paddedBlock(padded, neighbor[0], neighbor[1], neighbor[2]) !== BlockId.Air) {
            continue;
          }

          mask[u + dimU * v] = block;
        }
      }

      for (let v = 0; v < dimV; v++) {
        for (let u = 0; u < dimU;) {
          const block = mask[u + dimU * v] ?? BlockId.Air;
          if (block === BlockId.Air) {
            u++;
            continue;
          }

          let width = 1;
          while (
            u + width < dimU &&
            mask[u + width + dimU * v] === block
          ) {
            width++;
          }

          let height = 1;
          heightLoop:
          while (v + height < dimV) {
            for (let x = 0; x < width; x++) {
              if (mask[u + x + dimU * (v + height)] !== block) {
                break heightLoop;
              }
            }
            height++;
          }

          emitQuad(
            positions,
            normals,
            uvs,
            indices,
            direction,
            slice,
            u,
            v,
            width,
            height,
            block,
          );
          quadCount++;

          for (let yy = 0; yy < height; yy++) {
            for (let xx = 0; xx < width; xx++) {
              mask[u + xx + dimU * (v + yy)] = BlockId.Air;
            }
          }

          u += width;
        }
      }
    }
  }

  return {
    positions: new Float32Array(positions),
    normals: new Float32Array(normals),
    uvs: new Float32Array(uvs),
    indices: new Uint32Array(indices),
    quadCount,
  };
}

function emitQuad(
  positions: number[],
  normals: number[],
  uvs: number[],
  indices: number[],
  direction: FaceDirection,
  slice: number,
  u: number,
  v: number,
  width: number,
  height: number,
  block: number,
): void {
  const base = [0, 0, 0];
  const du = [0, 0, 0];
  const dv = [0, 0, 0];

  base[direction.axis] = slice + (direction.sign > 0 ? 1 : 0);
  base[direction.uAxis] = u;
  base[direction.vAxis] = v;
  du[direction.uAxis] = width;
  dv[direction.vAxis] = height;

  const corners = [
    base,
    base.map((value, axis) => value + du[axis]!),
    base.map((value, axis) => value + du[axis]! + dv[axis]!),
    base.map((value, axis) => value + dv[axis]!),
  ];

  const vertexStart = positions.length / 3;
  for (const corner of corners) {
    positions.push(corner[0]!, corner[1]!, corner[2]!);
    normals.push(
      direction.axis === 0 ? direction.sign : 0,
      direction.axis === 1 ? direction.sign : 0,
      direction.axis === 2 ? direction.sign : 0,
    );
  }

  const tile = blockDefinition(block).atlasTile;
  const col = tile % ATLAS_COLUMNS;
  const row = Math.floor(tile / ATLAS_COLUMNS);
  const insetU = 0.002 / ATLAS_COLUMNS;
  const insetV = 0.002 / ATLAS_ROWS;
  const u0 = col / ATLAS_COLUMNS + insetU;
  const u1 = (col + 1) / ATLAS_COLUMNS - insetU;
  const v0 = 1 - (row + 1) / ATLAS_ROWS + insetV;
  const v1 = 1 - row / ATLAS_ROWS - insetV;
  uvs.push(u0, v0, u1, v0, u1, v1, u0, v1);

  const faceCross = cross(du, dv);
  const facing =
    faceCross[direction.axis] ?? 0;
  const sameWinding = Math.sign(facing) === direction.sign;

  if (sameWinding) {
    indices.push(
      vertexStart, vertexStart + 1, vertexStart + 2,
      vertexStart, vertexStart + 2, vertexStart + 3,
    );
  } else {
    indices.push(
      vertexStart, vertexStart + 3, vertexStart + 2,
      vertexStart, vertexStart + 2, vertexStart + 1,
    );
  }
}
