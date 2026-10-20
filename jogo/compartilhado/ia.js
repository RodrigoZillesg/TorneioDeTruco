/**
 * Inteligência artificial do Truco
 * Decide usando apenas a visão do jogador (sem trapaça), com simulações de Monte Carlo
 */
(function (raiz, fabrica) {
  if (typeof module === 'object' && module.exports) module.exports = fabrica(require('./motor'));
  else raiz.TrucoIA = fabrica(raiz.TrucoMotor);
})(typeof self !== 'undefined' ? self : this, function (Motor) {
  'use strict';

  const { forcaCarta, criarBaralho, embaralhar, resolverVaza, vencedorDaMao } = Motor;

  const PERFIS = {
    facil: { amostras: 16, ruido: 0.25, erro: 0.35, limiarTruco: 0.82, blefe: 0.03, margem: 0.25, limiarAumento: 0.9, limiarOnze: 0.55, desconfianca: 0.97, sinal: false },
    medio: { amostras: 90, ruido: 0.08, erro: 0.06, limiarTruco: 0.7, blefe: 0.07, margem: 0.12, limiarAumento: 0.8, limiarOnze: 0.45, desconfianca: 0.92, sinal: false },
    dificil: { amostras: 220, ruido: 0.03, erro: 0, limiarTruco: 0.72, blefe: 0.08, margem: 0.1, limiarAumento: 0.76, limiarOnze: 0.42, desconfianca: 0.96, sinal: true }
  };

  // Política gulosa usada nas simulações
  function escolhaGulosa(mao, jogadas, manilha, equipe) {
    if (mao.length === 1) return 0;
    const forcas = mao.map(c => forcaCarta(c, manilha));
    const idxFraca = forcas.indexOf(Math.min(...forcas));
    const idxForte = forcas.indexOf(Math.max(...forcas));
    if (jogadas.length === 0) return idxForte;
    let topo = -2;
    let equipesTopo = new Set();
    for (const j of jogadas) {
      const f = j.encoberta ? -1 : forcaCarta(j.carta, manilha);
      if (f > topo) { topo = f; equipesTopo = new Set([j.assento % 2]); }
      else if (f === topo) equipesTopo.add(j.assento % 2);
    }
    if (equipesTopo.size === 1 && equipesTopo.has(equipe)) return idxFraca;
    let melhor = -1;
    for (let i = 0; i < mao.length; i++) {
      if (forcas[i] > topo && (melhor < 0 || forcas[i] < forcas[melhor])) melhor = i;
    }
    return melhor >= 0 ? melhor : idxFraca;
  }

  // Monta um cenário aleatório consistente com o que o jogador sabe
  function sortearCenario(visao, aleatorio) {
    const m = visao.mao;
    const n = visao.numJogadores;
    const eu = visao.meuAssento;
    const parceiro = n === 4 ? (eu + 2) % 4 : -1;
    const conhecidas = new Set([m.vira.id]);
    m.minhasCartas.forEach(c => c && conhecidas.add(c.id));
    m.vazas.forEach(v => v.jogadas.forEach(j => j.carta && conhecidas.add(j.carta.id)));
    if (m.cartasParceiro) m.cartasParceiro.forEach(c => conhecidas.add(c.id));
    const monte = embaralhar(criarBaralho().filter(c => !conhecidas.has(c.id)), aleatorio);
    const maos = [];
    for (let s = 0; s < n; s++) {
      if (s === eu) {
        maos.push(m.minhasCartas.map(c => c || monte.pop()));
      } else if (s === parceiro && m.cartasParceiro) {
        maos.push(m.cartasParceiro.slice());
      } else {
        const qtd = visao.jogadores[s].numCartas;
        const lista = [];
        for (let k = 0; k < qtd; k++) lista.push(monte.pop());
        maos.push(lista);
      }
    }
    return maos;
  }

  // Simula o restante da mão e retorna a equipe vencedora (0, 1 ou null)
  function simular(visao, aleatorio, forcada, sinal) {
    const m = visao.mao;
    const n = visao.numJogadores;
    const maos = sortearCenario(visao, aleatorio);
    if (sinal) sinal.peso = pesoDoSinal(maos, sinal.equipe, m.manilha, visao.meuAssento);
    const resultados = m.vazas.filter(v => v.equipe !== null).map(v => v.equipe);
    const atual = m.vazas[m.vazas.length - 1];
    let jogadas = atual && atual.equipe === null
      ? atual.jogadas.map(j => ({ assento: j.assento, carta: j.carta, encoberta: j.encoberta || !j.carta }))
      : [];
    let vez = m.vez;

    let guarda = 0;
    while (guarda++ < 20) {
      const mao = maos[vez];
      if (!mao.length) return null;
      let indice;
      let encoberta = false;
      if (forcada && vez === visao.meuAssento) {
        indice = forcada.indice;
        encoberta = !!forcada.encoberta;
        forcada = null;
      } else {
        indice = escolhaGulosa(mao, jogadas, m.manilha, vez % 2);
      }
      const carta = mao.splice(indice, 1)[0];
      jogadas.push({ assento: vez, carta, encoberta });
      if (jogadas.length === n) {
        const r = resolverVaza(jogadas, m.manilha);
        resultados.push(r.equipe);
        const venc = vencedorDaMao(resultados);
        if (venc !== undefined) return venc;
        if (resultados.length >= 3) return null;
        jogadas = [];
        vez = r.assento;
      } else {
        vez = (vez + 1) % n;
      }
    }
    return null;
  }

  // Quem pede truco costuma ter mão boa: cenários com adversário forte pesam mais
  function pesoDoSinal(maos, equipe, manilha, eu) {
    let soma = 0;
    let qtd = 0;
    for (let s = 0; s < maos.length; s++) {
      if (s % 2 !== equipe || s === eu) continue;
      for (const c of maos[s]) { soma += forcaCarta(c, manilha); qtd++; }
    }
    if (!qtd) return 1;
    const media = soma / qtd / 13;
    return 0.2 + media * media * 2;
  }

  function estimar(visao, amostras, aleatorio, forcada, equipeSinal) {
    const eq = visao.minhaEquipe;
    let pontos = 0;
    let total = 0;
    for (let i = 0; i < amostras; i++) {
      const sinal = equipeSinal === undefined || equipeSinal === null ? null : { equipe: equipeSinal, peso: 1 };
      const v = simular(visao, aleatorio, forcada ? Object.assign({}, forcada) : null, sinal);
      const peso = sinal ? sinal.peso : 1;
      total += peso;
      if (v === eq) pontos += peso;
      else if (v === null) pontos += peso / 2;
    }
    return pontos / Math.max(1e-9, total);
  }

  // Avalia cada carta possível e devolve a melhor jogada com sua chance de vitória
  function avaliarJogadas(visao, perfil, aleatorio, equipeSinal) {
    const m = visao.mao;
    const cartas = m.minhasCartas;
    if (!cartas.length) {
      // Sem cartas na mão (resposta a uma aposta depois de jogar a última)
      return { indice: 0, encoberta: false, chance: estimar(visao, perfil.amostras, aleatorio, null, equipeSinal) };
    }
    if (cartas.some(c => !c)) {
      // Mão de ferro: joga às cegas
      return { indice: Math.floor(aleatorio() * cartas.length), encoberta: false, chance: 0.5 };
    }
    const candidatos = cartas.map((c, i) => ({ indice: i, encoberta: false, forca: forcaCarta(c, m.manilha) }));
    if (visao.acoes.encobrir && cartas.length > 1) {
      const fraca = candidatos.reduce((a, b) => (b.forca < a.forca ? b : a));
      candidatos.push({ indice: fraca.indice, encoberta: true, forca: -1 });
    }
    let melhor = null;
    for (const c of candidatos) {
      c.chance = estimar(visao, perfil.amostras, aleatorio, c, equipeSinal) + (aleatorio() - 0.5) * perfil.ruido;
      if (c.encoberta) c.chance -= 0.02; // só encobre quando realmente compensa
      if (!melhor || c.chance > melhor.chance + 0.03 || (Math.abs(c.chance - melhor.chance) <= 0.03 && c.forca < melhor.forca)) melhor = c;
    }
    if (aleatorio() < perfil.erro) {
      const c = candidatos[Math.floor(aleatorio() * cartas.length)];
      return { indice: c.indice, encoberta: false, chance: melhor.chance };
    }
    return melhor;
  }

  /**
   * Decide a próxima ação do bot
   * @returns {object|null} ação para Partida.aplicar
   */
  function decidir(visao, opcoes) {
    opcoes = opcoes || {};
    const perfil = PERFIS[opcoes.dificuldade] || PERFIS.medio;
    const aleatorio = opcoes.aleatorio || Math.random;
    const a = visao.acoes;
    const m = visao.mao;
    if (!m) return null;
    const eq = visao.minhaEquipe;
    const placarNos = visao.placar[eq];
    const placarEles = visao.placar[1 - eq];

    if (a.decidirOnze) {
      const chance = avaliarJogadas(visao, perfil, aleatorio).chance;
      return { tipo: 'onze', decisao: chance >= perfil.limiarOnze ? 'jogar' : 'correr' };
    }

    if (a.responder) {
      const ap = m.aposta;
      const sinal = perfil.sinal ? ap.equipe : null;
      let chance = avaliarJogadas(Object.assign({}, visao, { acoes: Object.assign({}, a, { encobrir: m.vazas.length > 1 }) }), perfil, aleatorio, sinal).chance;
      chance *= perfil.desconfianca;
      const v = ap.valor;
      const c = m.valor;
      const limiar = (v - c) / (2 * v) + perfil.margem;
      if (a.aumentar && (chance >= perfil.limiarAumento || (chance > 0.55 && aleatorio() < perfil.blefe))) {
        return { tipo: 'responder', resposta: 'aumentar' };
      }
      // Correr agora entrega o jogo: melhor aceitar
      if (placarEles + c >= visao.pontosVitoria) return { tipo: 'responder', resposta: 'aceitar' };
      return { tipo: 'responder', resposta: chance >= limiar ? 'aceitar' : 'correr' };
    }

    if (a.jogar) {
      const melhor = avaliarJogadas(visao, perfil, aleatorio);
      if (a.trucar) {
        const proposto = a.proximaAposta;
        const arriscado = placarEles + proposto >= visao.pontosVitoria && melhor.chance < 0.8;
        const blefa = melhor.chance < 0.35 && aleatorio() < perfil.blefe && !arriscado;
        const confiante = melhor.chance >= perfil.limiarTruco && !(arriscado && melhor.chance < 0.9);
        // Se o adversário está muito perto de ganhar, vale apertar
        const pressao = placarNos + proposto >= visao.pontosVitoria && melhor.chance > 0.5;
        if (confiante || blefa || pressao) return { tipo: 'trucar' };
      }
      return { tipo: 'jogar', indice: melhor.indice, encoberta: !!melhor.encoberta };
    }
    return null;
  }

  // Opinião do bot para o parceiro humano (usada como dica no 2x2)
  function opinar(visao, opcoes) {
    const perfil = PERFIS[(opcoes && opcoes.dificuldade) || 'medio'];
    const aleatorio = (opcoes && opcoes.aleatorio) || Math.random;
    if (!visao.mao) return null;
    const v = Object.assign({}, visao, { acoes: Object.assign({}, visao.acoes, { encobrir: false }) });
    return avaliarJogadas(v, perfil, aleatorio).chance;
  }

  return { decidir, opinar, estimar, simular, PERFIS };
});
