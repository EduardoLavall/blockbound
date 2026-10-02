# Blockfall

Blockfall é um **FPS 3D voxel + Tower Defense + Roguelite** para navegador, usando **HTML, CSS, TypeScript, Vite, Three.js e Rapier**.

O protótipo top-down anterior continua preservado em `legacy/topdown-prototype`.

Plano completo: [docs/3D_FPS_REWRITE_PLAN.md](docs/3D_FPS_REWRITE_PLAN.md)

## Estado atual — Vertical Slice de 5 noites

A primeira run completa já está estruturada:

```text
DAY
  -> explorar
  -> minerar
  -> coletar
  -> construir / reparar
  -> preparar killzones

NIGHT
  -> roster da noite entra pelas bordas
  -> Navigation Grid + Flow Field reagem à base
  -> inimigos contornam / quebram / ignoram defesas conforme o papel
  -> jogador luta com Blade / Repeater
  -> Turrets e Spikes lutam junto
  -> Core e jogador podem morrer

DAWN
  -> noite registrada
  -> 1 de 3 upgrades roguelite
  -> próxima preparação

NIGHT 5
  -> Siege Warden + roster completo
  -> cronômetro não encerra a noite
  -> vitória somente após eliminar a wave inteira
```

## Enemy roster

### Grunt

Baseline da horda.

- segue Flow Field;
- ataca jogador próximo;
- quebra estruturas quando o breach é a melhor rota;
- pressiona o Core.

### Runner

Pressiona caminhos abertos.

- muito rápido;
- pouca vida;
- baixo dano em estruturas;
- quando encontra blocker tenta primeiro um passo lateral sem blocker;
- pune corredores e rotas mal fechadas.

### Brute

Anti-wall.

- muita vida;
- lento;
- dano de estrutura muito maior;
- forte contra Core;
- transforma uma parede resistente em prioridade de combate.

### Archer

Pressão de alcance.

- para antes de entrar em melee quando consegue;
- ataca jogador à distância;
- pode atacar o Core à distância quando entra no range;
- recua se o jogador encurta demais a distância;
- projétil visual inimigo.

### Support

Muda a força do grupo.

- aura de velocidade;
- aura de dano;
- força o jogador a escolher entre limpar DPS direto ou remover o multiplicador da horda;
- visual próprio com aura.

### Burrower

Anti-killzone / anti-blocker.

- atravessa blockers escolhidos pelo Flow Field;
- não precisa destruir a parede antes de continuar;
- dano reduzido contra estrutura porque sua função é bypass;
- pressiona o Core por uma rota diferente da horda normal.

### Siege Warden — Boss

Boss da noite 5.

- 1450 HP base;
- escala visual grande;
- breach extremamente forte;
- aura que fortalece inimigos próximos;
- pulso periódico em área;
- pulso pode atingir jogador, Core e estruturas;
- barra de HP dedicada no HUD.

## Progressão das noites

| Noite | Conteúdo |
| --- | --- |
| 1 | Grunt + Runner |
| 2 | + Brute |
| 3 | + Archer |
| 4 | + Support + Burrower |
| 5 | Siege Warden + roster completo |

Quantidades atuais:

```text
Night 1: 11
Night 2: 15
Night 3: 19
Night 4: 24
Night 5: 28, incluindo o Boss
```

Esses números são balanceamento inicial e podem mudar por playtest.

## Vitória e derrota

A run termina em derrota se:

- jogador chega a 0 HP;
- Core chega a 0 HP.

A run termina em vitória somente quando:

- Night 5 está ativa;
- todos os inimigos previstos já spawnaram;
- Siege Warden foi eliminado;
- nenhum inimigo permanece vivo.

O timer da quinta noite é **segurado em zero** até a wave ser realmente limpa.

## Combate FPS

`Q` alterna:

- Tool;
- Blade;
- Repeater.

Já existe:

- melee;
- projectile combat;
- crit;
- pierce;
- hit marker;
- damage flash;
- Burn;
- Shock;
- Mark;
- player HP;
- player death;
- atribuição de kills.

## Roguelite

Ao sobreviver às noites 1–4:

- simulação pausa;
- Pointer Lock é liberado;
- aparecem exatamente 3 cartas;
- uma carta é escolhida;
- o `RuleEngine` aplica a nova regra;
- a run continua.

Registry atual: **38 upgrades**.

Famílias:

- Player;
- Defense;
- Economy;
- System.

Exemplos:

- Mark → Turret causa mais dano;
- Shock → Spike causa mais dano;
- Burn → interage com defesas;
- kills → cura jogador/Core;
- kills → repara estrutura;
- kills → Metal/Crystal;
- mining speed / yield;
- low-health damage.

## Construção e navegação

Defesas:

- Wall;
- Turret;
- Spike Trap;
- Gate;
- Core.

A navegação usa:

```text
VoxelWorld + Structures
  -> dirty NavigationGrid cells
  -> NavigationGrid revision
  -> shared FlowField
  -> BreachPlanner
  -> EnemySystem
```

Não existe A* individual por inimigo.

Wall/Gate/Turret possuem custos finitos de travessia. A IA pode:

- contornar;
- atacar;
- ou, no caso do Burrower, ignorar o blocker.

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
- POIs;
- quatro zonas de entrada;
- limite físico/visual.

Reproduzir uma run:

```text
?seed=blockfall-demo
```

## Menu / Settings

O overlay de entrada/pausa possui:

- volume;
- effects on/off;
- debug overlay on/off.

As configurações são persistidas em `localStorage`.

## Áudio / FX

O vertical slice usa áudio procedural via Web Audio API:

- início da noite;
- aviso especial da noite final;
- hit/kill;
- abertura do draft;
- escolha de upgrade;
- vitória;
- derrota.

Sem assets externos ou backend.

FX atuais incluem:

- damage flash;
- hit marker;
- bolts do jogador/Archer/Turret;
- boss pulse;
- transição day/night;
- boss HUD;
- auras de Support/Boss.

## Performance

Passes já presentes:

- chunk meshing em workers;
- nenhum Mesh por voxel;
- Flow Field compartilhado;
- cap atual de inimigos vivos por wave;
- geometria base compartilhada entre inimigos;
- materiais cacheados por archetype;
- remoção de entidades inativas ao amanhecer;
- projéteis com lifetime;
- remoção de alocação de `Vector3` no hot loop de recuperação de escala dos inimigos.

## Controles

| Controle | Ação |
| --- | --- |
| Mouse | olhar |
| WASD | mover |
| Space | pular |
| Shift | correr |
| Q | Tool / Blade / Repeater |
| LMB | minerar / atacar |
| RMB | colocar bloco / construir |
| 1–5 | escolher material |
| B | Build Mode |
| 1–4 no Build Mode | escolher estrutura |
| E | abrir/fechar Gate |
| R | reparar estrutura |
| Esc | menu / liberar Pointer Lock |

## Vercel é requisito permanente

```text
framework: Vite
install:   npm install
build:     npm run build
output:    dist
```

Tudo permanece client-side:

- mundo;
- física;
- IA;
- combat;
- waves;
- RuleEngine;
- draft;
- settings;
- áudio Web Audio.

Nenhum servidor Node é necessário para jogar.

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

## Próximo roadmap

Depois do vertical slice:

1. Player Status;
2. Inventário + Equipamento;
3. Game Design — análise crítica de balanceamento;
4. Rapid / Machine Gun Turret;
5. Sniper Turret;
6. Electric / Tesla Turret;
7. Explosive / Mortar Turret;
8. Slow / Cryo Turret;
9. Flamethrower Turret;
10. Progressão e níveis das Torres;
11. Crafting expandido;
12. Shop;
13. Level + Árvore de Talentos;
14. Nível do Cristal/Core;
15. Shaders + tochas + iluminação leve;
16. Juicy Effects / Game Feel.

**Player Status vem primeiro** para centralizar e expor os atributos reais da build. **Inventário + Equipamento vem em seguida** porque itemização altera DPS, sobrevivência e outras métricas que precisam existir antes de um balance pass sério.

A análise crítica de balanceamento acontece então com uma build de jogador mais completa, considerando stats, equipamentos, cartas, economia, defesas, inimigos e Boss em conjunto.

Depois entram as novas torres **uma por vez**, cada uma com função própria: Rapid, Sniper, Tesla, Mortar, Cryo e Flamethrower. Só depois dos seis arquétipos básicos vem o sistema de níveis/especializações das torres.

A iluminação será deliberadamente leve: Core, cristais, tochas e emissives com budget controlado, sem depender de iluminação dinâmica pesada.

Juicy Effects entram depois dessa base visual para melhorar recoil, impacto, partículas, mineração, construção, torres, cartas e Boss sem sacrificar legibilidade ou performance.

A regra central continua:

**construir → sobreviver → melhorar → tentar novamente**
