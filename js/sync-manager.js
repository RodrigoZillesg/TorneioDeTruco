/**
 * Gerenciador de Sincronização Completo
 * Integra WebSockets, API REST e persistência local
 */

window.SyncManager = (function() {
  'use strict';

  let socket = null;
  let torneioId = null;
  let isConnected = false;
  let syncCallbacks = {};
  let reconnectTimer = null;
  let syncQueue = [];

  /**
   * Inicializa o gerenciador de sincronização
   */
  async function inicializar(idTorneio, callbacks = {}) {
    console.log('🚀 Iniciando SyncManager para torneio:', idTorneio);
    
    torneioId = idTorneio;
    syncCallbacks = callbacks;
    
    // Primeiro, tentar carregar do servidor
    await carregarDoServidor();
    
    // Depois, conectar WebSocket
    conectarWebSocket();
    
    return true;
  }

  /**
   * Carrega estado do servidor via API REST
   */
  async function carregarDoServidor() {
    if (!window.ApiClient || !torneioId) return null;
    
    try {
      console.log('📡 Carregando torneio do servidor...');
      const response = await window.ApiClient.obter(torneioId);
      
      if (response.success && response.torneio) {
        console.log('✅ Torneio carregado do servidor');
        
        // Salvar localmente
        if (window.PersistenceManager) {
          await window.PersistenceManager.salvar(response.torneio);
        }
        
        // Notificar callbacks
        if (syncCallbacks.onEstadoInicial) {
          syncCallbacks.onEstadoInicial(response.torneio);
        }
        
        return response.torneio;
      }
    } catch (error) {
      console.warn('⚠️ Não foi possível carregar do servidor:', error);
    }
    
    return null;
  }

  /**
   * Salva estado no servidor via API REST
   */
  async function salvarNoServidor(dados) {
    if (!window.ApiClient || !torneioId) return false;
    
    try {
      const response = await window.ApiClient.salvar(torneioId, dados);
      
      if (response.success) {
        console.log('💾 Torneio salvo no servidor');
        return true;
      }
    } catch (error) {
      console.warn('⚠️ Erro ao salvar no servidor:', error);
      
      // Adicionar à fila para retry
      syncQueue.push({
        tipo: 'salvar',
        dados: dados,
        timestamp: Date.now()
      });
    }
    
    return false;
  }

  /**
   * Conecta ao WebSocket
   */
  function conectarWebSocket() {
    if (typeof io === 'undefined') {
      console.warn('Socket.IO não disponível');
      // Fallback: usar apenas API REST com polling
      iniciarPolling();
      return;
    }
    
    try {
      socket = io(window.location.origin, {
        reconnection: true,
        reconnectionDelay: 1000,
        reconnectionAttempts: 10,
        timeout: 10000
      });
      
      // Eventos de conexão
      socket.on('connect', () => {
        console.log('✅ WebSocket conectado');
        isConnected = true;
        
        // Entrar no torneio
        socket.emit('entrar-torneio', torneioId);
        
        // Processar fila de sincronização pendente
        processarFilaSync();
        
        // Notificar callbacks
        if (syncCallbacks.onConectar) {
          syncCallbacks.onConectar();
        }
      });
      
      socket.on('disconnect', () => {
        console.log('❌ WebSocket desconectado');
        isConnected = false;
        
        if (syncCallbacks.onDesconectar) {
          syncCallbacks.onDesconectar();
        }
      });
      
      // Estado inicial do torneio
      socket.on('estado-inicial', (dados) => {
        console.log('📊 Estado inicial recebido via WebSocket');
        
        // Salvar localmente
        if (window.PersistenceManager) {
          window.PersistenceManager.salvar(dados);
        }
        
        if (syncCallbacks.onEstadoInicial) {
          syncCallbacks.onEstadoInicial(dados);
        }
      });
      
      // Torneio não encontrado
      socket.on('torneio-nao-encontrado', async (dados) => {
        console.log('⚠️ Torneio não encontrado no servidor, criando...');
        
        // Carregar dados locais e enviar para servidor
        if (window.PersistenceManager) {
          const torneioLocal = await window.PersistenceManager.carregarLocal();
          if (torneioLocal && torneioLocal.id === dados.torneioId) {
            await salvarNoServidor(torneioLocal);
            socket.emit('atualizar-torneio', torneioLocal);
          }
        }
      });
      
      // Atualizações em tempo real
      socket.on('torneio-atualizado', (dados) => {
        console.log('🔄 Torneio atualizado');
        processarAtualizacao('torneio', dados);
      });
      
      socket.on('bracket-atualizado', (dados) => {
        console.log('🏆 Bracket atualizado');
        processarAtualizacao('bracket', dados);
      });
      
      socket.on('partida-atualizada', (dados) => {
        console.log('⚡ Partida atualizada');
        processarAtualizacao('partida', dados);
      });
      
      // Clientes conectados
      socket.on('clientes-atualizado', (dados) => {
        console.log(`👥 Clientes conectados: ${dados.total}`);
        if (syncCallbacks.onClientesAtualizado) {
          syncCallbacks.onClientesAtualizado(dados);
        }
      });
      
    } catch (error) {
      console.error('Erro ao conectar WebSocket:', error);
      // Fallback para polling
      iniciarPolling();
    }
  }

  /**
   * Processa atualização recebida
   */
  function processarAtualizacao(tipo, dados) {
    // Salvar localmente
    if (window.PersistenceManager) {
      window.PersistenceManager.salvar(dados);
    }
    
    // Notificar callbacks apropriados
    switch(tipo) {
      case 'torneio':
        if (syncCallbacks.onTorneioAtualizado) {
          syncCallbacks.onTorneioAtualizado(dados);
        }
        break;
        
      case 'bracket':
        if (syncCallbacks.onBracketAtualizado) {
          syncCallbacks.onBracketAtualizado(dados);
        }
        break;
        
      case 'partida':
        if (syncCallbacks.onPartidaAtualizada) {
          syncCallbacks.onPartidaAtualizada(dados);
        }
        break;
    }
  }

  /**
   * Envia atualização
   */
  async function enviarAtualizacao(tipo, dados) {
    // Adicionar metadados
    dados.id = torneioId;
    dados.modificadoEm = new Date().toISOString();
    
    // Salvar localmente primeiro
    if (window.PersistenceManager) {
      await window.PersistenceManager.salvar(dados);
    }
    
    // Salvar no servidor via API
    await salvarNoServidor(dados);
    
    // Enviar via WebSocket se conectado
    if (socket && isConnected) {
      switch(tipo) {
        case 'torneio':
          socket.emit('atualizar-torneio', dados);
          break;
        case 'bracket':
          socket.emit('atualizar-bracket', dados);
          break;
        case 'partida':
          socket.emit('atualizar-partida', dados);
          break;
      }
      console.log(`📤 Atualização enviada: ${tipo}`);
    } else {
      // Adicionar à fila para envio posterior
      syncQueue.push({
        tipo: tipo,
        dados: dados,
        timestamp: Date.now()
      });
    }
  }

  /**
   * Processa fila de sincronização pendente
   */
  async function processarFilaSync() {
    if (syncQueue.length === 0) return;
    
    console.log(`📦 Processando ${syncQueue.length} itens na fila de sync`);
    
    while (syncQueue.length > 0) {
      const item = syncQueue.shift();
      
      if (item.tipo === 'salvar') {
        await salvarNoServidor(item.dados);
      } else {
        await enviarAtualizacao(item.tipo, item.dados);
      }
    }
  }

  /**
   * Inicia polling como fallback
   */
  function iniciarPolling() {
    console.log('🔄 Iniciando polling (fallback)');
    
    setInterval(async () => {
      if (!torneioId) return;
      
      try {
        const torneioServidor = await carregarDoServidor();
        if (torneioServidor) {
          // Comparar com versão local
          const torneioLocal = await window.PersistenceManager.carregarLocal();
          
          if (!torneioLocal || 
              new Date(torneioServidor.modificadoEm) > new Date(torneioLocal.modificadoEm || 0)) {
            processarAtualizacao('torneio', torneioServidor);
          }
        }
      } catch (error) {
        console.warn('Erro no polling:', error);
      }
    }, 3000); // A cada 3 segundos
  }

  /**
   * Reconecta ao servidor
   */
  function reconectar() {
    if (reconnectTimer) {
      clearTimeout(reconnectTimer);
    }
    
    reconnectTimer = setTimeout(() => {
      console.log('🔄 Tentando reconectar...');
      
      if (socket) {
        socket.connect();
      } else {
        conectarWebSocket();
      }
    }, 2000);
  }

  /**
   * Desconecta e limpa recursos
   */
  function desconectar() {
    console.log('🔌 Desconectando SyncManager');
    
    if (socket) {
      socket.disconnect();
      socket = null;
    }
    
    if (reconnectTimer) {
      clearTimeout(reconnectTimer);
      reconnectTimer = null;
    }
    
    torneioId = null;
    isConnected = false;
    syncCallbacks = {};
    syncQueue = [];
  }

  /**
   * Verifica status da conexão
   */
  function estaConectado() {
    return isConnected;
  }

  /**
   * Força sincronização completa
   */
  async function forcarSincronizacao() {
    console.log('🔄 Forçando sincronização completa');
    
    // Carregar do servidor
    const torneioServidor = await carregarDoServidor();
    
    // Carregar local
    const torneioLocal = await window.PersistenceManager.carregarLocal();
    
    if (torneioServidor && torneioLocal) {
      // Comparar timestamps e usar o mais recente
      const serverTime = new Date(torneioServidor.modificadoEm || 0).getTime();
      const localTime = new Date(torneioLocal.modificadoEm || 0).getTime();
      
      if (serverTime > localTime) {
        console.log('📥 Usando versão do servidor (mais recente)');
        processarAtualizacao('torneio', torneioServidor);
      } else if (localTime > serverTime) {
        console.log('📤 Enviando versão local (mais recente)');
        await enviarAtualizacao('torneio', torneioLocal);
      } else {
        console.log('✅ Torneio já está sincronizado');
      }
    } else if (torneioServidor) {
      processarAtualizacao('torneio', torneioServidor);
    } else if (torneioLocal) {
      await enviarAtualizacao('torneio', torneioLocal);
    }
  }

  // API pública
  return {
    inicializar,
    enviarAtualizacao,
    desconectar,
    estaConectado,
    forcarSincronizacao,
    carregarDoServidor,
    salvarNoServidor
  };
})();

console.log('🎯 SyncManager carregado');