import * as THREE from "three";
import { describe, expect, it } from "vitest";
import { miningSwingCount } from "../survival/MiningTool";
import { FirstPersonHand } from "./FirstPersonHand";
import type { PlayControls } from "./PlayControls";
import type { Input } from "../core/Input";
import type { PlayerController } from "./PlayerController";
import { PlayerActionMode } from "../combat/CombatTypes";
import { VIEWMODEL_POSES } from "./ViewmodelPose";
import { MINING_CONTACT_PHASE, miningContactsCrossed, miningStrokePhase, miningStrokePose } from "./MiningStroke";

describe("mining strike timing", () => {
  it.each([0.2, 0.38, 0.72, 1.05, 1.45, 1.75])("breaks at the final contact, retaining the %ss mining duration", duration => {
    expect(miningStrokePhase(0, duration)).toBe(0);
    expect(miningStrokePhase(1, duration)).toBe(MINING_CONTACT_PHASE);
    expect(miningContactsCrossed(0, 1 - 1e-5, duration)).toBe(miningSwingCount(duration) - 1);
    expect(miningContactsCrossed(1 - 1e-5, 1, duration)).toBe(1);
  });
  it.each([30, 60, 144])("does not miss or duplicate strikes at %s updates/sec", fps => {
    const duration = 1.45;
    let elapsed = 0, hits = 0;
    while (elapsed < duration) {
      const next = Math.min(duration, elapsed + 1 / fps);
      hits += miningContactsCrossed(elapsed / duration, next / duration, duration);
      elapsed = next;
    }
    expect(hits).toBe(miningSwingCount(duration));
  });
  it("includes a backswing, contact and return instead of an oscillation", () => {
    expect(miningStrokePose(0).position).toEqual([0, 0, 0]);
    expect(miningStrokePose(0.3).position[2]).toBeGreaterThan(0);
    expect(miningStrokePose(MINING_CONTACT_PHASE).position[2]).toBeLessThan(0);
    expect(miningStrokePose(1).position).toEqual([0, 0, 0]);
  });
  it("finishes recovery after the block disappears rather than snapping to idle", () => {
    const camera = new THREE.PerspectiveCamera();
    const controls = new THREE.EventDispatcher() as unknown as PlayControls;
    const input = { isDown: () => false, consumePointerDelta: () => ({ x: 0, y: 0 }) } as unknown as Input;
    const player = { getDebugState: () => ({ grounded: true }) } as unknown as PlayerController;
    const hand = new FirstPersonHand(camera, controls, input, player);
    for (let i = 0; i < 20; i++) hand.update(16);
    hand.setMiningState(true, 1, 1.05); hand.triggerMiningImpact(true);
    hand.setMiningState(false, 0, 0); hand.update(16);
    const root = camera.getObjectByName("first-person-hand")!;
    const idle = VIEWMODEL_POSES[PlayerActionMode.Tool].position;
    expect(root.position.x).toBeLessThan(idle[0] - 0.1);
    for (let i = 0; i < 60; i++) hand.update(16);
    expect(root.position.x).toBeCloseTo(idle[0], 4);
    expect(root.position.y).toBeCloseTo(idle[1], 4);
    expect(root.position.z).toBeCloseTo(idle[2], 4);
  });
});
