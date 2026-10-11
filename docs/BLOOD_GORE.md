# Feedback de sangue e gore — 0.5.0

Os acertos deixaram de usar partículas genéricas azuis/alaranjadas. Sangue vermelho agora sai do ponto atingido: tiros usam a interseção real do projétil, e picareta/lâmina informam contato e direção do golpe. Torres e espinhos também informam direção; dano contínuo tem um efeito menor.

Acertos não letais geram respingos, sem fragmentar o alvo. Na morte, uma explosão maior acompanha dez fragmentos de carne, roupa e ossos no estilo voxel. Fragmentos recebem gravidade, colisão com voxels, amortecimento e repouso no solo. A escala visual acompanha o inimigo, incluindo o chefe. Os números de dano e sons de acerto existentes continuam funcionando.

Gotas deixam manchas irregulares ao colidir com terreno ou paredes. Uma mancha maior aparece na morte. As manchas perdem opacidade no fim de sua duração (16–22 s) e desaparecem se o voxel de apoio for removido. Fragmentos somem em 7–10 s; gotas duram até 2 s. Os efeitos são cosméticos e não alteram dano, colisores de combate, drops, navegação ou progresso das ondas.

`BloodGoreSystem` usa três malhas instanciadas e pools fixos: 256 gotas, 96 fragmentos e 64 manchas. Eventos intensos reutilizam os slots mais antigos. A pausa congela a simulação; desativar efeitos visuais limpa e oculta os três pools, evitando que sangue antigo reapareça ao reativar.

## Verificação

- Ponto e direção do acerto transmitidos por tiros, picareta e lâmina; coordenadas copiadas para não mudar após o evento.
- Morte emitida uma única vez; alvos mortos e dano inválido não geram eventos extras.
- Sangue no impacto não letal, fragmentos somente na morte, colisão com paredes/chão e desaparecimento de manchas sem suporte.
- Pausa, efeitos reduzidos, limpeza, escala do chefe e limites dos pools em uma horda de 120 mortes.
- Prévia no navegador com EnemySystem, ProjectileSystem, chunks, colisores, renderização e áudio reais, inspecionando hit, morte e repouso.
