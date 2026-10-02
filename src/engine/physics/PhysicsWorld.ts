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

  createStaticBody(
    x: number,
    y: number,
    z: number,
    yaw = 0,
  ): RAPIER.RigidBody {
    const half = yaw / 2;
    return this.world.createRigidBody(
      RAPIER.RigidBodyDesc.fixed()
        .setTranslation(x, y, z)
        .setRotation({
          x: 0,
          y: Math.sin(half),
          z: 0,
          w: Math.cos(half),
        }),
    );
  }

  addBoxCollider(
    body: RAPIER.RigidBody,
    halfX: number,
    halfY: number,
    halfZ: number,
    offsetX = 0,
    offsetY = 0,
    offsetZ = 0,
  ): RAPIER.Collider {
    return this.world.createCollider(
      RAPIER.ColliderDesc.cuboid(halfX, halfY, halfZ)
        .setTranslation(offsetX, offsetY, offsetZ)
        .setFriction(0.8),
      body,
    );
  }

  removeBody(body: RAPIER.RigidBody): void {
    this.world.removeRigidBody(body);
  }

  addStaticBox(
    x: number,
    y: number,
    z: number,
    halfX: number,
    halfY: number,
    halfZ: number,
  ): RAPIER.Collider {
    const body = this.createStaticBody(x, y, z);
    return this.addBoxCollider(body, halfX, halfY, halfZ);
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

    const body = this.createStaticBody(originX, 0, originZ);

    this.world.createCollider(
      RAPIER.ColliderDesc.trimesh(vertices, indices).setFriction(0.85),
      body,
    );

    this.chunkBodies.set(key, body);
  }
}
