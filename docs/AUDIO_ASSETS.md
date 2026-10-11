# Sons — Blockbound 0.4.1

O banco ativo tem 49 gravações Ogg. Originais selecionados dos packs da Kenney:

- [Impact Sounds](https://kenney.nl/assets/impact-sounds): impactos, mineração e passos por superfície.
- [RPG Audio](https://kenney.nl/assets/rpg-audio): lâmina, empunhadura, tecido e madeira.
- [Sci-fi Sounds](https://kenney.nl/assets/sci-fi-sounds): Repeater, alerta de noite e chefe.
- [Interface Sounds](https://kenney.nl/assets/interface-sounds): interface, escolha e pickup.
- [Music Jingles](https://kenney.nl/assets/music-jingles): pequenas vinhetas de resultado.

Esses packs estão publicados sob CC0. As licenças originais estão em `public/audio/LICENSE-*.txt`. Os arquivos selecionados estão em `public/audio/*.ogg`, e o mapa de eventos em `src/engine/audio/SoundBank.ts`.

## Mix e comportamento

Cada bloco destrutível tem uma gravação final exclusiva, separada dos golpes de mineração. A ruptura substitui o golpe no último contato; não acumula um impacto genérico sobre ela. O mapa completo e tipado fica em `BLOCK_SOUNDS`. Ar e bedrock não acionam sons de quebra.

| Bloco | Gravação final | Fontes e caráter |
| --- | --- | --- |
| Grama | `breakGrass.ogg` | `footstep_grass_004`, `cloth2`, `impactSoft_medium_001`: vegetação arrancada com terra |
| Terra | `breakDirt.ogg` | `impactSoft_heavy_002`, `footstep_snow_003`: desmoronamento seco e grave |
| Pedra | `breakStone.ogg` | `impactMining_003`, `impactMining_004`: fratura com uma cauda de fragmentos |
| Madeira | `chop.ogg` | RPG Audio: corte seco de madeira |
| Folhas | `breakLeaves.ogg` | `cloth3`, `cloth4`, com filtro de graves: folhagem rasgando e farfalhando |
| Minério | `breakMetal.ogg` | `impactMetal_heavy_001`, `impactTin_medium_002`: ruptura com ressonância metálica |
| Cristal | `impactGlass_heavy_000.ogg` | Impact Sounds: estilhaçamento agudo |

As cinco novas composições são curtas (até 0,85 s), com cauda suavizada e volume normalizado. Fontes `cloth*` são do RPG Audio; demais fontes são do Impact Sounds. Todas mantêm CC0. Golpes nas folhas também usam `cloth3`/`cloth4` em vez de impactos de madeira. Os sons de queda e colisão de árvores continuam separados.

`treeFall.ogg` combina `creak2.ogg` (RPG Audio), desacelerado para acompanhar o tombamento, com `cloth2.ogg` em crescendo para a copa. `treeImpact.ogg` mistura `impactWood_heavy_000.ogg`, `impactSoft_heavy_000.ogg` (Impact Sounds, filtrado para reforçar o grave) e uma cauda de `cloth3.ogg` (RPG Audio). Ambos foram mixados com limitação de pico e codificados em Ogg Vorbis; mantêm a licença CC0 dos originais.

- Buffer decodificado uma vez e reutilizado.
- Os sete blocos destrutíveis têm rupturas próprias; golpes anteriores usam sons por material.
- Troca de arma, coleta, construção e dano recebido têm feedback sonoro.
- Passos acompanham deslocamento real e superfície, com aterrissagem discreta.
- Variação entre gravações e pequena variação de pitch reduz repetição.
- Pan estéreo para acertos, limite de 24 vozes e compressor evitam excesso na horda.
- Pausa interrompe sons ativos; vinheta de vitória/derrota não é cortada pelo retorno ao menu.
- Volume controla som; o ajuste de efeitos visuais deixa áudio independente.

Os arquivos foram conferidos com decoder Ogg e teste de referências. A percepção final de qualidade e volume continua sendo avaliada dentro de uma partida, pois volume do sistema e equipamento de áudio variam.
