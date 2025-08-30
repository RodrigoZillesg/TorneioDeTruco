/**
 * Servidor Node.js com WebSocket para Torneio de Truco
 * Sincronização em tempo real entre múltiplos dispositivos
 */

const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');
const cors = require('cors');

const app = express();
const server = http.createServer(app);

// Configurar Socket.IO com CORS
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

// Porta do servidor (EasyPanel geralmente usa variável de ambiente PORT)
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname)));

// Rota principal - servir index.html
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// Armazenamento em memória dos torneios ativos
const torneiosAtivos = new Map();
const clientesTorneio = new Map();

// Estrutura de um torneio ativo
class TorneioAtivo {
  constructor(id) {
    this.id = id;
    this.clientes = new Set();
    this.ultimaAtualizacao = Date.now();
    this.dados = null;
  }

  adicionarCliente(socketId) {
    this.clientes.add(socketId);
    this.ultimaAtualizacao = Date.now();
  }

  removerCliente(socketId) {
    this.clientes.delete(socketId);
    this.ultimaAtualizacao = Date.now();
  }

  atualizarDados(dados) {
    this.dados = dados;
    this.ultimaAtualizacao = Date.now();
  }
}

// WebSocket - Conexão de cliente
io.on('connection', (socket) => {
  console.log(`✅ Cliente conectado: ${socket.id}`);

  // Cliente entra em um torneio
  socket.on('entrar-torneio', (torneioId) => {
    console.log(`🎮 Cliente ${socket.id} entrando no torneio ${torneioId}`);
    
    // Sair de torneio anterior se estiver em algum
    if (clientesTorneio.has(socket.id)) {
      const torneioAnterior = clientesTorneio.get(socket.id);
      socket.leave(torneioAnterior);
      
      const torneio = torneiosAtivos.get(torneioAnterior);
      if (torneio) {
        torneio.removerCliente(socket.id);
      }
    }

    // Entrar no novo torneio
    socket.join(torneioId);
    clientesTorneio.set(socket.id, torneioId);

    // Criar torneio se não existe
    if (!torneiosAtivos.has(torneioId)) {
      torneiosAtivos.set(torneioId, new TorneioAtivo(torneioId));
    }

    const torneio = torneiosAtivos.get(torneioId);
    torneio.adicionarCliente(socket.id);

    // Notificar outros clientes sobre novo participante
    socket.to(torneioId).emit('cliente-conectado', {
      clienteId: socket.id,
      totalClientes: torneio.clientes.size,
      timestamp: Date.now()
    });

    // Enviar estado atual do torneio se existir
    if (torneio.dados) {
      socket.emit('estado-inicial', torneio.dados);
    }

    // Enviar contagem de clientes
    io.to(torneioId).emit('clientes-atualizado', {
      total: torneio.clientes.size,
      clientes: Array.from(torneio.clientes)
    });
  });

  // Atualização de partida
  socket.on('atualizar-partida', (dados) => {
    const torneioId = clientesTorneio.get(socket.id);
    if (!torneioId) return;

    console.log(`⚡ Atualização de partida no torneio ${torneioId}`);
    
    // Salvar estado no servidor
    const torneio = torneiosAtivos.get(torneioId);
    if (torneio) {
      torneio.atualizarDados(dados);
    }

    // Broadcast para todos no torneio exceto o remetente
    socket.to(torneioId).emit('partida-atualizada', {
      ...dados,
      remetenteId: socket.id,
      timestamp: Date.now()
    });
  });

  // Atualização de bracket
  socket.on('atualizar-bracket', (dados) => {
    const torneioId = clientesTorneio.get(socket.id);
    if (!torneioId) return;

    console.log(`🏆 Atualização de bracket no torneio ${torneioId}`);
    
    // Salvar estado no servidor
    const torneio = torneiosAtivos.get(torneioId);
    if (torneio) {
      torneio.atualizarDados(dados);
    }

    // Broadcast para todos no torneio exceto o remetente
    socket.to(torneioId).emit('bracket-atualizado', {
      ...dados,
      remetenteId: socket.id,
      timestamp: Date.now()
    });
  });

  // Atualização de torneio
  socket.on('atualizar-torneio', (dados) => {
    const torneioId = clientesTorneio.get(socket.id);
    if (!torneioId) return;

    console.log(`📊 Atualização de torneio ${torneioId}`);
    
    // Salvar estado no servidor
    const torneio = torneiosAtivos.get(torneioId);
    if (torneio) {
      torneio.atualizarDados(dados);
    }

    // Broadcast para todos no torneio exceto o remetente
    socket.to(torneioId).emit('torneio-atualizado', {
      ...dados,
      remetenteId: socket.id,
      timestamp: Date.now()
    });
  });

  // Heartbeat - manter conexão viva
  socket.on('heartbeat', () => {
    const torneioId = clientesTorneio.get(socket.id);
    if (torneioId) {
      const torneio = torneiosAtivos.get(torneioId);
      if (torneio) {
        torneio.ultimaAtualizacao = Date.now();
      }
    }
    socket.emit('heartbeat-ack');
  });

  // Desconexão
  socket.on('disconnect', () => {
    console.log(`❌ Cliente desconectado: ${socket.id}`);
    
    const torneioId = clientesTorneio.get(socket.id);
    if (torneioId) {
      const torneio = torneiosAtivos.get(torneioId);
      if (torneio) {
        torneio.removerCliente(socket.id);
        
        // Notificar outros clientes
        socket.to(torneioId).emit('cliente-desconectado', {
          clienteId: socket.id,
          totalClientes: torneio.clientes.size,
          timestamp: Date.now()
        });

        // Atualizar contagem
        io.to(torneioId).emit('clientes-atualizado', {
          total: torneio.clientes.size,
          clientes: Array.from(torneio.clientes)
        });

        // Remover torneio se não há mais clientes
        if (torneio.clientes.size === 0) {
          console.log(`🗑️ Removendo torneio vazio: ${torneioId}`);
          torneiosAtivos.delete(torneioId);
        }
      }
      
      clientesTorneio.delete(socket.id);
    }
  });
});

// Limpar torneios inativos a cada 5 minutos
setInterval(() => {
  const agora = Date.now();
  const timeout = 30 * 60 * 1000; // 30 minutos

  for (const [id, torneio] of torneiosAtivos.entries()) {
    if (torneio.clientes.size === 0 && (agora - torneio.ultimaAtualizacao) > timeout) {
      console.log(`🧹 Limpando torneio inativo: ${id}`);
      torneiosAtivos.delete(id);
    }
  }
}, 5 * 60 * 1000);

// API REST - Status do servidor
app.get('/api/status', (req, res) => {
  res.json({
    status: 'online',
    torneiosAtivos: torneiosAtivos.size,
    clientesConectados: clientesTorneio.size,
    uptime: process.uptime(),
    memoria: process.memoryUsage()
  });
});

// API REST - Listar torneios ativos
app.get('/api/torneios', (req, res) => {
  const torneios = [];
  for (const [id, torneio] of torneiosAtivos.entries()) {
    torneios.push({
      id,
      clientesConectados: torneio.clientes.size,
      ultimaAtualizacao: torneio.ultimaAtualizacao
    });
  }
  res.json(torneios);
});

// Iniciar servidor
server.listen(PORT, () => {
  console.log(`
    🎮 Servidor Torneio de Truco rodando!
    📡 Porta: ${PORT}
    🌐 Local: http://localhost:${PORT}
    ⚡ WebSocket pronto para conexões
    📊 API Status: http://localhost:${PORT}/api/status
  `);
});