/**
 * Conexões: local (contra a IA, tudo no navegador) e online (Socket.IO)
 * Ambas entregam pacotes { visao, eventos, prazo } para a interface.
 */
window.Conexoes = (function () {
  'use strict';

  const NOMES_BOTS = ['Zé da Viola', 'Dona Cida', 'Tião Carreiro', 'Mané Zap', 'Chico Bento', 'Tonhão', 'Nhô Quim', 'Rosinha'];
  const AVATARES_BOTS = ['🤠', '👵', '🧔', '😎', '👒', '🐂', '👴', '🌻'];

  class ConexaoLocal {
    constructor({ numJogadores, dificuldade, nome, avatar }) {
      this.tipo = 'local';
      this.numJogadores = numJogadores;
      this.dificuldade = dificuldade;
      this.nome = nome;
      this.avatar = avatar;
      this.aoPacote = () => {};
      this.mesa = null;
    }

    montarJogadores() {
      const idx = [...NOMES_BOTS.keys()].sort(() => Math.random() - 0.5);
      return Array.from({ length: this.numJogadores }, (_, i) => (i === 0
        ? { nome: this.nome, avatar: this.avatar, bot: false }
        : { nome: NOMES_BOTS[idx[i]], avatar: AVATARES_BOTS[idx[i]], bot: true, dificuldade: this.dificuldade }));
    }

    iniciar(aoPacote) {
      this.aoPacote = aoPacote;
      if (this.mesa) this.mesa.encerrar();
      this.mesa = new TrucoMesa({
        numJogadores: this.numJogadores,
        jogadores: this.montarJogadores(),
        tempos: { botMin: 650, botMax: 1300, entreMaos: 3600 },
        aoEnviar: (assento, pacote) => {
          // Copia para simular a rede (evita referências compartilhadas)
          if (assento === 0) setTimeout(() => this.aoPacote(JSON.parse(JSON.stringify(pacote))), 0);
        }
      });
      this.mesa.iniciar();
    }

    enviar(acao) {
      return Promise.resolve(this.mesa ? this.mesa.acao(0, acao) : { ok: false, erro: 'Sem partida' });
    }

    falar(texto, voz) { if (this.mesa) this.mesa.falar(0, texto, voz); }

    revanche() { this.iniciar(this.aoPacote); return Promise.resolve({ ok: true }); }

    podeRevanche() { return true; }

    sair() { if (this.mesa) this.mesa.encerrar(); this.mesa = null; }
  }

  class ConexaoOnline {
    constructor(cliente) {
      this.tipo = 'online';
      this.cliente = cliente;
      this.aoPacote = null;
      this.pendentes = [];
    }
    iniciar(aoPacote) {
      this.aoPacote = aoPacote;
      this.pendentes.splice(0).forEach(p => aoPacote(p));
    }
    receber(pacote) {
      // Guarda os pacotes que chegarem antes da mesa estar pronta
      if (this.aoPacote) this.aoPacote(pacote);
      else this.pendentes.push(pacote);
    }
    enviar(acao) { return this.cliente.emitir('acao', { acao }); }
    falar(texto, voz) { this.cliente.socket.emit('falar', { texto, voz }); }
    revanche() { return this.cliente.emitir('iniciar', {}); }
    podeRevanche() { return !!(this.cliente.sala && this.cliente.sala.souHost); }
    sair() { /* a saída da sala é tratada pelo app */ }
  }

  // Cliente Socket.IO com reconexão automática à sala
  class ClienteOnline {
    constructor() {
      this.socket = null;
      this.sala = null;
      this.codigo = null;
      this.ouvintes = {};
    }

    disponivel() { return typeof window.io === 'function'; }

    on(evento, fn) { this.ouvintes[evento] = fn; }
    disparar(evento, dados) { if (this.ouvintes[evento]) this.ouvintes[evento](dados); }

    conectar() {
      if (this.socket) return;
      this.socket = window.io('/truco', { transports: ['websocket', 'polling'] });
      this.socket.on('connect', () => {
        this.disparar('conectado');
        // Volta para a sala depois de uma queda de conexão
        if (this.codigo && this.dadosEntrada) {
          this.socket.emit('entrar', Object.assign({}, this.dadosEntrada, { codigo: this.codigo }), (r) => {
            if (!r || !r.ok) { this.codigo = null; this.disparar('expulso', { texto: (r && r.erro) || 'Não foi possível voltar à sala' }); }
          });
        }
      });
      this.socket.on('disconnect', () => this.disparar('desconectado'));
      this.socket.on('sala', (s) => { this.sala = s; this.disparar('sala', s); });
      this.socket.on('estado', (p) => this.disparar('estado', p));
      this.socket.on('chat', (m) => this.disparar('chat', m));
      this.socket.on('aviso', (m) => this.disparar('aviso', m));
      this.socket.on('expulso', (m) => { this.codigo = null; this.sala = null; this.disparar('expulso', m); });
    }

    emitir(evento, dados) {
      return new Promise((resolve) => {
        if (!this.socket) return resolve({ ok: false, erro: 'Sem conexão com o servidor' });
        const enviar = () => {
          const t = setTimeout(() => resolve({ ok: false, erro: 'O servidor não respondeu' }), 8000);
          this.socket.emit(evento, dados, (r) => { clearTimeout(t); resolve(r || { ok: false }); });
        };
        if (this.socket.connected) return enviar();
        // Aguarda a conexão por alguns segundos antes de desistir
        const espera = setTimeout(() => { this.socket.off('connect', aoConectar); resolve({ ok: false, erro: 'Sem conexão com o servidor' }); }, 6000);
        const aoConectar = () => { clearTimeout(espera); enviar(); };
        this.socket.once('connect', aoConectar);
      });
    }

    async criar(dados) {
      this.dadosEntrada = dados;
      const r = await this.emitir('criar', dados);
      if (r.ok) this.codigo = r.codigo;
      return r;
    }

    async entrar(dados) {
      this.dadosEntrada = dados;
      const r = await this.emitir('entrar', dados);
      if (r.ok) this.codigo = r.codigo;
      return r;
    }

    sair() {
      if (this.socket) this.socket.emit('sair');
      this.codigo = null;
      this.sala = null;
    }
  }

  return { ConexaoLocal, ConexaoOnline, ClienteOnline };
})();
