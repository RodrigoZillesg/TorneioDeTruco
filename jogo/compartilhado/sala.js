/**
 * Sala online: lobby, assentos, bots e a mesa da partida.
 * Independente do transporte: usada pelo servidor Node (Socket.IO) e pelo
 * navegador do anfitrião quando o jogo roda hospedado no WordPress.
 */
(function (raiz, fabrica) {
  if (typeof module === 'object' && module.exports) module.exports = fabrica(require('./mesa'), require('./elenco'));
  else raiz.TrucoSala = fabrica(raiz.TrucoMesa, raiz.TrucoElenco);
})(typeof self !== 'undefined' ? self : this, function (Mesa, Elenco) {
  'use strict';

  const DIFICULDADES = ['facil', 'medio', 'dificil'];

  function limparTexto(texto, max) {
    return String(texto || '').replace(/[<>]/g, '').replace(/\s+/g, ' ').trim().slice(0, max);
  }

  class Sala {
    /**
     * @param {object} cfg
     * @param {string} cfg.codigo
     * @param {string} cfg.hostToken
     * @param {number} cfg.numJogadores
     * @param {string} cfg.dificuldade
     * @param {function} cfg.enviar (token, evento, dados) => void
     * @param {boolean} [cfg.hostFixo] o anfitrião nunca é transferido (ele hospeda a partida)
     * @param {object} [cfg.tempos] { ausenciaJogo, ausenciaLobby, limiteJogada }
     */
    constructor(cfg) {
      this.codigo = cfg.codigo;
      this.hostToken = cfg.hostToken;
      this.numJogadores = cfg.numJogadores === 4 ? 4 : 2;
      this.dificuldade = DIFICULDADES.includes(cfg.dificuldade) ? cfg.dificuldade : 'medio';
      this.enviar = cfg.enviar;
      this.hostFixo = !!cfg.hostFixo;
      this.tempos = Object.assign({ ausenciaJogo: 15000, ausenciaLobby: 60000, limiteJogada: 40000 }, cfg.tempos || {});
      this.assentos = new Array(this.numJogadores).fill(null);
      this.estado = 'lobby';
      this.mesa = null;
    }

    assentoDe(token) {
      return token ? this.assentos.findIndex(a => a && a.token === token) : -1;
    }

    criarBot(assento) {
      const usados = this.assentos.filter(Boolean).flatMap(a => [a.avatar, a.nome]);
      const p = Elenco.sortearBots(1, usados)[0];
      return { token: null, nome: p.nome, avatar: p.avatar, bot: true, conectado: true, assento };
    }

    dadosPublicos(token) {
      return {
        codigo: this.codigo,
        numJogadores: this.numJogadores,
        dificuldade: this.dificuldade,
        estado: this.estado,
        souHost: this.hostToken === token,
        meuAssento: this.assentoDe(token),
        assentos: this.assentos.map(a => (a ? { nome: a.nome, avatar: a.avatar, bot: a.bot, conectado: a.conectado, host: !!a.token && a.token === this.hostToken } : null))
      };
    }

    enviarSala() {
      for (const a of this.assentos) {
        if (a && a.token && a.conectado) {
          this.enviarFotos(a);
          this.enviar(a.token, 'sala', this.dadosPublicos(a.token));
        }
      }
    }

    // Fotos dos jogadores vão em mensagens separadas, uma vez para cada destinatário
    enviarFotos(destino) {
      destino.fotosEnviadas = destino.fotosEnviadas || new Set();
      this.assentos.forEach((a, i) => {
        if (!a || !a.foto) return;
        const chave = i + ':' + a.token + ':' + a.foto.length;
        if (destino.fotosEnviadas.has(chave)) return;
        destino.fotosEnviadas.add(chave);
        this.enviar(destino.token, 'foto', { assento: i, foto: a.foto });
      });
    }

    avisar(texto) {
      for (const a of this.assentos) if (a && a.token && a.conectado) this.enviar(a.token, 'aviso', { texto });
    }

    humanosConectados() {
      return this.assentos.filter(a => a && !a.bot && a.conectado);
    }

    transferirHost() {
      if (this.hostFixo) return;
      const atual = this.assentos.find(a => a && a.token === this.hostToken && a.conectado);
      if (atual) return;
      const novo = this.humanosConectados()[0];
      if (novo) this.hostToken = novo.token;
    }

    // Entrada de um jogador novo ou reconexão de quem já estava sentado
    entrar(token, dados) {
      token = limparTexto(token, 64);
      if (!token) return { ok: false, erro: 'Identificação inválida' };
      dados = dados || {};
      let assento = this.assentoDe(token);
      if (assento >= 0) {
        const a = this.assentos[assento];
        clearTimeout(a.timerAusencia);
        a.conectado = true;
        a.fotosEnviadas = new Set();
        if (this.estado === 'jogo' && this.mesa) this.mesa.definirSubstituto(assento, false);
      } else {
        if (this.estado !== 'lobby') return { ok: false, erro: 'A partida já começou' };
        let livre = this.assentos.findIndex(a => !a);
        if (livre < 0) livre = this.assentos.findIndex(a => a && a.bot);
        if (livre < 0) return { ok: false, erro: 'Sala cheia' };
        assento = livre;
        const foto = dados.avatar === 'foto' && Elenco.fotoValida(dados.foto) ? dados.foto : null;
        this.assentos[assento] = {
          token,
          nome: limparTexto(dados.nome, 16) || 'Jogador',
          avatar: foto ? 'foto' : Elenco.avatarValido(dados.avatar),
          foto,
          bot: false,
          conectado: true,
          assento
        };
      }
      this.transferirHost();
      this.enviarSala();
      if (this.estado === 'jogo' && this.mesa) this.enviar(token, 'estado', this.mesa.pacote(assento, []));
      return { ok: true, codigo: this.codigo, assento };
    }

    trocarAssento(token, destino) {
      const assento = this.assentoDe(token);
      if (assento < 0 || this.estado !== 'lobby') return;
      if (!(destino >= 0 && destino < this.numJogadores) || this.assentos[destino]) return;
      this.assentos[destino] = this.assentos[assento];
      this.assentos[destino].assento = destino;
      this.assentos[assento] = null;
      this.enviarSala();
    }

    alterarBot(token, assento, adicionar) {
      if (this.hostToken !== token || this.estado !== 'lobby') return;
      if (!(assento >= 0 && assento < this.numJogadores)) return;
      const atual = this.assentos[assento];
      if (adicionar && !atual) {
        this.assentos[assento] = this.criarBot(assento);
      } else if (!adicionar && atual && (atual.bot || atual.token !== this.hostToken)) {
        if (!atual.bot && atual.token) this.enviar(atual.token, 'expulso', { texto: 'Você foi removido da sala' });
        this.assentos[assento] = null;
      }
      this.enviarSala();
    }

    configurar(token, dados) {
      if (this.hostToken !== token || this.estado !== 'lobby' || !dados) return;
      if (DIFICULDADES.includes(dados.dificuldade)) this.dificuldade = dados.dificuldade;
      this.enviarSala();
    }

    iniciar(token) {
      if (this.hostToken !== token) return { ok: false, erro: 'Só o anfitrião pode iniciar' };
      const podeReiniciar = this.estado === 'lobby' || (this.mesa && this.mesa.partida.fase === 'fimJogo');
      if (!podeReiniciar) return { ok: false, erro: 'A partida já está em andamento' };
      if (this.mesa) this.mesa.encerrar();
      for (let i = 0; i < this.numJogadores; i++) {
        if (!this.assentos[i]) this.assentos[i] = this.criarBot(i);
      }
      this.estado = 'jogo';
      this.mesa = new Mesa({
        numJogadores: this.numJogadores,
        jogadores: this.assentos.map(a => ({ nome: a.nome, avatar: a.avatar, bot: a.bot, dificuldade: this.dificuldade })),
        tempos: { limiteJogada: this.tempos.limiteJogada },
        aoEnviar: (assento, pacote) => {
          const a = this.assentos[assento];
          if (a && a.token && a.conectado) this.enviar(a.token, 'estado', pacote);
        }
      });
      // Humanos já desconectados começam controlados pela IA
      this.assentos.forEach((a, i) => {
        if (!a.bot && !a.conectado) this.mesa.jogadores[i].substituto = true;
      });
      this.enviarSala();
      this.mesa.iniciar();
      return { ok: true };
    }

    acao(token, acao) {
      const assento = this.assentoDe(token);
      if (!this.mesa || assento < 0) return { ok: false, erro: 'Você não está em uma partida' };
      return this.mesa.acao(assento, acao);
    }

    falar(token, texto, voz) {
      const assento = this.assentoDe(token);
      if (assento < 0) return;
      texto = limparTexto(texto, 80);
      if (!texto) return;
      if (this.mesa && this.estado === 'jogo') {
        this.mesa.falar(assento, texto, !!voz);
      } else {
        const a = this.assentos[assento];
        for (const b of this.assentos) {
          if (b && b.token && b.conectado) this.enviar(b.token, 'chat', { nome: a.nome, texto });
        }
      }
    }

    // Saída voluntária: no lobby libera o lugar; no jogo a IA assume
    sair(token) {
      const assento = this.assentoDe(token);
      if (assento < 0) return;
      const a = this.assentos[assento];
      clearTimeout(a.timerAusencia);
      if (this.estado === 'jogo' && this.mesa) {
        a.token = null;
        a.conectado = false;
        this.mesa.definirSubstituto(assento, true);
      } else {
        this.assentos[assento] = null;
      }
      this.transferirHost();
      this.enviarSala();
    }

    // Queda de conexão: dá um tempo para o jogador voltar
    desconectou(token) {
      const assento = this.assentoDe(token);
      if (assento < 0) return;
      const a = this.assentos[assento];
      if (!a.conectado) return;
      a.conectado = false;
      this.enviarSala();
      clearTimeout(a.timerAusencia);
      if (this.estado === 'jogo' && this.mesa) {
        this.avisar(a.nome + ' caiu. A IA assume se não voltar logo.');
        a.timerAusencia = setTimeout(() => {
          if (!a.conectado && this.mesa) this.mesa.definirSubstituto(assento, true);
        }, this.tempos.ausenciaJogo);
      } else {
        a.timerAusencia = setTimeout(() => {
          if (!a.conectado && this.assentos[assento] === a) this.sair(a.token);
        }, this.tempos.ausenciaLobby);
      }
      this.transferirHost();
    }

    encerrar() {
      if (this.mesa) this.mesa.encerrar();
      this.assentos.forEach(a => a && clearTimeout(a.timerAusencia));
    }
  }

  Sala.limparTexto = limparTexto;
  Sala.DIFICULDADES = DIFICULDADES;
  return Sala;
});
