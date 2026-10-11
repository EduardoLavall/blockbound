import * as THREE from "three";
import { describe, expect, it } from "vitest";
import { PhysicsWorld } from "../engine/physics/PhysicsWorld";
import { PlayerController } from "./PlayerController";
import { PlayerStatus } from "./PlayerStatus";
import { PlayerVitals } from "../combat/PlayerVitals";
import { RuleEngine } from "../roguelite/RuleEngine";
import type { Input } from "../core/Input";
import type { PlayControls } from "./PlayControls";

describe("Rapier character movement", () => {
  it("walks up a full voxel step without getting stuck", async () => {
    const physics = await PhysicsWorld.create();
    physics.addStaticBox(0, -0.5, 0, 8, 0.5, 8);
    physics.addStaticBox(0, 0.5, -3, 2, 0.5, 1);
    const held = new Set<string>();
    const input = { isDown: (key: string) => held.has(key), consumePressed: () => false } as unknown as Input;
    const camera = new THREE.PerspectiveCamera();
    const controller = new PlayerController(camera, { isLocked: true } as PlayControls, input,
      new PlayerStatus(new RuleEngine(), new PlayerVitals()), physics, { x: 0, y: 1.1, z: 0 });
    for (let i = 0; i < 30; i++) { controller.fixedUpdate(1 / 60); physics.step(1 / 60); controller.syncCamera(); }
    held.add("KeyW");
    for (let i = 0; i < 35; i++) { controller.fixedUpdate(1 / 60); physics.step(1 / 60); controller.syncCamera(); }
    expect(controller.getPosition().z).toBeLessThan(-2.3);
    expect(controller.getPosition().y).toBeGreaterThan(1.8);
    physics.world.free();
  });
});
