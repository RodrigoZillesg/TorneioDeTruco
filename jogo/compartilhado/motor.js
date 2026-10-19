/**
 * Motor do Truco Paulista (com vira e manilhas)
 * Funciona no navegador (window.TrucoMotor) e no Node (require)
 */
(function (raiz, fabrica) {
  if (typeof module === 'object' && module.exports) module.exports = fabrica();
  else raiz.TrucoMotor = fabrica();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  // Ordem de força das cartas comuns (da mais fraca para a mais forte)
  const VALORES = ['4', '5', '6', '7', 'Q', 'J', 'K', 'A', '2', '3'];
  // Ordem de força dos naipes da manilha: ouros (pica-fumo) < espadas (espadilha) < copas < paus (zap)
  const NAIPES = ['o', 'e', 'c', 'p'];
  const SIMBOLOS = { o: '♦', e: '♠', c: '♥', p: '♣' };
  const NOMES_NAIPES = { o: 'Ouros', e: 'Espadas', c: 'Copas', p: 'Paus' };
  const NOMES_MANILHA = { o: 'Pica-fumo', e: 'Espadilha', c: 'Copas', p: 'Zap' };
  const ESCADA_APOSTA = [1, 3, 6, 9, 12];
  const NOMES_APOSTA = { 3: 'TRUCO', 6: 'SEIS', 9: 'NOVE', 12: 'DOZE' };

  // Gerador pseudoaleatório com semente (para testes reproduzíveis)
  function criarAleatorio(semente) {
    if (semente === undefined || semente === null) return Math.random;
    let a = semente >>> 0;
    return function () {
      a |= 0; a = (a + 0x6D2B79F5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function criarBaralho() {
    const cartas = [];
    for (const valor of VALORES) {
      for (const naipe of NAIPES) cartas.push({ id: valor + naipe, valor, naipe });
    }
    return cartas;
  }

  function embaralhar(lista, aleatorio) {
    const a = lista.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(aleatorio() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  function manilhaDaVira(vira) {
    return VALORES[(VALORES.indexOf(vira.valor) + 1) % VALORES.length];
  }

  // Força numérica: 0..9 para cartas comuns, 10..13 para manilhas
  function forcaCarta(carta, manilha) {
    if (!carta) return -1;
    if (carta.valor === manilha) return 10 + NAIPES.indexOf(carta.naipe);
    return VALORES.indexOf(carta.valor);
  }

  function proximaAposta(valor) {
    const i = ESCADA_APOSTA.indexOf(valor);
    return i >= 0 && i < ESCADA_APOSTA.length - 1 ? ESCADA_APOSTA[i + 1] : null;
  }

  // Resolve uma vaza completa: retorna { equipe (0, 1 ou -1 para empate), assento }
  function resolverVaza(jogadas, manilha) {
    let melhor = -2;
    let vencedores = [];
    for (const j of jogadas) {
      const f = j.encoberta ? -1 : forcaCarta(j.carta, manilha);
      if (f > melhor) { melhor = f; vencedores = [j]; }
      else if (f === melhor) vencedores.push(j);
    }
    const equipes = new Set(vencedores.map(j => j.assento % 2));
    return {
      equipe: equipes.size === 1 ? vencedores[0].assento % 2 : -1,
      assento: vencedores[0].assento
    };
  }

  // Decide o vencedor da mão a partir dos resultados das vazas.
  // Retorna undefined (continua), null (ninguém pontua) ou 0/1
  function vencedorDaMao(resultados) {
    if (resultados.length === 2) {
      const [a, b] = resultados;
      if (a === -1 && b !== -1) return b;
      if (a !== -1 && (b === a || b === -1)) return a;
      return undefined;
    }
    if (resultados.length === 3) {
      const [a, b, c] = resultados;
      if (c !== -1) return c;
      if (a !== -1) return a;
      if (b !== -1) return b;
      return null;
    }
    return undefined;
  }

  class Partida {
    /**
     * @param {object} opcoes
     * @param {number} opcoes.numJogadores 2 ou 4
     * @param {Array} opcoes.jogadores [{ nome, avatar }]
     * @param {number} [opcoes.semente]
     */
    constructor(opcoes) {
      this.numJogadores = opcoes.numJogadores === 4 ? 4 : 2;
      this.pontosVitoria = opcoes.pontosVitoria || 12;
      this.aleatorio = criarAleatorio(opcoes.semente);
      this.jogadores = (opcoes.jogadores || []).slice(0, this.numJogadores).map((j, i) => ({
        nome: j.nome || 'Jogador ' + (i + 1),
        avatar: j.avatar || '🙂'
      }));
      while (this.jogadores.length < this.numJogadores) {
        this.jogadores.push({ nome: 'Jogador ' + (this.jogadores.length + 1), avatar: '🙂' });
      }
      this.placar = [0, 0];
      this.distribuidor = Math.floor(this.aleatorio() * this.numJogadores);
      this.numeroMao = 0;
      this.mao = null;
      this.fase = 'aguardando'; // aguardando | jogando | fimMao | fimJogo
      this.vencedor = null;
      this.historico = [];
      this.eventos = [];
    }

    equipe(assento) { return assento % 2; }
    proximo(assento) { return (assento + 1) % this.numJogadores; }

    emitir(evento) { this.eventos.push(evento); }

    coletarEventos() {
      const e = this.eventos;
      this.eventos = [];
      return e;
    }

    novaMao() {
      if (this.fase === 'fimJogo') return false;
      this.numeroMao++;
      if (this.numeroMao > 1) this.distribuidor = this.proximo(this.distribuidor);
      const baralho = embaralhar(criarBaralho(), this.aleatorio);
      const cartas = [];
      for (let s = 0; s < this.numJogadores; s++) cartas.push([]);
      // Distribui 3 cartas para cada jogador, começando pelo da direita do distribuidor
      for (let r = 0; r < 3; r++) {
        for (let k = 1; k <= this.numJogadores; k++) {
          const s = (this.distribuidor + k) % this.numJogadores;
          cartas[s].push(baralho.pop());
        }
      }
      const vira = baralho.pop();
      const primeiro = this.proximo(this.distribuidor);
      const onze = this.placar.map(p => p === this.pontosVitoria - 1);

      this.mao = {
        numero: this.numeroMao,
        distribuidor: this.distribuidor,
        primeiro,
        vira,
        manilha: manilhaDaVira(vira),
        cartas,
        cartasIniciais: cartas.map(c => c.slice()),
        vazas: [{ jogadas: [], equipe: null, assento: null, inicio: primeiro }],
        vez: primeiro,
        valor: 1,
        ultimoAumento: null,
        aposta: null,
        estado: 'jogando',
        maoDeOnze: null,
        maoDeFerro: false,
        resultado: null
      };

      if (onze[0] && onze[1]) {
        this.mao.maoDeFerro = true;
      } else if (onze[0] || onze[1]) {
        this.mao.maoDeOnze = onze[0] ? 0 : 1;
        this.mao.estado = 'maoDeOnze';
      }

      this.fase = 'jogando';
      this.emitir({
        tipo: 'novaMao',
        numero: this.numeroMao,
        distribuidor: this.distribuidor,
        primeiro,
        vira,
        manilha: this.mao.manilha,
        maoDeOnze: this.mao.maoDeOnze,
        maoDeFerro: this.mao.maoDeFerro
      });
      return true;
    }

    vazaAtual() {
      return this.mao.vazas[this.mao.vazas.length - 1];
    }

    podeTrucar(assento) {
      const m = this.mao;
      if (!m || this.fase !== 'jogando' || m.estado !== 'jogando') return false;
      if (m.vez !== assento) return false;
      if (m.maoDeOnze !== null || m.maoDeFerro) return false;
      if (m.ultimoAumento === this.equipe(assento)) return false;
      return proximaAposta(m.valor) !== null;
    }

    // Quais ações o jogador pode realizar agora
    acoesValidas(assento) {
      const vazio = { jogar: false, encobrir: false, trucar: false, proximaAposta: null, responder: false, aumentar: null, decidirOnze: false };
      const m = this.mao;
      if (!m || this.fase !== 'jogando') return vazio;
      const eq = this.equipe(assento);
      const acoes = Object.assign({}, vazio);
      if (m.estado === 'jogando' && m.vez === assento) {
        acoes.jogar = m.cartas[assento].length > 0;
        acoes.encobrir = m.vazas.length > 1 && !m.maoDeFerro;
        if (this.podeTrucar(assento)) {
          acoes.trucar = true;
          acoes.proximaAposta = proximaAposta(m.valor);
        }
      }
      if (m.estado === 'aposta' && m.aposta.aguardando === eq) {
        acoes.responder = true;
        acoes.aumentar = proximaAposta(m.aposta.valor);
      }
      if (m.estado === 'maoDeOnze' && m.maoDeOnze === eq) acoes.decidirOnze = true;
      return acoes;
    }

    /**
     * Aplica uma ação. Retorna { ok, erro }
     * Ações: { tipo: 'jogar', indice, encoberta } | { tipo: 'trucar' }
     *        { tipo: 'responder', resposta: 'aceitar'|'correr'|'aumentar' }
     *        { tipo: 'onze', decisao: 'jogar'|'correr' }
     */
    aplicar(assento, acao) {
      if (!acao || typeof acao !== 'object') return { ok: false, erro: 'Ação inválida' };
      if (this.fase !== 'jogando' || !this.mao) return { ok: false, erro: 'Não há mão em andamento' };
      if (!(assento >= 0 && assento < this.numJogadores)) return { ok: false, erro: 'Assento inválido' };
      switch (acao.tipo) {
        case 'jogar': return this.jogar(assento, acao.indice, !!acao.encoberta);
        case 'trucar': return this.trucar(assento);
        case 'responder': return this.responder(assento, acao.resposta);
        case 'onze': return this.decidirOnze(assento, acao.decisao);
        default: return { ok: false, erro: 'Ação desconhecida' };
      }
    }

    jogar(assento, indice, encoberta) {
      const m = this.mao;
      if (m.estado !== 'jogando') return { ok: false, erro: 'Aguarde a resposta da aposta' };
      if (m.vez !== assento) return { ok: false, erro: 'Não é a sua vez' };
      const mao = m.cartas[assento];
      if (!Number.isInteger(indice) || indice < 0 || indice >= mao.length) return { ok: false, erro: 'Carta inválida' };
      if (encoberta && (m.vazas.length < 2 || m.maoDeFerro)) return { ok: false, erro: 'Só é possível encobrir a partir da segunda vaza' };

      const carta = mao.splice(indice, 1)[0];
      const vaza = this.vazaAtual();
      vaza.jogadas.push({ assento, carta, encoberta });
      this.emitir({ tipo: 'jogada', assento, carta, encoberta, vaza: m.vazas.length - 1 });

      if (vaza.jogadas.length < this.numJogadores) {
        m.vez = this.proximo(assento);
        return { ok: true };
      }

      // Vaza completa
      const r = resolverVaza(vaza.jogadas, m.manilha);
      vaza.equipe = r.equipe;
      vaza.assento = r.assento;
      this.emitir({ tipo: 'fimVaza', vaza: m.vazas.length - 1, equipe: r.equipe, assento: r.assento });

      const vencedor = vencedorDaMao(m.vazas.map(v => v.equipe));
      if (vencedor !== undefined) {
        this.finalizarMao(vencedor, m.valor, vencedor === null ? 'empate' : 'vazas');
        return { ok: true };
      }
      m.vazas.push({ jogadas: [], equipe: null, assento: null, inicio: r.assento });
      m.vez = r.assento;
      return { ok: true };
    }

    trucar(assento) {
      if (!this.podeTrucar(assento)) return { ok: false, erro: 'Não é possível pedir aumento agora' };
      const m = this.mao;
      const eq = this.equipe(assento);
      const valor = proximaAposta(m.valor);
      m.aposta = { equipe: eq, assento, valor, aguardando: 1 - eq };
      m.estado = 'aposta';
      this.emitir({ tipo: 'aposta', assento, valor, nome: NOMES_APOSTA[valor] });
      return { ok: true };
    }

    responder(assento, resposta) {
      const m = this.mao;
      if (m.estado !== 'aposta') return { ok: false, erro: 'Não há aposta pendente' };
      const eq = this.equipe(assento);
      if (m.aposta.aguardando !== eq) return { ok: false, erro: 'Não é sua equipe que responde' };
      const ap = m.aposta;
      if (resposta === 'aceitar') {
        m.valor = ap.valor;
        m.ultimoAumento = ap.equipe;
        m.aposta = null;
        m.estado = 'jogando';
        this.emitir({ tipo: 'resposta', assento, resposta, valor: m.valor });
        return { ok: true };
      }
      if (resposta === 'correr') {
        this.emitir({ tipo: 'resposta', assento, resposta, valor: m.valor });
        this.finalizarMao(ap.equipe, m.valor, 'correu');
        return { ok: true };
      }
      if (resposta === 'aumentar') {
        const novo = proximaAposta(ap.valor);
        if (!novo) return { ok: false, erro: 'Não dá para aumentar mais' };
        m.valor = ap.valor;
        m.ultimoAumento = ap.equipe;
        m.aposta = { equipe: eq, assento, valor: novo, aguardando: ap.equipe };
        this.emitir({ tipo: 'resposta', assento, resposta, valor: m.valor });
        this.emitir({ tipo: 'aposta', assento, valor: novo, nome: NOMES_APOSTA[novo] });
        return { ok: true };
      }
      return { ok: false, erro: 'Resposta inválida' };
    }

    decidirOnze(assento, decisao) {
      const m = this.mao;
      if (m.estado !== 'maoDeOnze') return { ok: false, erro: 'Não é mão de onze' };
      const eq = this.equipe(assento);
      if (m.maoDeOnze !== eq) return { ok: false, erro: 'A decisão é da outra equipe' };
      if (decisao === 'jogar') {
        m.valor = 3;
        m.estado = 'jogando';
        this.emitir({ tipo: 'onze', assento, decisao });
        return { ok: true };
      }
      if (decisao === 'correr') {
        this.emitir({ tipo: 'onze', assento, decisao });
        this.finalizarMao(1 - eq, 1, 'correuOnze');
        return { ok: true };
      }
      return { ok: false, erro: 'Decisão inválida' };
    }

    finalizarMao(equipe, pontos, motivo) {
      const m = this.mao;
      m.estado = 'fim';
      m.aposta = null;
      if (equipe !== null) this.placar[equipe] += pontos;
      m.resultado = { equipe, pontos: equipe === null ? 0 : pontos, motivo };
      this.historico.push({ numero: m.numero, equipe, pontos: m.resultado.pontos, motivo });
      const ganhou = this.placar.findIndex(p => p >= this.pontosVitoria);
      this.emitir({ tipo: 'fimMao', equipe, pontos: m.resultado.pontos, motivo, placar: this.placar.slice(), cartas: m.cartasIniciais });
      if (ganhou >= 0) {
        this.fase = 'fimJogo';
        this.vencedor = ganhou;
        this.emitir({ tipo: 'fimJogo', equipe: ganhou, placar: this.placar.slice() });
      } else {
        this.fase = 'fimMao';
      }
    }

    // Quem precisa agir agora (lista de assentos)
    quemAge() {
      const m = this.mao;
      if (!m || this.fase !== 'jogando') return [];
      if (m.estado === 'jogando') return [m.vez];
      const equipe = m.estado === 'aposta' ? m.aposta.aguardando : m.estado === 'maoDeOnze' ? m.maoDeOnze : null;
      if (equipe === null) return [];
      const lista = [];
      // Começa pelo jogador seguinte a quem apostou (ou ao distribuidor)
      const base = m.estado === 'aposta' ? m.aposta.assento : m.distribuidor;
      for (let k = 1; k <= this.numJogadores; k++) {
        const s = (base + k) % this.numJogadores;
        if (this.equipe(s) === equipe) lista.push(s);
      }
      return lista;
    }

    // Visão do jogo do ponto de vista de um assento (esconde cartas alheias)
    visao(assento) {
      const m = this.mao;
      const minhaEquipe = assento >= 0 ? this.equipe(assento) : null;
      const v = {
        numJogadores: this.numJogadores,
        meuAssento: assento,
        minhaEquipe,
        jogadores: this.jogadores.map((j, i) => ({
          nome: j.nome, avatar: j.avatar, equipe: this.equipe(i),
          numCartas: m ? m.cartas[i].length : 0
        })),
        placar: this.placar.slice(),
        pontosVitoria: this.pontosVitoria,
        fase: this.fase,
        vencedor: this.vencedor,
        historico: this.historico.slice(-12),
        mao: null,
        acoes: assento >= 0 ? this.acoesValidas(assento) : this.acoesValidas(-1)
      };
      if (!m) return v;
      const fimDaMao = m.estado === 'fim';
      const verPropria = !m.maoDeFerro || fimDaMao;
      v.mao = {
        numero: m.numero,
        distribuidor: m.distribuidor,
        primeiro: m.primeiro,
        vira: m.vira,
        manilha: m.manilha,
        valor: m.valor,
        vez: m.vez,
        estado: m.estado,
        maoDeOnze: m.maoDeOnze,
        maoDeFerro: m.maoDeFerro,
        ultimoAumento: m.ultimoAumento,
        aposta: m.aposta ? Object.assign({}, m.aposta) : null,
        resultado: m.resultado,
        minhasCartas: assento >= 0 ? m.cartas[assento].map(c => (verPropria ? c : null)) : [],
        cartasParceiro: null,
        vazas: m.vazas.map(vz => ({
          equipe: vz.equipe,
          assento: vz.assento,
          inicio: vz.inicio,
          jogadas: vz.jogadas.map(j => ({
            assento: j.assento,
            encoberta: j.encoberta,
            carta: j.encoberta && j.assento !== assento ? null : j.carta
          }))
        }))
      };
      // Na mão de onze, a equipe com 11 vê as cartas do parceiro
      if (this.numJogadores === 4 && assento >= 0 && m.maoDeOnze === minhaEquipe) {
        const parceiro = (assento + 2) % 4;
        v.mao.cartasParceiro = m.cartas[parceiro].slice();
      }
      return v;
    }

    // Filtra eventos para um assento (esconde cartas encobertas de terceiros)
    eventosPara(eventos, assento) {
      return eventos.map(e => {
        if (e.tipo === 'jogada' && e.encoberta && e.assento !== assento) return Object.assign({}, e, { carta: null });
        if (e.tipo === 'fimMao') return Object.assign({}, e, { cartas: undefined });
        return e;
      });
    }
  }

  return {
    VALORES, NAIPES, SIMBOLOS, NOMES_NAIPES, NOMES_MANILHA, ESCADA_APOSTA, NOMES_APOSTA,
    criarAleatorio, criarBaralho, embaralhar, manilhaDaVira, forcaCarta, proximaAposta,
    resolverVaza, vencedorDaMao, Partida
  };
});
