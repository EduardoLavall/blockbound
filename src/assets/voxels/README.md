# Voxel textures

Source-of-truth pixel assets for the Blockfall terrain renderer.

Every source texture is a real **16×16 PNG**:

| Tile | File | Block |
| ---: | --- | --- |
| 0 | `grass.png` | Grass |
| 1 | `dirt.png` | Dirt |
| 2 | `stone.png` | Stone |
| 3 | `wood.png` | Wood |
| 4 | `crystal.png` | Crystal |
| 5 | `bedrock.png` | Bedrock |
| 6 | `leaves.png` | Leaves |
| 7 | `metal_ore.png` | Metal Ore |

`atlas.png` is the packed 4×2 runtime atlas generated from those eight
source tiles. It is 64×32 pixels.

Renderer rules:

- nearest-neighbor sampling;
- no smoothing;
- no mipmaps;
- half-pixel inset inside each atlas tile;
- greedy geometry remains merged;
- local UVs repeat once per voxel;
- the tile id is carried as a separate vertex attribute.

When a source tile changes, regenerate `atlas.png` using the same tile order.
Do not paint directly into `atlas.png` and leave the source PNG stale.
