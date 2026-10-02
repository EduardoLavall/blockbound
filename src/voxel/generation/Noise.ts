function hash2(seed: number, x: number, z: number): number {
  let h = seed ^ Math.imul(x, 0x27d4eb2d) ^ Math.imul(z, 0x165667b1);
  h ^= h >>> 15;
  h = Math.imul(h, 0x2c1b3c6d);
  h ^= h >>> 12;
  h = Math.imul(h, 0x297a2d39);
  h ^= h >>> 15;
  return h >>> 0;
}

export function coordinateRandom(seed: number, x: number, z: number, salt = 0): number {
  return hash2((seed + Math.imul(salt, 0x9e3779b1)) >>> 0, x, z) / 0xffffffff;
}

export function coordinateRandom3(
  seed: number,
  x: number,
  y: number,
  z: number,
  salt = 0,
): number {
  const mixed = hash2((seed + Math.imul(y, 0x85ebca6b) + salt) >>> 0, x, z);
  return mixed / 0xffffffff;
}

function smoothstep(t: number): number {
  return t * t * (3 - 2 * t);
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

export function valueNoise2D(seed: number, x: number, z: number): number {
  const x0 = Math.floor(x);
  const z0 = Math.floor(z);
  const tx = smoothstep(x - x0);
  const tz = smoothstep(z - z0);

  const n00 = coordinateRandom(seed, x0, z0) * 2 - 1;
  const n10 = coordinateRandom(seed, x0 + 1, z0) * 2 - 1;
  const n01 = coordinateRandom(seed, x0, z0 + 1) * 2 - 1;
  const n11 = coordinateRandom(seed, x0 + 1, z0 + 1) * 2 - 1;

  return lerp(lerp(n00, n10, tx), lerp(n01, n11, tx), tz);
}

export function fbm2D(
  seed: number,
  x: number,
  z: number,
  octaves = 4,
  lacunarity = 2,
  gain = 0.5,
): number {
  let frequency = 1;
  let amplitude = 1;
  let sum = 0;
  let normalization = 0;

  for (let octave = 0; octave < octaves; octave++) {
    sum += valueNoise2D((seed + octave * 1013) >>> 0, x * frequency, z * frequency) * amplitude;
    normalization += amplitude;
    frequency *= lacunarity;
    amplitude *= gain;
  }

  return normalization > 0 ? sum / normalization : 0;
}
