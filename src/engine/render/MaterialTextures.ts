import * as THREE from "three";
import wood from "../../assets/voxels/wood-v2.png?url";
import leaves from "../../assets/voxels/leaves-v2.png?url";
import stone from "../../assets/voxels/stone-v2.png?url";
import bedrock from "../../assets/voxels/bedrock-v2.png?url";
import steel from "../../assets/art/steel.png?url";
import leather from "../../assets/art/leather.png?url";
import cloth from "../../assets/art/cloth.png?url";
import bone from "../../assets/art/bone.png?url";

const sources = { wood, leaves, stone, bedrock, steel, leather, cloth, bone };
const cache = new Map<string, THREE.Texture>();
export function materialTexture(name: keyof typeof sources): THREE.Texture | null {
  // Simulation tests construct visuals without a browser image loader.
  if (typeof document === "undefined") return null;
  if (cache.has(name)) return cache.get(name)!;
  const texture = new THREE.TextureLoader().load(sources[name]);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.magFilter = THREE.NearestFilter;
  texture.minFilter = THREE.NearestFilter;
  texture.generateMipmaps = false;
  cache.set(name, texture);
  return texture;
}
