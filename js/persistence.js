/**
 * Sistema de Persistência Universal
 * Garante que os dados sejam salvos e sincronizados entre dispositivos
 */

window.PersistenceManager = (function() {
  'use strict';

  const STORAGE_KEY = 'torneio_truco_data';
  const SYNC_KEY = 'torneio_sync_timestamp';
  const TORNEIO_ATUAL_KEY = 'torneioAtual';
  const TORNEIOS_PUBLICOS_KEY = 'torneios_publicos_compartilhados';
  
  /**
   * Salva dados do torneio em múltiplos locais
   */
  async function salvarTorneio(torneio) {
    if (!torneio) return false;
    
    try {
      const dadosString = JSON.stringify(torneio);
      const timestamp = Date.now();
      
      // 1. LocalStorage principal
      localStorage.setItem(TORNEIO_ATUAL_KEY, dadosString);
      localStorage.setItem(STORAGE_KEY, dadosString);
      localStorage.setItem(SYNC_KEY, timestamp.toString());
      
      // 2. SessionStorage como backup
      sessionStorage.setItem(TORNEIO_ATUAL_KEY, dadosString);
      
      // 3. IndexedDB via Dexie (se disponível)
      if (window.db && window.db.torneios) {
        salvarIndexedDB(torneio);
      }
      
      // 4. Salvar como torneio compartilhável (chave única global)
      const chaveCompartilhada = `torneio_global_${torneio.id}`;
      localStorage.setItem(chaveCompartilhada, dadosString);
      
      // Registrar na lista de torneios públicos
      salvarTorneioPublico(torneio);
      
      // 5. Salvar no servidor via API para sincronização entre dispositivos
      if (window.ApiClient) {
        try {
          await window.ApiClient.salvar(torneio.id, torneio);
          console.log('🌐 Torneio sincronizado no servidor');
        } catch (error) {
          console.warn('Falha ao sincronizar no servidor:', error);
        }
      }
      
      // 6. Disparar evento para sincronização entre abas
      window.dispatchEvent(new StorageEvent('storage', {
        key: TORNEIO_ATUAL_KEY,
        newValue: dadosString,
        oldValue: null,
        storageArea: localStorage,
        url: window.location.href
      }));
      
      // 7. Broadcast via BroadcastChannel (se disponível)
      if (typeof BroadcastChannel !== 'undefined') {
        try {
          const channel = new BroadcastChannel('torneio_sync');
          channel.postMessage({
            type: 'torneio_update',
            data: torneio,
            timestamp: timestamp
          });
          channel.close();
        } catch (e) {
          console.warn('BroadcastChannel não disponível:', e);
        }
      }
      
      console.log('✅ Torneio salvo com sucesso em todos os locais');
      return true;
      
    } catch (error) {
      console.error('❌ Erro ao salvar torneio:', error);
      
      // Fallback: tentar salvar pelo menos no localStorage
      try {
        localStorage.setItem('torneio_backup_' + Date.now(), JSON.stringify(torneio));
      } catch (e) {
        console.error('Falha crítica ao salvar:', e);
      }
      
      return false;
    }
  }
  
  /**
   * Salva torneio na lista pública compartilhada
   */
  function salvarTorneioPublico(torneio) {
    try {
      let torneiosPublicos = [];
      
      const dados = localStorage.getItem(TORNEIOS_PUBLICOS_KEY);
      if (dados) {
        torneiosPublicos = JSON.parse(dados);
      }
      
      // Remover versão anterior se existir
      torneiosPublicos = torneiosPublicos.filter(t => t.id !== torneio.id);
      
      // Adicionar versão atual
      torneiosPublicos.push({
        id: torneio.id,
        nome: torneio.nome,
        status: torneio.status,
        criadoEm: torneio.criadoEm,
        modificadoEm: torneio.modificadoEm || new Date().toISOString(),
        deviceInfo: navigator.userAgent.substring(0, 50)
      });
      
      // Manter apenas os 10 mais recentes
      torneiosPublicos.sort((a, b) => new Date(b.modificadoEm) - new Date(a.modificadoEm));
      torneiosPublicos = torneiosPublicos.slice(0, 10);
      
      localStorage.setItem(TORNEIOS_PUBLICOS_KEY, JSON.stringify(torneiosPublicos));
      console.log('📝 Torneio adicionado à lista pública');
      
    } catch (error) {
      console.error('Erro ao salvar torneio público:', error);
    }
  }
  
  /**
   * Lista todos os torneios compartilhados disponíveis
   */
  function listarTorneiosPublicos() {
    try {
      const dados = localStorage.getItem(TORNEIOS_PUBLICOS_KEY);
      if (dados) {
        const lista = JSON.parse(dados);
        console.log(`📋 ${lista.length} torneios públicos encontrados`);
        return lista;
      }
    } catch (error) {
      console.error('Erro ao listar torneios públicos:', error);
    }
    return [];
  }
  
  /**
   * Carrega dados do torneio de qualquer fonte disponível
   */
  async function carregarTorneio() {
    let torneio = null;
    
    // 1. Tentar localStorage primeiro
    try {
      const dados = localStorage.getItem(TORNEIO_ATUAL_KEY) || 
                   localStorage.getItem(STORAGE_KEY);
      if (dados) {
        torneio = JSON.parse(dados);
        console.log('📁 Torneio carregado do localStorage');
      }
    } catch (error) {
      console.warn('Erro ao carregar do localStorage:', error);
    }
    
    // 2. Se não encontrou, tentar carregar do servidor
    if (!torneio && window.ApiClient) {
      try {
        const response = await window.ApiClient.listar();
        if (response.success && response.torneios.length > 0) {
          torneio = response.torneios[0]; // Mais recente
          console.log('🌐 Torneio carregado do servidor');
        }
      } catch (error) {
        console.warn('Erro ao carregar do servidor:', error);
      }
    }
    
    // 3. Se não encontrou, tentar sessionStorage
    if (!torneio) {
      try {
        const dados = sessionStorage.getItem(TORNEIO_ATUAL_KEY);
        if (dados) {
          torneio = JSON.parse(dados);
          console.log('📁 Torneio carregado do sessionStorage');
        }
      } catch (error) {
        console.warn('Erro ao carregar do sessionStorage:', error);
      }
    }
    
    // 4. Se ainda não encontrou, procurar torneios compartilhados
    if (!torneio) {
      torneio = procurarTorneioCompartilhado();
    }
    
    // 5. Se ainda não encontrou, procurar backups
    if (!torneio) {
      torneio = procurarBackups();
    }
    
    // 6. Se encontrou algum torneio, re-salvar em todos os locais
    if (torneio) {
      await salvarTorneio(torneio);
    }
    
    return torneio;
  }
  
  /**
   * Procura por torneios compartilhados de outros dispositivos
   */
  function procurarTorneioCompartilhado() {
    try {
      // Procurar por chaves de torneios globais
      for (let i = 0; i < localStorage.length; i++) {
        const chave = localStorage.key(i);
        if (chave && chave.startsWith('torneio_global_')) {
          try {
            const dados = localStorage.getItem(chave);
            if (dados) {
              const torneio = JSON.parse(dados);
              
              // Verificar se é recente (últimas 24 horas)
              const agora = Date.now();
              const criadoEm = new Date(torneio.criadoEm).getTime();
              const umDia = 24 * 60 * 60 * 1000;
              
              if (agora - criadoEm < umDia) {
                console.log(`🔄 Torneio compartilhado encontrado: ${torneio.nome}`);
                return torneio;
              }
            }
          } catch (e) {
            console.warn('Dados de torneio corrompidos:', chave);
            localStorage.removeItem(chave);
          }
        }
      }
      
      // Também verificar lista de torneios públicos
      const torneiosPublicos = listarTorneiosPublicos();
      if (torneiosPublicos.length > 0) {
        const maisRecente = torneiosPublicos[0];
        const chaveGlobal = `torneio_global_${maisRecente.id}`;
        const dados = localStorage.getItem(chaveGlobal);
        
        if (dados) {
          const torneio = JSON.parse(dados);
          console.log(`📋 Torneio carregado da lista pública: ${torneio.nome}`);
          return torneio;
        }
      }
      
    } catch (error) {
      console.error('Erro ao procurar torneios compartilhados:', error);
    }
    
    return null;
  }
  
  /**
   * Procura por backups do torneio
   */
  function procurarBackups() {
    const keys = Object.keys(localStorage);
    const backupKeys = keys.filter(k => k.startsWith('torneio_backup_'));
    
    if (backupKeys.length === 0) return null;
    
    // Ordenar por timestamp (mais recente primeiro)
    backupKeys.sort((a, b) => {
      const timeA = parseInt(a.split('_')[2]);
      const timeB = parseInt(b.split('_')[2]);
      return timeB - timeA;
    });
    
    // Tentar carregar o backup mais recente
    for (const key of backupKeys) {
      try {
        const dados = localStorage.getItem(key);
        if (dados) {
          const torneio = JSON.parse(dados);
          console.log('📁 Torneio recuperado de backup:', key);
          
          // Limpar backups antigos
          localStorage.removeItem(key);
          
          return torneio;
        }
      } catch (error) {
        console.warn('Backup corrompido:', key);
        localStorage.removeItem(key);
      }
    }
    
    return null;
  }
  
  /**
   * Salva no IndexedDB via Dexie
   */
  async function salvarIndexedDB(torneio) {
    try {
      if (!window.db) return;
      
      // Salvar torneio principal
      await window.db.torneios.put({
        id: torneio.id,
        nome: torneio.nome,
        status: torneio.status,
        criadoEm: torneio.criadoEm,
        dados: JSON.stringify(torneio)
      });
      
      console.log('💾 Torneio salvo no IndexedDB');
      
    } catch (error) {
      console.warn('Erro ao salvar no IndexedDB:', error);
    }
  }
  
  /**
   * Carrega do IndexedDB
   */
  async function carregarIndexedDB() {
    try {
      if (!window.db) return null;
      
      const torneios = await window.db.torneios.toArray();
      if (torneios.length > 0) {
        // Pegar o mais recente
        const maisRecente = torneios.sort((a, b) => 
          new Date(b.criadoEm) - new Date(a.criadoEm)
        )[0];
        
        if (maisRecente.dados) {
          return JSON.parse(maisRecente.dados);
        }
      }
    } catch (error) {
      console.warn('Erro ao carregar do IndexedDB:', error);
    }
    
    return null;
  }
  
  /**
   * Limpa todos os dados salvos
   */
  function limparTudo() {
    try {
      // Limpar localStorage
      const keys = Object.keys(localStorage);
      keys.forEach(key => {
        if (key.includes('torneio') || key.includes('truco')) {
          localStorage.removeItem(key);
        }
      });
      
      // Limpar sessionStorage
      sessionStorage.clear();
      
      // Limpar IndexedDB
      if (window.db) {
        window.db.torneios.clear();
        window.db.duplas.clear();
        window.db.partidas.clear();
      }
      
      console.log('🗑️ Todos os dados foram limpos');
      return true;
      
    } catch (error) {
      console.error('Erro ao limpar dados:', error);
      return false;
    }
  }
  
  /**
   * Verifica se há dados salvos
   */
  function temDadosSalvos() {
    return !!(localStorage.getItem(TORNEIO_ATUAL_KEY) || 
             localStorage.getItem(STORAGE_KEY) ||
             sessionStorage.getItem(TORNEIO_ATUAL_KEY));
  }
  
  /**
   * Obtém timestamp da última sincronização
   */
  function getUltimaSync() {
    const timestamp = localStorage.getItem(SYNC_KEY);
    return timestamp ? parseInt(timestamp) : 0;
  }
  
  /**
   * Configura listeners para sincronização entre abas
   */
  function configurarSincronizacao(callback) {
    // Storage event para sincronização entre abas
    window.addEventListener('storage', function(e) {
      if (e.key === TORNEIO_ATUAL_KEY && e.newValue) {
        try {
          const torneio = JSON.parse(e.newValue);
          console.log('📥 Torneio atualizado de outra aba');
          if (callback) callback(torneio);
        } catch (error) {
          console.error('Erro ao processar sincronização:', error);
        }
      }
    });
    
    // BroadcastChannel para sincronização mais eficiente
    if (typeof BroadcastChannel !== 'undefined') {
      try {
        const channel = new BroadcastChannel('torneio_sync');
        channel.addEventListener('message', function(e) {
          if (e.data && e.data.type === 'torneio_update') {
            console.log('📡 Torneio atualizado via BroadcastChannel');
            if (callback) callback(e.data.data);
          }
        });
      } catch (error) {
        console.warn('BroadcastChannel não suportado:', error);
      }
    }
    
    // Verificar periodicamente por atualizações
    setInterval(function() {
      const timestamp = getUltimaSync();
      const agora = Date.now();
      
      // Se não houve atualização nos últimos 30 segundos, recarregar
      if (agora - timestamp > 30000) {
        const torneio = carregarTorneio();
        if (torneio && callback) {
          callback(torneio);
        }
      }
    }, 5000); // Verificar a cada 5 segundos
  }
  
  /**
   * Lista torneios do servidor
   */
  async function listarTorneiosServidor() {
    if (!window.ApiClient) return [];
    
    try {
      const response = await window.ApiClient.listar();
      return response.success ? response.torneios : [];
    } catch (error) {
      console.warn('Erro ao listar torneios do servidor:', error);
      return [];
    }
  }

  /**
   * Sincronização periódica com servidor
   */
  function iniciarSincronizacaoServidor(callback) {
    if (!window.ApiClient) return;
    
    setInterval(async () => {
      try {
        const torneiosServidor = await listarTorneiosServidor();
        if (torneiosServidor.length > 0) {
          const maisRecente = torneiosServidor[0];
          const torneioLocal = carregarTorneioLocal();
          
          // Se o servidor tem torneio mais recente, atualizar local
          if (!torneioLocal || new Date(maisRecente.modificadoEm) > new Date(torneioLocal.modificadoEm || 0)) {
            console.log('🔄 Sincronizando torneio do servidor');
            await salvarTorneio(maisRecente);
            if (callback) callback(maisRecente);
          }
        }
      } catch (error) {
        console.warn('Erro na sincronização periódica:', error);
      }
    }, 5000); // A cada 5 segundos para evitar conflitos
  }

  /**
   * Carrega torneio apenas do localStorage (sem API)
   */
  function carregarTorneioLocal() {
    try {
      const dados = localStorage.getItem(TORNEIO_ATUAL_KEY) || 
                   localStorage.getItem(STORAGE_KEY);
      return dados ? JSON.parse(dados) : null;
    } catch (error) {
      return null;
    }
  }

  // API pública
  return {
    salvar: salvarTorneio,
    carregar: carregarTorneio,
    carregarLocal: carregarTorneioLocal,
    carregarAsync: carregarIndexedDB,
    listarPublicos: listarTorneiosPublicos,
    listarServidor: listarTorneiosServidor,
    limpar: limparTudo,
    temDados: temDadosSalvos,
    configurarSync: configurarSincronizacao,
    iniciarSyncServidor: iniciarSincronizacaoServidor,
    ultimaSync: getUltimaSync
  };
})();

console.log('Sistema de Persistência Universal carregado');