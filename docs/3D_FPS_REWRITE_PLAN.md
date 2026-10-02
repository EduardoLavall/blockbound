# Blockfall — Plano de Rewrite 3D FPS Voxel

> Status: proposta de arquitetura e roadmap.
> Objetivo: substituir o protótipo top-down por um jogo 3D em primeira pessoa, voxel, baseado em runs, combinando survival/building + tower defense + roguelite.

## 1. Visão correta do jogo

Blockfall deve ser percebido em primeira pessoa como:

**Minecraft-like voxel agency + FPS action + Tower Defense spatial strategy + Roguelite buildcraft**

A fantasia central não é “Minecraft com hordas”. É:

> **Eu exploro e transformo um mundo voxel para construir uma fortaleza funcional, depois entro pessoalmente na batalha para defender o que construí, enquanto a run cria uma build diferente a cada noite.**

### Loop macro

```text
DIA
Explorar
  -> minerar/coletar
  -> encontrar POIs/recursos raros
  -> construir/modificar terreno
  -> fabricar equipamento e defesas
  -> preparar rotas e killzones

NOITE
  -> hordas entram no mapa
  -> base altera o caminho dos inimigos
  -> torres/armadilhas trabalham automaticamente
  -> jogador luta em primeira pessoa
  -> inimigos quebram/contornam/adaptam-se às defesas
  -> boss/eventos forçam mudanças de estratégia

FIM DA NOITE
  -> escolha 1 de 3 upgrades roguelite
  -> reparo/recompensas
  -> nova exploração
```

A morte do jogador ou a destruição do Core encerra a run.

---

# 2. Pesquisa dos gêneros e o que Blockfall deve herdar

## 2.1 Voxel sandbox / survival

Minecraft é uma referência importante não por crafting infinito, fome ou dezenas de sistemas paralelos, mas porque seus blocos dão ao jogador **agência espacial**: explorar, quebrar, colocar e remodelar o mundo.

Para Blockfall, herdar:

- visão em primeira pessoa;
- mundo composto por blocos;
- terreno procedural;
- mineração;
- colocação e remoção de blocos;
- recursos com distribuição espacial;
- verticalidade;
- cavernas/POIs posteriormente;
- sensação de “esse mundo pode ser alterado”.

Não copiar como requisito:

- progressão longa de ferramentas;
- fome;
- dezenas de bancadas;
- agricultura;
- redstone equivalente;
- aldeões;
- dimensão paralela;
- árvore enorme de crafting.

Tudo que não reforça **construir / sobreviver / melhorar / tentar novamente** deve ficar fora do MVP.

Referências:
- https://www.minecraft.net/en-us/article/what-minecraft
- https://www.minecraft.net/en-us/about-minecraft

---

## 2.2 FPS

O jogador deve sentir que é uma unidade importante da defesa, e não apenas um cursor que coloca torres.

O FPS precisa de:

- mouse capturado via Pointer Lock;
- câmera responsiva;
- WASD;
- sprint;
- pulo;
- gravidade;
- colisão sólida;
- feedback de dano;
- arma visível em primeira pessoa;
- ataques hitscan/projectile conforme a arma;
- hit feedback;
- recoil/animação simples;
- som posicional posteriormente.

O combate não precisa virar um shooter competitivo.
A prioridade é **legibilidade, peso e sinergia com as defesas**.

Referência técnica:
- Three.js PointerLockControls:
  https://threejs.org/docs/#examples/en/controls/PointerLockControls

---

## 2.3 Tower Defense

Sanctum 2 demonstra diretamente que FPS e tower defense funcionam juntos: um Core é defendido contra hordas enquanto o jogador luta pessoalmente.

O aprendizado mais importante é que as torres não podem ser apenas DPS passivo.

Blockfall deve transformar construção em estratégia espacial:

- muralhas alteram rotas;
- corredores criam killzones;
- altura muda linha de visão;
- portões criam pontos de contenção;
- armadilhas dependem de rota;
- torres precisam de posição;
- inimigos têm prioridades diferentes;
- algumas criaturas quebram estruturas;
- outras ignoram partes da defesa;
- inimigos de alcance punem posições abertas.

Referências:
- Sanctum 2:
  https://store.steampowered.com/app/210770/Sanctum_2/
- Orcs Must Die:
  https://store.steampowered.com/app/102600/Orcs_Must_Die/

### Regra fundamental

Se o formato da base não mudar como a horda luta, a construção falhou.

---

## 2.4 Roguelite

Gunfire Reborn é uma referência útil porque combina FPS com níveis/itens/upgrades que produzem builds diferentes a cada run.

Blockfall deve usar aleatoriedade para criar decisões, não apenas números.

Depois de cada noite:

- apresentar exatamente 3 escolhas;
- upgrades pertencem a categorias/tags;
- escolhas posteriores podem favorecer sinergias já iniciadas;
- deve sempre existir chance de pivot;
- upgrades raros devem transformar regras.

Exemplos bons:

- flechas atravessam inimigos e ativam armadilhas;
- torres elétricas encadeiam por blocos metálicos;
- inimigos queimando explodem ao morrer;
- mineração causa onda de choque;
- estruturas regeneram quando o jogador causa dano;
- tiros em inimigos marcados aumentam temporariamente fire-rate das torres;
- inimigos mortos perto de muralhas viram material de reparo.

Exemplos fracos quando usados sozinhos:

- +5% dano;
- +5% vida;
- +5% velocidade.

Eles podem existir como suporte, mas não devem ser o coração das builds.

Referência:
- Gunfire Reborn:
  https://store.steampowered.com/app/1217060/Gunfire_Reborn/

---

# 3. Decisão técnica

## Stack

```text
HTML
CSS
TypeScript
Vite

Three.js
  -> renderização 3D
  -> câmera
  -> iluminação
  -> materiais
  -> frustum
  -> raycasting auxiliar
  -> áudio 3D futuramente

Rapier.js
  -> character controller
  -> colisão
  -> gravidade
  -> projéteis/rigid bodies quando necessário

Web Workers
  -> worldgen
  -> greedy meshing
  -> rebuild de chunks

Vitest
  -> testes de sistemas sem renderização
```

### Por que Three.js

Blockfall exige muito controle sobre voxels, chunks, meshing, AI e simulação.
Não precisamos de uma engine enorme escondendo esses sistemas.

Three.js deve funcionar como **render layer**, não como arquitetura inteira do jogo.

### Babylon.js foi considerado?

Sim. Babylon.js é uma ótima alternativa e já oferece câmera FPS, colisão, física integrada por plugins, Inspector e suporte forte a WebGPU.

Mesmo assim, para Blockfall a recomendação permanece Three.js porque:

- o voxel engine já será majoritariamente customizado;
- queremos separar simulação/renderização de forma rígida;
- Rapier atende diretamente o character controller e colisão;
- Three.js funciona bem como camada fina sobre BufferGeometry/meshes de chunks;
- o projeto não precisa depender da arquitetura de uma engine completa para UI, física e gameplay.

Se no futuro a equipe preferir tooling integrado a controle fino, Babylon.js continua sendo uma alternativa tecnicamente válida — mas trocar depois que o voxel engine existir teria custo alto, então a decisão deve ser fechada na Fase 0.

### Por que Rapier

O personagem FPS precisa de:

- colisão robusta;
- move-and-slide;
- degraus;
- slopes;
- gravidade.

Implementar isso manualmente junto com voxel engine seria gastar energia no problema errado.

Referência:
https://rapier.rs/docs/user_guides/javascript/character_controller/

---

# 4. Rewrite: o que fazer com o protótipo atual

## Decisão

**Reescrever o runtime inteiro.**

Não tentar converter Canvas 2D em Three.js gradualmente.

O estado antigo já foi preservado em:

```text
legacy/topdown-prototype
```

Portanto a implementação 3D pode substituir:

```text
src/game/game.ts
src/game/renderer.ts
src/game/world.ts
public/sprites/*
index.html atual
```

### O que reaproveitar conceitualmente

- ciclo dia/noite;
- Core;
- upgrade draft;
- categorias de inimigos;
- custos de estruturas;
- ideia de flow field;
- filosofia de design;
- CI;
- nome e identidade Blockfall.

### O que NÃO reaproveitar em código

- renderer 2D;
- tiles 2D;
- colisão 2D;
- coordenadas gx/gy;
- sprites SVG como representação principal;
- pathfinding apenas 2D atual;
- estrutura monolítica atual de Game.

---

# 5. Arquitetura proposta

```text
src/
  app/
    GameApp.ts
    bootstrap.ts

  core/
    GameLoop.ts
    Input.ts
    EventBus.ts
    RNG.ts
    Time.ts
    Config.ts
    math/

  engine/
    render/
      Renderer.ts
      SceneManager.ts
      Lighting.ts
      CameraRig.ts
    physics/
      PhysicsWorld.ts
      CharacterController.ts
    audio/
      AudioSystem.ts

  voxel/
    BlockRegistry.ts
    Chunk.ts
    ChunkStore.ts
    ChunkManager.ts
    VoxelWorld.ts
    VoxelRaycast.ts
    WorldEdit.ts
    mesh/
      GreedyMesher.ts
      MeshWorker.ts
      MeshWorkerPool.ts
    generation/
      TerrainGenerator.ts
      Noise.ts
      BiomeGenerator.ts
      StructureGenerator.ts

  player/
    PlayerController.ts
    PlayerState.ts
    InteractionController.ts
    MiningSystem.ts
    Inventory.ts

  combat/
    WeaponSystem.ts
    DamageSystem.ts
    ProjectileSystem.ts
    StatusEffects.ts

  building/
    BuildSystem.ts
    StructureRegistry.ts
    Wall.ts
    Tower.ts
    Trap.ts
    Gate.ts

  defense/
    Core.ts
    DayNightSystem.ts
    WaveDirector.ts
    SpawnDirector.ts

  ai/
    Enemy.ts
    EnemySystem.ts
    EnemyRegistry.ts
    navigation/
      NavigationGrid.ts
      FlowField.ts
      BreachPlanner.ts
      LocalSteering.ts

  roguelite/
    RunManager.ts
    UpgradeRegistry.ts
    UpgradeDraft.ts
    RuleEngine.ts
    RunStats.ts

  data/
    blocks.ts
    items.ts
    weapons.ts
    structures.ts
    enemies.ts
    upgrades.ts
    waves.ts

  ui/
    HUD.ts
    Crosshair.ts
    Hotbar.ts
    BuildMenu.ts
    UpgradeScreen.ts
    RunSummary.ts

  workers/
    worldgen.worker.ts
    mesher.worker.ts
```

## Regra arquitetural

A simulação não deve depender de Three.js.

Exemplo:

```text
EnemySystem
VoxelWorld
RunManager
UpgradeDraft
WaveDirector
DamageSystem
```

devem ser TypeScript puro.

Three.js apenas lê o estado e desenha.

Isso permite testar balanceamento, pathfinding e geração procedural sem navegador/WebGL.

---

# 6. Mundo voxel

## Chunks

Começar com:

```text
chunk X = 16
chunk Z = 16
altura = configurável
```

Não renderizar um `Mesh` por bloco.

Cada chunk mantém dados compactos:

```ts
Uint16Array
```

representando IDs de blocos.

## Rendering

Pipeline:

```text
Voxel data
  -> identificar faces visíveis
  -> greedy meshing
  -> BufferGeometry
  -> textura atlas
  -> um pequeno número de meshes por chunk
```

Instancing pode ser usado para objetos repetidos que NÃO fazem parte do terreno:

- plantas;
- drops;
- projéteis simples;
- props;
- partículas;
- modelos decorativos.

Three.js documenta InstancedMesh especificamente para reduzir draw calls em grandes quantidades de objetos repetidos.

Referência:
https://threejs.org/docs/#api/en/objects/InstancedMesh

## Web Workers

World generation e rebuild de mesh devem sair da main thread.

Fluxo:

```text
bloco quebrado
  -> Chunk marcado dirty
  -> snapshot do chunk + vizinhos
  -> Worker
  -> greedy mesh
  -> retorna buffers
  -> GPU mesh substituído
```

Chunks vizinhos também ficam dirty quando a alteração toca a borda.

---

# 7. Tamanho do mundo por run

## Decisão de design: procedural, mas finito

O mundo de Blockfall **será procedural por seed, mas não será infinito**.

Essa é uma decisão estrutural do jogo, não apenas uma limitação temporária do MVP. Cada run gera um mapa finito, delimitado e autocontido.

```text
seed da run
  -> gera mapa finito
  -> Core em região planejada do mapa
  -> POIs e recursos distribuídos proceduralmente
  -> zonas/spawn ring de inimigos próximos das bordas
  -> limite visual e jogável por fog/storm/barreira temática
```

O tamanho exato do mapa poderá variar por balanceamento, dificuldade, biome ou tipo de run, mas sempre haverá um limite definido.

Isso é intencional porque favorece:

- exploração com começo, meio e fim;
- densidade controlada de POIs e recursos;
- custo previsível de geração, memória, meshing e física;
- pathfinding e flow fields com limites conhecidos;
- hordas capazes de convergir para o Core;
- planejamento defensivo baseado em geografia legível;
- runs com duração e pacing controláveis;
- melhor compatibilidade de performance com execução no navegador/Vercel.

Blockfall **não tem como objetivo virar um sandbox de exploração infinita**. A geração procedural existe para tornar cada run diferente, não para produzir um mundo sem fim.

---

# 8. World generation

A seed deve definir:

- heightmap;
- biomas;
- árvores;
- pedra/minérios;
- ruínas;
- estruturas raras;
- cavernas posteriormente;
- posições de POIs;
- entradas principais de inimigos.

## MVP

Biomas simples:

- planície;
- floresta;
- pedregoso.

Recursos:

- madeira;
- pedra;
- metal;
- cristal/energia raro.

POIs:

- ruína;
- mina;
- altar;
- cache;
- ninho inimigo.

POIs devem gerar escolhas de risco/recompensa no período diurno.

---

# 9. Player FPS

## Controle inicial

```text
WASD       mover
Mouse      olhar
Space      pular
Shift      sprint
LMB        atacar/minerar
RMB        colocar/interagir
1-9        hotbar
E          inventário/crafting
B          build menu defensivo
Tab        run/build stats
Esc        unlock/pause
```

## Interaction ray

O centro da câmera executa DDA voxel raycast.

Retorna:

```ts
{
  block,
  voxel,
  faceNormal,
  adjacentVoxel,
  distance
}
```

Usado por:

- mineração;
- colocação de bloco;
- interação;
- construção de estruturas.

---

# 10. Construção

Existem duas camadas.

## Voxel blocks

Blocos básicos colocáveis:

- madeira;
- pedra;
- metal.

Funções:

- terreno;
- barricada;
- plataforma;
- corredor;
- cobertura;
- suporte para estruturas.

## Defensive structures

Entidades especiais ancoradas na grade voxel:

- Core;
- torre;
- armadilha;
- portão;
- reparador;
- barricada especializada futuramente.

Torres NÃO precisam ser compostas por voxels.

Isso permite lógica própria, animações e upgrades sem complicar chunk meshing.

---

# 11. Navegação inimiga em mundo editável

Esse é um dos sistemas centrais do projeto.

NavMesh tradicional é ruim para um mundo que o jogador destrói e reconstrói o tempo inteiro.

## Estratégia inicial: navigation grid + flow field

Gerar uma representação 2.5D sobre a superfície:

```text
x,z -> walkable y
       slope
       hazard
       blocker
       breakCost
```

O Core gera um flow field.

Cada inimigo consulta o campo e faz steering local.

### Estruturas e blocos

Quando o jogador constrói:

```text
voxel/estrutura mudou
  -> células de navegação dirty
  -> custo atualizado
  -> flow field atualizado
```

## Não proibir bases fechadas

Se não existir caminho livre, inimigos normais devem avaliar um **breach cost**.

Exemplo:

```text
custo para contornar parede = 42
custo estimado para quebrar parede = 18
-> inimigo ataca parede
```

Isso produz comportamento emergente muito melhor do que simplesmente impedir o jogador de fechar a rota.

## Arquétipos

- Runner: prefere caminhos livres e longos a estruturas resistentes.
- Brute: baixo custo de breach; destrói paredes.
- Archer: procura posição com linha de visão.
- Support: acompanha grupos e buffa.
- Burrower: ignora certos blockers.
- Climber futuro: sobe paredes baixas.
- Flying futuro: ignora navegação terrestre.

---

# 12. Tower Defense em primeira pessoa

O jogador precisa poder “ler” a defesa sem visão top-down.

Ferramentas de UX:

- holograma/ghost antes de colocar;
- outline verde/vermelho;
- alcance da torre visível ao construir;
- linhas de rota opcionais no Build Mode;
- marcadores de spawn no horizonte;
- som/sirene de direção da horda;
- health bars apenas quando úteis;
- ícones no mundo para estruturas críticas.

## Build Mode

Ao segurar `B` ou selecionar ferramenta de engenharia:

- cursor ainda é FPS;
- estruturas válidas recebem holograma;
- opcionalmente mostrar caminhos previstos dos inimigos;
- scroll/Q/E gira estrutura;
- RMB coloca;
- LMB cancela/seleciona conforme UX final.

---

# 13. Combate FPS

MVP:

- arma melee;
- arma ranged projectile;
- ferramenta de mineração também pode causar dano.

Não precisamos iniciar com 20 armas.

Primeiros arquétipos:

1. Blade
   - curto alcance;
   - alto burst;
   - sinergia com stagger/crit.

2. Bow / repeater
   - projétil;
   - headshot/weak point posteriormente;
   - sinergia com pierce/burn/chain.

3. Engineer tool
   - baixo dano;
   - repara;
   - upgrades podem transformá-la em arma.

Depois:

- shotgun-like scrap cannon;
- lightning tool;
- explosive launcher.

---

# 14. Roguelite buildcraft

## Quatro famílias principais

### PLAYER
Altera combate/mobilidade.

### DEFENSE
Altera torres, armadilhas, paredes e Core.

### ECONOMY
Altera mineração, drops, crafting e reparo.

### SYSTEM
Cria interações entre jogador, defesa, mundo e inimigos.

A família SYSTEM é a mais importante para identidade própria.

## Tags

```text
fire
shock
crit
projectile
melee
tower
trap
wall
repair
mining
resource
kill
mark
slow
explosion
```

Upgrades reagem a tags em vez de terem dezenas de ifs espalhados.

## RuleEngine

Exemplo:

```text
Player shoots marked enemy
 -> Damage event
 -> RuleEngine
 -> "Marked Target" gives +tower fire rate
 -> "Conductive Arrow" adds shock
 -> enemy dies
 -> "Scrap Harvest" gives material
 -> "Last Spark" chains damage
```

---

# 15. Estrutura de uma run

Primeiro objetivo de conteúdo:

```text
Night 1
Night 2
Night 3
Night 4
Night 5 -> Boss
```

Completar a noite 5 encerra a primeira versão da run com vitória.

Depois podemos expandir para 10 noites.

## Ritmo inicial proposto

Valores configuráveis:

```text
dia:   4–6 min
noite: 2–4 min
upgrade: sem timer
```

Runs iniciais alvo:

```text
~30–40 minutos
```

Esses números só devem ser fechados por playtest.

---

# 16. Conteúdo MVP

## Blocos

- grass
- dirt
- stone
- wood
- leaves
- metal ore
- crystal
- plank/build wood
- refined stone
- metal block

## Estruturas

- Core
- wall/barricade
- basic turret
- spike trap
- gate

## Inimigos

- Grunt
- Runner
- Brute
- Archer
- Support
- Burrower
- Boss 1

## Upgrades

MVP: 30–40.

Quantidade menor, mas com interações reais.

---

# 17. Direção visual

Não copiar texturas de Minecraft.

Identidade proposta:

- voxel/low-poly;
- pixel textures originais;
- blocos com silhuetas mais agressivas;
- tecnologia improvisada;
- fantasia industrial;
- Core luminoso contrastando com natureza;
- noites com cor/fog forte;
- inimigos com shapes legíveis à distância.

Paleta e biome art podem evoluir depois do vertical slice.

## Assets

Primeira versão pode gerar texturas pixel simples proceduralmente/canvas.

Depois substituir por:

- texture atlas original;
- modelos GLTF simples para armas, inimigos e torres.

---

# 18. Performance budget

Alvos de engenharia, não promessas:

- 60 FPS em desktop médio como objetivo;
- simulation fixed timestep;
- render interpolado;
- meshing fora da main thread;
- chunk rebuild incremental;
- texture atlas;
- frustum culling;
- chunks distantes simplificados/ocultos;
- pooled projectiles/particles;
- flow field compartilhado entre inimigos;
- evitar A* individual por inimigo;
- evitar Mesh por voxel.

Métricas visíveis no debug overlay:

- FPS/frame time;
- draw calls;
- triangles;
- chunks loaded;
- mesh queue;
- worker queue;
- enemies alive;
- flow-field rebuild time;
- physics step time.

---

# 19. Roadmap de implementação

## Fase 0 — Reset técnico

Objetivo: preparar o repo para o novo jogo.

- preservar branch legacy;
- remover runtime 2D da nova branch;
- instalar Three.js;
- instalar Rapier;
- configurar Vitest;
- criar arquitetura de pastas;
- criar GameLoop fixed timestep;
- debug overlay básico;
- CI build + tests.

### Aceite

```text
npm run dev
npm run build
npm test
```

funcionando.

---

## Fase 1 — FPS 3D mínimo

- WebGLRenderer;
- Scene;
- PerspectiveCamera;
- PointerLock;
- WASD;
- sprint;
- jump;
- gravity;
- Rapier character controller;
- crosshair;
- flat voxel floor temporário.

### Aceite

O jogador consegue andar, olhar, pular e colidir em primeira pessoa.

---

## Fase 2 — Voxel engine

- Chunk;
- BlockRegistry;
- armazenamento compacto;
- visible-face meshing;
- greedy meshing;
- worker pool;
- chunk remesh;
- DDA raycast;
- quebrar bloco;
- colocar bloco;
- hotbar.

### Aceite

O jogador consegue alterar um mundo voxel 3D e a malha é reconstruída sem Mesh por bloco.

---

## Fase 3 — Procedural world

> O mundo gerado nesta fase é procedural e reproduzível por seed, porém **sempre finito e delimitado por run**.

- seeded noise;
- terrain height;
- biomas iniciais;
- trees/resources;
- ore;
- POIs simples;
- spawn do Core;
- spawn ring da horda.

### Aceite

Duas seeds diferentes produzem mapas diferentes, mas reproduzíveis.

---

## Fase 4 — Survival/build loop

- mining time;
- drops;
- inventory;
- hotbar;
- recipes mínimos;
- defensive build mode;
- wall/tower/trap/gate;
- Core health.

### Aceite

É possível explorar, minerar e montar uma defesa em primeira pessoa.

---

## Fase 5 ✅ implementação base concluída — Tower Defense

- day/night;
- wave director;
- spawn director;
- NavigationGrid;
- FlowField;
- BreachPlanner;
- turret targeting;
- traps;
- structure damage;
- Core defeat.

### Aceite

Construir uma parede muda a rota/decisão dos inimigos.

Esse é o primeiro **Blockfall moment** obrigatório.

---

## Fase 6 — FPS combat

- melee;
- ranged projectile;
- hit feedback;
- damage numbers opcionais;
- enemy attack;
- player death;
- audio placeholders;
- impact FX.

### Aceite

O jogador consegue participar ativamente da mesma batalha que suas torres.

---

## Fase 7 — Roguelite

- RunManager;
- UpgradeRegistry;
- RuleEngine;
- escolha 1/3;
- tags/synergies;
- 30–40 upgrades;
- raridade;
- run summary.

### Aceite

Duas runs podem produzir estilos de jogo claramente diferentes.

---

## Fase 8 — Enemy roster + Boss

Implementar papéis completos:

- Grunt;
- Runner;
- Brute;
- Archer;
- Support;
- Burrower;
- Boss.

### Aceite

Nenhum inimigo existe apenas como “mesmo mob com mais HP”.

---

## Fase 9 — Vertical Slice

Conteúdo:

- 5 noites;
- boss final;
- vitória;
- 3 biomas simples;
- POIs;
- 5 estruturas;
- armas básicas;
- 30–40 upgrades;
- menu;
- settings;
- polish mínimo;
- balance pass.

### Aceite

Uma run completa pode ser jogada do começo ao boss sem ferramentas de debug.

---

## Fase 10 — Player Status

Objetivo: criar uma fonte única e legível para os atributos atuais do jogador.

- modelo de status do jogador;
- HP / max HP;
- dano melee;
- dano ranged;
- crit chance / crit multiplier;
- velocidade/mobilidade;
- redução de dano;
- mining speed;
- modificadores vindos de upgrades e equipamentos;
- painel de status para visualizar valores finais da run;
- separar claramente base stats, bônus temporários e bônus permanentes da run.

### Aceite

O jogo consegue explicar em uma única tela quais são os atributos atuais do jogador e de onde os principais modificadores vêm.

---

## Fase 11 — Inventário + Equipamento

Objetivo: separar recursos de construção de itens/equipamentos utilizáveis.

- inventário de itens;
- stack/quantidade quando aplicável;
- slots de equipamento;
- armas equipáveis;
- peças/acessórios de equipamento;
- atributos de item;
- integração com Player Status;
- pickup/equip de loot;
- comparação simples entre item equipado e item selecionado.

### Aceite

O jogador consegue obter um item, guardá-lo, equipá-lo e ver seus atributos refletidos no Player Status.

---

## Fase 12 — Crafting expandido

Objetivo: evoluir as receitas diretas atuais para fabricação de itens/equipamentos sem criar uma árvore gigante de crafting.

- receitas de recursos refinados;
- componentes;
- armas/equipamentos selecionados;
- upgrades de equipamento;
- custos legíveis;
- integração com inventário;
- crafting continua subordinado ao loop construir / sobreviver / melhorar.

### Aceite

O jogador consegue transformar recursos coletados em itens/equipamentos úteis para a próxima noite.

---

## Fase 13 — Shop

Objetivo: criar uma segunda rota de decisão econômica além do crafting.

- loja entre períodos seguros;
- pool controlado de itens;
- compra de equipamento/consumíveis/recursos especiais;
- preços escaláveis;
- integração com a economia da run;
- loja não deve substituir exploração/mineração;
- reroll/refresh somente se acrescentar decisão real.

### Aceite

Duas runs com recursos semelhantes podem tomar decisões econômicas diferentes entre comprar, craftar ou investir na defesa.

---

## Fase 14 — Level do jogador + Árvore de Talentos

Objetivo: adicionar progressão estruturada do jogador sem substituir os upgrades roguelite da run.

- XP;
- player level;
- pontos de talento;
- árvore de talentos;
- talentos com identidade clara;
- integração com Player Status;
- separar progressão de level dos upgrades aleatórios da run;
- evitar talentos que sejam apenas duplicatas das cartas roguelite.

### Aceite

Level/talentos criam uma camada de progressão previsível enquanto as escolhas roguelite continuam sendo a camada variável de cada run.

---

## Fase 15 — Nível do Cristal / Core

Objetivo: transformar o cristal/Core em uma progressão própria da defesa.

- Crystal/Core level;
- requisitos/custos de upgrade;
- HP/defesa do Core;
- desbloqueios ligados ao nível do cristal;
- interação com torres/estruturas quando fizer sentido;
- feedback visual do nível;
- decisões de investimento concorrendo com equipamento, crafting e shop.

### Aceite

Subir o nível do cristal altera de forma perceptível a capacidade defensiva da run e cria uma decisão econômica real.

---

# 20. Ordem de prioridade real

```text
1. FPS feel
2. voxel editing
3. mundo procedural
4. construção defensiva
5. inimigo consegue navegar pela construção
6. torre funciona
7. dia/noite + wave
8. combate
9. upgrades roguelite
10. enemy roster + boss
11. vertical slice completo
12. Player Status
13. inventário + equipamento
14. crafting expandido
15. shop
16. level do jogador + árvore de talentos
17. nível do cristal/Core
18. polish e expansão de conteúdo
```

Não construir inventário gigante, crafting complexo ou progressões paralelas antes do core loop estar validado.

A prioridade permanece terminar o **vertical slice** antes de aprofundar itemização, shop e progressões de level.

Se o jogador não puder construir uma fortaleza em 3D e ver a horda reagindo a ela, ainda não temos Blockfall.

---

# 21. Primeira demo que vale mostrar

A primeira demo pública NÃO precisa de roguelite completo.

Ela precisa demonstrar:

1. spawn em mundo voxel;
2. FPS movement;
3. quebrar árvore/pedra;
4. colocar blocos;
5. construir 1 wall + 1 turret;
6. iniciar noite;
7. 20 inimigos atacam o Core;
8. parede altera a rota;
9. turret atira;
10. jogador luta junto;
11. vitória/derrota.

Se isso for divertido, o projeto está vivo.

Depois adicionamos a camada roguelite.

---

# 22. Critérios para não perder a identidade

Antes de implementar qualquer sistema novo, responder:

1. Isso melhora construção?
2. Isso melhora sobrevivência?
3. Isso cria decisões de run?
4. Isso cria interação entre sistemas?

Se a resposta for “não” para todos, provavelmente não entra.

---

# 23. Decisão final

O protótipo top-down cumpriu seu papel de testar o loop, mas a direção correta exige um **rewrite completo do runtime**.

Estratégia:

```text
preservar histórico
-> manter legacy/topdown-prototype
-> criar implementação 3D limpa
-> substituir main apenas após vertical slice mínimo funcionar
```

Não apagar história do Git.

Recomeçar o código é aceitável.
Recomeçar o aprendizado não é.


---

# 24. Novas decisões de roadmap adicionadas em 2026-10-01

Itens novos solicitados e adicionados ao roadmap, sem duplicar sistemas que já estavam planejados:

- **Player Status** → Fase 10;
- **Inventário + Equipamento** → Fase 11;
- **Crafting expandido** → Fase 12;
- **Shop** → Fase 13;
- **Level do jogador + Árvore de Talentos** → Fase 14;
- **Nível do Cristal/Core** → Fase 15.

Não foram adicionados novamente:

- **cartinhas estilo ARAM/Desordem**, porque o draft 1-de-3, raridades, tags e sinergias já fazem parte da Fase 7 — Roguelite;
- **torres**, porque já fazem parte das Fases 4–5 e possuem implementação funcional.

## Ordem escolhida

```text
vertical slice
  -> Player Status
  -> inventário/equipamento
  -> crafting expandido
  -> shop
  -> player level + árvore de talentos
  -> crystal/Core level
```

Motivo:

- Player Status vira a base de leitura dos atributos;
- equipamento depende dessa base para alterar stats;
- crafting precisa de inventário/itemização;
- shop precisa de itens e economia já definidos;
- level/talent tree passa a modificar uma camada de stats estável;
- Crystal/Core level entra depois que economia, shop e progressão do jogador já possuem regras claras.
