// Funções para geração e gerenciamento do bracket

/**
 * Gera o bracket de eliminação simples
 * @param {Array} duplas - Array de duplas do torneio
 * @returns {Object} - Objeto com rodadas do bracket
 */
function gerarBracket(duplas) {
  if (!duplas || duplas.length < 2) {
    throw new Error('Mínimo de 2 duplas necessárias para gerar o bracket');
  }

  // Embaralhar duplas para sementeamento aleatório
  const duplasEmbaralhadas = [...duplas];
  embaralharArray(duplasEmbaralhadas);

  // Calcular próxima potência de 2
  const proximaPotencia = proximaPotenciaDe2(duplasEmbaralhadas.length);
  const byes = proximaPotencia - duplasEmbaralhadas.length;

  console.log(`Gerando bracket: ${duplasEmbaralhadas.length} duplas, ${byes} byes, próxima potência: ${proximaPotencia}`);

  // Gerar primeira rodada com byes
  const primeiraRodada = gerarPrimeiraRodada(duplasEmbaralhadas, byes);
  
  // Gerar todas as rodadas
  const rodadas = montarTodasRodadas(primeiraRodada, proximaPotencia);

  const bracket = {
    rodadas,
    totalDuplas: duplasEmbaralhadas.length,
    totalByes: byes
  };

  // Processar BYEs automaticamente - avançar vencedores para próxima rodada
  for (const partida of primeiraRodada) {
    if (partida.duplaB === null && partida.status === 'concluida' && partida.vencedor) {
      // Esta é uma partida com BYE, avançar o vencedor
      avancarVencedor(bracket, partida.id, partida.vencedor);
    }
  }

  return bracket;
}

/**
 * Embaralha um array (Fisher-Yates shuffle)
 */
function embaralharArray(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}

/**
 * Calcula a próxima potência de 2 maior ou igual ao número dado
 */
function proximaPotenciaDe2(num) {
  if (num <= 0) return 1;
  if (num & (num - 1)) {
    // Não é potência de 2
    let potencia = 1;
    while (potencia < num) {
      potencia *= 2;
    }
    return potencia;
  }
  return num; // Já é potência de 2
}

/**
 * Gera a primeira rodada com byes quando necessário
 */
function gerarPrimeiraRodada(duplas, byes) {
  const partidas = [];
  let cursor = 0;
  let byesRestantes = byes;
  let mesa = 1;

  while (cursor < duplas.length) {
    if (byesRestantes > 0 && cursor < duplas.length) {
      // Criar partida com bye (dupla avança automaticamente)
      partidas.push(criarModeloPartida({
        round: 1,
        mesa: mesa++,
        duplaA: duplas[cursor].id,
        duplaB: null, // Bye
        status: 'concluida', // Bye já está concluída
        vencedor: duplas[cursor].id
      }));
      byesRestantes--;
      cursor++;
    } else if (cursor + 1 < duplas.length) {
      // Criar partida normal
      partidas.push(criarModeloPartida({
        round: 1,
        mesa: mesa++,
        duplaA: duplas[cursor].id,
        duplaB: duplas[cursor + 1].id,
        status: 'pendente'
      }));
      cursor += 2;
    } else {
      // Último jogador sem par (bye)
      partidas.push(criarModeloPartida({
        round: 1,
        mesa: mesa++,
        duplaA: duplas[cursor].id,
        duplaB: null,
        status: 'concluida',
        vencedor: duplas[cursor].id
      }));
      cursor++;
    }
  }

  return partidas;
}

/**
 * Monta todas as rodadas do bracket
 */
function montarTodasRodadas(primeiraRodada, totalSlots) {
  const rodadas = [
    {
      indice: 1,
      nome: 'Primeira Rodada',
      matches: primeiraRodada
    }
  ];

  // Calcular número de duplas que avançam da primeira rodada
  // Cada partida gera 1 vencedor (incluindo BYEs)
  let duplasAvancando = primeiraRodada.length;
  let numeroRodada = 2;

  // Gerar rodadas subsequentes
  while (duplasAvancando > 1) {
    const partidasRodadaAtual = [];
    let mesa = 1;
    const partidasNestaRodada = Math.floor(duplasAvancando / 2);

    for (let i = 0; i < partidasNestaRodada; i++) {
      partidasRodadaAtual.push(criarModeloPartida({
        round: numeroRodada,
        mesa: mesa++,
        duplaA: null, // Será preenchido pelo vencedor
        duplaB: null, // Será preenchido pelo vencedor
        status: 'aguardando'
      }));
    }

    const nomeRodada = partidasNestaRodada === 1 ? 'Final' : 
                      partidasNestaRodada === 2 ? 'Semifinal' :
                      partidasNestaRodada === 4 ? 'Quartas de Final' :
                      `${numeroRodada}ª Rodada`;

    rodadas.push({
      indice: numeroRodada,
      nome: nomeRodada,
      matches: partidasRodadaAtual
    });

    duplasAvancando = partidasNestaRodada;
    numeroRodada++;
  }

  return rodadas;
}

/**
 * Avança vencedor para próxima rodada
 * @param {Object} bracket - Bracket completo
 * @param {string} partidaId - ID da partida concluída
 * @param {string} vencedorId - ID da dupla vencedora
 */
function avancarVencedor(bracket, partidaId, vencedorId) {
  // Encontrar a partida
  let partidaConcluida = null;
  let rodadaAtual = null;

  for (const rodada of bracket.rodadas) {
    const partida = rodada.matches.find(m => m.id === partidaId);
    if (partida) {
      partidaConcluida = partida;
      rodadaAtual = rodada;
      break;
    }
  }

  if (!partidaConcluida) {
    console.error('Partida não encontrada:', partidaId);
    return;
  }

  // Marcar vencedor
  partidaConcluida.vencedor = vencedorId;
  partidaConcluida.status = 'concluida';
  partidaConcluida.finalizada = new Date().toISOString();

  // Se for a final, temos um campeão
  if (rodadaAtual.nome === 'Final') {
    return { campeao: vencedorId };
  }

  // Encontrar próxima rodada
  const proximaRodada = bracket.rodadas.find(r => r.indice === rodadaAtual.indice + 1);
  if (!proximaRodada) {
    console.error('Próxima rodada não encontrada');
    return;
  }

  // Calcular posição na próxima rodada
  const posicaoNaRodadaAtual = rodadaAtual.matches.findIndex(m => m.id === partidaId);
  const posicaoNaProximaRodada = Math.floor(posicaoNaRodadaAtual / 2);
  const proximaPartida = proximaRodada.matches[posicaoNaProximaRodada];

  if (!proximaPartida) {
    console.error('Próxima partida não encontrada');
    return;
  }

  // Determinar se vai para duplaA ou duplaB
  const ehPrimeiro = posicaoNaRodadaAtual % 2 === 0;
  if (ehPrimeiro) {
    proximaPartida.duplaA = vencedorId;
  } else {
    proximaPartida.duplaB = vencedorId;
  }

  // Se ambas as duplas estão definidas, a partida pode começar
  if (proximaPartida.duplaA && proximaPartida.duplaB) {
    proximaPartida.status = 'pendente';
  }

  return { partidaAtualizada: proximaPartida };
}

/**
 * Obtém as próximas partidas disponíveis para jogar
 * @param {Object} bracket - Bracket completo
 * @returns {Array} - Array de partidas pendentes
 */
function obterProximasPartidas(bracket) {
  const partidasPendentes = [];
  
  for (const rodada of bracket.rodadas) {
    for (const partida of rodada.matches) {
      if (partida.status === 'pendente') {
        partidasPendentes.push({
          ...partida,
          nomeRodada: rodada.nome,
          indiceRodada: rodada.indice
        });
      }
    }
  }
  
  return partidasPendentes.sort((a, b) => a.indiceRodada - b.indiceRodada);
}

/**
 * Obtém estatísticas do bracket
 * @param {Object} bracket - Bracket completo
 * @returns {Object} - Objeto com estatísticas
 */
function obterEstatisticasBracket(bracket) {
  let totalPartidas = 0;
  let partidasConcluidas = 0;
  let partidasPendentes = 0;
  let partidasAguardando = 0;

  for (const rodada of bracket.rodadas) {
    totalPartidas += rodada.matches.length;
    
    for (const partida of rodada.matches) {
      switch (partida.status) {
        case 'concluida':
          partidasConcluidas++;
          break;
        case 'pendente':
          partidasPendentes++;
          break;
        case 'aguardando':
          partidasAguardando++;
          break;
      }
    }
  }

  return {
    totalPartidas,
    partidasConcluidas,
    partidasPendentes,
    partidasAguardando,
    progresso: Math.round((partidasConcluidas / totalPartidas) * 100)
  };
}

/**
 * Busca uma dupla no bracket
 * @param {Object} bracket - Bracket completo
 * @param {string} duplaId - ID da dupla
 * @returns {Object} - Informações sobre a dupla no bracket
 */
function buscarDuplaNoBracket(bracket, duplaId) {
  const info = {
    partidasJogadas: [],
    proximaPartida: null,
    status: 'ativa' // 'ativa', 'eliminada', 'aguardando'
  };

  for (const rodada of bracket.rodadas) {
    for (const partida of rodada.matches) {
      // Verifica se a dupla participa desta partida
      if (partida.duplaA === duplaId || partida.duplaB === duplaId) {
        if (partida.status === 'concluida') {
          info.partidasJogadas.push({
            ...partida,
            nomeRodada: rodada.nome,
            indiceRodada: rodada.indice,
            venceu: partida.vencedor === duplaId
          });
          
          // Se perdeu, está eliminada
          if (partida.vencedor !== duplaId) {
            info.status = 'eliminada';
          }
        } else if (partida.status === 'pendente') {
          info.proximaPartida = {
            ...partida,
            nomeRodada: rodada.nome,
            indiceRodada: rodada.indice
          };
          break; // Próxima partida encontrada
        }
      }
    }
    
    // Se foi eliminada, não precisa verificar rodadas subsequentes
    if (info.status === 'eliminada') {
      break;
    }
  }

  return info;
}

/**
 * Valida se o bracket está íntegro
 * @param {Object} bracket - Bracket para validar
 * @returns {Object} - Resultado da validação
 */
function validarBracket(bracket) {
  const erros = [];
  const avisos = [];

  if (!bracket || !bracket.rodadas || bracket.rodadas.length === 0) {
    erros.push('Bracket não possui rodadas');
    return { valido: false, erros, avisos };
  }

  // Validar cada rodada
  for (let i = 0; i < bracket.rodadas.length; i++) {
    const rodada = bracket.rodadas[i];
    
    if (!rodada.matches || rodada.matches.length === 0) {
      erros.push(`Rodada ${rodada.indice} não possui partidas`);
      continue;
    }

    // Verificar se o número de partidas está correto
    const partidasEsperadas = i === 0 ? 
      Math.ceil(bracket.totalDuplas / 2) : 
      Math.ceil(bracket.rodadas[i-1].matches.length / 2);
      
    if (rodada.matches.length !== partidasEsperadas && i > 0) {
      avisos.push(`Rodada ${rodada.indice} tem ${rodada.matches.length} partidas, esperado ${partidasEsperadas}`);
    }

    // Validar partidas da rodada
    for (const partida of rodada.matches) {
      if (!partida.id) {
        erros.push(`Partida na rodada ${rodada.indice} sem ID`);
      }
      
      if (partida.status === 'pendente' && (!partida.duplaA || !partida.duplaB)) {
        if (rodada.indice > 1) {
          avisos.push(`Partida ${partida.id} pendente mas sem duplas definidas`);
        }
      }
    }
  }

  return {
    valido: erros.length === 0,
    erros,
    avisos
  };
}

// Exportar funções para uso global
window.BracketSystem = {
  gerarBracket,
  avancarVencedor,
  obterProximasPartidas,
  calcularEstatisticas: obterEstatisticasBracket, // Alias para compatibilidade
  obterEstatisticasBracket,
  buscarDuplaNoBracket,
  validarBracket,
  embaralharArray,
  proximaPotenciaDe2
};

console.log('BracketSystem loaded with functions:', Object.keys(window.BracketSystem));