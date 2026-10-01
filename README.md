# Blockfall

Blockfall é um jogo browser-based de sobrevivência, construção, roguelike e tower defense feito com **HTML, CSS, TypeScript e Vite**.

## Loop principal

**Explorar → coletar → construir → preparar a defesa → sobreviver à noite → escolher upgrade → repetir**

Cada run possui mapa procedural, posicionamento diferente de recursos, escalada de hordas e upgrades aleatórios.

## Estado atual

O vertical slice jogável já inclui:

- mapa procedural 48x48;
- coleta de madeira, pedra, minério e caches raros;
- construção de muralhas, torres, espinhos e portões;
- núcleo central que precisa sobreviver;
- combate do jogador com espada e arco;
- ciclo completo de dia e noite;
- hordas progressivas;
- sistema de 3 upgrades aleatórios ao fim de cada noite;
- builds de torre, coleta, sobrevivência, crítico, regeneração, armadilhas e sustain;
- pathfinding por campo de custo: construções realmente alteram a rota dos inimigos;
- inimigos com funções diferentes:
  - grunt: atacante padrão;
  - runner: rápido e frágil;
  - brute: causa dano extra em estruturas;
  - archer: pressiona à distância;
  - shaman: fortalece inimigos próximos;
  - burrower: ignora estruturas e força defesa interna;
  - boss: aparece a cada 5 noites e usa onda de impacto em área;
- morte do jogador ou destruição do núcleo encerra a run;
- sprites pixel-art originais em SVG no próprio repositório;
- CI com typecheck e build do Vite.

## Controles

| Controle | Ação |
| --- | --- |
| WASD | mover |
| Mouse | mirar |
| Click esquerdo | atacar ou coletar |
| Click direito | construir |
| 1 | muralha |
| 2 | torre |
| 3 | espinhos |
| 4 | portão |
| Q | alternar espada/arco |
| Esc | sair do modo de construção |

## Desenvolvimento

Requer Node.js 22+.

~~~bash
npm install
npm run dev
~~~

Build de produção:

~~~bash
npm run build
npm run preview
~~~

## Estrutura

~~~text
src/
  main.ts
  style.css
  game/
    content.ts
    game.ts
    renderer.ts
    rng.ts
    types.ts
    world.ts
public/
  sprites/
.github/
  workflows/
    ci.yml
~~~

### Responsabilidades

- `world.ts`: geração procedural e recursos.
- `game.ts`: simulação, combate, construção, hordas, IA, upgrades e estado da run.
- `renderer.ts`: renderização Canvas 2D e sprites.
- `content.ts`: dados balanceáveis de inimigos, construções e upgrades.
- `rng.ts`: RNG determinístico por seed.

## Filosofia

Blockfall não tenta ser Minecraft no navegador. O foco é a interação entre **construção com propósito**, **defesa de base**, **combate ativo** e **escolhas roguelike**.

Todo sistema novo deve reforçar pelo menos um dos quatro pilares:

**construir → sobreviver → melhorar → tentar novamente**
