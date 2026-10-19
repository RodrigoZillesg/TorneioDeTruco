/**
 * Mesa: controla uma partida, os bots e os tempos.
 * Usada pelo servidor (salas online) e pelo navegador (jogo local contra a IA).
 */
(function (raiz, fabrica) {
  if (typeof module === 'object' && module.exports) module.exports = fabrica(require('./motor'), require('./ia'));
  else raiz.TrucoMesa = fabrica(raiz.TrucoMotor, raiz.TrucoIA);
})(typeof self !== 'undefined' ? self : this, function (Motor, IA) {
  'use strict';

  const FALAS = {
    aceitar: ['Desce!', 'Cai dentro!', 'Vem tranquilo!', 'Aceito!', 'Manda bala!', 'Pode vir!'],
    correr: ['Corro...', 'Tô fora!', 'Essa eu deixo...', 'Pode levar.', 'Fui!'],
    aumentar: ['Aumenta!', 'Quero mais!', 'Vamos ver quem é homem!'],
    onzeJogar: ['Vamos pra cima!', 'Bora jogar!', 'Essa é nossa!'],
    onzeCorrer: ['Melhor não arriscar.', 'Essa não dá.'],
    ganhouMao: ['É nóis!', 'Ê beleza!', 'Hahaha!', 'Foi fácil!', 'Toma!'],
    perdeuMao: ['Sorte sua...', 'Tá bom, tá bom.', 'Próxima é minha!', 'Aff...'],
    dicaAceitar: ['Aceita, parceiro! Tô forte.', 'Pode aceitar, eu ajudo!', 'Manda ver, tô bem!'],
    dicaCorrer: ['Corre, tô sem nada...', 'Melhor correr, parceiro.', 'Tô fraco, pode correr.'],
    dicaAumentar: ['Pede mais! Tô com tudo!', 'Aumenta que eu seguro!'],
    dicaDuvida: ['Tô mais ou menos...', 'Decide aí, parceiro.']
  };

  function sortear(lista, aleatorio) {
    return lista[Math.floor(aleatorio() * lista.length)];
  }

  class Mesa {
    /**
     * @param {object} cfg
     * @param {number} cfg.numJogadores
     * @param {Array} cfg.jogadores [{ nome, avatar, bot, dificuldade }]
     * @param {function} cfg.aoEnviar (assento, pacote) => void
     * @param {object} [cfg.tempos] { botMin, botMax, entreMaos, limiteJogada }
     */
    constructor(cfg) {
      this.cfg = cfg;
      this.aleatorio = Motor.criarAleatorio(cfg.semente);
      this.partida = new Motor.Partida({
        numJogadores: cfg.numJogadores,
        jogadores: cfg.jogadores,
        semente: cfg.semente
      });
      this.jogadores = cfg.jogadores.map(j => ({
        bot: !!j.bot,
        substituto: false, // humano ausente controlado pela IA
        conectado: !j.bot,
        dificuldade: j.dificuldade || 'medio'
      }));
      this.tempos = Object.assign({ botMin: 700, botMax: 1400, entreMaos: 3800, limiteJogada: 0, aposAposta: 1500, aposVaza: 1300 }, cfg.tempos || {});
      this.timerBot = null;
      this.timerPrazo = null;
      this.prazoFim = 0;
      this.prazoAssentos = [];
      this.encerrada = false;
      this.dicaDada = null;
      this.ultimoTipo = null;
    }

    controladoPorIA(assento) {
      const j = this.jogadores[assento];
      return j.bot || j.substituto;
    }

    iniciar() {
      this.partida.novaMao();
      this.processar([]);
    }

    encerrar() {
      this.encerrada = true;
      clearTimeout(this.timerBot);
      clearTimeout(this.timerPrazo);
    }

    // Ação vinda de um humano
    acao(assento, acao) {
      if (this.encerrada) return { ok: false, erro: 'Partida encerrada' };
      if (this.controladoPorIA(assento) && !this.jogadores[assento].substituto) return { ok: false, erro: 'Assento controlado pela IA' };
      if (this.jogadores[assento].substituto) this.jogadores[assento].substituto = false;
      return this.executar(assento, acao);
    }

    executar(assento, acao) {
      const r = this.partida.aplicar(assento, acao);
      if (!r.ok) return r;
      const extras = this.falasDaAcao(assento, acao);
      this.processar(extras);
      return r;
    }

    falasDaAcao(assento, acao) {
      const a = this.aleatorio;
      const extras = [];
      if (acao.tipo === 'responder') {
        const lista = acao.resposta === 'aceitar' ? FALAS.aceitar : acao.resposta === 'correr' ? FALAS.correr : null;
        if (lista) extras.push({ tipo: 'fala', assento, texto: sortear(lista, a), voz: true });
      } else if (acao.tipo === 'onze') {
        extras.push({ tipo: 'fala', assento, texto: sortear(acao.decisao === 'jogar' ? FALAS.onzeJogar : FALAS.onzeCorrer, a), voz: true });
      }
      return extras;
    }

    // Mensagem de chat ou emote de um jogador
    falar(assento, texto, voz) {
      if (this.encerrada) return;
      const limpo = String(texto || '').slice(0, 80);
      if (!limpo.trim()) return;
      this.transmitir([{ tipo: 'fala', assento, texto: limpo, voz: !!voz }]);
    }

    definirSubstituto(assento, ativo) {
      const j = this.jogadores[assento];
      if (!j || j.bot) return;
      j.substituto = !!ativo;
      j.conectado = !ativo;
      this.transmitir([{ tipo: 'conexao', assento, conectado: j.conectado }]);
      this.agendar();
    }

    pacote(assento, eventos) {
      const visao = this.partida.visao(assento);
      visao.jogadores.forEach((j, i) => {
        j.bot = this.jogadores[i].bot;
        j.conectado = this.jogadores[i].bot || this.jogadores[i].conectado;
        j.substituto = this.jogadores[i].substituto;
      });
      const restante = this.prazoFim ? Math.max(0, this.prazoFim - Date.now()) : 0;
      return {
        visao,
        eventos: this.partida.eventosPara(eventos || [], assento),
        prazo: restante ? { assentos: this.prazoAssentos.slice(), restanteMs: restante, totalMs: this.tempos.limiteJogada } : null
      };
    }

    transmitir(eventos) {
      for (let s = 0; s < this.partida.numJogadores; s++) {
        if (this.jogadores[s].bot) continue;
        try { this.cfg.aoEnviar(s, this.pacote(s, eventos)); } catch (e) { /* ignora falhas de envio */ }
      }
    }

    processar(extras) {
      const eventos = this.partida.coletarEventos().concat(extras || []);
      const ultimo = eventos.filter(e => e.tipo !== 'fala').pop();
      this.ultimoTipo = ultimo ? ultimo.tipo : this.ultimoTipo;
      // Comentários dos bots no fim da mão
      const fim = eventos.find(e => e.tipo === 'fimMao');
      if (fim && fim.equipe !== null && this.aleatorio() < 0.45) {
        const bots = this.jogadores.map((j, i) => i).filter(i => this.jogadores[i].bot);
        if (bots.length) {
          const b = sortear(bots, this.aleatorio);
          const ganhou = this.partida.equipe(b) === fim.equipe;
          eventos.push({ tipo: 'fala', assento: b, texto: sortear(ganhou ? FALAS.ganhouMao : FALAS.perdeuMao, this.aleatorio), voz: true });
        }
      }
      this.definirPrazo();
      this.darDica(eventos);
      this.transmitir(eventos);
      this.agendar();
    }

    definirPrazo() {
      clearTimeout(this.timerPrazo);
      this.prazoFim = 0;
      this.prazoAssentos = [];
      if (!this.tempos.limiteJogada || this.partida.fase !== 'jogando') return;
      const humanos = this.partida.quemAge().filter(s => !this.controladoPorIA(s));
      if (!humanos.length) return;
      this.prazoAssentos = humanos;
      this.prazoFim = Date.now() + this.tempos.limiteJogada;
      this.timerPrazo = setTimeout(() => {
        if (this.encerrada) return;
        // Tempo esgotado: a IA joga pelo humano
        const s = humanos[0];
        const acao = IA.decidir(this.partida.visao(s), { dificuldade: 'facil', aleatorio: this.aleatorio });
        if (acao) {
          const r = this.partida.aplicar(s, acao.tipo === 'trucar' ? { tipo: 'jogar', indice: 0 } : acao);
          if (r.ok) this.processar([{ tipo: 'fala', assento: s, texto: '⏰ Tempo esgotado', voz: false }]);
        }
      }, this.tempos.limiteJogada);
    }

    // No 2x2, o bot parceiro de um humano dá a sua opinião sobre a aposta
    darDica(eventos) {
      const p = this.partida;
      const m = p.mao;
      if (!m || p.numJogadores !== 4) return;
      if (m.estado !== 'aposta' && m.estado !== 'maoDeOnze') return;
      const chave = m.numero + ':' + m.estado + ':' + (m.aposta ? m.aposta.valor : 'onze');
      if (this.dicaDada === chave) return;
      const equipe = m.estado === 'aposta' ? m.aposta.aguardando : m.maoDeOnze;
      const membros = [0, 1, 2, 3].filter(s => p.equipe(s) === equipe);
      const humanos = membros.filter(s => !this.controladoPorIA(s));
      const bots = membros.filter(s => this.controladoPorIA(s));
      if (!humanos.length || !bots.length) return;
      this.dicaDada = chave;
      const b = bots[0];
      const chance = IA.opinar(p.visao(b), { dificuldade: this.jogadores[b].dificuldade, aleatorio: this.aleatorio });
      let lista;
      if (chance === null) return;
      if (chance > 0.78 && (m.estado === 'maoDeOnze' || Motor.proximaAposta(m.aposta.valor))) lista = m.estado === 'maoDeOnze' ? FALAS.onzeJogar : FALAS.dicaAumentar;
      else if (chance > 0.5) lista = FALAS.dicaAceitar;
      else if (chance > 0.35) lista = FALAS.dicaDuvida;
      else lista = FALAS.dicaCorrer;
      eventos.push({ tipo: 'fala', assento: b, texto: sortear(lista, this.aleatorio), voz: true, dica: true });
    }

    agendar() {
      clearTimeout(this.timerBot);
      if (this.encerrada) return;
      const p = this.partida;
      if (p.fase === 'fimMao') {
        this.timerBot = setTimeout(() => {
          if (this.encerrada) return;
          p.novaMao();
          this.processar([]);
        }, this.tempos.entreMaos);
        return;
      }
      if (p.fase !== 'jogando') return;
      const quem = p.quemAge();
      if (!quem.length) return;
      // Em apostas e mão de onze, se houver humano na equipe, ele decide
      const humanos = quem.filter(s => !this.controladoPorIA(s));
      if (humanos.length) return;
      const s = quem[0];
      let atraso = this.tempos.botMin + this.aleatorio() * (this.tempos.botMax - this.tempos.botMin);
      if (this.ultimoTipo === 'aposta' || this.ultimoTipo === 'novaMao') atraso += this.tempos.aposAposta;
      if (this.ultimoTipo === 'fimVaza') atraso += this.tempos.aposVaza;
      this.timerBot = setTimeout(() => {
        if (this.encerrada) return;
        const visao = p.visao(s);
        let acao = IA.decidir(visao, { dificuldade: this.jogadores[s].dificuldade, aleatorio: this.aleatorio });
        if (!acao) return;
        let r = p.aplicar(s, acao);
        if (!r.ok) {
          // Segurança: se a IA errar, joga a primeira carta possível
          acao = visao.acoes.responder ? { tipo: 'responder', resposta: 'aceitar' } : visao.acoes.decidirOnze ? { tipo: 'onze', decisao: 'jogar' } : { tipo: 'jogar', indice: 0 };
          r = p.aplicar(s, acao);
          if (!r.ok) return;
        }
        this.processar(this.falasDaAcao(s, acao));
      }, atraso);
    }
  }

  Mesa.FALAS = FALAS;
  return Mesa;
});
