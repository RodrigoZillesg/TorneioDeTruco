/**
 * Salas online do jogo de Truco (Socket.IO, namespace /truco)
 * O servidor é a autoridade da partida: os clientes só enviam ações.
 */
const Mesa = require('../compartilhado/mesa');

const LETRAS = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
const TEMPO_AUSENCIA_JOGO = 15000;
const TEMPO_AUSENCIA_LOBBY = 60000;
const TEMPO_SALA_VAZIA = 10 * 60 * 1000;
const LIMITE_JOGADA = 40000;
const DIFICULDADES = ['facil', 'medio', 'dificil'];
const NOMES_BOTS = ['Zé da Viola', 'Dona Cida', 'Tião Carreiro', 'Mané Zap', 'Chico Bento', 'Tonhão', 'Nhô Quim', 'Rosinha'];
const AVATARES_BOTS = ['🤠', '👵', '🧔', '😎', '👒', '🐂', '👴', '🌻'];

function limparTexto(texto, max) {
  return String(texto || '').replace(/[<>]/g, '').replace(/\s+/g, ' ').trim().slice(0, max);
}

module.exports = function configurarSalasTruco(io) {
  const ns = io.of('/truco');
  const salas = new Map();

  function gerarCodigo() {
    let codigo;
    do {
      codigo = '';
      for (let i = 0; i < 4; i++) codigo += LETRAS[Math.floor(Math.random() * LETRAS.length)];
    } while (salas.has(codigo));
    return codigo;
  }

  function criarBot(sala, assento) {
    const usados = new Set(sala.assentos.filter(Boolean).map(a => a.nome));
    let i = Math.floor(Math.random() * NOMES_BOTS.length);
    for (let k = 0; k < NOMES_BOTS.length && usados.has(NOMES_BOTS[i]); k++) i = (i + 1) % NOMES_BOTS.length;
    return { token: null, nome: NOMES_BOTS[i], avatar: AVATARES_BOTS[i], socketId: null, bot: true, conectado: true, assento };
  }

  function dadosPublicos(sala, token) {
    const meuAssento = sala.assentos.findIndex(a => a && a.token && a.token === token);
    return {
      codigo: sala.codigo,
      numJogadores: sala.numJogadores,
      dificuldade: sala.dificuldade,
      estado: sala.estado,
      souHost: sala.hostToken === token,
      meuAssento,
      assentos: sala.assentos.map(a => (a ? { nome: a.nome, avatar: a.avatar, bot: a.bot, conectado: a.conectado, host: !!a.token && a.token === sala.hostToken } : null))
    };
  }

  function enviarSala(sala) {
    for (const a of sala.assentos) {
      if (a && a.socketId) ns.to(a.socketId).emit('sala', dadosPublicos(sala, a.token));
    }
  }

  function enviarAviso(sala, texto) {
    for (const a of sala.assentos) if (a && a.socketId) ns.to(a.socketId).emit('aviso', { texto });
  }

  function humanosConectados(sala) {
    return sala.assentos.filter(a => a && !a.bot && a.conectado);
  }

  function transferirHost(sala) {
    const atual = sala.assentos.find(a => a && a.token === sala.hostToken && a.conectado);
    if (atual) return;
    const novo = humanosConectados(sala)[0];
    if (novo) sala.hostToken = novo.token;
  }

  function iniciarMesa(sala) {
    if (sala.mesa) sala.mesa.encerrar();
    for (let i = 0; i < sala.numJogadores; i++) {
      if (!sala.assentos[i]) sala.assentos[i] = criarBot(sala, i);
    }
    sala.estado = 'jogo';
    sala.mesa = new Mesa({
      numJogadores: sala.numJogadores,
      jogadores: sala.assentos.map(a => ({ nome: a.nome, avatar: a.avatar, bot: a.bot, dificuldade: sala.dificuldade })),
      tempos: { limiteJogada: LIMITE_JOGADA },
      aoEnviar: (assento, pacote) => {
        const a = sala.assentos[assento];
        if (a && a.socketId) ns.to(a.socketId).emit('estado', pacote);
      }
    });
    // Humanos que já estão desconectados começam controlados pela IA
    sala.assentos.forEach((a, i) => {
      if (!a.bot && !a.conectado) sala.mesa.jogadores[i].substituto = true;
    });
    enviarSala(sala);
    sala.mesa.iniciar();
  }

  function liberarAssento(sala, assento) {
    const a = sala.assentos[assento];
    if (!a) return;
    clearTimeout(a.timerAusencia);
    if (sala.estado === 'jogo' && sala.mesa) {
      // Durante o jogo a IA assume o lugar de quem saiu
      a.token = null;
      a.socketId = null;
      a.conectado = false;
      sala.mesa.definirSubstituto(assento, true);
    } else {
      sala.assentos[assento] = null;
    }
    transferirHost(sala);
    enviarSala(sala);
    verificarSalaVazia(sala);
  }

  function verificarSalaVazia(sala) {
    clearTimeout(sala.timerVazia);
    if (humanosConectados(sala).length) return;
    sala.timerVazia = setTimeout(() => {
      if (humanosConectados(sala).length) return;
      if (sala.mesa) sala.mesa.encerrar();
      sala.assentos.forEach(a => a && clearTimeout(a.timerAusencia));
      salas.delete(sala.codigo);
    }, TEMPO_SALA_VAZIA);
  }

  function salaDoSocket(socket) {
    const codigo = socket.data.codigo;
    const sala = codigo && salas.get(codigo);
    if (!sala) return {};
    const assento = sala.assentos.findIndex(a => a && a.token && a.token === socket.data.token);
    return { sala, assento };
  }

  ns.on('connection', (socket) => {
    socket.data.ultimaFala = 0;

    socket.on('criar', (dados, cb) => {
      cb = typeof cb === 'function' ? cb : () => {};
      dados = dados || {};
      const token = limparTexto(dados.token, 64);
      if (!token) return cb({ ok: false, erro: 'Identificação inválida' });
      const numJogadores = dados.numJogadores === 4 ? 4 : 2;
      const codigo = gerarCodigo();
      const sala = {
        codigo,
        hostToken: token,
        numJogadores,
        dificuldade: DIFICULDADES.includes(dados.dificuldade) ? dados.dificuldade : 'medio',
        assentos: new Array(numJogadores).fill(null),
        estado: 'lobby',
        mesa: null
      };
      sala.assentos[0] = {
        token, nome: limparTexto(dados.nome, 16) || 'Jogador', avatar: limparTexto(dados.avatar, 8) || '🙂',
        socketId: socket.id, bot: false, conectado: true, assento: 0
      };
      salas.set(codigo, sala);
      socket.data.codigo = codigo;
      socket.data.token = token;
      socket.join('sala:' + codigo);
      cb({ ok: true, codigo });
      enviarSala(sala);
    });

    socket.on('entrar', (dados, cb) => {
      cb = typeof cb === 'function' ? cb : () => {};
      dados = dados || {};
      const codigo = limparTexto(dados.codigo, 8).toUpperCase();
      const token = limparTexto(dados.token, 64);
      const sala = salas.get(codigo);
      if (!sala) return cb({ ok: false, erro: 'Sala não encontrada' });
      if (!token) return cb({ ok: false, erro: 'Identificação inválida' });

      let assento = sala.assentos.findIndex(a => a && a.token === token);
      if (assento >= 0) {
        // Reconexão
        const a = sala.assentos[assento];
        clearTimeout(a.timerAusencia);
        a.socketId = socket.id;
        a.conectado = true;
        if (sala.estado === 'jogo' && sala.mesa) sala.mesa.definirSubstituto(assento, false);
      } else {
        if (sala.estado !== 'lobby') return cb({ ok: false, erro: 'A partida já começou' });
        // Prefere o assento livre que equilibra as equipes
        const livres = sala.assentos.map((a, i) => (a ? -1 : i)).filter(i => i >= 0);
        if (!livres.length) {
          const bot = sala.assentos.findIndex(a => a && a.bot);
          if (bot < 0) return cb({ ok: false, erro: 'Sala cheia' });
          livres.push(bot);
        }
        assento = livres[0];
        sala.assentos[assento] = {
          token, nome: limparTexto(dados.nome, 16) || 'Jogador', avatar: limparTexto(dados.avatar, 8) || '🙂',
          socketId: socket.id, bot: false, conectado: true, assento
        };
      }
      if (socket.data.codigo && socket.data.codigo !== codigo) socket.leave('sala:' + socket.data.codigo);
      socket.data.codigo = codigo;
      socket.data.token = token;
      socket.join('sala:' + codigo);
      clearTimeout(sala.timerVazia);
      transferirHost(sala);
      cb({ ok: true, codigo });
      enviarSala(sala);
      if (sala.estado === 'jogo' && sala.mesa) socket.emit('estado', sala.mesa.pacote(assento, []));
    });

    socket.on('assento', (dados) => {
      const { sala, assento } = salaDoSocket(socket);
      if (!sala || assento < 0 || sala.estado !== 'lobby') return;
      const destino = dados && dados.assento;
      if (!(destino >= 0 && destino < sala.numJogadores) || sala.assentos[destino]) return;
      sala.assentos[destino] = sala.assentos[assento];
      sala.assentos[destino].assento = destino;
      sala.assentos[assento] = null;
      enviarSala(sala);
    });

    socket.on('bot', (dados) => {
      const { sala } = salaDoSocket(socket);
      if (!sala || sala.hostToken !== socket.data.token || sala.estado !== 'lobby') return;
      const i = dados && dados.assento;
      if (!(i >= 0 && i < sala.numJogadores)) return;
      const atual = sala.assentos[i];
      if (dados.adicionar && !atual) sala.assentos[i] = criarBot(sala, i);
      else if (!dados.adicionar && atual && (atual.bot || atual.token !== sala.hostToken)) {
        if (!atual.bot && atual.socketId) ns.to(atual.socketId).emit('expulso', { texto: 'Você foi removido da sala' });
        sala.assentos[i] = null;
      }
      enviarSala(sala);
    });

    socket.on('configurar', (dados) => {
      const { sala } = salaDoSocket(socket);
      if (!sala || sala.hostToken !== socket.data.token || sala.estado !== 'lobby' || !dados) return;
      if (DIFICULDADES.includes(dados.dificuldade)) sala.dificuldade = dados.dificuldade;
      enviarSala(sala);
    });

    socket.on('iniciar', (dados, cb) => {
      cb = typeof cb === 'function' ? cb : () => {};
      const { sala } = salaDoSocket(socket);
      if (!sala) return cb({ ok: false, erro: 'Sala não encontrada' });
      if (sala.hostToken !== socket.data.token) return cb({ ok: false, erro: 'Só o anfitrião pode iniciar' });
      const podeReiniciar = sala.estado === 'lobby' || (sala.mesa && sala.mesa.partida.fase === 'fimJogo');
      if (!podeReiniciar) return cb({ ok: false, erro: 'A partida já está em andamento' });
      iniciarMesa(sala);
      cb({ ok: true });
    });

    socket.on('acao', (dados, cb) => {
      cb = typeof cb === 'function' ? cb : () => {};
      const { sala, assento } = salaDoSocket(socket);
      if (!sala || !sala.mesa || assento < 0) return cb({ ok: false, erro: 'Você não está em uma partida' });
      cb(sala.mesa.acao(assento, dados && dados.acao));
    });

    socket.on('falar', (dados) => {
      const { sala, assento } = salaDoSocket(socket);
      if (!sala || assento < 0) return;
      const agora = Date.now();
      if (agora - socket.data.ultimaFala < 700) return;
      socket.data.ultimaFala = agora;
      const texto = limparTexto(dados && dados.texto, 80);
      if (!texto) return;
      if (sala.mesa && sala.estado === 'jogo') {
        sala.mesa.falar(assento, texto, !!(dados && dados.voz));
      } else {
        const a = sala.assentos[assento];
        ns.to('sala:' + sala.codigo).emit('chat', { nome: a.nome, avatar: a.avatar, texto });
      }
    });

    socket.on('sair', () => {
      const { sala, assento } = salaDoSocket(socket);
      socket.data.codigo = null;
      if (!sala) return;
      socket.leave('sala:' + sala.codigo);
      if (assento >= 0) liberarAssento(sala, assento);
    });

    socket.on('disconnect', () => {
      const { sala, assento } = salaDoSocket(socket);
      if (!sala || assento < 0) return;
      const a = sala.assentos[assento];
      if (a.socketId !== socket.id) return;
      a.conectado = false;
      a.socketId = null;
      enviarSala(sala);
      clearTimeout(a.timerAusencia);
      if (sala.estado === 'jogo' && sala.mesa) {
        enviarAviso(sala, a.nome + ' caiu. A IA assume se não voltar logo.');
        a.timerAusencia = setTimeout(() => {
          if (!a.conectado && sala.mesa) sala.mesa.definirSubstituto(assento, true);
        }, TEMPO_AUSENCIA_JOGO);
      } else {
        a.timerAusencia = setTimeout(() => {
          if (!a.conectado && sala.assentos[assento] === a) liberarAssento(sala, assento);
        }, TEMPO_AUSENCIA_LOBBY);
      }
      transferirHost(sala);
      verificarSalaVazia(sala);
    });
  });

  return { salas };
};
