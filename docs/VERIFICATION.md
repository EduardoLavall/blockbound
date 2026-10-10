# Verificação — Blockbound 0.3.0

## História verificada

O jogador carrega um mundo por seed, entra na expedição, prepara defesas, troca armas, enfrenta ondas, abre inventário ou pausa, e recebe feedback coerente no mundo e no HUD. É um jogo integralmente no cliente: não existem API de gameplay, banco de dados ou credenciais de servidor nesse fluxo.

| Fronteira | Evidência |
| --- | --- |
| HTML → inicialização | Menu só libera entrada depois de física, texturas e 25 chunks; falha de inicialização oferece recarregar. |
| Mundo → GPU | Menu e cenário inspecionados no navegador, incluindo faces diferentes da grama e render noturno. Erro encontrado no shader durante desenvolvimento foi corrigido e o cenário voltou a renderizar. |
| Arte → mundo/UI | Atlas 64×64, mipmaps com bordas, sprites transparentes de inventário/hotbar e materiais de modelos integrados e inspecionados no navegador. Picareta, lâmina e arma têm poses distintas, renderização separada e profundidade correta entre peças. |
| Eventos → áudio | 40 buffers decodificados no navegador (`SFX READY 40`), tiro/troca/passos acionados e pausa testada; nenhum aviso de sound no console. Os 40 Ogg também foram conferidos com decoder e testes de referência. Mix tem testes de cache, mute, limite de vozes e descarte de nós. |
| Entrada → controle | Captura de mouse foi bloqueada pelo navegador integrado; opção de mouse livre foi usada e verificada. Captura normal continua implementada, mas não foi validada manualmente neste ambiente. |
| Controle → inventário | I abre e pausa; botão de fechar retorna ao modo de mouse livre, com HUD restaurado. |
| Ataque → inimigo → HUD | Disparos no navegador eliminaram inimigos, exibiram dano/eliminação e reduziram contador da onda de 11 para 9. |
| Relógio → onda → amanhecer | Testes exercitam as cinco noites, N, retenção de fase, spawn completo, chefe e término após eliminar inimigos. |
| Anoitecer → noite | Regressão percorre a transição a 60 Hz e garante que a iluminação nunca clareia entre as fases. Também cobre limite exato, sobra de frame, N no dia/durante o anoitecer e amanhecer após uma noite curta. |
| Física → jogador | Teste com Rapier real atravessa um degrau de 1 bloco; testes de buffer cobrem salto cedo, salto na borda e rejeição de salto tardio. |
| Mineração → animação/impacto | Preparação, golpe acelerado, contato e recuperação usam a mesma linha de tempo. O contato final coincide com a quebra, preservando duração e upgrades. Regressões cobrem 30/60/144 atualizações por segundo e recuperação após remover o bloco. Lasca/áudio saem da face atingida; fraturas crescem por impacto. Cena controlada com os sistemas reais usada para inspeção visual e prévia. |
| Inventário → recompensas | Testes verificam kit inicial utilizável e preservação de overflow com mochila cheia ou parcialmente cheia. |
| Geração → floresta | Três seeds verificadas com raízes em terreno e separação mínima de 6 células entre canopias. |
| Produção | Verificação dos PNGs, Vitest, TypeScript e build Vite. Há aviso de bundle grande por causa da física embutida. |

O navegador não teve uma run humana completa de cinco noites. A passagem das cinco ondas foi verificada com simulação automatizada em três seeds, quatro torres, duas armadilhas e jogador scriptado. O teste preserva a distinção entre correção funcional e qualidade subjetiva do balanceamento.
