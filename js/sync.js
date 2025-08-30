/**
 * Sistema de Sincronização em Tempo Real - Torneio de Truco
 * 
 * Implementa sincronização entre múltiplas abas/dispositivos usando:
 * - localStorage events para abas do mesmo navegador
 * - BroadcastChannel API para comunicação eficiente
 * - Sistema de versionamento para evitar conflitos
 * - Heartbeat para detectar clientes ativos
 */

// Namespace global para funções de sincronização
window.syncFunctions = (function() {
  'use strict';

  let isInitialized = false;
  let currentTournamentId = null;
  let lastSyncTimestamp = 0;
  let heartbeatInterval = null;
  let broadcastChannel = null;
  let socket = null; // Socket.IO connection
  
  // Callbacks para notificar mudanças
  const callbacks = {
    onTournamentUpdate: null,
    onBracketUpdate: null,
    onMatchUpdate: null,
    onPlayerJoin: null,
    onPlayerLeave: null
  };

  /**
   * Inicializa o sistema de sincronização
   * @param {string} tournamentId - ID do torneio a sincronizar
   * @param {Object} callbackHandlers - Funções de callback para eventos
   */
  function inicializarSync(tournamentId, callbackHandlers = {}) {
    if (isInitialized && currentTournamentId === tournamentId) {
      console.log('Sync já inicializado para este torneio');
      return;
    }

    console.log('Inicializando sincronização para torneio:', tournamentId);
    
    currentTournamentId = tournamentId;
    lastSyncTimestamp = Date.now();
    
    // Registrar callbacks
    Object.assign(callbacks, callbackHandlers);
    
    try {
      // Tentar conectar via WebSocket primeiro (se disponível)
      if (typeof io !== 'undefined') {
        inicializarWebSocket(tournamentId);
      } else {
        console.log('Socket.IO não disponível, usando fallback local');
        
        // Inicializar BroadcastChannel se disponível
        if (typeof BroadcastChannel !== 'undefined') {
          broadcastChannel = new BroadcastChannel(`truco_tournament_${tournamentId}`);
          broadcastChannel.addEventListener('message', processarMensagemBroadcast);
          console.log('BroadcastChannel inicializado');
        }
        
        // Fallback: localStorage events
        window.addEventListener('storage', processarEventoStorage);
      }
      
      // Iniciar heartbeat
      iniciarHeartbeat();
      
      // Marcar como cliente ativo
      marcarClienteAtivo();
      
      isInitialized = true;
      console.log('Sistema de sincronização inicializado');
      
    } catch (error) {
      console.error('Erro ao inicializar sincronização:', error);
    }
  }

  /**
   * Inicializa conexão WebSocket com servidor
   */
  function inicializarWebSocket(tournamentId) {
    try {
      // Verificar se Socket.IO está disponível
      if (typeof io === 'undefined' || window.ioUnavailable) {
        console.log('Socket.IO não disponível, usando fallback local');
        inicializarFallback(tournamentId);
        return;
      }
      
      // Conectar ao servidor Socket.IO
      socket = io(window.location.origin, {
        reconnection: true,
        reconnectionDelay: 1000,
        reconnectionAttempts: 5,
        timeout: 5000
      });
      
      // Eventos de conexão
      socket.on('connect', () => {
        console.log('✅ WebSocket conectado');
        socket.emit('entrar-torneio', tournamentId);
      });
      
      socket.on('disconnect', () => {
        console.log('❌ WebSocket desconectado');
      });
      
      // Receber estado inicial
      socket.on('estado-inicial', (dados) => {
        console.log('📊 Estado inicial recebido');
        if (callbacks.onTournamentUpdate) {
          callbacks.onTournamentUpdate(dados);
        }
      });
      
      // Atualizações de partida
      socket.on('partida-atualizada', (dados) => {
        console.log('⚡ Partida atualizada via WebSocket');
        if (callbacks.onMatchUpdate) {
          callbacks.onMatchUpdate(dados);
        }
      });
      
      // Atualizações de bracket
      socket.on('bracket-atualizado', (dados) => {
        console.log('🏆 Bracket atualizado via WebSocket');
        if (callbacks.onBracketUpdate) {
          callbacks.onBracketUpdate(dados);
        }
      });
      
      // Atualizações de torneio
      socket.on('torneio-atualizado', (dados) => {
        console.log('📊 Torneio atualizado via WebSocket');
        if (callbacks.onTournamentUpdate) {
          callbacks.onTournamentUpdate(dados);
        }
      });
      
      // Clientes conectados/desconectados
      socket.on('cliente-conectado', (dados) => {
        if (callbacks.onPlayerJoin) {
          callbacks.onPlayerJoin(dados);
        }
      });
      
      socket.on('cliente-desconectado', (dados) => {
        if (callbacks.onPlayerLeave) {
          callbacks.onPlayerLeave(dados);
        }
      });
      
      // Contador de clientes
      socket.on('clientes-atualizado', (dados) => {
        console.log(`👥 Clientes conectados: ${dados.total}`);
      });
      
      console.log('WebSocket inicializado com sucesso');
      
    } catch (error) {
      console.error('Erro ao inicializar WebSocket:', error);
      // Fallback para métodos locais
      inicializarFallback(tournamentId);
    }
  }
  
  /**
   * Inicializa métodos de fallback (BroadcastChannel/localStorage)
   */
  function inicializarFallback(tournamentId) {
    if (typeof BroadcastChannel !== 'undefined') {
      broadcastChannel = new BroadcastChannel(`truco_tournament_${tournamentId}`);
      broadcastChannel.addEventListener('message', processarMensagemBroadcast);
      console.log('BroadcastChannel inicializado como fallback');
    }
    
    window.addEventListener('storage', processarEventoStorage);
  }

  /**
   * Para a sincronização do torneio atual
   */
  function pararSync() {
    console.log('Parando sincronização');
    
    // Desconectar WebSocket se existir
    if (socket) {
      socket.disconnect();
      socket = null;
    }
    
    if (broadcastChannel) {
      broadcastChannel.close();
      broadcastChannel = null;
    }
    
    window.removeEventListener('storage', processarEventoStorage);
    
    if (heartbeatInterval) {
      clearInterval(heartbeatInterval);
      heartbeatInterval = null;
    }
    
    // Remover marca de cliente ativo
    removerClienteAtivo();
    
    isInitialized = false;
    currentTournamentId = null;
  }

  /**
   * Publica atualização do torneio
   * @param {string} tipo - Tipo de atualização (match, bracket, tournament)
   * @param {Object} dados - Dados da atualização
   */
  function publicarAtualizacao(tipo, dados) {
    if (!currentTournamentId) {
      console.warn('Tentativa de publicar sem torneio ativo');
      return;
    }

    const mensagem = {
      timestamp: Date.now(),
      tournamentId: currentTournamentId,
      tipo,
      dados,
      clienteId: obterClienteId()
    };

    try {
      // Usar WebSocket se disponível
      if (socket && socket.connected) {
        switch(tipo) {
          case 'match':
            socket.emit('atualizar-partida', dados);
            break;
          case 'bracket':
            socket.emit('atualizar-bracket', dados);
            break;
          case 'tournament':
            socket.emit('atualizar-torneio', dados);
            break;
        }
        console.log(`Atualização publicada via WebSocket: ${tipo}`);
      } else {
        // Fallback: BroadcastChannel ou localStorage
        if (broadcastChannel) {
          broadcastChannel.postMessage(mensagem);
        }
        
        // localStorage como último recurso
        const chaveSync = `sync_${currentTournamentId}_${tipo}`;
        localStorage.setItem(chaveSync, JSON.stringify(mensagem));
        
        console.log(`Atualização publicada localmente: ${tipo}`);
      }
      
    } catch (error) {
      console.error('Erro ao publicar atualização:', error);
    }
  }

  /**
   * Processa mensagem recebida via BroadcastChannel
   * @param {MessageEvent} event - Evento da mensagem
   */
  function processarMensagemBroadcast(event) {
    const mensagem = event.data;
    
    if (!mensagem || mensagem.tournamentId !== currentTournamentId) {
      return;
    }
    
    // Ignorar mensagens do próprio cliente
    if (mensagem.clienteId === obterClienteId()) {
      return;
    }
    
    processarAtualizacaoRecebida(mensagem);
  }

  /**
   * Processa evento de storage (fallback)
   * @param {StorageEvent} event - Evento de storage
   */
  function processarEventoStorage(event) {
    if (!event.key || !event.key.startsWith(`sync_${currentTournamentId}_`)) {
      return;
    }
    
    try {
      const mensagem = JSON.parse(event.newValue);
      
      if (!mensagem || mensagem.clienteId === obterClienteId()) {
        return;
      }
      
      processarAtualizacaoRecebida(mensagem);
      
    } catch (error) {
      console.error('Erro ao processar evento de storage:', error);
    }
  }

  /**
   * Processa atualização recebida de outro cliente
   * @param {Object} mensagem - Mensagem de atualização
   */
  function processarAtualizacaoRecebida(mensagem) {
    // Evitar processar mensagens antigas
    if (mensagem.timestamp <= lastSyncTimestamp) {
      return;
    }
    
    lastSyncTimestamp = mensagem.timestamp;
    
    console.log(`Recebida atualização: ${mensagem.tipo}`, mensagem.dados);
    
    // Chamar callback apropriado
    switch (mensagem.tipo) {
      case 'match':
        if (callbacks.onMatchUpdate) {
          callbacks.onMatchUpdate(mensagem.dados);
        }
        break;
        
      case 'bracket':
        if (callbacks.onBracketUpdate) {
          callbacks.onBracketUpdate(mensagem.dados);
        }
        break;
        
      case 'tournament':
        if (callbacks.onTournamentUpdate) {
          callbacks.onTournamentUpdate(mensagem.dados);
        }
        break;
        
      case 'player_join':
        if (callbacks.onPlayerJoin) {
          callbacks.onPlayerJoin(mensagem.dados);
        }
        break;
        
      case 'player_leave':
        if (callbacks.onPlayerLeave) {
          callbacks.onPlayerLeave(mensagem.dados);
        }
        break;
    }
  }

  /**
   * Marca cliente como ativo no torneio
   */
  function marcarClienteAtivo() {
    if (!currentTournamentId) return;
    
    const clienteInfo = {
      id: obterClienteId(),
      tournamentId: currentTournamentId,
      joinedAt: Date.now(),
      lastSeen: Date.now(),
      userAgent: navigator.userAgent.substring(0, 100)
    };
    
    const chaveCliente = `client_${currentTournamentId}_${clienteInfo.id}`;
    localStorage.setItem(chaveCliente, JSON.stringify(clienteInfo));
    
    // Notificar outros clientes
    publicarAtualizacao('player_join', clienteInfo);
  }

  /**
   * Remove marca de cliente ativo
   */
  function removerClienteAtivo() {
    if (!currentTournamentId) return;
    
    const clienteId = obterClienteId();
    const chaveCliente = `client_${currentTournamentId}_${clienteId}`;
    
    // Notificar outros clientes antes de sair
    publicarAtualizacao('player_leave', { id: clienteId, leftAt: Date.now() });
    
    localStorage.removeItem(chaveCliente);
  }

  /**
   * Atualiza timestamp de atividade do cliente
   */
  function atualizarHeartbeat() {
    if (!currentTournamentId) return;
    
    const clienteId = obterClienteId();
    const chaveCliente = `client_${currentTournamentId}_${clienteId}`;
    
    try {
      const clienteInfo = JSON.parse(localStorage.getItem(chaveCliente) || '{}');
      clienteInfo.lastSeen = Date.now();
      localStorage.setItem(chaveCliente, JSON.stringify(clienteInfo));
    } catch (error) {
      console.warn('Erro ao atualizar heartbeat:', error);
    }
  }

  /**
   * Inicia heartbeat para manter cliente ativo
   */
  function iniciarHeartbeat() {
    if (heartbeatInterval) {
      clearInterval(heartbeatInterval);
    }
    
    heartbeatInterval = setInterval(atualizarHeartbeat, 5000); // A cada 5 segundos
  }

  /**
   * Lista clientes ativos no torneio
   * @returns {Array} - Lista de clientes ativos
   */
  function listarClientesAtivos() {
    if (!currentTournamentId) return [];
    
    const clientesAtivos = [];
    const agora = Date.now();
    const timeout = 30000; // 30 segundos
    
    try {
      for (let i = 0; i < localStorage.length; i++) {
        const chave = localStorage.key(i);
        if (chave && chave.startsWith(`client_${currentTournamentId}_`)) {
          try {
            const clienteInfo = JSON.parse(localStorage.getItem(chave));
            
            // Considerar ativo se visto nos últimos 30 segundos
            if (agora - clienteInfo.lastSeen < timeout) {
              clientesAtivos.push(clienteInfo);
            } else {
              // Remover cliente inativo
              localStorage.removeItem(chave);
            }
          } catch (e) {
            // Remover entrada corrompida
            localStorage.removeItem(chave);
          }
        }
      }
    } catch (error) {
      console.error('Erro ao listar clientes ativos:', error);
    }
    
    return clientesAtivos.sort((a, b) => a.joinedAt - b.joinedAt);
  }

  /**
   * Obtém ID único do cliente atual
   * @returns {string} - ID do cliente
   */
  function obterClienteId() {
    let clienteId = sessionStorage.getItem('truco_client_id');
    
    if (!clienteId) {
      clienteId = `client_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      sessionStorage.setItem('truco_client_id', clienteId);
    }
    
    return clienteId;
  }

  /**
   * Força sincronização manual do estado atual
   */
  function forcarSincronizacao() {
    if (!window.torneioAtual?.value) return;
    
    publicarAtualizacao('tournament', {
      id: window.torneioAtual.value.id,
      status: window.torneioAtual.value.status,
      bracket: window.torneioAtual.value.bracket,
      duplas: window.torneioAtual.value.duplas,
      timestamp: Date.now()
    });
  }

  /**
   * Limpa dados de sincronização antigos
   */
  function limparDadosSync() {
    try {
      const chaves = [];
      for (let i = 0; i < localStorage.length; i++) {
        const chave = localStorage.key(i);
        if (chave && (chave.startsWith('sync_') || chave.startsWith('client_'))) {
          chaves.push(chave);
        }
      }
      
      chaves.forEach(chave => localStorage.removeItem(chave));
      console.log(`Limpeza: ${chaves.length} entradas de sync removidas`);
    } catch (error) {
      console.error('Erro ao limpar dados de sync:', error);
    }
  }

  // Limpeza automática ao sair da página
  window.addEventListener('beforeunload', () => {
    removerClienteAtivo();
  });

  // API pública do módulo
  return {
    inicializarSync,
    pararSync,
    publicarAtualizacao,
    listarClientesAtivos,
    forcarSincronizacao,
    limparDadosSync,
    obterClienteId,
    isActive: () => isInitialized,
    getCurrentTournament: () => currentTournamentId
  };
})();

console.log('Módulo de Sincronização carregado');