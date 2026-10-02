import * as THREE from "three";
import { STRUCTURES, StructureType } from "./StructureRegistry";

function materialFor(type: StructureType, ghost: boolean): THREE.MeshStandardMaterial {
  const color = new THREE.Color(STRUCTURES[type].swatch);
  return new THREE.MeshStandardMaterial({
    color,
    roughness: 0.82,
    metalness:
      type === StructureType.Turret ||
      type === StructureType.RapidTurret
        ? 0.28
        : 0.05,
    transparent: ghost,
    opacity: ghost ? 0.42 : 1,
    depthWrite: !ghost,
  });
}

function addBox(
  group: THREE.Group,
  material: THREE.Material,
  size: [number, number, number],
  position: [number, number, number],
): THREE.Mesh {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(...size), material);
  mesh.position.set(...position);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  group.add(mesh);
  return mesh;
}

export function createStructureVisual(
  type: StructureType,
  ghost = false,
): THREE.Group {
  const group = new THREE.Group();
  group.name = `structure-${type}`;
  const material = materialFor(type, ghost);

  if (type === StructureType.Wall) {
    addBox(group, material, [2, 1.8, 0.42], [0, 0.9, 0]);
    addBox(group, material, [2.12, 0.22, 0.54], [0, 1.86, 0]);
    for (const x of [-0.72, 0, 0.72]) {
      addBox(group, material, [0.12, 1.65, 0.52], [x, 0.86, 0]);
    }
  } else if (type === StructureType.Turret) {
    addBox(group, material, [0.9, 0.28, 0.9], [0, 0.14, 0]);
    addBox(group, material, [0.34, 1.05, 0.34], [0, 0.78, 0]);
    addBox(group, material, [0.72, 0.52, 0.72], [0, 1.43, 0]);
    addBox(group, material, [0.18, 0.18, 0.78], [0, 1.48, -0.62]);
    const crystalMaterial = new THREE.MeshStandardMaterial({
      color: 0x65d9d4,
      emissive: 0x183f42,
      emissiveIntensity: 1.6,
      transparent: ghost,
      opacity: ghost ? 0.5 : 1,
      depthWrite: !ghost,
    });
    addBox(group, crystalMaterial, [0.2, 0.2, 0.2], [0, 1.76, 0]);
  } else if (type === StructureType.RapidTurret) {
    addBox(group, material, [0.92, 0.24, 0.92], [0, 0.12, 0]);
    addBox(group, material, [0.28, 0.72, 0.28], [0, 0.58, 0]);
    addBox(group, material, [0.82, 0.42, 0.68], [0, 1.04, 0]);
    addBox(group, material, [0.16, 0.14, 0.84], [-0.2, 1.08, -0.62]);
    addBox(group, material, [0.16, 0.14, 0.84], [0.2, 1.08, -0.62]);

    const rapidCore = new THREE.MeshStandardMaterial({
      color: 0xffc45e,
      emissive: 0x6a3f0e,
      emissiveIntensity: 1.9,
      roughness: 0.38,
      metalness: 0.12,
      transparent: ghost,
      opacity: ghost ? 0.5 : 1,
      depthWrite: !ghost,
    });
    addBox(group, rapidCore, [0.34, 0.18, 0.16], [0, 1.33, 0.16]);
  } else if (type === StructureType.Spike) {
    addBox(group, material, [1.7, 0.12, 1.7], [0, 0.06, 0]);
    for (const x of [-0.55, 0, 0.55]) {
      for (const z of [-0.55, 0, 0.55]) {
        const spike = new THREE.Mesh(
          new THREE.ConeGeometry(0.12, 0.48, 4),
          material,
        );
        spike.position.set(x, 0.3, z);
        spike.rotation.y = Math.PI / 4;
        spike.castShadow = true;
        group.add(spike);
      }
    }
  } else {
    addBox(group, material, [0.34, 2.4, 0.46], [-0.95, 1.2, 0]);
    addBox(group, material, [0.34, 2.4, 0.46], [0.95, 1.2, 0]);
    addBox(group, material, [2.24, 0.34, 0.46], [0, 2.23, 0]);

    const door = new THREE.Group();
    door.name = "gate-door";
    door.position.set(-0.8, 0, 0);
    door.userData.gateDoor = true;
    group.add(door);

    addBox(door, material, [1.6, 0.14, 0.2], [0.8, 0.2, 0]);
    addBox(door, material, [1.6, 0.14, 0.2], [0.8, 1.35, 0]);
    for (const x of [0.24, 0.8, 1.36]) {
      addBox(door, material, [0.12, 1.28, 0.28], [x, 0.78, 0]);
    }
  }

  group.traverse((object) => {
    object.userData.structureType = type;
  });
  return group;
}

export function setGhostValidity(group: THREE.Group, valid: boolean): void {
  group.traverse((object) => {
    if (!(object instanceof THREE.Mesh)) return;
    const materials = Array.isArray(object.material)
      ? object.material
      : [object.material];
    for (const material of materials) {
      if (!(material instanceof THREE.MeshStandardMaterial)) continue;
      material.color.set(valid ? 0x69d17b : 0xd65a5a);
      material.opacity = 0.42;
      material.transparent = true;
      material.depthWrite = false;
    }
  });
}
