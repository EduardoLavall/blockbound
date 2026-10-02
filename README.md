# Blockfall

Blockfall é um **FPS 3D voxel + Tower Defense + Roguelite** para navegador, usando **HTML, CSS, TypeScript, Vite, Three.js e Rapier**.

O protótipo top-down anterior continua preservado em `legacy/topdown-prototype`.

Plano completo: [docs/3D_FPS_REWRITE_PLAN.md](docs/3D_FPS_REWRITE_PLAN.md)

## Estado atual — Fase 4: Survival + Build

O jogo já possui FPS 3D, voxel engine, mundo procedural finito e agora um loop de preparação defensiva baseado em recursos.

### Loop atual

```text
explorar
  -> minerar segurando LMB
  -> bloco gera drop físico
  -> coletar recurso
  -> gastar em blocos ou receitas defensivas
  -> montar defesa ao redor do Core
```

### Mineração e recursos

Recursos atuais:

- Soil
- Wood
- Stone
- Metal
- Crystal

Blocos têm tempos diferentes de mineração. Recursos mais valiosos, como Metal Ore e Crystal, demoram mais para quebrar.

Ao minerar, o recurso vira um pickup físico que flutua no mundo e é atraído para o jogador quando ele chega perto.

Colocar blocos também consome recursos do inventário.

### Build Mode

Pressione `B` para alternar o Build Mode.

No Build Mode:

| Tecla | Estrutura |
| --- | --- |
| 1 | Wall |
| 2 | Turret |
| 3 | Spike Trap |
| 4 | Gate |

O RMB confirma a construção.

O placement ghost fica:

- verde quando o local é válido e os recursos existem;
- vermelho quando falta recurso, há colisão com terreno/jogador/Core ou outra estrutura.

As estruturas usam receitas diretas de construção, que são o crafting mínimo desta fase.

### Estruturas

**Wall**
- bloqueio físico;
- HP próprio;
- custo de Wood + Stone.

**Turret**
- entidade própria;
- HP;
- collider;
- range já definido no registry para a fase de hordas;
- exige Metal + Crystal.

**Spike Trap**
- entidade defensiva no chão;
- HP;
- preparada para aplicar dano na fase de inimigos.

**Gate**
- collider composto;
- `E` próximo ao Gate abre/fecha;
- o collider da porta acompanha o estado aberto/fechado.

Todas as estruturas possuem:

- custo;
- max HP;
- regra de reparo;
- API de dano pronta para a Issue #7.

Pressione `R` perto de uma estrutura danificada para consumir o recurso de reparo e recuperar HP.

## Core

O Core agora é uma entidade real, não apenas um marcador visual.

- HP inicial: **500**;
- collider próprio;
- visual original;
- HUD de vida;
- API de dano/reparo pronta para as hordas.

## Mundo

- procedural por seed;
- finito;
- configuração atual: **5×5 chunks / 80×80 blocos**;
- planície, floresta e região pedregosa;
- árvores;
- Metal Ore;
- Crystal;
- POIs;
- quatro entradas futuras de horda;
- limite físico do mapa.

A mesma seed pode ser reproduzida com:

```text
?seed=blockfall-demo
```

## Controles

| Controle | Ação |
| --- | --- |
| Mouse | olhar |
| WASD | mover |
| Space | pular |
| Shift | correr |
| Hold LMB | minerar |
| RMB | colocar bloco / construir |
| 1–5 | escolher material |
| B | alternar Build Mode |
| 1–4 no Build Mode | escolher estrutura |
| E | abrir/fechar Gate próximo |
| R | reparar estrutura próxima |
| Esc | liberar Pointer Lock |

## Arquitetura relevante

```text
src/
  building/
    Core.ts
    StructureRegistry.ts
    StructureSystem.ts
    StructureVisuals.ts
  survival/
    Health.ts
    Inventory.ts
    Mining.ts
    ResourceDropSystem.ts
    Resources.ts
  player/
    InteractionMode.ts
    VoxelInteractionController.ts
  ui/
    SurvivalHUD.ts
```

## Vercel é requisito permanente

```text
framework: Vite
install:   npm install
build:     npm run build
output:    dist
```

Toda a lógica nova continua client-side:

- inventário local da run;
- drops renderizados com Three.js;
- Core e estruturas usando Rapier no browser;
- nenhum backend obrigatório;
- nenhum novo runtime server-side.

## Desenvolvimento

Requer Node.js 22.12+.

```bash
npm install
npm run dev
npm run check
```

## Próxima fase

**Issue #7 — hordas + navegação dinâmica**

Próximos sistemas:

- day/night;
- waves;
- spawn director;
- navigation grid;
- flow field;
- breach planner;
- inimigos atacando estruturas/Core;
- Wall alterando rota;
- Gate alterando rota quando abre/fecha;
- Turret adquirindo alvos e atirando;
- Spike Trap aplicando dano.

A regra central continua sendo:

**construir → sobreviver → melhorar → tentar novamente**
