/**
 * Testes do motor e da IA do truco
 * Executar: npm run test:jogo
 */
const assert = require('assert');
const Motor = require('../compartilhado/motor');
const IA = require('../compartilhado/ia');
const Mesa = require('../compartilhado/mesa');

let falhas = 0;
function teste(nome, fn) {
  try {
    fn();
    console.log('✅ ' + nome);
  } catch (e) {
    falhas++;
    console.error('❌ ' + nome + '\n   ' + (e.stack || e));
  }
}

const c = (id) => ({ id, valor: id.slice(0, -1), naipe: id.slice(-1) });

teste('baralho tem 40 cartas únicas', () => {
  const b = Motor.criarBaralho();
  assert.strictEqual(b.length, 40);
  assert.strictEqual(new Set(b.map(x => x.id)).size, 40);
});

teste('manilha é a carta seguinte à vira (cíclica)', () => {
  assert.strictEqual(Motor.manilhaDaVira(c('7o')), 'Q');
  assert.strictEqual(Motor.manilhaDaVira(c('3p')), '4');
  assert.strictEqual(Motor.manilhaDaVira(c('Ke')), 'A');
});

teste('força: zap > copas > espadilha > pica-fumo > 3', () => {
  const m = '5';
  const f = (id) => Motor.forcaCarta(c(id), m);
  assert(f('5p') > f('5c'));
  assert(f('5c') > f('5e'));
  assert(f('5e') > f('5o'));
  assert(f('5o') > f('3p'));
  assert(f('3o') > f('2p'));
  assert(f('A') !== null);
});

teste('vaza empatada entre equipes diferentes', () => {
  const r = Motor.resolverVaza([
    { assento: 0, carta: c('3o') },
    { assento: 1, carta: c('3e') }
  ], '5');
  assert.strictEqual(r.equipe, -1);
});

teste('vaza com carta encoberta perde', () => {
  const r = Motor.resolverVaza([
    { assento: 0, carta: c('3o'), encoberta: true },
    { assento: 1, carta: c('4e') }
  ], '5');
  assert.strictEqual(r.equipe, 1);
});

teste('regras de vencedor da mão', () => {
  const v = Motor.vencedorDaMao;
  assert.strictEqual(v([0, 0]), 0);
  assert.strictEqual(v([0, 1]), undefined);
  assert.strictEqual(v([-1, 1]), 1);
  assert.strictEqual(v([1, -1]), 1);
  assert.strictEqual(v([-1, -1]), undefined);
  assert.strictEqual(v([0, 1, 1]), 1);
  assert.strictEqual(v([0, 1, -1]), 0);
  assert.strictEqual(v([-1, -1, 0]), 0);
  assert.strictEqual(v([-1, -1, -1]), null);
});

teste('truco, aumento e corrida contabilizam corretamente', () => {
  const p = new Motor.Partida({ numJogadores: 2, semente: 7 });
  p.novaMao();
  const a = p.mao.vez;
  const b = 1 - a;
  assert(p.aplicar(a, { tipo: 'trucar' }).ok);
  assert(!p.aplicar(a, { tipo: 'jogar', indice: 0 }).ok, 'não pode jogar com aposta pendente');
  assert(p.aplicar(b, { tipo: 'responder', resposta: 'aumentar' }).ok);
  assert.strictEqual(p.mao.valor, 3);
  assert.strictEqual(p.mao.aposta.valor, 6);
  assert(p.aplicar(a, { tipo: 'responder', resposta: 'correr' }).ok);
  assert.strictEqual(p.placar[p.equipe(b)], 3);
  assert.strictEqual(p.fase, 'fimMao');
});

teste('mesma equipe não pode pedir aumento duas vezes seguidas', () => {
  const p = new Motor.Partida({ numJogadores: 2, semente: 3 });
  p.novaMao();
  const a = p.mao.vez;
  p.aplicar(a, { tipo: 'trucar' });
  p.aplicar(1 - a, { tipo: 'responder', resposta: 'aceitar' });
  assert.strictEqual(p.podeTrucar(a), false);
  assert(p.aplicar(a, { tipo: 'jogar', indice: 0 }).ok);
  assert.strictEqual(p.podeTrucar(1 - a), true);
});

teste('encobrir só a partir da segunda vaza', () => {
  const p = new Motor.Partida({ numJogadores: 2, semente: 11 });
  p.novaMao();
  const a = p.mao.vez;
  assert(!p.aplicar(a, { tipo: 'jogar', indice: 0, encoberta: true }).ok);
});

teste('mão de onze: equipe com 11 decide e vale 3', () => {
  const p = new Motor.Partida({ numJogadores: 4, semente: 5 });
  p.placar = [11, 4];
  p.novaMao();
  assert.strictEqual(p.mao.estado, 'maoDeOnze');
  const v = p.visao(0);
  assert.strictEqual(v.mao.cartasParceiro.length, 3);
  assert.strictEqual(p.visao(1).mao.cartasParceiro, null);
  assert(!p.aplicar(1, { tipo: 'onze', decisao: 'jogar' }).ok);
  assert(p.aplicar(2, { tipo: 'onze', decisao: 'jogar' }).ok);
  assert.strictEqual(p.mao.valor, 3);
  assert.strictEqual(p.podeTrucar(p.mao.vez), false);
});

teste('mão de ferro esconde as próprias cartas', () => {
  const p = new Motor.Partida({ numJogadores: 2, semente: 9 });
  p.placar = [11, 11];
  p.novaMao();
  assert(p.mao.maoDeFerro);
  assert(p.visao(0).mao.minhasCartas.every(x => x === null));
});

teste('visão não vaza cartas dos adversários', () => {
  const p = new Motor.Partida({ numJogadores: 4, semente: 1 });
  p.novaMao();
  const v = JSON.stringify(p.visao(0));
  for (const s of [1, 2, 3]) {
    for (const carta of p.mao.cartas[s]) assert(!v.includes('"' + carta.id + '"'), 'vazou ' + carta.id);
  }
});

function jogarPartidaCompleta(n, semente, dificuldades) {
  const p = new Motor.Partida({ numJogadores: n, semente });
  const al = Motor.criarAleatorio(semente + 1000);
  let passos = 0;
  while (p.fase !== 'fimJogo') {
    if (p.fase !== 'jogando') p.novaMao();
    const quem = p.quemAge();
    assert(quem.length > 0, 'ninguém para agir');
    const s = quem[0];
    const acao = IA.decidir(p.visao(s), { dificuldade: dificuldades[s % 2], aleatorio: al });
    assert(acao, 'IA não decidiu');
    const r = p.aplicar(s, acao);
    assert(r.ok, 'ação inválida da IA: ' + JSON.stringify(acao) + ' ' + r.erro);
    p.coletarEventos();
    assert(++passos < 5000, 'partida não terminou');
  }
  return p;
}

teste('partidas completas 1x1 e 2x2 entre bots terminam corretamente', () => {
  for (let i = 0; i < 30; i++) {
    const p = jogarPartidaCompleta(i % 2 ? 4 : 2, i, ['medio', 'facil']);
    assert(p.placar[p.vencedor] >= 12);
  }
});

teste('IA difícil vence a fácil na maioria das partidas', () => {
  let vitorias = 0;
  const total = 60;
  for (let i = 0; i < total; i++) {
    const troca = i % 2 === 1;
    const p = jogarPartidaCompleta(2, 500 + i, troca ? ['facil', 'dificil'] : ['dificil', 'facil']);
    if ((p.vencedor === 0) !== troca) vitorias++;
  }
  console.log('   difícil x fácil: ' + vitorias + '/' + total);
  assert(vitorias > total * 0.5);
});

teste('mesa com bots joga sozinha até o fim (tempos zerados)', () => {
  // Executa de forma síncrona substituindo setTimeout
  const fila = [];
  const original = global.setTimeout;
  global.setTimeout = (fn) => { fila.push(fn); return fila.length; };
  try {
    const recebidos = [];
    const mesa = new Mesa({
      numJogadores: 4,
      semente: 42,
      jogadores: [0, 1, 2, 3].map(i => ({ nome: 'B' + i, bot: i !== 0 })),
      aoEnviar: (s, pac) => recebidos.push(pac)
    });
    mesa.jogadores[0].substituto = true;
    mesa.iniciar();
    let guarda = 0;
    while (fila.length && guarda++ < 10000) fila.shift()();
    assert.strictEqual(mesa.partida.fase, 'fimJogo');
    assert(recebidos.length > 10);
  } finally {
    global.setTimeout = original;
  }
});

teste('sala: entrada, reconexão, bots e início da partida', () => {
  const Sala = require('../compartilhado/sala');
  const enviados = [];
  const original = global.setTimeout;
  global.setTimeout = () => 0;
  try {
    const sala = new Sala({ codigo: 'ABCD', hostToken: 'h', numJogadores: 4, dificuldade: 'facil', enviar: (t, ev, d) => enviados.push([t, ev, d]) });
    assert(sala.entrar('h', { nome: 'Ana' }).ok);
    assert(sala.entrar('g', { nome: '<b>Beto</b>' }).ok);
    assert.strictEqual(sala.assentos[1].nome, 'bBeto/b');
    assert(!sala.iniciar('g').ok, 'só o anfitrião inicia');
    sala.alterarBot('h', 2, true);
    assert(sala.assentos[2].bot);
    assert(sala.iniciar('h').ok);
    assert(sala.assentos[3].bot, 'lugar vazio vira bot');
    assert(!sala.entrar('novo', {}).ok, 'não entra com a partida em andamento');
    sala.desconectou('g');
    assert.strictEqual(sala.assentos[1].conectado, false);
    assert(sala.entrar('g', {}).ok, 'reconexão');
    assert(enviados.some(([t, ev]) => t === 'g' && ev === 'estado'));
    sala.encerrar();
  } finally {
    global.setTimeout = original;
  }
});

teste('sala: personagens dos bots e foto do jogador enviada uma vez', () => {
  const Sala = require('../compartilhado/sala');
  const Elenco = require('../compartilhado/elenco');
  const enviados = [];
  const sala = new Sala({ codigo: 'FOTO', hostToken: 'h', numJogadores: 4, enviar: (t, ev, d) => enviados.push([t, ev, d]) });
  const foto = 'data:image/jpeg;base64,' + 'A'.repeat(400);
  assert(sala.entrar('h', { nome: 'Ana', avatar: 'foto', foto }).ok);
  assert(sala.entrar('g', { nome: 'Beto', avatar: '😀' }).ok);
  assert.strictEqual(sala.assentos[0].avatar, 'foto');
  assert.strictEqual(sala.assentos[1].avatar, 'p:ze', 'emoji vira personagem padrão');
  sala.alterarBot('h', 2, true);
  assert(Elenco.porId(sala.assentos[2].avatar.slice(2)), 'bot usa personagem do elenco');
  const fotosParaG = enviados.filter(([t, ev]) => t === 'g' && ev === 'foto');
  assert.strictEqual(fotosParaG.length, 1);
  assert.strictEqual(fotosParaG[0][2].assento, 0);
  assert(!Elenco.fotoValida('data:image/jpeg;base64,' + 'A'.repeat(20000)), 'foto grande é recusada');
});

if (falhas) {
  console.error('\n' + falhas + ' teste(s) falharam');
  process.exit(1);
}
console.log('\nTodos os testes passaram');
