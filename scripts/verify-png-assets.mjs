import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { inflateSync } from "node:zlib";

const PNG_SIGNATURE = Buffer.from([
  0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
]);

const assets = [
  ["src/assets/voxels/grass.png", 16, 16],
  ["src/assets/voxels/dirt.png", 16, 16],
  ["src/assets/voxels/stone.png", 16, 16],
  ["src/assets/voxels/wood.png", 16, 16],
  ["src/assets/voxels/crystal.png", 16, 16],
  ["src/assets/voxels/bedrock.png", 16, 16],
  ["src/assets/voxels/leaves.png", 16, 16],
  ["src/assets/voxels/metal_ore.png", 16, 16],
  ["src/assets/voxels/atlas.png", 64, 32],
  ["public/textures/lane-indestructible.png", 128, 128],
];

for (const [relativePath, expectedWidth, expectedHeight] of assets) {
  verifyPng(relativePath, expectedWidth, expectedHeight);
}

console.log(
  `PNG integrity OK: ${assets.length} assets structurally valid and decodable.`,
);

function verifyPng(relativePath, expectedWidth, expectedHeight) {
  const path = resolve(process.cwd(), relativePath);
  const data = readFileSync(path);

  assert(
    data.length >= PNG_SIGNATURE.length &&
      data.subarray(0, PNG_SIGNATURE.length).equals(PNG_SIGNATURE),
    relativePath,
    "invalid PNG signature",
  );

  let offset = PNG_SIGNATURE.length;
  let width = null;
  let height = null;
  let sawIhdr = false;
  let sawIend = false;
  const idat = [];

  while (offset < data.length) {
    assert(
      offset + 12 <= data.length,
      relativePath,
      `truncated chunk header at byte ${offset}`,
    );

    const length = data.readUInt32BE(offset);
    const typeStart = offset + 4;
    const typeEnd = typeStart + 4;
    const payloadStart = typeEnd;
    const payloadEnd = payloadStart + length;
    const crcOffset = payloadEnd;
    const chunkEnd = crcOffset + 4;

    assert(
      chunkEnd <= data.length,
      relativePath,
      `truncated ${data.subarray(typeStart, typeEnd).toString("ascii")} chunk: expected end ${chunkEnd}, file has ${data.length} bytes`,
    );

    const typeBytes = data.subarray(typeStart, typeEnd);
    const type = typeBytes.toString("ascii");
    const payload = data.subarray(payloadStart, payloadEnd);
    const expectedCrc = data.readUInt32BE(crcOffset);
    const actualCrc = crc32Parts(typeBytes, payload);

    assert(
      actualCrc === expectedCrc,
      relativePath,
      `${type} CRC mismatch: expected 0x${expectedCrc.toString(16)}, got 0x${actualCrc.toString(16)}`,
    );

    if (type === "IHDR") {
      assert(!sawIhdr, relativePath, "multiple IHDR chunks");
      assert(length === 13, relativePath, "IHDR must be 13 bytes");
      width = payload.readUInt32BE(0);
      height = payload.readUInt32BE(4);
      sawIhdr = true;
    } else if (type === "IDAT") {
      idat.push(payload);
    } else if (type === "IEND") {
      assert(length === 0, relativePath, "IEND must be empty");
      sawIend = true;
      offset = chunkEnd;
      break;
    }

    offset = chunkEnd;
  }

  assert(sawIhdr, relativePath, "missing IHDR");
  assert(idat.length > 0, relativePath, "missing IDAT");
  assert(sawIend, relativePath, "missing IEND");
  assert(
    offset === data.length,
    relativePath,
    `unexpected trailing/truncated bytes after IEND: parsed ${offset}, file has ${data.length}`,
  );
  assert(
    width === expectedWidth && height === expectedHeight,
    relativePath,
    `expected ${expectedWidth}x${expectedHeight}, got ${width}x${height}`,
  );

  try {
    inflateSync(Buffer.concat(idat));
  } catch (error) {
    throw new Error(
      `[PNG integrity] ${relativePath}: IDAT zlib stream is invalid: ${error instanceof Error ? error.message : String(error)}`,
    );
  }

  console.log(
    `  ✓ ${relativePath} (${width}x${height}, ${data.length} bytes)`,
  );
}

function assert(condition, relativePath, message) {
  if (!condition) {
    throw new Error(`[PNG integrity] ${relativePath}: ${message}`);
  }
}

function crc32Parts(...parts) {
  let crc = 0xffffffff;

  for (const part of parts) {
    for (const byte of part) {
      crc ^= byte;
      for (let bit = 0; bit < 8; bit++) {
        crc = (crc >>> 1) ^ ((crc & 1) ? 0xedb88320 : 0);
      }
    }
  }

  return (crc ^ 0xffffffff) >>> 0;
}
