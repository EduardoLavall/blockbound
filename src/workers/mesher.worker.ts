import { buildGreedyMesh } from "../voxel/mesh/GreedyMesher";
import type { MeshBuildRequest, MeshBuildResponse } from "../voxel/mesh/protocol";

interface WorkerScope {
  onmessage: ((event: MessageEvent<MeshBuildRequest>) => void) | null;
  postMessage(message: MeshBuildResponse, transfer: Transferable[]): void;
}

const workerScope = self as unknown as WorkerScope;

workerScope.onmessage = (event): void => {
  const { id, key, padded } = event.data;
  const mesh = buildGreedyMesh(padded);
  const response: MeshBuildResponse = { id, key, ...mesh };

  workerScope.postMessage(response, [
    response.positions.buffer,
    response.normals.buffer,
    response.uvs.buffer,
    response.indices.buffer,
  ]);
};
