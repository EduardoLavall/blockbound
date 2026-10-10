# Blockbound — revisão crítica e overhaul 0.3.0

Revisão de 10/10/2026. Base analisada: `fdca10b`, versão 0.2.2.

## Diagnóstico

O projeto já tinha uma base técnica útil: terreno por seed, greedy meshing em workers, física Rapier, Flow Field compartilhado, inventário com equipamento e upgrades. Os 89 testes existentes e o build passavam antes da revisão. Isso não garantia uma experiência boa: faltavam testes de integração para o combate, para o início da partida e para a navegação das ondas.

O maior problema era a relação entre regras, percepção e controle. O jogador começava vazio, precisava aprender muitos atalhos em 45 segundos, não recebia orientação sobre a lane e podia perder a base enquanto estava no menu. Combate através de cobertura e dano instantâneo do arqueiro tornavam erros do jogo parecidos com erros do jogador. A arte tinha pouca diferenciação entre faces, quase nenhum impacto de mineração e problemas reais na geração das árvores.

## Problemas encontrados e mudanças

| Problema confirmado | Onde estava | Mudança em 0.3.0 |
| --- | --- | --- |
| Simulação rodava antes de entrar e com Esc/menu aberto | `app/GameApp.ts` | Uma condição central pausa física, combate, ondas e relógios; blur e aba escondida também pausam. |
| Anoitecer completo voltava a clarear ao entrar na noite | `defense/DayNightSystem.ts` | A fase nova preserva o fator de iluminação da fase anterior. Transição automática, início com N e amanhecer ficam contínuos. |
| Inimigos restantes eram apagados no amanhecer das noites 1–4 | `app/GameApp.ts` | Todas as noites exigem eliminar a onda inteira. Limpar cedo já abre o draft. |
| Começo com zero recursos e 45 segundos | `defense/DayNightSystem.ts`, inicialização | Preparação de 75 segundos, kit inicial e N para chamar a onda. |
| Disparo verificava o voxel só na posição final | `combat/ProjectileSystem.ts` | Colisão no segmento inteiro, cobertura antes do inimigo, perfuração em ordem de distância. |
| Volume de acerto ignorava escala do chefe | `combat/ProjectileSystem.ts` | Caixa de corpo acompanha a escala de cada inimigo. |
| Espada acertava através de terreno | `combat/PlayerCombatSystem.ts` | Visibilidade até o alvo e cobertura por defesas também entram no cálculo. |
| Trocar arma reduzia o cooldown para 0,1 s | `combat/PlayerCombatSystem.ts` | Recuperação anterior é preservada. Segurar o botão repete ataques da lâmina. |
| Arqueiro causava dano antes da chegada do tiro e através de cobertura | `ai/EnemySystem.ts` | Disparo depende de visibilidade, tem tempo de viagem, pode atingir cobertura e pode ser desviado. |
| Torres acertavam através de cobertura; espinhos ignoravam altura | `defense/DefenseCombatSystem.ts` | Torres precisam de linha de visão e espinhos conferem distância vertical. |
| Personagem prendia em degraus de 1 bloco | `player/PlayerController.ts` | Autostep adequado a voxel, buffer de pulo, tolerância nas bordas e interrupção de salto ao tocar teto. |
| Lane visual ficava dentro do chão | `world/WorldLandmarks.ts` | Superfície e origem da horda posicionadas sobre a face superior do voxel. |
| Árvores podiam nascer sobre copas anteriores | `voxel/generation/WorldGenerator.ts` | Raízes só em terreno, copas separadas, corredores livres e distância dos POIs. |
| POIs eram criados depois das árvores e podiam usar copas como altura | `voxel/generation/WorldGenerator.ts` | POIs precedem árvores e suas áreas são reservadas. |
| Lista de recursos duplicava hotbar abaixo do mapa | HUD | Painel lateral removido da apresentação, conforme feedback do usuário. |
| Vida sem hierarquia e ações sem impacto | HUD, áudio, render, mineração | Vitalidade segmentada com rastro de dano, alerta de pouca vida, recoil, muzzle flash, partículas, números de dano, rachaduras e impactos sonoros por swing. |
| Mineração oscilava e saltava para repouso na quebra; efeitos nasciam dentro do voxel | `player/FirstPersonHand.ts`, `player/VoxelInteractionController.ts` | Preparação/golpe/recuperação próprios, contato e som sincronizados, fraturas na face atingida e detritos com queda e pequeno rebote. A recuperação continua após o bloco desaparecer. |
| Captura de mouse podia bloquear a entrada em navegador embutido | controle de entrada | Alternativa explícita de mouse livre: segure o botão do meio para olhar. Retorno do inventário mantém esse modo. |

## Direção de gameplay

O loop agora é **preparar → eliminar a onda → receber suprimentos e escolher uma melhoria → reforçar a defesa**. Há um objetivo legível em cada fase e o minimapa mostra a rota, o cristal, as defesas, o jogador, os inimigos e os pontos de interesse.

O kit tem 12 madeira, 8 pedra, 8 metal e 3 cristal: permite duas torres e duas armadilhas imediatamente. Cada amanhecer entrega 4 madeira, 3 metal, 1 cristal, até 35 HP e até 40 HP do cristal. Suprimentos que não cabem no inventário ficam no mundo, evitando perda silenciosa. Esses valores são uma nova baseline e precisam de partidas humanas para ajuste fino.

| Atributo | Antes | Depois |
| --- | --- | --- |
| DPS esperado da lâmina, com crit base | 73,49 | 108,47 |
| DPS esperado do Repeater, com crit base | 73,24 | 83,00 |
| Velocidade de projétil | 25 m/s | 42 m/s |
| Multiplicador do Brute contra estruturas | 2,4 | 1,8 |
| Multiplicador do Guardião contra o cristal | 1,8 | 1,3 |
| Pulso do Guardião | 18 a cada 5,5 s | 14 a cada 6,5 s, com aviso visual |

A lâmina passa a compensar o risco de curta distância. O Guardião mantém 1450 HP e o roster final completo. A simulação de regressão consegue vencer cinco noites em três seeds usando quatro torres, dois espinhos, recuperação no amanhecer e um jogador scriptado a 80 DPS. Essa simulação não substitui playtest humano, não mede precisão de mira e não prova que qualquer construção funciona.

## Direção visual

- Céu com gradiente, sol, lua e estrelas; neblina e luzes ajustadas por fase.
- Sombras do terreno, luz do cristal, lanternas na rota e pequenos detalhes instanciados no chão.
- Bloom leve nos emissivos, desativável nos ajustes, com resolução limitada.
- Novo pacote original de oito texturas 64×64, quatro materiais de modelos e 16 sprites. Os PNGs antigos 16×16 foram preservados como histórico. O shader mantém variação por voxel, laterais de terra com borda de grama e anéis na madeira cortada. Atlas com bordas e mipmaps reduz cintilação distante. Fontes e prompts: [ART_ASSETS.md](ART_ASSETS.md).
- Mão, picareta, lâmina e Repeater remodelados, com poses independentes, materiais texturizados e renderização separada com luz própria. Isso corrige o antebraço excessivo, o cabo deitado e a sobreposição incorreta das peças.
- HUD reorganizado para deixar o mundo visível; minimapa ao alto, objetivo à esquerda, vida e arma em um módulo próprio, recursos apenas na hotbar.
- Efeitos limitados a 180 partículas e 24 números simultâneos. Recuo é visual e restaura a câmera após renderizar, sem alterar as regras do tiro.
- Áudio substituído por 40 gravações CC0 selecionadas da Kenney, com impactos por material, passos, ações e interface. Variação entre samples, pitch discreto, pan e compressor controlam o mix. [Fontes e implementação](AUDIO_ASSETS.md).

## O que ainda merece trabalho

1. **Peso do download:** o pacote de física compatível embute WASM e o bundle ainda fica em cerca de 5 MB antes de gzip. Separar o WASM e avaliar cache/loading é a próxima melhoria de entrega.
2. **Construção e terreno:** estruturas não são suportadas por física dinâmica; remover terreno debaixo delas ainda pode deixá-las suspensas. A próxima passagem deve definir uma regra consistente para suporte, desmontagem e recuperação de custo.
3. **Mais identidade de inimigos:** silhuetas e animações foram melhoradas, mas continuam simples. Ataques com animações e telegraph próprio por arquétipo são um passo mais valioso que adicionar muitos tipos novos de torre agora.
4. **Áudio ambiente e música:** os efeitos agora são gravações reais; a próxima camada é trilha adaptativa e paisagens sonoras próprias para dia, noite e chefe.
5. **Balanceamento humano:** coletar mortes, tempo até primeira torre, dano ao cristal por noite e escolhas de upgrade. Ajustar kit, economia e pressão final com essas partidas.
6. **Localização:** menu e HUD principal estão em português; nomes de equipamentos, inventário e parte das mensagens do protótipo continuam em inglês.

Não foram feitos merge na main nem publicação de produção nesta revisão. A proposta fica em uma branch própria para revisão e playtest.
