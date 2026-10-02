# Blockfall

Blockfall é um **FPS 3D voxel + Tower Defense + Roguelite** para navegador, usando **HTML, CSS, TypeScript, Vite, Three.js e Rapier**.

O protótipo top-down anterior continua preservado em `legacy/topdown-prototype`.

Plano completo: [docs/3D_FPS_REWRITE_PLAN.md](docs/3D_FPS_REWRITE_PLAN.md)

## Estado atual — Fase 3: Mundo Procedural Finito

O jogo já possui uma base FPS 3D, voxel engine editável e agora um mundo procedural reproduzível por seed.

### Mundo

- mapa finito de **5×5 chunks / 80×80 blocos** por run nesta primeira configuração;
- seed reproduzível;
- seed persistida na URL com `?seed=...`;
- terreno gerado por noise/fBm;
- planície;
- floresta;
- região pedregosa;
- clareira central preparada para o futuro Core;
- quatro zonas de entrada de horda próximas às bordas;
- três POIs iniciais por run:
  - ruína;
  - altar de cristal;
  - mina;
- árvores com tronco e folhas voxel;
- Metal Ore distribuído no subsolo;
- cristais em POIs;
- barreira visual e física nas bordas;
- nenhuma expansão infinita de chunks.

A proceduralidade existe para produzir **runs diferentes**, não exploração infinita.

### Voxel engine

- chunks `16x16x24`;
- voxels em `Uint16Array`;
- greedy meshing;
- meshing em Web Workers;
- uma `BufferGeometry` agregada por chunk;
- um collider trimesh Rapier por chunk;
- raycast DDA;
- quebrar/colocar blocos;
- hotbar;
- rebuild incremental dos chunks alterados.

## Seed

Sem parâmetro, o jogo gera uma nova seed e a coloca automaticamente na URL.

Exemplo:

```text
https://<deploy-vercel>/?seed=blockfall-demo
```

Reabrir a mesma URL gera o mesmo terreno, biomas, árvores, recursos e POIs.

Isso é importante para:

- reproduzir bugs;
- comparar balanceamento;
- compartilhar runs específicas;
- testar o mesmo mapa entre localhost, Preview Deployment e Production na Vercel.

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

## Limites do mundo

O mundo de Blockfall é **procedural, porém finito**.

A configuração atual usa 80×80 blocos, mas esse tamanho ainda é parâmetro de balanceamento. O importante é que uma run sempre possua limites conhecidos.

Isso permite:

- performance previsível;
- meshing e física limitados;
- pathfinding/flow fields controláveis;
- hordas convergindo para o Core;
- densidade de recursos e POIs balanceável;
- pacing de run previsível.

As bordas atualmente usam uma barreira translúcida com collider físico. A aparência final da tempestade/barreira pode mudar sem alterar a regra de mundo finito.

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

```text
framework: Vite
install:   npm install
build:     npm run build
output:    dist
```

A geração procedural é client-side e não introduz backend.

- nenhuma função server-side necessária;
- seed via query string;
- Rapier via `@dimforge/rapier3d-compat`;
- meshing Workers empacotados pelo Vite;
- mundo gerado localmente no browser;
- output continua estático em `dist/`.

## Estrutura relevante

```text
src/
  voxel/
    generation/
      Biomes.ts
      Noise.ts
      Seed.ts
      SeededRandom.ts
      WorldGenerator.ts
      WorldMetadata.ts
    mesh/
    render/
  world/
    WorldBoundary.ts
    WorldLandmarks.ts
```

## Próxima fase

**Issue #6 — survival/build loop**

Próximos sistemas:

- mineração com tempo/durabilidade;
- drops;
- inventário;
- recursos de verdade;
- crafting mínimo;
- modo de construção defensiva;
- wall;
- turret;
- spike trap;
- gate;
- Core com vida.

A regra principal continua sendo:

**construir → sobreviver → melhorar → tentar novamente**
