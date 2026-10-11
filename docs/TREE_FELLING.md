# Derrubada de árvores — 0.4.0

Árvores naturais registram os blocos de tronco e copa na geração. A picareta demora 2,16 s para cortar qualquer bloco do tronco sem upgrades: três vezes a dureza de madeira colocada pelo jogador. Bônus de velocidade de mineração continuam aplicados.

O corte remove todos os voxels remanescentes daquela árvore, atualiza chunks, colisores e navegação, e inicia uma queda de 1,45 s na direção oposta ao jogador. Tronco e copa usam texturas, iluminação e sombras. O contato considera a altura do terreno; no impacto, a copa se desfaz em até 90 folhas, o tronco assenta e é convertido em madeira coletável. Cada bloco do tronco rende 1 madeira mais o bônus de coleta capturado no corte. Recompensas que cairiam fora do mapa ficam junto à raiz.

Madeira de construções não pertence ao registro de árvores. Folhas podem ser mineradas isoladamente. A derrubada preserva alterações na copa e árvores vizinhas. Os materiais usam o sistema normal de sprites e respeitam espaço no inventário.

O rangido e o impacto têm gravações distintas, volume atenuado por distância e controle pelo volume do jogo. A pausa interrompe a simulação e os sons ativos. Desativar efeitos visuais retira as partículas sem retirar a queda ou a coleta. O pool de folhas é limitado a 160 partículas simultâneas; cada árvore usa duas malhas instanciadas e libera seus recursos ao terminar.

## Verificação

- Testes cobrem cortes na base, meio e topo, mineração real sem drop duplicado, bônus de coleta, edição de folhas, proteção de construções/vizinhas, pausa, terreno elevado, borda do mapa, encerramento das animações e limite de partículas.
- Testes de geração conferem que troncos e copas registrados correspondem aos voxels de três seeds.
- Testes de áudio conferem as 42 gravações, os dois eventos separados e o mute.
- Prévia visual usa os mesmos sistemas de mineração, chunks, colisores, renderização, áudio, derrubada e drops do jogo em um cenário controlado.

A queda é uma animação de ambiente: não causa dano nem empurra jogadores, inimigos ou construções.
