let db;

async function initDb() {
  db = new Dexie('TrucoTorneiosDB');
  
  db.version(1).stores({
    torneios: 'id, nome, criadoEm, status',
    duplas: 'id, torneioId, nome, jogadores',
    partidas: 'id, torneioId, round, duplaA, duplaB, status'
  });
  
  db.version(2).stores({
    torneios: 'id, nome, criadoEm, status',
    duplas: 'id, torneioId, nome, jogadores',
    partidas: 'id, torneioId, round, duplaA, duplaB, status',
    jogadores: 'nome, usado'
  });

  try {
    await db.open();
    console.log('Database initialized successfully');
    window.db = db; // Expor globalmente
  } catch (error) {
    console.error('Error initializing database:', error);
    
    if (typeof Storage !== 'undefined') {
      console.log('Fallback to localStorage');
      db = createLocalStorageDb();
      window.db = db; // Expor globalmente
    } else {
      throw new Error('Neither IndexedDB nor localStorage is available');
    }
  }
}

function createLocalStorageDb() {
  const storageDb = {
    torneios: {
      async add(torneio) {
        const torneios = this.getAll();
        torneios.push(torneio);
        localStorage.setItem('truco_torneios', JSON.stringify(torneios));
        return torneio.id;
      },

      async get(id) {
        const torneios = this.getAll();
        return torneios.find(t => t.id === id);
      },

      async put(torneio) {
        const torneios = this.getAll();
        const index = torneios.findIndex(t => t.id === torneio.id);
        if (index !== -1) {
          torneios[index] = torneio;
          localStorage.setItem('truco_torneios', JSON.stringify(torneios));
        }
        return torneio.id;
      },

      async delete(id) {
        const torneios = this.getAll().filter(t => t.id !== id);
        localStorage.setItem('truco_torneios', JSON.stringify(torneios));
      },

      getAll() {
        const stored = localStorage.getItem('truco_torneios');
        return stored ? JSON.parse(stored) : [];
      },

      orderBy() {
        return {
          reverse() {
            return {
              async toArray() {
                const torneios = storageDb.torneios.getAll();
                return torneios.sort((a, b) => new Date(b.criadoEm) - new Date(a.criadoEm));
              }
            };
          }
        };
      }
    }
  };

  return storageDb;
}

async function salvarTorneio(torneio) {
  try {
    if (torneio.id) {
      await db.torneios.put(torneio);
    } else {
      torneio.id = `tourn_${Date.now()}`;
      await db.torneios.add(torneio);
    }
    return torneio;
  } catch (error) {
    console.error('Erro ao salvar torneio:', error);
    throw error;
  }
}

async function buscarTorneio(id) {
  try {
    return await db.torneios.get(id);
  } catch (error) {
    console.error('Erro ao buscar torneio:', error);
    return null;
  }
}

async function listarTorneios() {
  try {
    return await db.torneios.orderBy('criadoEm').reverse().toArray();
  } catch (error) {
    console.error('Erro ao listar torneios:', error);
    return [];
  }
}

async function excluirTorneio(id) {
  try {
    await db.torneios.delete(id);
    return true;
  } catch (error) {
    console.error('Erro ao excluir torneio:', error);
    return false;
  }
}

function criarModeloTorneio(dados = {}) {
  return {
    id: dados.id || null,
    nome: dados.nome || '',
    criadoEm: dados.criadoEm || new Date().toISOString(),
    regras: {
      formato: 'eliminatoria_simples',
      melhorDe: 3,
      pontosPorMao: 1,
      criterioDesempate: 'mao_extra',
      ...dados.regras
    },
    duplas: dados.duplas || [],
    bracket: {
      rodadas: [],
      ...dados.bracket
    },
    campeao: dados.campeao || null,
    status: dados.status || 'configuracao'
  };
}

function criarModeloDupla(dados = {}) {
  return {
    id: dados.id || `team_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    nome: dados.nome || '',
    jogadores: dados.jogadores || ['', ''],
    avatarUrl: dados.avatarUrl || '',
    stats: {
      vitorias: 0,
      derrotas: 0,
      pontosPro: 0,
      pontosContra: 0,
      ...dados.stats
    }
  };
}

function criarModeloPartida(dados = {}) {
  return {
    id: dados.id || `match_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    round: dados.round || 1,
    mesa: dados.mesa || 1,
    duplaA: dados.duplaA || null,
    duplaB: dados.duplaB || null,
    maos: dados.maos || [],
    vencedor: dados.vencedor || null,
    status: dados.status || 'pendente',
    iniciada: dados.iniciada || null,
    finalizada: dados.finalizada || null
  };
}

function validarTorneio(torneio) {
  const erros = [];
  
  if (!torneio.nome?.trim()) {
    erros.push('Nome do torneio é obrigatório');
  }
  
  if (!torneio.regras?.melhorDe || torneio.regras.melhorDe < 1) {
    erros.push('Melhor de X mãos deve ser pelo menos 1');
  }
  
  if (!torneio.regras?.pontosPorMao || torneio.regras.pontosPorMao < 1) {
    erros.push('Pontos por mão deve ser pelo menos 1');
  }
  
  return {
    valido: erros.length === 0,
    erros
  };
}

function validarDupla(dupla) {
  const erros = [];
  
  if (!dupla.nome?.trim()) {
    erros.push('Nome da dupla é obrigatório');
  }
  
  return {
    valido: erros.length === 0,
    erros
  };
}

function limparObjetoParaSerializacao(obj) {
  return JSON.parse(JSON.stringify(obj));
}

// Funções para gerenciar jogadores salvos
async function salvarJogador(nome) {
  if (!nome?.trim()) return;
  
  try {
    const nomeFormatado = nome.trim();
    await db.jogadores.put({
      nome: nomeFormatado,
      usado: new Date().toISOString()
    });
  } catch (error) {
    console.warn('Erro ao salvar jogador:', error);
  }
}

async function buscarJogadores(filtro = '') {
  try {
    let query = db.jogadores.orderBy('usado').reverse();
    
    if (filtro.trim()) {
      const jogadores = await query.toArray();
      return jogadores.filter(j => 
        j.nome.toLowerCase().includes(filtro.toLowerCase())
      );
    }
    
    return await query.limit(20).toArray();
  } catch (error) {
    console.warn('Erro ao buscar jogadores:', error);
    return [];
  }
}

async function inicializarJogadoresBase() {
  const jogadoresBase = [
    'Joaquim', 'John Lennon', 'Wagner Passarinho', 'Rodrigo Zillesg',
    'Clayton', 'Rogério', 'Marcão', 'Alex', 'Claudio', 'Waldeci',
    'Luiz Fernando', 'Marco Vinicius'
  ];
  
  try {
    const jogadoresExistentes = await db.jogadores.count();
    if (jogadoresExistentes === 0) {
      for (const nome of jogadoresBase) {
        await salvarJogador(nome);
      }
      console.log('Jogadores base inicializados');
    }
  } catch (error) {
    console.warn('Erro ao inicializar jogadores base:', error);
  }
}

async function inicializarDuplasBase() {
  const duplasBase = [
    { nome: 'QuimJohn', jogadores: ['Joaquim', 'John Lennon'] },
    { nome: 'Passallesg', jogadores: ['Wagner Passarinho', 'Rodrigo Zillesg'] },
    { nome: 'Tudo Loro', jogadores: ['Clayton', 'Rogério'] },
    { nome: 'Nóis nos carros', jogadores: ['Marcão', 'Alex'] },
    { nome: 'Veteranos', jogadores: ['Claudio', 'Waldeci'] },
    { nome: 'Artilheiros', jogadores: ['Luiz Fernando', 'Marco Vinicius'] }
  ];
  
  return duplasBase;
}