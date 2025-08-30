/**
 * Sistema de Exportação e Compartilhamento - Torneio de Truco
 * Implementa funcionalidades de:
 * - Exportação/Importação JSON
 * - Geração de QR Code
 * - Links de compartilhamento
 * - Serialização compacta
 */

// Namespace global para funções de exportação
window.exportFunctions = (function() {
  'use strict';

  /**
   * Exporta um torneio completo para arquivo JSON
   * @param {Object} torneio - Dados do torneio a exportar
   * @param {string} nomePersonalizado - Nome personalizado para o arquivo (opcional)
   */
  function exportarTorneioJSON(torneio, nomePersonalizado = null) {
    if (!torneio) {
      throw new Error('Torneio inválido para exportação');
    }

    try {
      // Preparar dados para exportação com metadados
      const dadosExportacao = {
        versao: '1.0.0',
        exportadoEm: new Date().toISOString(),
        exportadoPor: 'Sistema Truco v1.0',
        torneio: {
          ...torneio,
          // Garantir que temos todos os campos necessários
          duplas: torneio.duplas || [],
          bracket: torneio.bracket || { rodadas: [] },
          regras: torneio.regras || {
            formato: 'eliminatoria_simples',
            melhorDe: 3,
            pontosPorMao: 1,
            criterioDesempate: 'mao_extra'
          }
        }
      };

      // Converter para JSON com formatação
      const jsonString = JSON.stringify(dadosExportacao, null, 2);
      
      // Gerar nome do arquivo
      const nomeBase = nomePersonalizado || torneio.nome.replace(/[^a-z0-9\-_\s]/gi, '');
      const timestamp = new Date().toISOString().split('T')[0];
      const nomeArquivo = `truco_${nomeBase.replace(/\s+/g, '_')}_${timestamp}.json`;
      
      // Usar FileSaver.js para download
      const blob = new Blob([jsonString], { type: 'application/json;charset=utf-8' });
      saveAs(blob, nomeArquivo);
      
      console.log('Torneio exportado:', nomeArquivo);
      return {
        sucesso: true,
        nomeArquivo,
        tamanho: blob.size
      };
    } catch (error) {
      console.error('Erro ao exportar torneio:', error);
      throw new Error('Falha na exportação: ' + error.message);
    }
  }

  /**
   * Importa torneio de arquivo JSON
   * @param {File} arquivo - Arquivo JSON selecionado pelo usuário
   * @returns {Promise<Object>} - Dados do torneio importado
   */
  async function importarTorneioJSON(arquivo) {
    if (!arquivo) {
      throw new Error('Nenhum arquivo fornecido');
    }

    if (!arquivo.name.toLowerCase().endsWith('.json')) {
      throw new Error('Arquivo deve ter extensão .json');
    }

    try {
      // Ler conteúdo do arquivo
      const conteudoTexto = await arquivo.text();
      
      if (!conteudoTexto.trim()) {
        throw new Error('Arquivo está vazio');
      }

      // Fazer parse do JSON
      const dados = JSON.parse(conteudoTexto);
      
      // Validar estrutura do arquivo
      const torneioValidado = validarEstruturaTorneio(dados);
      
      console.log('Torneio importado com sucesso:', torneioValidado.torneio?.nome);
      return {
        sucesso: true,
        dados: torneioValidado,
        versao: dados.versao || 'desconhecida'
      };
    } catch (error) {
      console.error('Erro ao importar torneio:', error);
      if (error instanceof SyntaxError) {
        throw new Error('Arquivo JSON inválido ou corrompido');
      }
      throw new Error('Falha na importação: ' + error.message);
    }
  }

  /**
   * Valida e ajusta estrutura do torneio importado
   * @param {Object} dados - Dados do arquivo importado
   * @returns {Object} - Dados validados e ajustados
   */
  function validarEstruturaTorneio(dados) {
    // Verificar se é formato novo (com metadados) ou legado (só torneio)
    let torneio;
    if (dados.torneio) {
      // Formato novo com metadados
      torneio = dados.torneio;
    } else if (dados.id && dados.nome) {
      // Formato legado - o arquivo inteiro é o torneio
      torneio = dados;
    } else {
      throw new Error('Formato de arquivo não reconhecido');
    }

    // Validações obrigatórias
    if (!torneio.nome || typeof torneio.nome !== 'string') {
      throw new Error('Nome do torneio é obrigatório');
    }

    // Ajustar campos ausentes ou inválidos
    const torneioAjustado = {
      id: torneio.id || `tourn_imported_${Date.now()}`,
      nome: torneio.nome,
      criadoEm: torneio.criadoEm || new Date().toISOString(),
      regras: {
        formato: 'eliminatoria_simples',
        melhorDe: 3,
        pontosPorMao: 1,
        criterioDesempate: 'mao_extra',
        ...torneio.regras
      },
      duplas: Array.isArray(torneio.duplas) ? torneio.duplas.map(validarDupla) : [],
      bracket: torneio.bracket && torneio.bracket.rodadas ? torneio.bracket : { rodadas: [] },
      campeao: torneio.campeao || null,
      status: torneio.status || 'configuracao'
    };

    return {
      versao: dados.versao || '1.0.0',
      importadoEm: new Date().toISOString(),
      torneio: torneioAjustado
    };
  }

  /**
   * Valida e ajusta dados de uma dupla
   * @param {Object} dupla - Dados da dupla
   * @returns {Object} - Dupla validada
   */
  function validarDupla(dupla) {
    if (!dupla || typeof dupla !== 'object') {
      throw new Error('Dados de dupla inválidos');
    }

    if (!dupla.nome || typeof dupla.nome !== 'string') {
      throw new Error('Nome da dupla é obrigatório');
    }

    return {
      id: dupla.id || `team_imported_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      nome: dupla.nome,
      jogadores: Array.isArray(dupla.jogadores) ? dupla.jogadores.slice(0, 2) : ['', ''],
      avatarUrl: dupla.avatarUrl || '',
      stats: {
        vitorias: 0,
        derrotas: 0,
        pontosPro: 0,
        pontosContra: 0,
        ...dupla.stats
      }
    };
  }

  /**
   * Gera link de compartilhamento do torneio
   * @param {Object} torneio - Dados do torneio
   * @param {boolean} somenteleitura - Se true, gera link somente leitura
   * @returns {Object} - URL gerada e informações
   */
  function gerarLinkCompartilhamento(torneio, somenteleitura = true) {
    if (!torneio) {
      throw new Error('Torneio inválido para compartilhamento');
    }

    try {
      // Preparar dados mínimos para o link
      const dadosCompartilhamento = {
        id: torneio.id,
        nome: torneio.nome,
        status: torneio.status,
        campeao: torneio.campeao,
        duplas: torneio.duplas?.map(d => ({
          id: d.id,
          nome: d.nome,
          jogadores: d.jogadores,
          stats: d.stats
        })) || [],
        bracket: torneio.bracket || { rodadas: [] },
        regras: torneio.regras,
        modo: somenteleitura ? 'somente-leitura' : 'colaborativo'
      };

      // Serializar e comprimir se necessário
      let dadosSerializados = JSON.stringify(dadosCompartilhamento);
      let comprimido = false;

      // Se muito grande, usar LZ-String para comprimir
      if (dadosSerializados.length > 1500 && window.LZString) {
        dadosSerializados = LZString.compressToEncodedURIComponent(dadosCompartilhamento);
        comprimido = true;
      }

      // Gerar URL
      const baseUrl = window.location.origin + window.location.pathname;
      const hashParams = new URLSearchParams({
        view: somenteleitura ? 'torneio' : 'colaborar',
        data: dadosSerializados,
        compressed: comprimido ? '1' : '0'
      });

      const linkCompleto = `${baseUrl}#compartilhado?${hashParams.toString()}`;

      return {
        link: linkCompleto,
        tamanho: linkCompleto.length,
        comprimido,
        valido: linkCompleto.length < 2048 // Limite típico de URL
      };
    } catch (error) {
      console.error('Erro ao gerar link:', error);
      throw new Error('Falha ao gerar link: ' + error.message);
    }
  }

  /**
   * Gera QR Code para compartilhamento
   * @param {string} url - URL para gerar QR
   * @param {HTMLElement} elemento - Elemento onde inserir o QR
   * @param {Object} opcoes - Opções de configuração
   */
  function gerarQRCode(url, elemento, opcoes = {}) {
    if (!url || !elemento) {
      throw new Error('URL e elemento são obrigatórios para gerar QR Code');
    }

    if (!window.QRCode) {
      throw new Error('Biblioteca QRCode não está disponível');
    }

    try {
      // Limpar elemento
      elemento.innerHTML = '';

      // Configurações padrão do QR Code
      const configuracoes = {
        text: url,
        width: opcoes.tamanho || 200,
        height: opcoes.tamanho || 200,
        colorDark: opcoes.corEscura || '#000000',
        colorLight: opcoes.corClara || '#FFFFFF',
        correctLevel: QRCode.CorrectLevel.M,
        ...opcoes
      };

      // Gerar QR Code
      new QRCode(elemento, configuracoes);

      console.log('QR Code gerado para URL:', url.substring(0, 50) + '...');
      return {
        sucesso: true,
        tamanhoUrl: url.length
      };
    } catch (error) {
      console.error('Erro ao gerar QR Code:', error);
      throw new Error('Falha ao gerar QR Code: ' + error.message);
    }
  }

  /**
   * Processa link compartilhado da URL atual
   * @returns {Object|null} - Dados do torneio compartilhado ou null
   */
  function processarLinkCompartilhado() {
    try {
      const hash = window.location.hash;
      
      if (!hash.includes('compartilhado')) {
        return null;
      }

      // Extrair parâmetros do hash
      const paramString = hash.split('?')[1];
      if (!paramString) {
        return null;
      }

      const params = new URLSearchParams(paramString);
      const dadosRaw = params.get('data');
      const comprimido = params.get('compressed') === '1';

      if (!dadosRaw) {
        return null;
      }

      let dadosTorneio;

      // Descomprimir se necessário
      if (comprimido && window.LZString) {
        dadosTorneio = LZString.decompressFromEncodedURIComponent(dadosRaw);
        dadosTorneio = JSON.parse(dadosTorneio);
      } else {
        dadosTorneio = JSON.parse(dadosRaw);
      }

      console.log('Link compartilhado processado:', dadosTorneio.nome);
      return {
        dados: dadosTorneio,
        modo: dadosTorneio.modo || 'somente-leitura'
      };
    } catch (error) {
      console.error('Erro ao processar link compartilhado:', error);
      return null;
    }
  }

  /**
   * Cria backup automático do torneio no localStorage
   * @param {Object} torneio - Dados do torneio
   */
  function criarBackupAutomatico(torneio) {
    if (!torneio) return;

    try {
      const chaveBackup = `backup_${torneio.id}`;
      const dadosBackup = {
        torneio,
        criadoEm: new Date().toISOString(),
        versao: '1.0.0'
      };

      localStorage.setItem(chaveBackup, JSON.stringify(dadosBackup));
      
      // Limitar número de backups (manter últimos 5)
      limparBackupsAntigos();
    } catch (error) {
      console.warn('Erro ao criar backup automático:', error);
    }
  }

  /**
   * Remove backups antigos para liberar espaço
   */
  function limparBackupsAntigos() {
    try {
      const backups = [];
      
      // Encontrar todos os backups
      for (let i = 0; i < localStorage.length; i++) {
        const chave = localStorage.key(i);
        if (chave && chave.startsWith('backup_')) {
          try {
            const dados = JSON.parse(localStorage.getItem(chave));
            backups.push({
              chave,
              criadoEm: dados.criadoEm,
              dados
            });
          } catch (e) {
            // Remove backup corrompido
            localStorage.removeItem(chave);
          }
        }
      }

      // Ordenar por data (mais recentes primeiro)
      backups.sort((a, b) => new Date(b.criadoEm) - new Date(a.criadoEm));

      // Remover backups extras (manter apenas 5)
      if (backups.length > 5) {
        backups.slice(5).forEach(backup => {
          localStorage.removeItem(backup.chave);
        });
      }
    } catch (error) {
      console.warn('Erro ao limpar backups antigos:', error);
    }
  }

  /**
   * Recupera lista de backups disponíveis
   * @returns {Array} - Lista de backups
   */
  function listarBackups() {
    const backups = [];
    
    try {
      for (let i = 0; i < localStorage.length; i++) {
        const chave = localStorage.key(i);
        if (chave && chave.startsWith('backup_')) {
          try {
            const dados = JSON.parse(localStorage.getItem(chave));
            backups.push({
              id: chave,
              nome: dados.torneio?.nome || 'Sem nome',
              criadoEm: dados.criadoEm,
              status: dados.torneio?.status || 'desconhecido'
            });
          } catch (e) {
            console.warn('Backup corrompido removido:', chave);
            localStorage.removeItem(chave);
          }
        }
      }

      // Ordenar por data (mais recentes primeiro)
      backups.sort((a, b) => new Date(b.criadoEm) - new Date(a.criadoEm));
    } catch (error) {
      console.error('Erro ao listar backups:', error);
    }

    return backups;
  }

  /**
   * Restaura torneio de backup
   * @param {string} backupId - ID do backup a restaurar
   * @returns {Object} - Dados do torneio restaurado
   */
  function restaurarBackup(backupId) {
    try {
      const dadosBackup = localStorage.getItem(backupId);
      if (!dadosBackup) {
        throw new Error('Backup não encontrado');
      }

      const backup = JSON.parse(dadosBackup);
      
      if (!backup.torneio) {
        throw new Error('Backup inválido - dados do torneio não encontrados');
      }

      console.log('Backup restaurado:', backup.torneio.nome);
      return backup.torneio;
    } catch (error) {
      console.error('Erro ao restaurar backup:', error);
      throw new Error('Falha ao restaurar backup: ' + error.message);
    }
  }

  // API pública do módulo
  return {
    exportarTorneioJSON,
    importarTorneioJSON,
    gerarLinkCompartilhamento,
    gerarQRCode,
    processarLinkCompartilhado,
    criarBackupAutomatico,
    limparBackupsAntigos,
    listarBackups,
    restaurarBackup,
    validarEstruturaTorneio,
    validarDupla
  };
})();

// Inicialização automática quando o DOM estiver pronto
document.addEventListener('DOMContentLoaded', function() {
  console.log('Sistema de Exportação/Compartilhamento carregado');
  
  // Verificar se chegamos por link compartilhado
  const linkCompartilhado = window.exportFunctions.processarLinkCompartilhado();
  if (linkCompartilhado) {
    console.log('Detectado acesso via link compartilhado:', linkCompartilhado.modo);
    
    // Emitir evento para o app principal processar
    window.dispatchEvent(new CustomEvent('torneioCompartilhado', {
      detail: linkCompartilhado
    }));
  }
});

console.log('Módulo de Exportação carregado');