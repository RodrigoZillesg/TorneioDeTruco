/**
 * Servidor Node.js com WebSocket para Torneio de Truco
 * Sincronização em tempo real entre múltiplos dispositivos
 */

const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');
const cors = require('cors');
const fs = require('fs').promises;

const app = express();
const server = http.createServer(app);

// Configurar Socket.IO com CORS
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

// Jogo de Truco online (salas em tempo real no namespace /truco)
require('./jogo/servidor/salas')(io);

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

// Arquivo para persistência de torneios
const ARQUIVO_TORNEIOS = 'torneios-persistentes.json';

// Cache de torneios persistidos
let cacheTorneios = {};

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
  socket.on('entrar-torneio', async (torneioId) => {
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

    // Carregar estado persistido se não houver em memória
    if (!torneio.dados) {
      try {
        const dadosPersistidos = await carregarTorneioPersistente(torneioId);
        if (dadosPersistidos) {
          torneio.atualizarDados(dadosPersistidos);
          console.log(`📁 Estado do torneio ${torneioId} recuperado do disco`);
        }
      } catch (error) {
        console.error('Erro ao carregar torneio persistido:', error);
      }
    }

    // Enviar estado atual do torneio se existir
    if (torneio.dados) {
      socket.emit('estado-inicial', torneio.dados);
      console.log(`📊 Estado inicial enviado para cliente ${socket.id}`);
    } else {
      socket.emit('torneio-nao-encontrado', { torneioId });
    }

    // Enviar contagem de clientes
    io.to(torneioId).emit('clientes-atualizado', {
      total: torneio.clientes.size,
      clientes: Array.from(torneio.clientes)
    });
  });

  // Atualização de partida
  socket.on('atualizar-partida', async (dados) => {
    const torneioId = clientesTorneio.get(socket.id);
    if (!torneioId) return;

    console.log(`⚡ Atualização de partida no torneio ${torneioId}`);
    
    // Salvar estado no servidor
    const torneio = torneiosAtivos.get(torneioId);
    if (torneio) {
      torneio.atualizarDados(dados);
      // Persistir imediatamente
      await salvarTorneioPersistente(torneioId, dados);
    }

    // Broadcast para todos no torneio exceto o remetente
    socket.to(torneioId).emit('partida-atualizada', {
      ...dados,
      remetenteId: socket.id,
      timestamp: Date.now()
    });
  });

  // Atualização de bracket
  socket.on('atualizar-bracket', async (dados) => {
    const torneioId = clientesTorneio.get(socket.id);
    if (!torneioId) return;

    console.log(`🏆 Atualização de bracket no torneio ${torneioId}`);
    
    // Salvar estado no servidor
    const torneio = torneiosAtivos.get(torneioId);
    if (torneio) {
      torneio.atualizarDados(dados);
      // Persistir imediatamente
      await salvarTorneioPersistente(torneioId, dados);
    }

    // Broadcast para todos no torneio exceto o remetente
    socket.to(torneioId).emit('bracket-atualizado', {
      ...dados,
      remetenteId: socket.id,
      timestamp: Date.now()
    });
  });

  // Atualização de torneio
  socket.on('atualizar-torneio', async (dados) => {
    const torneioId = clientesTorneio.get(socket.id);
    if (!torneioId) return;

    console.log(`📊 Atualização de torneio ${torneioId}`);
    
    // Salvar estado no servidor
    const torneio = torneiosAtivos.get(torneioId);
    if (torneio) {
      torneio.atualizarDados(dados);
      // Persistir imediatamente
      await salvarTorneioPersistente(torneioId, dados);
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

// Funções de persistência
async function carregarTorneisPersistentes() {
  try {
    const data = await fs.readFile(ARQUIVO_TORNEIOS, 'utf8');
    cacheTorneios = JSON.parse(data).torneios || {};
    return { torneios: cacheTorneios };
  } catch (error) {
    cacheTorneios = {};
    return { torneios: {} };
  }
}

async function salvarTorneisPersistentes(dados) {
  try {
    await fs.writeFile(ARQUIVO_TORNEIOS, JSON.stringify(dados, null, 2));
    return true;
  } catch (error) {
    console.error('Erro ao salvar torneios:', error);
    return false;
  }
}

// Carregar torneio específico persistido
async function carregarTorneioPersistente(torneioId) {
  try {
    const dados = await carregarTorneisPersistentes();
    return dados.torneios[torneioId] || null;
  } catch (error) {
    console.error('Erro ao carregar torneio persistido:', error);
    return null;
  }
}

// Salvar torneio específico
async function salvarTorneioPersistente(torneioId, dadosTorneio) {
  try {
    const dados = await carregarTorneisPersistentes();
    
    // Atualizar torneio
    dados.torneios[torneioId] = {
      ...dadosTorneio,
      id: torneioId,
      modificadoEm: new Date().toISOString()
    };
    
    // Salvar no arquivo
    await salvarTorneisPersistentes(dados);
    
    // Atualizar cache
    cacheTorneios[torneioId] = dados.torneios[torneioId];
    
    console.log(`💾 Torneio ${torneioId} persistido com sucesso`);
    return true;
  } catch (error) {
    console.error('Erro ao salvar torneio:', error);
    return false;
  }
}

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

// API REST - Listar torneios persistentes
app.get('/api/torneios', async (req, res) => {
  try {
    const dados = await carregarTorneisPersistentes();
    const lista = Object.values(dados.torneios || {})
      .sort((a, b) => new Date(b.modificadoEm || b.criadoEm) - new Date(a.modificadoEm || a.criadoEm))
      .slice(0, 50);
    
    res.json({ success: true, torneios: lista });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// API REST - Obter torneio específico
app.get('/api/torneios/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const dados = await carregarTorneisPersistentes();
    const torneio = dados.torneios[id];
    
    if (!torneio) {
      return res.status(404).json({ success: false, error: 'Torneio não encontrado' });
    }
    
    res.json({ success: true, torneio });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// API REST - Salvar/atualizar torneio
app.post('/api/torneios/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const torneio = req.body;
    
    if (!torneio || !torneio.nome) {
      return res.status(400).json({ success: false, error: 'Dados do torneio inválidos' });
    }
    
    const dados = await carregarTorneisPersistentes();
    
    // Adicionar metadados
    torneio.id = id;
    torneio.modificadoEm = new Date().toISOString();
    if (!torneio.criadoEm) {
      torneio.criadoEm = torneio.modificadoEm;
    }
    
    dados.torneios[id] = torneio;
    
    const salvou = await salvarTorneisPersistentes(dados);
    if (!salvou) {
      return res.status(500).json({ success: false, error: 'Erro ao salvar' });
    }
    
    // Notificar via WebSocket se há clientes conectados
    if (torneiosAtivos.has(id)) {
      io.to(id).emit('torneio-atualizado', {
        torneio,
        timestamp: Date.now()
      });
    }
    
    res.json({ success: true, torneio });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// API REST - Deletar torneio
app.delete('/api/torneios/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const dados = await carregarTorneisPersistentes();
    
    if (!dados.torneios[id]) {
      return res.status(404).json({ success: false, error: 'Torneio não encontrado' });
    }
    
    delete dados.torneios[id];
    
    const salvou = await salvarTorneisPersistentes(dados);
    if (!salvou) {
      return res.status(500).json({ success: false, error: 'Erro ao deletar' });
    }
    
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Iniciar servidor
server.listen(PORT, async () => {
  // Carregar torneios persistidos na inicialização
  await carregarTorneisPersistentes();
  console.log(`📁 ${Object.keys(cacheTorneios).length} torneios carregados do disco`);
  
  console.log(`
    🎮 Servidor Torneio de Truco rodando!
    📡 Porta: ${PORT}
    🌐 Local: http://localhost:${PORT}
    ⚡ WebSocket pronto para conexões
    📊 API Status: http://localhost:${PORT}/api/status
    💾 Torneios persistidos: ${Object.keys(cacheTorneios).length}
  `);
});