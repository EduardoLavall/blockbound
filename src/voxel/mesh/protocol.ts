export interface MeshBuildRequest {
  id: number;
  key: string;
  padded: Uint16Array;
}

export interface ChunkMeshData {
  positions: Float32Array;
  normals: Float32Array;
  uvs: Float32Array;
  tiles: Float32Array;
  indices: Uint32Array;
  quadCount: number;
}

export interface MeshBuildResponse extends ChunkMeshData {
  id: number;
  key: string;
}
