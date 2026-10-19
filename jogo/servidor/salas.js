/**
 * Salas online do jogo de Truco (Socket.IO, namespace /truco)
 * O servidor é a autoridade da partida: os clientes só enviam ações.
 */
const Sala = require('../compartilhado/sala');

const LETRAS = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
const TEMPO_SALA_VAZIA = 10 * 60 * 1000;
const { limparTexto } = Sala;

module.exports = function configurarSalasTruco(io) {
  const ns = io.of('/truco');
  // codigo -> { sala, sockets: Map(token -> socketId), timerVazia }
  const salas = new Map();

  function gerarCodigo() {
    let codigo;
    do {
      codigo = '';
      for (let i = 0; i < 4; i++) codigo += LETRAS[Math.floor(Math.random() * LETRAS.length)];
    } while (salas.has(codigo));
    return codigo;
  }

  function novaSala(dados, token) {
    const codigo = gerarCodigo();
    const registro = { sockets: new Map(), timerVazia: null };
    registro.sala = new Sala({
      codigo,
      hostToken: token,
      numJogadores: dados.numJogadores,
      dificuldade: dados.dificuldade,
      enviar: (destino, evento, conteudo) => {
        const id = registro.sockets.get(destino);
        if (id) ns.to(id).emit(evento, conteudo);
      }
    });
    salas.set(codigo, registro);
    return registro;
  }

  function verificarSalaVazia(registro) {
    clearTimeout(registro.timerVazia);
    if (registro.sala.humanosConectados().length) return;
    registro.timerVazia = setTimeout(() => {
      if (registro.sala.humanosConectados().length) return;
      registro.sala.encerrar();
      salas.delete(registro.sala.codigo);
    }, TEMPO_SALA_VAZIA);
  }

  function registroDoSocket(socket) {
    const codigo = socket.data.codigo;
    return (codigo && salas.get(codigo)) || null;
  }

  function vincular(socket, registro, token) {
    const anterior = socket.data.codigo;
    if (anterior && anterior !== registro.sala.codigo) socket.leave('sala:' + anterior);
    socket.data.codigo = registro.sala.codigo;
    socket.data.token = token;
    socket.join('sala:' + registro.sala.codigo);
    registro.sockets.set(token, socket.id);
    clearTimeout(registro.timerVazia);
  }

  ns.on('connection', (socket) => {
    socket.data.ultimaFala = 0;

    socket.on('criar', (dados, cb) => {
      cb = typeof cb === 'function' ? cb : () => {};
      dados = dados || {};
      const token = limparTexto(dados.token, 64);
      if (!token) return cb({ ok: false, erro: 'Identificação inválida' });
      const registro = novaSala(dados, token);
      vincular(socket, registro, token);
      const r = registro.sala.entrar(token, dados);
      cb(r.ok ? { ok: true, codigo: registro.sala.codigo } : r);
    });

    socket.on('entrar', (dados, cb) => {
      cb = typeof cb === 'function' ? cb : () => {};
      dados = dados || {};
      const codigo = limparTexto(dados.codigo, 8).toUpperCase();
      const token = limparTexto(dados.token, 64);
      const registro = salas.get(codigo);
      if (!registro) return cb({ ok: false, erro: 'Sala não encontrada' });
      if (!token) return cb({ ok: false, erro: 'Identificação inválida' });
      // Registra o socket antes de entrar para receber o estado da sala
      const anterior = registro.sockets.get(token);
      registro.sockets.set(token, socket.id);
      const r = registro.sala.entrar(token, dados);
      if (!r.ok) {
        if (anterior) registro.sockets.set(token, anterior);
        else registro.sockets.delete(token);
        return cb(r);
      }
      vincular(socket, registro, token);
      cb({ ok: true, codigo });
    });

    socket.on('assento', (dados) => {
      const registro = registroDoSocket(socket);
      if (registro) registro.sala.trocarAssento(socket.data.token, dados && dados.assento);
    });

    socket.on('bot', (dados) => {
      const registro = registroDoSocket(socket);
      if (registro && dados) registro.sala.alterarBot(socket.data.token, dados.assento, !!dados.adicionar);
    });

    socket.on('configurar', (dados) => {
      const registro = registroDoSocket(socket);
      if (registro) registro.sala.configurar(socket.data.token, dados);
    });

    socket.on('iniciar', (dados, cb) => {
      cb = typeof cb === 'function' ? cb : () => {};
      const registro = registroDoSocket(socket);
      if (!registro) return cb({ ok: false, erro: 'Sala não encontrada' });
      cb(registro.sala.iniciar(socket.data.token));
    });

    socket.on('acao', (dados, cb) => {
      cb = typeof cb === 'function' ? cb : () => {};
      const registro = registroDoSocket(socket);
      if (!registro) return cb({ ok: false, erro: 'Você não está em uma partida' });
      cb(registro.sala.acao(socket.data.token, dados && dados.acao));
    });

    socket.on('falar', (dados) => {
      const registro = registroDoSocket(socket);
      if (!registro) return;
      const agora = Date.now();
      if (agora - socket.data.ultimaFala < 700) return;
      socket.data.ultimaFala = agora;
      registro.sala.falar(socket.data.token, dados && dados.texto, dados && dados.voz);
    });

    socket.on('sair', () => {
      const registro = registroDoSocket(socket);
      socket.data.codigo = null;
      if (!registro) return;
      socket.leave('sala:' + registro.sala.codigo);
      registro.sala.sair(socket.data.token);
      registro.sockets.delete(socket.data.token);
      verificarSalaVazia(registro);
    });

    socket.on('disconnect', () => {
      const registro = registroDoSocket(socket);
      if (!registro) return;
      const token = socket.data.token;
      // Ignora quedas de um socket antigo quando o jogador já reconectou
      if (registro.sockets.get(token) !== socket.id) return;
      registro.sockets.delete(token);
      registro.sala.desconectou(token);
      verificarSalaVazia(registro);
    });
  });

  return { salas };
};
