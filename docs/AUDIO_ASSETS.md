# Sons — Blockbound 0.4.0

O banco ativo tem 42 gravações Ogg. Originais selecionados dos packs da Kenney:

- [Impact Sounds](https://kenney.nl/assets/impact-sounds): impactos, mineração e passos por superfície.
- [RPG Audio](https://kenney.nl/assets/rpg-audio): lâmina, empunhadura, tecido e madeira.
- [Sci-fi Sounds](https://kenney.nl/assets/sci-fi-sounds): Repeater, alerta de noite e chefe.
- [Interface Sounds](https://kenney.nl/assets/interface-sounds): interface, escolha e pickup.
- [Music Jingles](https://kenney.nl/assets/music-jingles): pequenas vinhetas de resultado.

Esses packs estão publicados sob CC0. As licenças originais estão em `public/audio/LICENSE-*.txt`. Os arquivos selecionados estão em `public/audio/*.ogg`, e o mapa de eventos em `src/engine/audio/SoundBank.ts`.

## Mix e comportamento

`treeFall.ogg` combina `creak2.ogg` (RPG Audio), desacelerado para acompanhar o tombamento, com `cloth2.ogg` em crescendo para a copa. `treeImpact.ogg` mistura `impactWood_heavy_000.ogg`, `impactSoft_heavy_000.ogg` (Impact Sounds, filtrado para reforçar o grave) e uma cauda de `cloth3.ogg` (RPG Audio). Ambos foram mixados com limitação de pico e codificados em Ogg Vorbis; mantêm a licença CC0 dos originais.

- Buffer decodificado uma vez e reutilizado.
- Madeira, pedra, terra, metal e cristal têm impactos próprios.
- Troca de arma, coleta, construção e dano recebido têm feedback sonoro.
- Passos acompanham deslocamento real e superfície, com aterrissagem discreta.
- Variação entre gravações e pequena variação de pitch reduz repetição.
- Pan estéreo para acertos, limite de 24 vozes e compressor evitam excesso na horda.
- Pausa interrompe sons ativos; vinheta de vitória/derrota não é cortada pelo retorno ao menu.
- Volume controla som; o ajuste de efeitos visuais deixa áudio independente.

Os arquivos foram conferidos com decoder Ogg e teste de referências. A percepção final de qualidade e volume continua sendo avaliada dentro de uma partida, pois volume do sistema e equipamento de áudio variam.
