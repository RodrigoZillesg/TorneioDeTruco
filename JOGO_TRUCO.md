# 🃏 Jogo de Truco Online

Truco Paulista (com vira e manilha) 100% web, jogável contra a IA ou com amigos em tempo real.

## Como acessar
- Rode o servidor: `npm install` e `npm start`
- Abra `http://localhost:3000/jogo/` (ou pelo botão "Jogar Truco" na tela inicial dos torneios)
- Contra a IA funciona até em hospedagem estática; o modo online precisa do `server.js` (Socket.IO)

## Modos
- **Contra a IA**: 1 x 1 ou 2 x 2 (você + bot parceiro contra 2 bots), dificuldade Fácil, Médio ou Difícil
- **Online**: crie uma sala (1 x 1 ou 2 x 2), compartilhe o código/link (WhatsApp) e os lugares vagos viram bots
  - Quem cair tem 15 s para voltar antes da IA assumir; recarregar a página devolve o lugar
  - Limite de 40 s por jogada (depois a IA joga por você)

## Regras implementadas
- Baralho de 40 cartas, vira e manilhas (♦ Pica-fumo ‹ ♠ Espadilha ‹ ♥ Copas ‹ ♣ Zap)
- Melhor de 3 vazas com as regras de empate ("empachou")
- Truco (3), Seis, Nove e Doze, com aceitar, correr ou aumentar
- Encobrir carta a partir da 2ª vaza
- Mão de onze (vê as cartas do parceiro) e mão de ferro (todos jogam às cegas)
- Partida até 12 pontos

## Efeitos
- Animações de distribuição, cartas em 3D, brilho nas manilhas, fogo no Zap
- "TRUCO!" gigante com tremor de tela, flash e faíscas, crescendo a cada aumento
- Confete e fogos na vitória, moedas nos pontos, balões de fala dos jogadores
- Áudio 100% sintetizado (Web Audio): cartas, embaralhar, metais e tambores do truco, fanfarra
- Música de viola caipira procedural e narração por voz em português (Speech Synthesis)
- Vibração no celular ao pedir truco

## Estrutura
| Arquivo | Função |
|---|---|
| `jogo/compartilhado/motor.js` | Regras do jogo (usado no navegador e no servidor) |
| `jogo/compartilhado/ia.js` | IA com simulações de Monte Carlo (só vê o que um jogador veria) |
| `jogo/compartilhado/mesa.js` | Controle da partida, bots, tempos e falas |
| `jogo/servidor/salas.js` | Salas online no namespace `/truco` do Socket.IO |
| `jogo/js/*.js` | Interface, áudio, efeitos, cartas e conexões |
| `jogo/testes/motor.test.js` | Testes (`npm test`) |
