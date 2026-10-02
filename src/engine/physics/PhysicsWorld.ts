import RAPIER from "@dimforge/rapier3d-compat";

export class PhysicsWorld {
  readonly world: RAPIER.World;
  private readonly chunkBodies = new Map<string, RAPIER.RigidBody>();

  private constructor() {
    this.world = new RAPIER.World({ x: 0, y: -18, z: 0 });
  }

  static async create(): Promise<PhysicsWorld> {
    await RAPIER.init();
    return new PhysicsWorld();
  }

  step(dt: number): void {
    this.world.timestep = dt;
    this.world.step();
  }

  replaceChunkCollider(
    key: string,
    originX: number,
    originZ: number,
    vertices: Float32Array,
    indices: Uint32Array,
  ): void {
    const previous = this.chunkBodies.get(key);
    if (previous) {
      this.world.removeRigidBody(previous);
      this.chunkBodies.delete(key);
    }

    if (indices.length === 0) return;

    const body = this.world.createRigidBody(
      RAPIER.RigidBodyDesc.fixed().setTranslation(originX, 0, originZ),
    );

    this.world.createCollider(
      RAPIER.ColliderDesc.trimesh(vertices, indices).setFriction(0.85),
      body,
    );

    this.chunkBodies.set(key, body);
  }
}
