# Blockfall

Blockfall está sendo reescrito como um **FPS 3D voxel + Tower Defense + Roguelite** para navegador, usando **HTML, CSS, TypeScript, Vite, Three.js e Rapier**.

O protótipo top-down anterior continua preservado em `legacy/topdown-prototype`.

Plano completo: [docs/3D_FPS_REWRITE_PLAN.md](docs/3D_FPS_REWRITE_PLAN.md)

## Estado atual — Fase 0/1

A branch de implementação 3D começa validando a fundação antes da voxel engine:

- renderer WebGL com Three.js;
- câmera FPS com Pointer Lock;
- WASD;
- sprint;
- pulo;
- gravidade;
- colisão e character controller com Rapier;
- autostep e snap-to-ground;
- cenário 3D temporário para testes;
- fixed timestep a 60 Hz;
- crosshair;
- debug overlay com FPS, posição, grounded, draw calls e triângulos;
- testes unitários do fixed-step clock;
- CI executando testes + typecheck + build;
- configuração explícita para deploy estático na Vercel.

### Controles atuais

| Controle | Ação |
| --- | --- |
| Mouse | olhar |
| WASD | mover |
| Space | pular |
| Shift | correr |
| Esc | liberar Pointer Lock |

O cenário atual **não é o mapa final**. Os cubos existem somente para testar movimentação e colisão antes da Issue #4, onde começa a voxel engine.

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

Build de produção:

```bash
npm run build
npm run preview
```

## Vercel é requisito

Blockfall é desenvolvido para continuar compatível com **Vercel** durante toda a implementação.

A aplicação é client-side e o build de produção é estático:

```text
framework: Vite
install:   npm install
build:     npm run build
output:    dist
```

Essas definições também estão versionadas em `vercel.json`.

Regras do projeto relacionadas à Vercel:

- nenhum servidor Node é obrigatório para iniciar o jogo;
- código de gameplay precisa executar no browser;
- assets devem ser empacotáveis/servíveis pelo Vite;
- workers futuros devem usar URLs compatíveis com Vite;
- Rapier usa `@dimforge/rapier3d-compat`, que embute o WASM no JavaScript para reduzir problemas de bundling/deploy;
- `npm run build` deve permanecer verde antes de mergear;
- branches podem ser usadas como Preview Deployments quando o repo estiver ligado a um projeto Vercel.

## Estrutura atual

```text
src/
  app/
    GameApp.ts
    bootstrap.ts
  core/
    FixedStepAccumulator.ts
    GameLoop.ts
    Input.ts
  engine/
    physics/
      PhysicsWorld.ts
    render/
      Renderer3D.ts
  player/
    PlayerController.ts
  ui/
    DebugOverlay.ts
  world/
    createTestArena.ts
  main.ts
  style.css
```

## Próximas fases

1. FPS foundation.
2. Voxel engine com chunks e greedy meshing.
3. Mundo procedural por seed.
4. Mineração e construção.
5. Navegação dinâmica + Tower Defense.
6. Combate.
7. Roguelite.
8. Enemy roster + boss.
9. Vertical slice completo.

A principal regra de design continua sendo:

**construir → sobreviver → melhorar → tentar novamente**
