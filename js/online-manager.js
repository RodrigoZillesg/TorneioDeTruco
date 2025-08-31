/**
 * Gerenciador Online - Sistema 100% baseado em servidor
 * Toda a persistência é feita no servidor, nada local
 */

window.OnlineManager = (function() {
  'use strict';

  const API_BASE = window.location.origin;
  let socket = null;
  let currentTournamentId = null;
  let isConnected = false;
  let callbacks = {};

  /**
   * Faz requisição HTTP para o servidor
   */
  async function apiRequest(endpoint, options = {}) {
    try {
      const response = await fetch(`${API_BASE}${endpoint}`, {
        headers: {
          'Content-Type': 'application/json',
          ...options.headers
        },
        ...options
      });
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error(`Erro na API ${endpoint}:`, error);
      throw error;
    }
  }

  /**
   * Lista todos os torneios do servidor
   */
  async function listarTorneios() {
    try {
      const response = await apiRequest('/api/torneios');
      return response.success ? response.torneios : [];
    } catch (error) {
      console.error('Erro ao listar torneios:', error);
      return [];
    }
  }

  /**
   * Carrega um torneio específico do servidor
   */
  async function carregarTorneio(id) {
    try {
      const response = await apiRequest(`/api/torneios/${id}`);
      return response.success ? response.torneio : null;
    } catch (error) {
      console.error('Erro ao carregar torneio:', error);
      return null;
    }
  }

  /**
   * Cria novo torneio no servidor
   */
  async function criarTorneio(dadosTorneio) {
    try {
      const torneio = {
        ...dadosTorneio,
        id: dadosTorneio.id || `tourn_${Date.now()}`,
        criadoEm: new Date().toISOString(),
        modificadoEm: new Date().toISOString()
      };
      
      const response = await apiRequest(`/api/torneios/${torneio.id}`, {
        method: 'POST',
        body: JSON.stringify(torneio)
      });
      
      if (response.success) {
        // Conectar WebSocket para este torneio
        conectarWebSocket(torneio.id);
        return response.torneio;
      }
      
      throw new Error('Falha ao criar torneio');
    } catch (error) {
      console.error('Erro ao criar torneio:', error);
      throw error;
    }
  }

  /**
   * Atualiza torneio no servidor
   */
  async function atualizarTorneio(id, dadosTorneio) {
    try {
      const torneio = {
        ...dadosTorneio,
        id: id,
        modificadoEm: new Date().toISOString()
      };
      
      const response = await apiRequest(`/api/torneios/${id}`, {
        method: 'POST',
        body: JSON.stringify(torneio)
      });
      
      if (response.success) {
        // Notificar via WebSocket se conectado
        if (socket && socket.connected) {
          socket.emit('atualizar-torneio', torneio);
        }
        return response.torneio;
      }
      
      throw new Error('Falha ao atualizar torneio');
    } catch (error) {
      console.error('Erro ao atualizar torneio:', error);
      throw error;
    }
  }

  /**
   * Exclui torneio do servidor
   */
  async function excluirTorneio(id) {
    try {
      const response = await apiRequest(`/api/torneios/${id}`, {
        method: 'DELETE'
      });
      
      if (response.success) {
        // Desconectar WebSocket se for o torneio atual
        if (currentTournamentId === id) {
          desconectarWebSocket();
        }
        return true;
      }
      
      throw new Error('Falha ao excluir torneio');
    } catch (error) {
      console.error('Erro ao excluir torneio:', error);
      throw error;
    }
  }

  /**
   * Conecta WebSocket para sincronização em tempo real
   */
  function conectarWebSocket(torneioId) {
    // Desconectar conexão anterior se existir
    if (socket) {
      socket.disconnect();
    }
    
    currentTournamentId = torneioId;
    
    if (typeof io === 'undefined') {
      console.warn('Socket.IO não disponível');
      return;
    }
    
    socket = io(API_BASE, {
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: 10
    });
    
    socket.on('connect', () => {
      console.log('✅ Conectado ao servidor');
      isConnected = true;
      
      // Entrar na sala do torneio
      socket.emit('entrar-torneio', torneioId);
      
      if (callbacks.onConnect) {
        callbacks.onConnect();
      }
    });
    
    socket.on('disconnect', () => {
      console.log('❌ Desconectado do servidor');
      isConnected = false;
      
      if (callbacks.onDisconnect) {
        callbacks.onDisconnect();
      }
    });
    
    // Receber estado inicial
    socket.on('estado-inicial', (dados) => {
      console.log('📊 Estado inicial recebido');
      if (callbacks.onEstadoInicial) {
        callbacks.onEstadoInicial(dados);
      }
    });
    
    // Receber atualizações
    socket.on('torneio-atualizado', (dados) => {
      console.log('🔄 Torneio atualizado');
      if (callbacks.onTorneioAtualizado) {
        callbacks.onTorneioAtualizado(dados);
      }
    });
    
    socket.on('bracket-atualizado', (dados) => {
      console.log('🏆 Bracket atualizado');
      if (callbacks.onBracketAtualizado) {
        callbacks.onBracketAtualizado(dados);
      }
    });
    
    socket.on('partida-atualizada', (dados) => {
      console.log('⚡ Partida atualizada');
      if (callbacks.onPartidaAtualizada) {
        callbacks.onPartidaAtualizada(dados);
      }
    });
    
    // Contador de usuários conectados
    socket.on('clientes-atualizado', (dados) => {
      console.log(`👥 Usuários online: ${dados.total}`);
      if (callbacks.onUsuariosAtualizado) {
        callbacks.onUsuariosAtualizado(dados);
      }
    });
  }

  /**
   * Desconecta WebSocket
   */
  function desconectarWebSocket() {
    if (socket) {
      socket.disconnect();
      socket = null;
    }
    currentTournamentId = null;
    isConnected = false;
  }

  /**
   * Define callbacks para eventos
   */
  function setCallbacks(newCallbacks) {
    callbacks = { ...callbacks, ...newCallbacks };
  }

  /**
   * Verifica status da conexão
   */
  function estaConectado() {
    return isConnected;
  }

  /**
   * Obtém ID do torneio atual
   */
  function getTorneioAtual() {
    return currentTournamentId;
  }

  /**
   * Envia atualização de partida
   */
  function atualizarPartida(dados) {
    if (socket && socket.connected) {
      socket.emit('atualizar-partida', dados);
    }
  }

  /**
   * Envia atualização de bracket
   */
  function atualizarBracket(dados) {
    if (socket && socket.connected) {
      socket.emit('atualizar-bracket', dados);
    }
  }

  // ===== FUNÇÕES DE USUÁRIO LOCAL =====
  
  /**
   * Obtém dados do usuário local (nome e foto)
   */
  function getUsuarioLocal() {
    const dados = localStorage.getItem('usuario_local');
    if (dados) {
      try {
        return JSON.parse(dados);
      } catch (e) {
        return null;
      }
    }
    return null;
  }

  /**
   * Salva dados do usuário local
   */
  function setUsuarioLocal(nome, foto = null) {
    const usuario = {
      id: localStorage.getItem('usuario_id') || `user_${Date.now()}`,
      nome: nome,
      foto: foto,
      atualizadoEm: new Date().toISOString()
    };
    
    localStorage.setItem('usuario_id', usuario.id);
    localStorage.setItem('usuario_local', JSON.stringify(usuario));
    
    return usuario;
  }

  /**
   * Remove dados do usuário local
   */
  function limparUsuarioLocal() {
    localStorage.removeItem('usuario_local');
    localStorage.removeItem('usuario_id');
  }

  /**
   * Verifica status do servidor
   */
  async function verificarServidor() {
    try {
      const response = await apiRequest('/api/status');
      return response;
    } catch (error) {
      return { status: 'offline', error: error.message };
    }
  }

  // API pública
  return {
    // Torneios
    listarTorneios,
    carregarTorneio,
    criarTorneio,
    atualizarTorneio,
    excluirTorneio,
    
    // WebSocket
    conectarWebSocket,
    desconectarWebSocket,
    setCallbacks,
    estaConectado,
    getTorneioAtual,
    
    // Atualizações
    atualizarPartida,
    atualizarBracket,
    
    // Usuário local
    getUsuarioLocal,
    setUsuarioLocal,
    limparUsuarioLocal,
    
    // Status
    verificarServidor
  };
})();

console.log('🌐 OnlineManager carregado - Sistema 100% online');