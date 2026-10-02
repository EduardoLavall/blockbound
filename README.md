# Blockfall

Blockfall é um **FPS 3D voxel + Tower Defense + Roguelite** para navegador, usando **HTML, CSS, TypeScript, Vite, Three.js e Rapier**.

O protótipo top-down anterior continua preservado em `legacy/topdown-prototype`.

Plano completo: [docs/3D_FPS_REWRITE_PLAN.md](docs/3D_FPS_REWRITE_PLAN.md)

## Estado atual — Fase 2: Voxel Engine

A fundação FPS já evoluiu para um mundo voxel editável:

- câmera FPS com Pointer Lock;
- WASD, sprint, pulo e gravidade;
- character controller e colisão com Rapier;
- chunks `16x16x24`;
- voxels armazenados em `Uint16Array`;
- suporte correto a chunks/coordenadas negativas;
- greedy meshing;
- meshing em pool de Web Workers;
- culling de faces entre chunks por snapshot com borda;
- uma `BufferGeometry` agregada por chunk;
- um collider trimesh agregado por chunk;
- rebuild assíncrono apenas de chunks alterados;
- chunks vizinhos invalidados quando uma edição acontece na borda;
- raycast DDA diretamente no grid voxel;
- highlight do bloco mirado;
- quebrar e colocar blocos;
- hotbar de blocos;
- atlas pixel-art original gerado pelo próprio jogo;
- debug de FPS, posição, draw calls, triângulos, chunks e fila de Workers;
- testes de coordenadas, raycast, invalidação de bordas e greedy meshing.

O terreno atual é **somente um mapa técnico determinístico**. Geração procedural por seed pertence à Issue #5.

## Controles

| Controle | Ação |
| --- | --- |
| Mouse | olhar |
| WASD | mover |
| Space | pular |
| Shift | correr |
| LMB | quebrar bloco |
| RMB | colocar bloco |
| 1–5 | escolher bloco da hotbar |
| Esc | liberar Pointer Lock |

Blocos atuais:

1. Grass
2. Dirt
3. Stone
4. Wood
5. Crystal

O Bedrock existe como camada estrutural e não pode ser destruído.

## Arquitetura voxel

```text
VoxelWorld
  -> Chunk (Uint16Array)
  -> padded snapshot
  -> MeshWorkerPool
  -> mesher.worker.ts
  -> GreedyMesher
  -> positions / normals / UVs / indices
  -> Three.js BufferGeometry
  -> Rapier trimesh collider
```

Ao editar um bloco:

```text
raycast DDA
  -> VoxelWorld.setBlock
  -> marca chunk dirty
  -> marca vizinho se edição estiver na borda
  -> Web Worker remesh
  -> troca BufferGeometry
  -> recria collider do chunk
```

O mundo **não usa um Mesh nem um collider por bloco**.

## Desenvolvimento

Requer Node.js 22.12+.

```bash
npm install
npm run dev
```

Validação completa:

```bash
npm run check
```

Build:

```bash
npm run build
npm run preview
```

## Vercel é requisito permanente

Blockfall precisa continuar deployável na **Vercel** durante todas as fases.

```text
framework: Vite
install:   npm install
build:     npm run build
output:    dist
```

O arquivo `vercel.json` mantém essas definições versionadas.

A voxel engine preserva isso:

- gameplay totalmente client-side;
- nenhum servidor Node necessário;
- Rapier via `@dimforge/rapier3d-compat`;
- Workers carregados com `new URL(..., import.meta.url)`, para o Vite gerar os assets corretos;
- atlas gerado em runtime, sem dependência externa;
- CI executa testes + build de produção antes de merge.

## Estrutura relevante

```text
src/
  app/
  core/
  engine/
    physics/
    render/
  player/
    Hotbar.ts
    PlayerController.ts
    VoxelInteractionController.ts
  voxel/
    blocks.ts
    Chunk.ts
    ChunkSnapshot.ts
    constants.ts
    VoxelRaycast.ts
    VoxelWorld.ts
    mesh/
      GreedyMesher.ts
      MeshWorkerPool.ts
      protocol.ts
    render/
      ChunkManager.ts
      TextureAtlas.ts
  workers/
    mesher.worker.ts
```

## Próxima fase

**Issue #5 — procedural world**

### Decisão de mundo

O mundo será **procedural por seed, mas não infinito**. Cada run terá um mapa finito e delimitado, com tamanho controlado. A proceduralidade existe para variar terreno, biomas, recursos e POIs entre runs — não para criar exploração sem fim.

Próximos sistemas:

- seed reproduzível;
- limites finitos do mapa por run;
- height/noise;
- biomas iniciais;
- árvores;
- recursos/minérios;
- POIs;
- Core perto do centro;
- spawn ring para hordas.

A regra principal continua sendo:

**construir → sobreviver → melhorar → tentar novamente**
