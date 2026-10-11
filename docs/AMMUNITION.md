# Munição física e abastecimento — 0.6.0

O Repeater e os dois tipos de torre usam o item `energy-cells` (Células de energia). O jogador continua começando só com a picareta, sem munição. A fabricação produz 48 células por 1 metal e 1 cristal; células usam o inventário comum e empilham até 128 por slot.

O Repeater consome uma célula do inventário por disparo, inclusive em tiros que erram. O estoque pode estar na hotbar ou na mochila. Sem células, não cria projétil, som de tiro ou animação de ataque; a HUD informa zero e indica fabricação com I. Há uma pequena espera de 0,25 s na tentativa sem munição. Não há carregador separado: a arma usa diretamente a reserva física.

Todas as torres são colocadas vazias. A torre normal comporta 96 células; a rápida, 128. Cada tiro efetivo consome uma célula. Sem alvo válido, com linha de tiro bloqueada ou durante cooldown, não gastam munição. Quando vazias, não atacam. Torres não puxam automaticamente munição da mochila.

Mire numa torre próxima e pressione E para abastecer. A interação exige alcance de 4,5 m, proximidade do jogador e linha de visão livre; outra estrutura ou terreno pode impedir a interação. A transferência usa somente a quantidade disponível e que cabe no depósito, preservando o restante no inventário. Uma torre cheia não consome mais células. E continua acionando portões quando não há uma torre como alvo da interação.

Contadores ficam sobre a geometria real das torres próximas, respeitando visibilidade, obstáculos e a escala da HUD. O alvo exibe a dica de abastecimento. R continua reparando estruturas. Destruir uma torre perde a munição armazenada nela.

## Verificação

- Fabricação em lote é atômica: se todas as 48 células não couberem, não gasta ingredientes nem insere um lote parcial. Mescla e divide stacks sem perda.
- Testes de consumo entre slots, falta de células, cooldown, recarga parcial, depósito cheio, alcance, obstáculos e munição inicial zero nos dois tipos de torre.
- Testes de disparo do Repeater e torres, incluindo retorno ao ataque depois de abastecimento. O cenário de navegação das cinco noites agora modela abastecimento entre ondas dentro da capacidade real.
- Prévia no navegador com inventário/crafting, estruturas, armas, torres, física e HUD reais: três lotes deram 144 células; um tiro deixou 143; abastecimentos de 96 e 47 deixaram a mochila zerada. Após 67 tiros das torres, a rápida ficou vazia e a normal com 76 — conservando as 144 células iniciais entre estoque e tiros.

A quantidade/custo dos lotes e o tempo de abastecimento introduzem uma nova decisão na defesa: reservar munição para o jogador ou distribuí-la às torres. O balanceamento final precisa de partidas humanas; os testes não representam coleta e movimentação humanas.
