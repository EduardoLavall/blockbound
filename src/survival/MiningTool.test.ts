import { describe, expect, it } from "vitest";
import {
  PICKAXE,
  miningSwingCount,
  toolAdjustedMiningDuration,
} from "./MiningTool";

describe("Pickaxe v1", () => {
  it("preserves current mining speed as the explicit base tool", () => {
    expect(PICKAXE.miningPower).toBe(1);
    expect(toolAdjustedMiningDuration(1.45)).toBeCloseTo(1.45);
  });

  it("is clearly an emergency weapon rather than a primary weapon", () => {
    expect(PICKAXE.combatDamage).toBe(10);
    expect(PICKAXE.combatCooldown).toBe(0.55);
    expect(PICKAXE.combatRange).toBe(2.1);
    expect(PICKAXE.combatDamage / PICKAXE.combatCooldown).toBeCloseTo(
      18.1818,
      3,
    );
  });

  it("derives a stable number of mining swings from real duration", () => {
    expect(miningSwingCount(0.2)).toBe(1);
    expect(miningSwingCount(1.05)).toBe(3);
    expect(miningSwingCount(1.75)).toBe(5);
  });
});
