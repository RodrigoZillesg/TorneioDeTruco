/**
 * Cliente para API REST de sincronização de torneios
 */

window.ApiClient = (function() {
  'use strict';

  const BASE_URL = window.location.origin;

  async function request(endpoint, options = {}) {
    try {
      const response = await fetch(`${BASE_URL}${endpoint}`, {
        headers: {
          'Content-Type': 'application/json',
          ...options.headers
        },
        ...options
      });
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error(`Erro na API ${endpoint}:`, error);
      throw error;
    }
  }

  // Listar todos os torneios
  async function listarTorneios() {
    return await request('/api/torneios');
  }

  // Obter torneio específico
  async function obterTorneio(id) {
    return await request(`/api/torneios/${id}`);
  }

  // Salvar torneio
  async function salvarTorneio(id, torneio) {
    return await request(`/api/torneios/${id}`, {
      method: 'POST',
      body: JSON.stringify(torneio)
    });
  }

  // Deletar torneio
  async function deletarTorneio(id) {
    return await request(`/api/torneios/${id}`, {
      method: 'DELETE'
    });
  }

  // Verificar status do servidor
  async function verificarStatus() {
    try {
      return await request('/api/status');
    } catch (error) {
      return { status: 'offline', error: error.message };
    }
  }

  return {
    listar: listarTorneios,
    obter: obterTorneio,
    salvar: salvarTorneio,
    deletar: deletarTorneio,
    status: verificarStatus
  };
})();

console.log('🌐 Cliente API carregado');