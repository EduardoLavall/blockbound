# Blockfall

Blockfall é um **FPS 3D voxel + Tower Defense + Roguelite** para navegador, usando **HTML, CSS, TypeScript, Vite, Three.js e Rapier**.

O protótipo top-down anterior continua preservado em `legacy/topdown-prototype`.

Plano completo: [docs/3D_FPS_REWRITE_PLAN.md](docs/3D_FPS_REWRITE_PLAN.md)

## Estado atual — Fase 5: Hordas + Navegação Dinâmica

O jogo agora possui o primeiro loop de Tower Defense funcional:

```text
DAY
  -> explorar
  -> minerar
  -> coletar
  -> construir defesa

NIGHT
  -> hordas entram pelas bordas
  -> Navigation Grid lê terreno + estruturas
  -> Flow Field aponta para o Core
  -> inimigos contornam ou quebram obstáculos
  -> Turrets atiram
  -> Spike Traps causam dano
  -> estruturas/Core recebem dano
  -> Core destruído = derrota
```

A regra central já está implementada:

> **construir uma base altera o comportamento da horda.**

## Day / Night

Tuning atual:

- dia: **45s**;
- noite: **55s**;
- iluminação/fog mudam gradualmente;
- cada noite aumenta quantidade, HP, velocidade e dano básico da horda;
- quatro zonas de spawn ficam próximas às bordas do mapa finito.

Esses tempos ainda são valores de balanceamento, não regras definitivas.

## Navegação 2.5D

O Blockfall não usa navmesh tradicional para a horda.

A navegação atual é:

```text
VoxelWorld + Structures
  -> NavigationGrid 2.5D
  -> dirty cells após edição
  -> FlowField compartilhado
  -> BreachPlanner
  -> local steering
  -> EnemySystem
```

### Navigation Grid

Cada célula registra:

- altura do chão;
- walkability;
- custo de travessia;
- blocker estrutural;
- hazard como Spike Trap.

Edições de voxels e estruturas invalidam somente a região próxima da alteração.

### Flow Field

Quando o grid muda, o campo de integração é recalculado para o Core e **compartilhado por todos os inimigos**.

Não existe A* separado por inimigo.

Isso é importante para suportar hordas maiores sem multiplicar o custo de pathfinding.

## Breach Planner

Wall, Gate fechado e Turret têm custos de travessia **altos, mas finitos**.

Isso significa que o jogador pode fechar completamente uma base.

A IA compara implicitamente:

```text
custo de contornar
vs
custo de atravessar/quebrar
```

Se o desvio for barato, a horda contorna.

Se quebrar a estrutura for mais barato, o Flow Field direciona o inimigo para o blocker e o `BreachPlanner` transforma aquele passo em um alvo de ataque.

Conforme uma estrutura perde HP, seu custo de breach também diminui e a navegação é recalculada.

Existe teste automatizado provando os dois casos:

- barreira cara → rota contorna;
- barreira barata → rota atravessa/brecha.

## Estruturas defensivas

### Wall

- bloqueia fisicamente;
- altera Navigation Grid;
- HP próprio;
- horda pode contornar ou atacar.

### Gate

- fechado participa do Flow Field como blocker;
- `E` abre/fecha;
- collider acompanha o estado;
- abrir/fechar invalida a navegação imediatamente.

### Turret

- adquire automaticamente o inimigo mais próximo no range;
- dispara bolts visuais;
- aplica dano;
- possui HP/collider;
- também pode ser alvo de breach.

### Spike Trap

- não bloqueia completamente a rota;
- adiciona custo/hazard;
- causa dano periódico em inimigos próximos.

## Inimigos

A primeira horda usa um inimigo básico provisório.

Ele possui:

- HP escalando com a noite;
- velocidade escalando;
- dano contra estrutura/Core;
- attack cooldown;
- movimento pelo Flow Field;
- local steering para reduzir sobreposição;
- ataque de breach contra blockers;
- ataque ao Core ao alcançar a base.

O roster completo de papéis diferentes ainda pertence à fase posterior de conteúdo.

## Derrota

O Core possui **500 HP**.

Quando chega a zero:

- waves param;
- input é bloqueado;
- Pointer Lock é liberado;
- aparece a tela **CORE DESTROYED**;
- a run pode ser reiniciada mantendo a mesma seed pela URL.

## Survival + Build

Recursos atuais:

- Soil
- Wood
- Stone
- Metal
- Crystal

Loop:

```text
segurar LMB
  -> mineração por duração
  -> drop físico
  -> pickup
  -> inventário
  -> blocos / Wall / Turret / Spike / Gate
```

### Build Mode

`B` alterna o modo de construção.

| Tecla | Estrutura |
| --- | --- |
| 1 | Wall |
| 2 | Turret |
| 3 | Spike Trap |
| 4 | Gate |

- RMB confirma;
- ghost verde/vermelho;
- `E` abre/fecha Gate;
- `R` repara estrutura próxima.

## Mundo

O mundo é **procedural por seed, porém finito**.

Configuração atual:

- 5×5 chunks;
- 80×80 blocos;
- planície;
- floresta;
- região pedregosa;
- árvores;
- Metal Ore;
- Crystal;
- ruína;
- altar;
- mina;
- quatro zonas de entrada da horda;
- limite físico/visual da run.

A mesma run pode ser reproduzida com:

```text
?seed=blockfall-demo
```

A proceduralidade existe para variar runs, não para produzir exploração infinita.

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
| B | Build Mode |
| 1–4 no Build Mode | escolher estrutura |
| E | abrir/fechar Gate |
| R | reparar estrutura |
| Esc | liberar Pointer Lock |

## Arquitetura relevante

```text
src/
  ai/
    EnemySystem.ts
    navigation/
      NavigationGrid.ts
      FlowField.ts
      BreachPlanner.ts
  defense/
    DayNightSystem.ts
    SpawnDirector.ts
    WaveDirector.ts
    DefenseCombatSystem.ts
  building/
    Core.ts
    StructureSystem.ts
    StructureRegistry.ts
  survival/
  voxel/
  ui/
    HordeHUD.ts
    SurvivalHUD.ts
```

## Vercel é requisito permanente

```text
framework: Vite
install:   npm install
build:     npm run build
output:    dist
```

A fase de hordas continua totalmente client-side:

- Navigation Grid no browser;
- Flow Field no browser;
- enemy simulation local;
- Three.js para render;
- Rapier para player/estruturas;
- nenhum backend obrigatório;
- nenhum runtime server-side novo.

## Desenvolvimento

Requer Node.js 22.12+.

```bash
npm install
npm run dev
npm run check
```

A CI valida:

- Vitest;
- TypeScript;
- Vite production build.

## Próxima fase

**Issue #8 — combate FPS + roguelite**

Próximos sistemas:

- dano ativo do jogador contra inimigos;
- melee;
- ranged;
- hit feedback;
- status effects;
- player death;
- Upgrade Registry;
- draft 1-of-3;
- tags e sinergias;
- Rule Engine.

A regra central continua sendo:

**construir → sobreviver → melhorar → tentar novamente**
