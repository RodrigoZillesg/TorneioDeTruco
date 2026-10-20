/**
 * Conexões: local (contra a IA, tudo no navegador) e online (Socket.IO)
 * Ambas entregam pacotes { visao, eventos, prazo } para a interface.
 */
window.Conexoes = (function () {
  'use strict';


  class ConexaoLocal {
    constructor({ numJogadores, dificuldade, nome, avatar, foto }) {
      this.tipo = 'local';
      this.numJogadores = numJogadores;
      this.dificuldade = dificuldade;
      this.nome = nome;
      this.avatar = avatar;
      this.foto = foto;
      this.aoPacote = () => {};
      this.mesa = null;
    }

    montarJogadores() {
      const usaFoto = this.avatar === 'foto' && TrucoElenco.fotoValida(this.foto);
      const avatar = usaFoto ? 'foto' : TrucoElenco.avatarValido(this.avatar);
      Personagens.definirFoto('a0', usaFoto ? this.foto : null);
      const bots = TrucoElenco.sortearBots(this.numJogadores - 1, [avatar]);
      return [{ nome: this.nome, avatar, bot: false }]
        .concat(bots.map(b => Object.assign(b, { bot: true, dificuldade: this.dificuldade })));
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
    falar(texto, voz) { this.cliente.enviar('falar', { texto, voz }); }
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
      this.socket.on('foto', (m) => this.disparar('foto', m));
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

    // Envio sem esperar resposta
    enviar(evento, dados) {
      if (this.socket) this.socket.emit(evento, dados);
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

  /**
   * Cliente para hospedagem sem servidor Node (WordPress): o navegador do
   * anfitrião roda a sala (TrucoSala) e o relay.php só repassa as mensagens.
   */
  class ClienteRelay {
    constructor(url) {
      this.url = url;
      this.sala = null;
      this.codigo = null;
      this.ouvintes = {};
      this.anfitriao = null; // { sala, segredo, saida, vistos }
      this.desde = 0;
      this.ativo = false;
      this.pendentes = new Map();
      this.proximoId = 1;
      this.ultimoContato = 0;
      this.timers = [];
      this.avisouQueda = false;
    }

    disponivel() { return true; }
    conectar() { /* sem conexão permanente */ }
    on(evento, fn) { this.ouvintes[evento] = fn; }
    disparar(evento, dados) {
      if (evento === 'sala') this.sala = dados;
      if (evento === 'expulso') { this.parar(); this.codigo = null; this.sala = null; }
      if (this.ouvintes[evento]) this.ouvintes[evento](dados);
    }

    async post(corpo) {
      try {
        const r = await fetch(this.url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(corpo),
          cache: 'no-store'
        });
        const json = await r.json();
        return json && typeof json === 'object' ? json : { ok: false, erro: 'Resposta inválida do servidor' };
      } catch (e) {
        return { ok: false, erro: 'Sem conexão com o servidor' };
      }
    }

    // ---------- Anfitrião ----------
    async criar(dados) {
      const r = await this.post({ acao: 'criar' });
      if (!r.ok) return r;
      this.codigo = r.codigo;
      this.token = dados.token;
      const anf = { segredo: r.segredo, saida: [], vistos: new Map(), enviando: false };
      this.anfitriao = anf;
      anf.sala = new TrucoSala({
        codigo: r.codigo,
        hostToken: dados.token,
        numJogadores: dados.numJogadores,
        dificuldade: dados.dificuldade,
        hostFixo: true,
        enviar: (destino, evento, conteudo) => {
          if (destino === this.token) setTimeout(() => this.disparar(evento, conteudo), 0);
          else anf.saida.push({ para: destino, dados: { evento, dados: conteudo } });
        }
      });
      const e = anf.sala.entrar(dados.token, dados);
      if (!e.ok) return e;
      this.desde = 0;
      this.iniciarLacos(true);
      window.addEventListener('pagehide', this._aoSairPagina = () => this.avisarSaidaAnfitriao());
      return { ok: true, codigo: r.codigo };
    }

    async despachar() {
      const anf = this.anfitriao;
      if (!anf || anf.enviando || !anf.saida.length) return;
      anf.enviando = true;
      const mensagens = anf.saida.splice(0, 150);
      const r = await this.post({ acao: 'enviar', codigo: this.codigo, segredo: anf.segredo, mensagens });
      // Em caso de falha, devolve as mensagens para a fila na mesma ordem
      if (!r.ok) anf.saida.unshift(...mensagens);
      anf.enviando = false;
    }

    tratarComoAnfitriao(m) {
      const anf = this.anfitriao;
      const sala = anf.sala;
      const de = m.de;
      const msg = m.msg || {};
      anf.vistos.set(de, Date.now());
      const responder = (resultado) => {
        if (msg.id) anf.saida.push({ para: de, dados: { evento: 'resposta', dados: { id: msg.id, resultado } } });
      };
      const d = msg.dados || {};
      switch (msg.tipo) {
        case 'entrar': responder(sala.entrar(de, d)); break;
        case 'acao': responder(sala.acao(de, d.acao)); break;
        case 'iniciar': responder(sala.iniciar(de)); break;
        case 'assento': sala.trocarAssento(de, d.assento); break;
        case 'bot': sala.alterarBot(de, d.assento, !!d.adicionar); break;
        case 'configurar': sala.configurar(de, d); break;
        case 'falar': sala.falar(de, d.texto, d.voz); break;
        case 'sair': sala.sair(de); break;
        case 'ping': {
          const i = sala.assentoDe(de);
          // Quem tinha caído e voltou a responder retoma o lugar
          if (i >= 0 && !sala.assentos[i].conectado) sala.entrar(de, {});
          break;
        }
        default: break;
      }
    }

    verificarConvidados() {
      const anf = this.anfitriao;
      if (!anf) return;
      const agora = Date.now();
      for (const a of anf.sala.assentos) {
        if (!a || a.bot || !a.token || a.token === this.token || !a.conectado) continue;
        const visto = anf.vistos.get(a.token) || agora;
        if (!anf.vistos.has(a.token)) anf.vistos.set(a.token, agora);
        if (agora - visto > 12000) anf.sala.desconectou(a.token);
      }
      // Pulso para os convidados saberem que o anfitrião está ativo
      anf.saida.push({ para: '*', dados: { evento: 'pulso', dados: null } });
    }

    avisarSaidaAnfitriao() {
      const anf = this.anfitriao;
      if (!anf || !navigator.sendBeacon) return;
      const corpo = JSON.stringify({
        acao: 'enviar', codigo: this.codigo, segredo: anf.segredo,
        mensagens: [{ para: '*', dados: { evento: 'expulso', dados: { texto: 'O anfitrião saiu da sala.' } } }]
      });
      navigator.sendBeacon(this.url, new Blob([corpo], { type: 'text/plain' }));
    }

    // ---------- Convidado ----------
    async entrar(dados) {
      this.parar();
      this.anfitriao = null;
      this.codigo = String(dados.codigo || '').toUpperCase();
      this.token = dados.token;
      // Marca a posição atual da fila antes de pedir para entrar
      const inicio = await this.post({ acao: 'receber', codigo: this.codigo, token: this.token, inicio: true });
      if (!inicio.ok) { this.codigo = null; return inicio; }
      this.desde = inicio.ultimo || 0;
      this.ultimoContato = Date.now();
      this.iniciarLacos(false);
      const r = await this.pedir('entrar', dados, 10000);
      if (!r.ok) {
        this.parar();
        this.codigo = null;
        if (/respondeu/.test(r.erro || '')) r.erro = 'O anfitrião da sala não respondeu';
      }
      return r.ok ? { ok: true, codigo: this.codigo } : r;
    }

    pedir(tipo, dados, espera) {
      const id = this.token + ':' + (this.proximoId++);
      return new Promise((resolve) => {
        const t = setTimeout(() => { this.pendentes.delete(id); resolve({ ok: false, erro: 'O servidor não respondeu' }); }, espera || 10000);
        this.pendentes.set(id, (resultado) => { clearTimeout(t); resolve(resultado || { ok: false }); });
        this.post({ acao: 'enviar', codigo: this.codigo, token: this.token, dados: { tipo, id, dados } }).then(r => {
          if (!r.ok) { clearTimeout(t); this.pendentes.delete(id); resolve(r); }
        });
      });
    }

    tratarComoConvidado(m) {
      if (!m) return;
      this.ultimoContato = Date.now();
      if (this.avisouQueda) { this.avisouQueda = false; this.disparar('conectado'); }
      if (m.evento === 'resposta') {
        const fn = m.dados && this.pendentes.get(m.dados.id);
        if (fn) { this.pendentes.delete(m.dados.id); fn(m.dados.resultado); }
        return;
      }
      if (m.evento === 'pulso') return;
      this.disparar(m.evento, m.dados);
    }

    // ---------- Laços de envio e recebimento ----------
    iniciarLacos(anfitriao) {
      this.parar();
      this.ativo = true;
      let recebendo = false;
      const receber = async () => {
        if (!this.ativo || recebendo || !this.codigo) return;
        recebendo = true;
        const corpo = { acao: 'receber', codigo: this.codigo, desde: this.desde };
        if (anfitriao) corpo.segredo = this.anfitriao.segredo;
        else corpo.token = this.token;
        const r = await this.post(corpo);
        recebendo = false;
        if (!this.ativo) return;
        if (!r.ok) {
          if (/não encontrada/.test(r.erro || '')) this.disparar('expulso', { texto: 'A sala foi encerrada.' });
          return;
        }
        this.desde = r.ultimo || this.desde;
        for (const m of r.msgs || []) {
          if (anfitriao) this.tratarComoAnfitriao(m);
          else this.tratarComoConvidado(m);
        }
        if (anfitriao) this.despachar();
      };
      this.timers.push(setInterval(receber, 650));
      if (anfitriao) {
        this.timers.push(setInterval(() => this.despachar(), 200));
        this.timers.push(setInterval(() => this.verificarConvidados(), 4000));
      } else {
        this.timers.push(setInterval(() => {
          if (!this.codigo) return;
          this.post({ acao: 'enviar', codigo: this.codigo, token: this.token, dados: { tipo: 'ping' } });
          const silencio = Date.now() - this.ultimoContato;
          if (silencio > 15000 && !this.avisouQueda) { this.avisouQueda = true; this.disparar('desconectado'); }
          if (silencio > 60000) this.disparar('expulso', { texto: 'O anfitrião ficou sem conexão. A sala foi encerrada.' });
        }, 4000));
      }
      receber();
    }

    parar() {
      this.ativo = false;
      this.timers.forEach(t => clearInterval(t));
      this.timers = [];
    }

    // ---------- Interface comum ----------
    emitir(evento, dados) {
      if (this.anfitriao) {
        const sala = this.anfitriao.sala;
        if (evento === 'acao') return Promise.resolve(sala.acao(this.token, dados && dados.acao));
        if (evento === 'iniciar') return Promise.resolve(sala.iniciar(this.token));
        this.enviar(evento, dados);
        return Promise.resolve({ ok: true });
      }
      if (!this.codigo) return Promise.resolve({ ok: false, erro: 'Você não está em uma sala' });
      return this.pedir(evento, dados);
    }

    enviar(evento, dados) {
      if (this.anfitriao) {
        this.tratarComoAnfitriao({ de: this.token, msg: { tipo: evento, dados } });
        return;
      }
      if (this.codigo) this.post({ acao: 'enviar', codigo: this.codigo, token: this.token, dados: { tipo: evento, dados } });
    }

    sair() {
      if (this.anfitriao) {
        const anf = this.anfitriao;
        anf.saida.push({ para: '*', dados: { evento: 'expulso', dados: { texto: 'O anfitrião encerrou a sala.' } } });
        anf.enviando = false;
        this.despachar();
        anf.sala.encerrar();
        window.removeEventListener('pagehide', this._aoSairPagina);
        this.parar();
      } else {
        if (this.codigo) this.post({ acao: 'enviar', codigo: this.codigo, token: this.token, dados: { tipo: 'sair' } });
        this.parar();
      }
      this.anfitriao = null;
      this.codigo = null;
      this.sala = null;
    }
  }

  return { ConexaoLocal, ConexaoOnline, ClienteOnline, ClienteRelay };
})();
