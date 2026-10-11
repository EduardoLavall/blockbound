import * as THREE from "three";
import { iconUrl } from "../../ui/ArtIcons";

const textures = new Map<string, THREE.Texture>();
export function createDropSprite(name: string): THREE.Sprite {
  let map = textures.get(name) ?? null;
  if (!map && typeof document !== "undefined") {
    map = new THREE.TextureLoader().load(iconUrl(name));
    map.colorSpace = THREE.SRGBColorSpace;
    map.magFilter = THREE.NearestFilter;
    textures.set(name, map);
  }
  const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map, transparent: true, alphaTest: 0.1,
    depthWrite: false, toneMapped: false }));
  sprite.scale.set(0.48, 0.48, 1);
  return sprite;
}
