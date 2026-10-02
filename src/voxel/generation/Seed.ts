export interface RunSeed {
  text: string;
  value: number;
}

export function hashSeed(text: string): number {
  let hash = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
}

export function createRunSeed(text: string): RunSeed {
  const normalized = text.trim() || "blockfall";
  return { text: normalized, value: hashSeed(normalized) };
}

export function createRandomRunSeed(): RunSeed {
  const values = new Uint32Array(2);
  crypto.getRandomValues(values);
  const text = values[0]!.toString(36) + "-" + values[1]!.toString(36);
  return createRunSeed(text);
}
