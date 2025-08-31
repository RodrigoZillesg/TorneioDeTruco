/**
 * Sistema de Controle de Versão
 * IMPORTANTE: Atualizar VERSION a cada mudança no código!
 */

window.AppVersion = {
  VERSION: '2.0.1',
  BUILD_DATE: '2024-08-31',
  LAST_UPDATE: '11:45',
  
  // Changelog resumido
  CHANGES: {
    '2.0.1': 'Correções: Tela branca em duplas e funções faltantes',
    '2.0.0': 'MAJOR: Sistema 100% online - Sem persistência local, tudo no servidor',
    '1.3.1': 'Correção: Exclusão completa de torneios (local, servidor e cache)',
    '1.3.0': 'Sistema robusto de sincronização com SyncManager e persistência no servidor',
    '1.2.9': 'Melhorias: Clareza do bracket e correção de sincronização',
    '1.2.8': 'URGENTE: Correção de erros JavaScript críticos',
    '1.2.7': 'Correções: Pontuação detalhada no bracket e botão remover tentos',
    '1.2.6': 'Melhorias: Sincronização em tempo real e interface do bracket',
    '1.2.5': 'Implementação: API REST para sincronização real entre dispositivos',
    '1.2.4': 'Correção: Remover indicador Local do header',
    '1.2.3': 'Correções: Exclusão de torneio, bracket e interface mobile',
    '1.2.2': 'Correção: Sincronização de dados entre dispositivos',
    '1.2.1': 'Adicionado sistema de versionamento visível no header',
    '1.2.0': 'Sistema de persistência universal e sincronização melhorada',
    '1.1.0': 'Sincronização WebSocket e indicador de status',
    '1.0.0': 'Versão inicial com torneios e bracket'
  },
  
  // Obtém a versão formatada para exibição
  getDisplayVersion() {
    return `v${this.VERSION}`;
  },
  
  // Obtém informações completas
  getFullInfo() {
    return `Versão ${this.VERSION} - ${this.BUILD_DATE} ${this.LAST_UPDATE}`;
  },
  
  // Verifica se há nova versão (comparando com localStorage)
  checkForUpdates() {
    const storedVersion = localStorage.getItem('app_version');
    if (storedVersion && storedVersion !== this.VERSION) {
      console.log(`🔄 Nova versão detectada: ${storedVersion} → ${this.VERSION}`);
      // Limpar cache se necessário
      this.clearOldCache();
    }
    localStorage.setItem('app_version', this.VERSION);
  },
  
  // Limpa cache antigo quando há nova versão
  clearOldCache() {
    console.log('🧹 Limpando cache da versão anterior...');
    // Limpar service worker cache se existir
    if ('caches' in window) {
      caches.keys().then(names => {
        names.forEach(name => {
          caches.delete(name);
        });
      });
    }
    
    // Forçar reload de recursos
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.getRegistrations().then(registrations => {
        registrations.forEach(registration => {
          registration.unregister();
        });
      });
    }
  }
};

// Verificar atualizações ao carregar
window.AppVersion.checkForUpdates();
console.log(`🚀 ${window.AppVersion.getFullInfo()}`);