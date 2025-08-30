#!/bin/bash
# Script de atualização para EasyPanel Console
# Execute este script no console do EasyPanel

echo "🔄 Iniciando atualização do sistema de sincronização..."

# Navegar para pasta do código
cd /etc/easypanel/projects/truco/torneio-de-truco/code

# Fazer backup
echo "📦 Criando backup..."
cp -r . ../backup-$(date +%Y%m%d-%H%M%S)

# Baixar arquivos atualizados diretamente do seu servidor ou GitHub
# Alternativa: criar os arquivos manualmente

echo "📝 Criando arquivo persistence.js..."
cat > js/persistence.js << 'ENDOFFILE'
window.PersistenceManager = (function() {
  'use strict';
  const STORAGE_KEY = 'torneio_truco_data';
  const SYNC_KEY = 'torneio_sync_timestamp';
  const TORNEIO_ATUAL_KEY = 'torneioAtual';
  
  function salvarTorneio(torneio) {
    if (!torneio) return false;
    try {
      const dadosString = JSON.stringify(torneio);
      const timestamp = Date.now();
      localStorage.setItem(TORNEIO_ATUAL_KEY, dadosString);
      localStorage.setItem(STORAGE_KEY, dadosString);
      localStorage.setItem(SYNC_KEY, timestamp.toString());
      sessionStorage.setItem(TORNEIO_ATUAL_KEY, dadosString);
      
      window.dispatchEvent(new StorageEvent('storage', {
        key: TORNEIO_ATUAL_KEY,
        newValue: dadosString,
        oldValue: null,
        storageArea: localStorage,
        url: window.location.href
      }));
      
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
      
      console.log('✅ Torneio salvo com sucesso');
      return true;
    } catch (error) {
      console.error('❌ Erro ao salvar torneio:', error);
      try {
        localStorage.setItem('torneio_backup_' + Date.now(), JSON.stringify(torneio));
      } catch (e) {
        console.error('Falha crítica ao salvar:', e);
      }
      return false;
    }
  }
  
  function carregarTorneio() {
    let torneio = null;
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
    
    if (torneio) {
      salvarTorneio(torneio);
    }
    
    return torneio;
  }
  
  function configurarSincronizacao(callback) {
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
  }
  
  return {
    salvar: salvarTorneio,
    carregar: carregarTorneio,
    configurarSync: configurarSincronizacao
  };
})();
console.log('Sistema de Persistência Universal carregado');
ENDOFFILE

echo "✅ persistence.js criado!"

# Atualizar index.html para incluir o novo script
echo "📝 Atualizando index.html..."
sed -i '/<script src="js\/db.js"><\/script>/a <script src="js/persistence.js"></script>' index.html

echo "🔄 Reiniciando aplicação..."
# Tentar reiniciar com PM2 se disponível
if command -v pm2 &> /dev/null; then
    pm2 restart all
else
    # Alternativa: matar processo node e deixar EasyPanel reiniciar
    pkill -f "node server.js"
fi

echo "✅ Atualização concluída!"
echo "🌐 Acesse https://truco-torneio-de-truco.qczjfz.easypanel.host/ para testar"
echo "🔍 Use /diagnostico.html para verificar o status"