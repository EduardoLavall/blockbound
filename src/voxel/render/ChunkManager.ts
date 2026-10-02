import * as THREE from "three";
import type { PhysicsWorld } from "../../engine/physics/PhysicsWorld";
import { Chunk } from "../Chunk";
import { buildPaddedChunkSnapshot } from "../ChunkSnapshot";
import { CHUNK_SIZE } from "../constants";
import type { VoxelWorld } from "../VoxelWorld";
import { MeshWorkerPool } from "../mesh/MeshWorkerPool";
import type { MeshBuildResponse } from "../mesh/protocol";
import { createVoxelTextureAtlas } from "./TextureAtlas";

interface ChunkRenderEntry {
  mesh: THREE.Mesh<THREE.BufferGeometry, THREE.MeshStandardMaterial>;
}

export class ChunkManager {
  private readonly entries = new Map<string, ChunkRenderEntry>();
  private readonly dirty = new Set<string>();
  private readonly rebuilding = new Set<string>();
  private readonly workerPool = new MeshWorkerPool();
  private readonly material: THREE.MeshStandardMaterial;

  constructor(
    private readonly world: VoxelWorld,
    private readonly scene: THREE.Scene,
    private readonly physics: PhysicsWorld,
  ) {
    this.material = new THREE.MeshStandardMaterial({
      map: createVoxelTextureAtlas(),
      roughness: 0.92,
      metalness: 0,
    });
  }

  async initialize(): Promise<void> {
    await Promise.all(
      this.world.getChunks().map((chunk) => this.rebuildChunkNow(chunk.key)),
    );
  }

  requestRebuild(keys: readonly string[]): void {
    for (const key of keys) {
      if (!this.world.getChunkByKey(key)) continue;
      this.dirty.add(key);
      void this.processDirtyChunk(key);
    }
  }

  getStats(): {
    chunks: number;
    dirty: number;
    workersBusy: number;
    workersPending: number;
  } {
    return {
      chunks: this.entries.size,
      dirty: this.dirty.size,
      workersBusy: this.workerPool.busyCount,
      workersPending: this.workerPool.pendingCount,
    };
  }

  private async processDirtyChunk(key: string): Promise<void> {
    if (this.rebuilding.has(key)) return;
    this.rebuilding.add(key);

    try {
      while (this.dirty.delete(key)) {
        await this.rebuildChunkNow(key);
      }
    } finally {
      this.rebuilding.delete(key);
    }
  }

  private async rebuildChunkNow(key: string): Promise<void> {
    const chunk = this.world.getChunkByKey(key);
    if (!chunk) return;

    const padded = buildPaddedChunkSnapshot(this.world, chunk);
    const result = await this.workerPool.mesh(key, padded);
    this.applyMesh(chunk, result);
  }

  private applyMesh(chunk: Chunk, result: MeshBuildResponse): void {
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute("position", new THREE.BufferAttribute(result.positions, 3));
    geometry.setAttribute("normal", new THREE.BufferAttribute(result.normals, 3));
    geometry.setAttribute("uv", new THREE.BufferAttribute(result.uvs, 2));
    geometry.setIndex(new THREE.BufferAttribute(result.indices, 1));
    geometry.computeBoundingBox();
    geometry.computeBoundingSphere();

    let entry = this.entries.get(chunk.key);
    if (!entry) {
      const mesh = new THREE.Mesh(geometry, this.material);
      mesh.position.set(chunk.cx * CHUNK_SIZE, 0, chunk.cz * CHUNK_SIZE);
      mesh.receiveShadow = true;
      mesh.castShadow = false;
      this.scene.add(mesh);
      entry = { mesh };
      this.entries.set(chunk.key, entry);
    } else {
      entry.mesh.geometry.dispose();
      entry.mesh.geometry = geometry;
    }

    this.physics.replaceChunkCollider(
      chunk.key,
      chunk.cx * CHUNK_SIZE,
      chunk.cz * CHUNK_SIZE,
      result.positions,
      result.indices,
    );
  }
}
