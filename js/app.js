const { createApp, ref, reactive, computed, onMounted, nextTick } = Vue;

createApp({
  setup() {
    const currentRoute = ref('home');
    const torneioAtual = ref(null);
    const torneiosSalvos = ref([]);
    const torneioCompartilhado = ref(null);
    const toast = reactive({
      show: false,
      message: '',
      tipo: 'sucesso', // 'sucesso' ou 'erro'
      posicao: 'top-4 right-4' // posicionamento
    });

    const novoTorneio = reactive({
      nome: '',
      regras: {
        formato: 'eliminatoria_simples',
        melhorDe: 3,
        pontosPorMao: 1,
        criterioDesempate: 'mao_extra'
      }
    });

    // Estados para duplas
    const duplas = ref([]);
    const mostrarFormularioDupla = ref(false);
    const duplaEditando = ref(null);
    const formularioDupla = reactive({
      nome: '',
      jogadores: ['', '']
    });
    const textoImportacao = ref('');
    let sortableInstance = null;

    // Estados para autocomplete de jogadores
    const jogadoresSalvos = ref([]);
    const sugestoesJogador1 = ref([]);
    const sugestoesJogador2 = ref([]);
    const mostrarSugestoesJ1 = ref(false);
    const mostrarSugestoesJ2 = ref(false);

    // Estados para bracket e partidas
    const bracket = ref(null);
    const bracketStats = ref(null);
    const proximasPartidas = ref([]);
    const partidaAtual = ref(null);

    // Estados para sincronização
    const clientesConectados = ref(1);
    const syncStatus = ref('desconectado'); // 'conectado', 'sincronizando', 'desconectado'
    
    // Versão do sistema
    const appVersion = computed(() => {
      return window.AppVersion ? window.AppVersion.getDisplayVersion() : 'v1.0.0';
    });

    const pageTitle = computed(() => {
      const titles = {
        'home': 'Torneio de Truco',
        'novo-torneio': 'Novo Torneio',
        'duplas': 'Cadastro de Duplas',
        'bracket': 'Bracket do Torneio',
        'partida': 'Pontuação da Partida',
        'compartilhar': 'Compartilhar Torneio',
        'visualizar-publico': 'Visualização Pública'
      };
      return titles[currentRoute.value] || 'Torneio de Truco';
    });

    const showTabBar = computed(() => {
      return torneioAtual.value && ['duplas', 'bracket', 'compartilhar'].includes(currentRoute.value);
    });

    const bracketDisponivel = computed(() => {
      return torneioAtual.value?.bracket?.rodadas?.length > 0;
    });

    const canGoBack = computed(() => {
      return currentRoute.value !== 'home';
    });

    const mainClass = computed(() => {
      return showTabBar.value ? 'pb-20' : '';
    });

    function navigate(route, params = {}) {
      currentRoute.value = route;
      if (params.torneioId) {
        carregarTorneio(params.torneioId);
      }
      
      window.location.hash = route;
    }

    function goBack() {
      if (currentRoute.value === 'novo-torneio') {
        navigate('home');
      } else if (torneioAtual.value) {
        navigate('bracket');
      } else {
        navigate('home');
      }
    }

    function mostrarToast(message, tipo = 'sucesso', duration = 3000) {
      // Carregar preferências de toast salvas ou usar padrão
      const preferenciasToast = JSON.parse(localStorage.getItem('truco_toast_prefs') || '{}');
      
      toast.message = message;
      toast.tipo = tipo;
      toast.posicao = preferenciasToast.posicao || 'top-4 right-4';
      toast.show = true;
      
      // Salvar preferências atualizadas
      localStorage.setItem('truco_toast_prefs', JSON.stringify({
        posicao: toast.posicao,
        duracao: duration
      }));
      
      setTimeout(() => {
        toast.show = false;
      }, duration);
    }

    async function carregarTorneiosSalvos() {
      try {
        const torneios = await db.torneios.orderBy('criadoEm').reverse().toArray();
        torneiosSalvos.value = torneios;
      } catch (error) {
        console.error('Erro ao carregar torneios:', error);
      }
    }

    async function carregarTorneio(id) {
      try {
        const torneio = await db.torneios.get(id);
        if (torneio) {
          torneioAtual.value = torneio;
          await carregarDuplas();
          await carregarBracket();
          return torneio;
        }
      } catch (error) {
        console.error('Erro ao carregar torneio:', error);
        mostrarToast('Erro ao carregar torneio', 'erro');
      }
      return null;
    }

    async function abrirTorneio(id) {
      const torneio = await carregarTorneio(id);
      if (torneio) {
        // Inicializar sincronização para este torneio
        inicializarSyncTorneio(id);
        
        if (torneio.status === 'configuracao' || !torneio.duplas?.length) {
          navigate('duplas');
        } else if (torneio.bracket?.rodadas?.length > 0) {
          navigate('bracket');
        } else {
          navigate('duplas');
        }
      }
    }

    async function criarTorneio() {
      if (!novoTorneio.nome.trim()) {
        mostrarToast('Nome do torneio é obrigatório', 'erro');
        return;
      }

      const torneio = {
        id: `tourn_${Date.now()}`,
        nome: novoTorneio.nome,
        criadoEm: new Date().toISOString(),
        regras: { ...novoTorneio.regras },
        duplas: [],
        bracket: { rodadas: [] },
        campeao: null,
        status: 'configuracao'
      };

      try {
        await db.torneios.add(torneio);
        torneioAtual.value = torneio;
        
        Object.assign(novoTorneio, {
          nome: '',
          regras: {
            formato: 'eliminatoria_simples',
            melhorDe: 3,
            pontosPorMao: 1,
            criterioDesempate: 'mao_extra'
          }
        });

        navigate('duplas');
        mostrarToast('Torneio criado com sucesso!');
        await carregarTorneiosSalvos();
        await carregarDuplas();
      } catch (error) {
        console.error('Erro ao criar torneio:', error);
        mostrarToast('Erro ao criar torneio', 'erro');
      }
    }

    async function excluirTorneio(torneioId) {
      if (!confirm('Tem certeza que deseja excluir este torneio? Esta ação não pode ser desfeita.')) {
        return;
      }
      
      try {
        await db.torneios.delete(torneioId);
        await carregarTorneiosSalvos();
        mostrarToast('Torneio excluído com sucesso!');
      } catch (error) {
        console.error('Erro ao excluir torneio:', error);
        mostrarToast('Erro ao excluir torneio', 'erro');
      }
    }

    async function reiniciarTorneio(torneioId) {
      if (!confirm('Tem certeza que deseja reiniciar este torneio? Todas as partidas serão zeradas.')) {
        return;
      }
      
      try {
        const torneio = await db.torneios.get(torneioId);
        if (!torneio) {
          mostrarToast('Torneio não encontrado', 'erro');
          return;
        }
        
        // Reiniciar torneio - manter duplas mas zerar bracket
        const torneioReiniciado = {
          ...torneio,
          bracket: { rodadas: [] },
          campeao: null,
          status: 'configuracao'
        };
        
        await db.torneios.put(torneioReiniciado);
        await carregarTorneiosSalvos();
        mostrarToast('Torneio reiniciado com sucesso!');
      } catch (error) {
        console.error('Erro ao reiniciar torneio:', error);
        mostrarToast('Erro ao reiniciar torneio', 'erro');
      }
    }

    function formatarData(dateString) {
      return dayjs(dateString).format('DD/MM/YYYY HH:mm');
    }

    function initRouter() {
      const hash = window.location.hash.slice(1);
      if (hash) {
        currentRoute.value = hash;
      }

      window.addEventListener('hashchange', () => {
        const newHash = window.location.hash.slice(1);
        if (newHash) {
          currentRoute.value = newHash;
          
          // Inicializar sortable quando navegar para duplas
          if (newHash === 'duplas') {
            initSortable();
          }
        }
      });
    }

    onMounted(async () => {
      await initDb();
      await inicializarJogadoresBase();
      await carregarJogadoresSalvos();
      await carregarTorneiosSalvos();
      carregarBackups();
      initRouter();
      
      // Tentar carregar torneio salvo do PersistenceManager
      if (window.PersistenceManager) {
        const torneioSalvo = window.PersistenceManager.carregar();
        if (torneioSalvo && !torneioAtual.value) {
          console.log('📂 Torneio restaurado da persistência');
          torneioAtual.value = torneioSalvo;
          torneioCompartilhado.value = torneioSalvo;
          
          // Carregar dados relacionados
          if (torneioSalvo.duplas) {
            duplas.value = torneioSalvo.duplas;
          }
          if (torneioSalvo.bracket) {
            bracket.value = torneioSalvo.bracket;
          }
          
          // Navegar para a tela apropriada
          if (torneioSalvo.status === 'finalizado') {
            navigate('bracket');
          } else if (torneioSalvo.bracket?.rodadas?.length > 0) {
            navigate('bracket');
          } else if (torneioSalvo.duplas?.length > 0) {
            navigate('duplas');
          }
        } else {
          // Se não há torneio ativo, verificar se há torneios compartilhados
          const torneiosPublicos = window.PersistenceManager.listarPublicos();
          if (torneiosPublicos.length > 0) {
            const maisRecente = torneiosPublicos[0];
            console.log(`🔍 Torneio compartilhado disponível: ${maisRecente.nome}`);
            torneioCompartilhado.value = maisRecente;
          }
        }
        
        // Configurar sincronização automática
        window.PersistenceManager.configurarSync((torneioAtualizado) => {
          if (torneioAtualizado && torneioAtualizado.id === torneioAtual.value?.id) {
            console.log('🔄 Torneio sincronizado de outro dispositivo');
            torneioAtual.value = torneioAtualizado;
            
            if (torneioAtualizado.duplas) {
              duplas.value = torneioAtualizado.duplas;
            }
            if (torneioAtualizado.bracket) {
              bracket.value = torneioAtualizado.bracket;
            }
            
            mostrarToast('Dados sincronizados', 'sucesso');
          }
        });
      }
      
      // Event listener para torneio compartilhado
      window.addEventListener('torneioCompartilhado', processarTorneioCompartilhado);
    });

    // Funções para jogadores salvos
    async function carregarJogadoresSalvos() {
      try {
        jogadoresSalvos.value = await buscarJogadores();
      } catch (error) {
        console.error('Erro ao carregar jogadores:', error);
      }
    }

    async function buscarSugestoesJogador(filtro, numeroJogador) {
      if (!filtro.trim()) {
        if (numeroJogador === 1) {
          mostrarSugestoesJ1.value = false;
        } else {
          mostrarSugestoesJ2.value = false;
        }
        return;
      }

      try {
        const sugestoes = await buscarJogadores(filtro);
        
        if (numeroJogador === 1) {
          sugestoesJogador1.value = sugestoes;
          mostrarSugestoesJ1.value = sugestoes.length > 0;
        } else {
          sugestoesJogador2.value = sugestoes;
          mostrarSugestoesJ2.value = sugestoes.length > 0;
        }
      } catch (error) {
        console.error('Erro ao buscar sugestões:', error);
      }
    }

    function selecionarJogador(nome, numeroJogador) {
      formularioDupla.jogadores[numeroJogador - 1] = nome;
      if (numeroJogador === 1) {
        mostrarSugestoesJ1.value = false;
      } else {
        mostrarSugestoesJ2.value = false;
      }
    }

    function esconderSugestoesJ1() {
      setTimeout(() => {
        mostrarSugestoesJ1.value = false;
      }, 150);
    }

    function esconderSugestoesJ2() {
      setTimeout(() => {
        mostrarSugestoesJ2.value = false;
      }, 150);
    }

    async function salvarJogadoresDaDupla() {
      for (const nomeJogador of formularioDupla.jogadores) {
        if (nomeJogador?.trim()) {
          await salvarJogador(nomeJogador.trim());
        }
      }
      await carregarJogadoresSalvos();
    }

    // Funções para duplas
    function limparFormularioDupla() {
      formularioDupla.nome = '';
      formularioDupla.jogadores = ['', ''];
      duplaEditando.value = null;
      mostrarSugestoesJ1.value = false;
      mostrarSugestoesJ2.value = false;
    }

    function editarDupla(dupla) {
      duplaEditando.value = dupla;
      formularioDupla.nome = dupla.nome;
      formularioDupla.jogadores = [...dupla.jogadores];
      mostrarFormularioDupla.value = true;
      
      // Scroll para o formulário
      nextTick(() => {
        const form = document.querySelector('form');
        if (form) {
          form.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      });
    }

    function cancelarEdicao() {
      limparFormularioDupla();
      mostrarFormularioDupla.value = false;
    }

    async function salvarDupla() {
      // Gerar nome automático se não foi fornecido
      let nomeDupla = formularioDupla.nome.trim();
      if (!nomeDupla) {
        const jogador1 = formularioDupla.jogadores[0].trim();
        const jogador2 = formularioDupla.jogadores[1].trim();
        
        if (jogador1 || jogador2) {
          if (jogador1 && jogador2) {
            nomeDupla = `${jogador1} & ${jogador2}`;
          } else {
            nomeDupla = jogador1 || jogador2;
          }
        } else {
          mostrarToast('Digite pelo menos o nome da dupla ou um jogador');
          return;
        }
      }

      // Verificar se já existe uma dupla com o mesmo nome (exceto se estiver editando a própria)
      const nomeExistente = duplas.value.find(d => 
        d.nome.toLowerCase() === nomeDupla.toLowerCase() && 
        d.id !== duplaEditando.value?.id
      );
      
      if (nomeExistente) {
        mostrarToast('Já existe uma dupla com este nome', 'erro');
        return;
      }

      try {
        if (duplaEditando.value) {
          // Editar dupla existente
          const index = duplas.value.findIndex(d => d.id === duplaEditando.value.id);
          if (index !== -1) {
            duplas.value[index] = {
              ...duplas.value[index],
              nome: nomeDupla,
              jogadores: [formularioDupla.jogadores[0].trim(), formularioDupla.jogadores[1].trim()]
            };
          }
          mostrarToast('Dupla editada com sucesso!');
        } else {
          // Adicionar nova dupla
          const novaDupla = criarModeloDupla({
            nome: nomeDupla,
            jogadores: [formularioDupla.jogadores[0].trim(), formularioDupla.jogadores[1].trim()]
          });
          
          duplas.value.push(novaDupla);
          mostrarToast('Dupla adicionada com sucesso!');
        }

        // Salvar jogadores da dupla
        await salvarJogadoresDaDupla();
        
        await salvarTorneioAtual();
        limparFormularioDupla();
        mostrarFormularioDupla.value = false;
      } catch (error) {
        console.error('Erro ao salvar dupla:', error);
        mostrarToast('Erro ao salvar dupla', 'erro');
      }
    }

    async function removerDupla(duplaId) {
      if (confirm('Tem certeza que deseja remover esta dupla?')) {
        try {
          duplas.value = duplas.value.filter(d => d.id !== duplaId);
          await salvarTorneioAtual();
          mostrarToast('Dupla removida com sucesso!');
          
          // Se estava editando essa dupla, cancelar edição
          if (duplaEditando.value?.id === duplaId) {
            cancelarEdicao();
          }
        } catch (error) {
          console.error('Erro ao remover dupla:', error);
          mostrarToast('Erro ao remover dupla', 'erro');
        }
      }
    }

    function importarDuplas() {
      if (!textoImportacao.value.trim()) {
        mostrarToast('Cole uma lista de duplas para importar');
        return;
      }

      try {
        const linhas = textoImportacao.value.split('\n').filter(linha => linha.trim());
        let adicionadas = 0;
        let ignoradas = 0;

        for (const linha of linhas) {
          const partes = linha.split(',').map(p => p.trim());
          const nome = partes[0];
          
          if (!nome) continue;
          
          // Verificar se já existe
          const existe = duplas.value.find(d => d.nome.toLowerCase() === nome.toLowerCase());
          if (existe) {
            ignoradas++;
            continue;
          }

          const novaDupla = criarModeloDupla({
            nome: nome,
            jogadores: [
              partes[1] || '',
              partes[2] || ''
            ]
          });
          
          duplas.value.push(novaDupla);
          adicionadas++;
        }

        if (adicionadas > 0) {
          salvarTorneioAtual();
          mostrarToast(`${adicionadas} dupla${adicionadas > 1 ? 's' : ''} adicionada${adicionadas > 1 ? 's' : ''}${ignoradas > 0 ? `, ${ignoradas} ignorada${ignoradas > 1 ? 's' : ''} (duplicada${ignoradas > 1 ? 's' : ''})` : ''}`);
          limparImportacao();
        } else if (ignoradas > 0) {
          mostrarToast('Todas as duplas já existem');
        } else {
          mostrarToast('Nenhuma dupla válida encontrada');
        }
      } catch (error) {
        console.error('Erro ao importar duplas:', error);
        mostrarToast('Erro ao processar a lista', 'erro');
      }
    }

    function limparImportacao() {
      textoImportacao.value = '';
    }

    async function carregarDuplasBase() {
      try {
        const duplasBase = await inicializarDuplasBase();
        
        for (const dupla of duplasBase) {
          // Verificar se já existe
          const existe = duplas.value.find(d => d.nome.toLowerCase() === dupla.nome.toLowerCase());
          if (!existe) {
            const novaDupla = criarModeloDupla(dupla);
            duplas.value.push(novaDupla);
            
            // Salvar jogadores
            for (const jogador of dupla.jogadores) {
              if (jogador) await salvarJogador(jogador);
            }
          }
        }
        
        await carregarJogadoresSalvos();
        await salvarTorneioAtual();
        mostrarToast(`${duplasBase.length} duplas padrão carregadas!`);
      } catch (error) {
        console.error('Erro ao carregar duplas base:', error);
        mostrarToast('Erro ao carregar duplas padrão', 'erro');
      }
    }

    async function salvarTorneioAtual() {
      if (!torneioAtual.value) return;
      
      try {
        torneioAtual.value.duplas = [...duplas.value];
        
        // Limpar objeto para evitar problemas de serialização
        const torneioLimpo = limparObjetoParaSerializacao(torneioAtual.value);
        
        // Verificar se o torneio já existe
        const existente = await db.torneios.get(torneioLimpo.id);
        if (existente) {
          await db.torneios.put(torneioLimpo);
        } else {
          await db.torneios.add(torneioLimpo);
        }
        
        // Salvar com PersistenceManager para sincronização entre dispositivos
        if (window.PersistenceManager) {
          const dadosCompletos = {
            ...torneioLimpo,
            duplas: [...duplas.value],
            bracket: bracket.value ? {...bracket.value} : null,
            modificadoEm: new Date().toISOString()
          };
          
          window.PersistenceManager.salvar(dadosCompletos);
          console.log('💾 Torneio salvo e sincronizado');
        }
      } catch (error) {
        console.error('Erro ao salvar torneio:', error);
        throw error;
      }
    }

    async function gerarBracket() {
      if (duplas.value.length < 2) {
        mostrarToast('Mínimo de 2 duplas necessárias para gerar o bracket');
        return;
      }

      if (!window.bracketFunctions) {
        mostrarToast('Erro: Módulo de bracket não carregado');
        return;
      }
      
      try {
        // Verificar se há torneio ativo
        if (!torneioAtual.value) {
          mostrarToast('Nenhum torneio ativo. Crie um novo torneio primeiro.', 'erro');
          navigate('home');
          return;
        }
        
        // Gerar o bracket usando a função do módulo bracket.js
        const bracket = window.bracketFunctions.gerarBracket(duplas.value);
        
        // Salvar no torneio atual
        torneioAtual.value.bracket = bracket;
        torneioAtual.value.status = 'em_andamento';
        
        await salvarTorneioAtual();
        
        // Carregar dados do bracket
        await carregarBracket();
        
        navigate('bracket');
        mostrarToast(`Bracket gerado com ${duplas.value.length} duplas!`);
      } catch (error) {
        console.error('Erro ao gerar bracket:', error);
        mostrarToast('Erro ao gerar bracket: ' + error.message);
      }
    }

    function initSortable() {
      nextTick(() => {
        const element = document.querySelector('[ref="sortableList"]');
        if (element && !sortableInstance) {
          sortableInstance = Sortable.create(element, {
            animation: 150,
            ghostClass: 'opacity-50',
            onEnd: async (evt) => {
              const { oldIndex, newIndex } = evt;
              if (oldIndex !== newIndex) {
                // Reordenar array
                const item = duplas.value.splice(oldIndex, 1)[0];
                duplas.value.splice(newIndex, 0, item);
                
                await salvarTorneioAtual();
                mostrarToast('Ordem das duplas atualizada!');
              }
            }
          });
        }
      });
    }

    // Carregar duplas quando o torneio for carregado
    async function carregarDuplas() {
      if (torneioAtual.value?.duplas) {
        duplas.value = [...torneioAtual.value.duplas];
        initSortable();
      }
    }

    // Carregar dados do bracket
    async function carregarBracket() {
      if (!torneioAtual.value?.bracket) return;

      bracket.value = torneioAtual.value.bracket;
      
      if (window.bracketFunctions) {
        bracketStats.value = window.bracketFunctions.obterEstatisticasBracket(bracket.value);
        proximasPartidas.value = window.bracketFunctions.obterProximasPartidas(bracket.value);
      }
    }

    // Obter nome da dupla por ID
    function obterNomeDupla(duplaId) {
      if (!duplaId) return 'N/A';
      const dupla = duplas.value.find(d => d.id === duplaId);
      return dupla ? dupla.nome : 'Dupla não encontrada';
    }

    // Obter classe CSS da partida baseada no status
    function obterClassePartida(partida) {
      switch (partida.status) {
        case 'pendente':
          return 'border-yellow-300 bg-yellow-50';
        case 'concluida':
          return 'border-green-300 bg-green-50';
        case 'aguardando':
        default:
          return 'border-slate-200 bg-slate-50';
      }
    }

    // Iniciar uma partida
    function iniciarPartida(partida) {
      partidaAtual.value = {
        ...partida,
        nomeRodada: partida.nomeRodada || 'Partida'
      };
      
      // Marcar como iniciada se ainda não foi
      if (!partida.iniciada) {
        partida.iniciada = new Date().toISOString();
      }
      
      navigate('partida');
    }

    // Contar vitórias em mãos de uma dupla na partida atual
    function contarVitoriasMaos(duplaId) {
      if (!partidaAtual.value?.maos) return 0;
      
      let vitorias = 0;
      for (const mao of partidaAtual.value.maos) {
        // Uma mão é vencida quando uma dupla chega aos 12 pontos
        if (duplaId === partidaAtual.value.duplaA && mao.pontosA >= 12) {
          vitorias++;
        } else if (duplaId === partidaAtual.value.duplaB && mao.pontosB >= 12) {
          vitorias++;
        }
      }
      
      return vitorias;
    }

    // Contar tentos da dupla na mão atual (em andamento)
    function contarTentosMaoAtual(duplaId) {
      if (!partidaAtual.value?.maos) return 0;
      
      // Procurar mão em andamento (não finalizada)
      for (let i = partidaAtual.value.maos.length - 1; i >= 0; i--) {
        const mao = partidaAtual.value.maos[i];
        // Mão em andamento é aquela que nenhuma dupla chegou aos 12 pontos
        if (mao.pontosA < 12 && mao.pontosB < 12) {
          if (duplaId === partidaAtual.value.duplaA) {
            return mao.pontosA;
          } else if (duplaId === partidaAtual.value.duplaB) {
            return mao.pontosB;
          }
        }
      }
      
      return 0; // Se não há mão em andamento, retorna 0
    }

    // Adicionar pontos a uma mão
    function adicionarPontoMao(duplaId, pontos) {
      if (!partidaAtual.value || partidaAtual.value.status === 'concluida') return;
      
      const melhorDe = torneioAtual.value?.regras?.melhorDe || 3;
      const maosNecessarias = Math.ceil(melhorDe / 2);
      
      // Inicializar array de mãos se necessário
      if (!partidaAtual.value.maos) {
        partidaAtual.value.maos = [];
      }
      
      // Encontrar ou criar mão em andamento
      let maoAtual = null;
      for (let i = partidaAtual.value.maos.length - 1; i >= 0; i--) {
        const mao = partidaAtual.value.maos[i];
        // Mão em andamento é aquela que nenhuma dupla chegou aos 12 pontos
        if (mao.pontosA < 12 && mao.pontosB < 12) {
          maoAtual = mao;
          break;
        }
      }
      
      // Se não há mão em andamento, criar nova
      if (!maoAtual) {
        maoAtual = {
          ordem: partidaAtual.value.maos.length + 1,
          pontosA: 0,
          pontosB: 0
        };
        partidaAtual.value.maos.push(maoAtual);
      }
      
      // Marcar ação local para evitar conflitos de sincronização
      partidaAtual.value.ultimaAcaoLocal = Date.now();
      
      // Adicionar pontos à mão atual
      if (duplaId === partidaAtual.value.duplaA) {
        maoAtual.pontosA = Math.min(maoAtual.pontosA + pontos, 12); // Máximo 12 pontos
      } else if (duplaId === partidaAtual.value.duplaB) {
        maoAtual.pontosB = Math.min(maoAtual.pontosB + pontos, 12); // Máximo 12 pontos
      }
      
      // Verificar se alguém venceu a mão (chegou aos 12)
      if (maoAtual.pontosA >= 12 || maoAtual.pontosB >= 12) {
        mostrarToast(`Mão finalizada! ${maoAtual.pontosA >= 12 ? obterNomeDupla(partidaAtual.value.duplaA) : obterNomeDupla(partidaAtual.value.duplaB)} venceu a mão.`);
      }
      
      // Verificar se a partida terminou
      const vitoriasA = contarVitoriasMaos(partidaAtual.value.duplaA);
      const vitoriasB = contarVitoriasMaos(partidaAtual.value.duplaB);
      
      if (vitoriasA >= maosNecessarias || vitoriasB >= maosNecessarias) {
        finalizarPartida(vitoriasA > vitoriasB ? partidaAtual.value.duplaA : partidaAtual.value.duplaB);
      } else {
        // Salvar progresso
        salvarProgresso();
      }
    }

    // Finalizar partida
    async function finalizarPartida(vencedorId) {
      if (!partidaAtual.value || !vencedorId) return;
      
      partidaAtual.value.vencedor = vencedorId;
      partidaAtual.value.status = 'concluida';
      partidaAtual.value.finalizada = new Date().toISOString();
      
      // Atualizar estatísticas das duplas
      atualizarEstatisticasDuplas(vencedorId);
      
      // Avançar no bracket
      if (window.bracketFunctions && bracket.value) {
        const resultado = window.bracketFunctions.avancarVencedor(
          bracket.value, 
          partidaAtual.value.id, 
          vencedorId
        );
        
        // Verificar se temos um campeão
        if (resultado?.campeao) {
          torneioAtual.value.campeao = resultado.campeao;
          torneioAtual.value.status = 'concluido';
          mostrarToast(`🏆 Parabéns! ${obterNomeDupla(resultado.campeao)} é o campeão!`);
          
          // Recarregar lista de torneios para atualizar status na tela inicial
          await carregarTorneiosSalvos();
        }
      }
      
      // Salvar tudo
      await salvarProgresso();
      await carregarBracket();
      
      mostrarToast(`Partida finalizada! Vencedor: ${obterNomeDupla(vencedorId)}`);
    }

    // Atualizar estatísticas das duplas
    function atualizarEstatisticasDuplas(vencedorId) {
      const perdedorId = partidaAtual.value.duplaA === vencedorId ? 
                         partidaAtual.value.duplaB : partidaAtual.value.duplaA;
      
      // Vencedor
      const duplaVencedora = duplas.value.find(d => d.id === vencedorId);
      if (duplaVencedora) {
        duplaVencedora.stats.vitorias++;
        
        // Contar pontos da partida
        let pontosPro = 0, pontosContra = 0;
        for (const mao of partidaAtual.value.maos || []) {
          if (vencedorId === partidaAtual.value.duplaA) {
            pontosPro += mao.pontosA;
            pontosContra += mao.pontosB;
          } else {
            pontosPro += mao.pontosB;
            pontosContra += mao.pontosA;
          }
        }
        duplaVencedora.stats.pontosPro += pontosPro;
        duplaVencedora.stats.pontosContra += pontosContra;
      }
      
      // Perdedor
      const duplaPerdedora = duplas.value.find(d => d.id === perdedorId);
      if (duplaPerdedora) {
        duplaPerdedora.stats.derrotas++;
        
        let pontosPro = 0, pontosContra = 0;
        for (const mao of partidaAtual.value.maos || []) {
          if (perdedorId === partidaAtual.value.duplaA) {
            pontosPro += mao.pontosA;
            pontosContra += mao.pontosB;
          } else {
            pontosPro += mao.pontosB;
            pontosContra += mao.pontosA;
          }
        }
        duplaPerdedora.stats.pontosPro += pontosPro;
        duplaPerdedora.stats.pontosContra += pontosContra;
      }
    }

    // Desfazer última mão
    function desfazerUltimaMao() {
      if (!partidaAtual.value?.maos?.length) return;
      
      // Marcar ação local
      partidaAtual.value.ultimaAcaoLocal = Date.now();
      
      partidaAtual.value.maos.pop();
      
      // Se não há mais mãos e a partida estava concluída, reabrir
      if (partidaAtual.value.maos.length === 0 && partidaAtual.value.status === 'concluida') {
        partidaAtual.value.status = 'pendente';
        partidaAtual.value.vencedor = null;
        partidaAtual.value.finalizada = null;
      }
      
      salvarProgresso();
      mostrarToast('Última mão desfeita');
    }

    // Editar resultado da partida finalizada
    function editarResultado() {
      if (!partidaAtual.value || partidaAtual.value.status !== 'concluida') return;
      
      if (!confirm('Tem certeza que deseja editar o resultado desta partida? O vencedor atual será removido do bracket.')) {
        return;
      }
      
      // Marcar ação local
      partidaAtual.value.ultimaAcaoLocal = Date.now();
      
      // Reverter a partida para status pendente
      partidaAtual.value.status = 'pendente';
      const vencedorAnterior = partidaAtual.value.vencedor;
      partidaAtual.value.vencedor = null;
      partidaAtual.value.finalizada = null;
      
      // Remover o vencedor da próxima rodada se já foi avançado
      if (vencedorAnterior && bracket.value) {
        removerVencedorProximaRodada(bracket.value, partidaAtual.value.id, vencedorAnterior);
      }
      
      salvarProgresso();
      mostrarToast('Resultado removido. Você pode refazer a partida.', 'sucesso');
    }
    
    // Remove vencedor da próxima rodada quando o resultado é editado
    function removerVencedorProximaRodada(bracket, partidaId, vencedorId) {
      // Encontrar a partida atual
      let rodadaAtual = null;
      let posicaoNaRodadaAtual = -1;
      
      for (const rodada of bracket.rodadas) {
        const indicePartida = rodada.matches.findIndex(m => m.id === partidaId);
        if (indicePartida !== -1) {
          rodadaAtual = rodada;
          posicaoNaRodadaAtual = indicePartida;
          break;
        }
      }
      
      if (!rodadaAtual || rodadaAtual.nome === 'Final') return;
      
      // Encontrar próxima rodada
      const proximaRodada = bracket.rodadas.find(r => r.indice === rodadaAtual.indice + 1);
      if (!proximaRodada) return;
      
      // Calcular posição na próxima rodada
      const posicaoNaProximaRodada = Math.floor(posicaoNaRodadaAtual / 2);
      const proximaPartida = proximaRodada.matches[posicaoNaProximaRodada];
      
      if (!proximaPartida) return;
      
      // Remover o vencedor da próxima partida
      const ehPrimeiro = posicaoNaRodadaAtual % 2 === 0;
      if (ehPrimeiro && proximaPartida.duplaA === vencedorId) {
        proximaPartida.duplaA = null;
      } else if (!ehPrimeiro && proximaPartida.duplaB === vencedorId) {
        proximaPartida.duplaB = null;
      }
      
      // Se a próxima partida ficou sem ambas as duplas, voltar para aguardando
      if (!proximaPartida.duplaA && !proximaPartida.duplaB) {
        proximaPartida.status = 'aguardando';
        proximaPartida.vencedor = null;
        proximaPartida.finalizada = null;
      } else if (proximaPartida.status === 'pendente' && (!proximaPartida.duplaA || !proximaPartida.duplaB)) {
        proximaPartida.status = 'aguardando';
      }
    }

    // Inicializar sincronização para torneio
    function inicializarSyncTorneio(tournamentId) {
      if (!window.syncFunctions) {
        console.warn('Módulo de sincronização não disponível');
        return;
      }
      
      console.log('Inicializando sincronização para torneio:', tournamentId);
      
      const callbacks = {
        onTournamentUpdate: (dados) => {
          console.log('Recebida atualização do torneio');
          // Recarregar torneio se mudou
          if (dados.timestamp > lastSyncTimestamp.value) {
            recarregarTorneioDoServidor(dados);
          }
        },
        
        onBracketUpdate: (dados) => {
          console.log('Recebida atualização do bracket');
          // Atualizar bracket se mudou
          if (dados.timestamp > lastSyncTimestamp.value) {
            atualizarBracketLocal(dados);
          }
        },
        
        onMatchUpdate: (dados) => {
          console.log('Recebida atualização de partida');
          // Atualizar partida se mudou
          if (dados.timestamp > lastSyncTimestamp.value) {
            atualizarPartidaLocal(dados);
          }
        },
        
        onPlayerJoin: (clienteInfo) => {
          console.log('Novo cliente conectado:', clienteInfo.id);
          atualizarContadorClientes();
          mostrarToast(`Novo usuário conectado ao torneio`);
        },
        
        onPlayerLeave: (clienteInfo) => {
          console.log('Cliente desconectado:', clienteInfo.id);
          atualizarContadorClientes();
        }
      };
      
      window.syncFunctions.inicializarSync(tournamentId, callbacks);
      
      // Atualizar contador inicial e configurar timer
      atualizarContadorClientes();
      setInterval(atualizarContadorClientes, 10000); // Atualizar a cada 10 segundos
    }

    // Atualizar contador de clientes conectados
    function atualizarContadorClientes() {
      if (!window.syncFunctions || !window.syncFunctions.isActive()) {
        clientesConectados.value = 1;
        return;
      }
      
      try {
        const clientes = window.syncFunctions.listarClientesAtivos();
        clientesConectados.value = clientes.length;
        syncStatus.value = clientes.length > 1 ? 'conectado' : 'desconectado';
      } catch (error) {
        console.error('Erro ao atualizar contador de clientes:', error);
        clientesConectados.value = 1;
      }
    }

    // Timestamp da última sincronização
    const lastSyncTimestamp = ref(0);

    // Callback para atualização do torneio recebida
    async function recarregarTorneioDoServidor(dados) {
      try {
        console.log('Recarregando torneio do servidor');
        lastSyncTimestamp.value = dados.timestamp;
        
        // Recarregar torneio completo do banco
        if (torneioAtual.value?.id) {
          await carregarTorneio(torneioAtual.value.id);
        }
      } catch (error) {
        console.error('Erro ao recarregar torneio:', error);
      }
    }

    // Callback para atualização do bracket recebida
    function atualizarBracketLocal(dados) {
      try {
        console.log('Atualizando bracket local');
        lastSyncTimestamp.value = dados.timestamp;
        
        // Atualizar bracket reativo
        if (dados.bracket && bracket.value) {
          bracket.value.rodadas = dados.bracket.rodadas;
          
          // Atualizar estatísticas
          if (window.bracketFunctions) {
            const stats = window.bracketFunctions.obterEstatisticasBracket(bracket.value);
            bracketStats.value = stats;
          }
          
          // Recarregar próximas partidas
          carregarProximasPartidas();
        }
      } catch (error) {
        console.error('Erro ao atualizar bracket:', error);
      }
    }

    // Callback para atualização de partida recebida
    function atualizarPartidaLocal(dados) {
      try {
        console.log('Atualizando partida local');
        lastSyncTimestamp.value = dados.timestamp;
        
        // Se estamos na tela da partida e é a mesma partida
        if (currentRoute.value === 'partida' && partidaAtual.value?.id === dados.partida.id) {
          // Atualizar partida atual apenas se não estamos editando neste momento
          const agora = Date.now();
          const ultimaAcaoLocal = partidaAtual.value.ultimaAcaoLocal || 0;
          
          // Só atualizar se a última ação local foi há mais de 2 segundos
          if (agora - ultimaAcaoLocal > 2000) {
            partidaAtual.value = { ...dados.partida };
          }
        }
        
        // Atualizar bracket se a partida mudou
        if (bracket.value) {
          for (const rodada of bracket.value.rodadas) {
            const index = rodada.matches.findIndex(m => m.id === dados.partida.id);
            if (index !== -1) {
              rodada.matches[index] = { ...dados.partida };
              break;
            }
          }
        }
      } catch (error) {
        console.error('Erro ao atualizar partida:', error);
      }
    }

    // Salvar progresso da partida atual
    async function salvarProgresso() {
      if (!partidaAtual.value || !bracket.value) return;
      
      // Verificar se há torneio ativo
      if (!torneioAtual.value) {
        console.error('Tentativa de salvar progresso sem torneio ativo');
        return;
      }
      
      // Encontrar a partida no bracket e atualizar
      for (const rodada of bracket.value.rodadas) {
        const index = rodada.matches.findIndex(m => m.id === partidaAtual.value.id);
        if (index !== -1) {
          rodada.matches[index] = { ...partidaAtual.value };
          break;
        }
      }
      
      // Salvar torneio
      torneioAtual.value.bracket = bracket.value;
      torneioAtual.value.duplas = duplas.value;
      await salvarTorneioAtual();
      
      // Publicar atualização via sincronização
      if (window.syncFunctions && window.syncFunctions.isActive()) {
        lastSyncTimestamp.value = Date.now();
        
        if (partidaAtual.value) {
          // Publicar atualização da partida
          window.syncFunctions.publicarAtualizacao('match', {
            partida: partidaAtual.value,
            timestamp: lastSyncTimestamp.value
          });
        }
        
        // Publicar atualização do bracket
        window.syncFunctions.publicarAtualizacao('bracket', {
          bracket: bracket.value,
          timestamp: lastSyncTimestamp.value
        });
      }
    }

    // Voltar para o bracket
    function voltarParaBracket() {
      navigate('bracket');
    }

    // Estados para compartilhamento
    const linkCompartilhamento = ref(null);
    const gerandoLink = ref(false);
    const gerandoQR = ref(false);
    const mostrarQR = ref(false);
    const linkCopiado = ref(false);
    const backupsDisponiveis = ref([]);
    const modoVisualizacao = ref(false);

    // Exportar torneio usando o módulo de exportação
    function exportarTorneioJSON() {
      if (!torneioAtual.value) {
        mostrarToast('Nenhum torneio carregado para exportar');
        return;
      }

      if (!window.exportFunctions) {
        mostrarToast('Módulo de exportação não está disponível');
        return;
      }

      try {
        const resultado = window.exportFunctions.exportarTorneioJSON(torneioAtual.value);
        mostrarToast(`Arquivo exportado: ${resultado.nomeArquivo}`);
      } catch (error) {
        console.error('Erro ao exportar:', error);
        mostrarToast('Erro ao exportar torneio: ' + error.message);
      }
    }

    // Exportar torneio (mantida para compatibilidade)
    function exportarTorneio() {
      exportarTorneioJSON();
    }

    // Gerar link de compartilhamento somente leitura
    async function gerarLinkSomenteLeitura() {
      if (!torneioAtual.value) {
        mostrarToast('Nenhum torneio carregado');
        return;
      }

      if (!window.exportFunctions) {
        mostrarToast('Módulo de exportação não está disponível');
        return;
      }

      gerandoLink.value = true;
      linkCopiado.value = false;

      try {
        const resultado = window.exportFunctions.gerarLinkCompartilhamento(torneioAtual.value, true);
        linkCompartilhamento.value = resultado;
        
        if (resultado.valido) {
          mostrarToast('Link de compartilhamento gerado!');
        } else {
          mostrarToast('Link gerado, mas pode ser muito longo para alguns navegadores');
        }
      } catch (error) {
        console.error('Erro ao gerar link:', error);
        mostrarToast('Erro ao gerar link: ' + error.message);
      } finally {
        gerandoLink.value = false;
      }
    }

    // Gerar QR Code
    async function gerarQRCode() {
      if (!linkCompartilhamento.value?.link) {
        mostrarToast('Gere um link primeiro');
        return;
      }

      if (!window.exportFunctions) {
        mostrarToast('Módulo de exportação não está disponível');
        return;
      }

      gerandoQR.value = true;

      try {
        await nextTick(); // Garantir que o elemento existe
        const container = document.querySelector('[ref="qrContainer"]');
        
        if (!container) {
          throw new Error('Elemento para QR Code não encontrado');
        }

        window.exportFunctions.gerarQRCode(linkCompartilhamento.value.link, container, {
          tamanho: 200
        });
        
        mostrarQR.value = true;
        mostrarToast('QR Code gerado com sucesso!');
      } catch (error) {
        console.error('Erro ao gerar QR Code:', error);
        mostrarToast('Erro ao gerar QR Code: ' + error.message);
      } finally {
        gerandoQR.value = false;
      }
    }

    // Copiar link para clipboard
    async function copiarLink() {
      if (!linkCompartilhamento.value?.link) {
        return;
      }

      try {
        if (navigator.clipboard && window.isSecureContext) {
          await navigator.clipboard.writeText(linkCompartilhamento.value.link);
        } else {
          // Fallback para navegadores mais antigos
          const linkInput = document.querySelector('[ref="linkInput"]');
          if (linkInput) {
            linkInput.select();
            linkInput.setSelectionRange(0, 99999);
            document.execCommand('copy');
          }
        }
        
        linkCopiado.value = true;
        mostrarToast('Link copiado para a área de transferência!');
        
        setTimeout(() => {
          linkCopiado.value = false;
        }, 3000);
      } catch (error) {
        console.error('Erro ao copiar link:', error);
        mostrarToast('Erro ao copiar link', 'erro');
      }
    }

    // Criar backup automático
    function criarBackupAutomatico() {
      if (!torneioAtual.value) {
        mostrarToast('Nenhum torneio carregado');
        return;
      }

      if (!window.exportFunctions) {
        mostrarToast('Módulo de exportação não está disponível');
        return;
      }

      try {
        window.exportFunctions.criarBackupAutomatico(torneioAtual.value);
        carregarBackups();
        mostrarToast('Backup criado no armazenamento local!');
      } catch (error) {
        console.error('Erro ao criar backup:', error);
        mostrarToast('Erro ao criar backup: ' + error.message);
      }
    }

    // Carregar lista de backups
    function carregarBackups() {
      if (!window.exportFunctions) {
        return;
      }

      try {
        backupsDisponiveis.value = window.exportFunctions.listarBackups();
      } catch (error) {
        console.error('Erro ao carregar backups:', error);
      }
    }

    // Restaurar backup
    async function restaurarBackup(backupId) {
      if (!window.exportFunctions) {
        mostrarToast('Módulo de exportação não está disponível');
        return;
      }

      try {
        const dadosTorneio = window.exportFunctions.restaurarBackup(backupId);
        
        // Gerar novo ID para evitar conflitos
        dadosTorneio.id = `tourn_restored_${Date.now()}`;
        dadosTorneio.nome = `${dadosTorneio.nome} (Restaurado)`;
        
        // Salvar no banco
        await db.torneios.add(dadosTorneio);
        await carregarTorneiosSalvos();
        
        // Carregar o torneio restaurado
        await carregarTorneio(dadosTorneio.id);
        navigate('bracket');
        
        mostrarToast('Backup restaurado com sucesso!');
      } catch (error) {
        console.error('Erro ao restaurar backup:', error);
        mostrarToast('Erro ao restaurar backup: ' + error.message);
      }
    }


    // Funções utilitárias para estatísticas
    function calcularTotalPartidas() {
      if (!bracket.value?.rodadas) return 0;
      return bracket.value.rodadas.reduce((total, rodada) => total + rodada.matches.length, 0);
    }

    function calcularMediaPartidasPorRodada() {
      if (!bracket.value?.rodadas?.length) return 0;
      const total = calcularTotalPartidas();
      return Math.round(total / bracket.value.rodadas.length * 10) / 10;
    }

    function calcularTempoEstimado() {
      const totalPartidas = calcularTotalPartidas();
      const tempoMedioPorPartida = 15; // minutos
      const tempoTotal = totalPartidas * tempoMedioPorPartida;
      
      if (tempoTotal < 60) {
        return `${tempoTotal}min`;
      } else {
        const horas = Math.floor(tempoTotal / 60);
        const minutos = tempoTotal % 60;
        return `${horas}h${minutos > 0 ? `${minutos}min` : ''}`;
      }
    }

    // Computed para duplas ordenadas por estatísticas
    const duplasComEstatisticas = computed(() => {
      return [...duplas.value].sort((a, b) => {
        // Ordenar por vitórias (decrescente), depois por saldo de pontos
        if (b.stats.vitorias !== a.stats.vitorias) {
          return b.stats.vitorias - a.stats.vitorias;
        }
        const saldoA = a.stats.pontosPro - a.stats.pontosContra;
        const saldoB = b.stats.pontosPro - b.stats.pontosContra;
        return saldoB - saldoA;
      });
    });

    // Lidar com torneio compartilhado
    function processarTorneioCompartilhado(event) {
      const { dados, modo } = event.detail;
      console.log('Processando torneio compartilhado:', dados.nome, modo);
      
      // Carregar dados do torneio compartilhado
      torneioAtual.value = dados;
      duplas.value = dados.duplas || [];
      bracket.value = dados.bracket || { rodadas: [] };
      
      // Ativar modo visualização
      modoVisualizacao.value = modo === 'somente-leitura';
      
      // Carregar dados do bracket
      carregarBracket();
      
      // Navegar para tela de visualização pública se for somente leitura
      if (modo === 'somente-leitura') {
        navigate('visualizar-publico');
      } else if (bracket.value.rodadas?.length > 0) {
        navigate('bracket');
      } else {
        navigate('duplas');
      }
      
      mostrarToast(`Visualizando torneio compartilhado: ${dados.nome}`);
    }

    return {
      currentRoute,
      torneioAtual,
      torneiosSalvos,
      torneioCompartilhado,
      toast,
      novoTorneio,
      pageTitle,
      appVersion,
      showTabBar,
      canGoBack,
      mainClass,
      navigate,
      goBack,
      mostrarToast,
      abrirTorneio,
      criarTorneio,
      excluirTorneio,
      reiniciarTorneio,
      formatarData,
      // Duplas
      duplas,
      mostrarFormularioDupla,
      duplaEditando,
      formularioDupla,
      textoImportacao,
      editarDupla,
      cancelarEdicao,
      salvarDupla,
      removerDupla,
      importarDuplas,
      limparImportacao,
      carregarDuplasBase,
      gerarBracket,
      carregarDuplas,
      // Jogadores salvos
      jogadoresSalvos,
      sugestoesJogador1,
      sugestoesJogador2,
      mostrarSugestoesJ1,
      mostrarSugestoesJ2,
      buscarSugestoesJogador,
      selecionarJogador,
      esconderSugestoesJ1,
      esconderSugestoesJ2,
      // Bracket
      bracket,
      bracketStats,
      proximasPartidas,
      bracketDisponivel,
      obterNomeDupla,
      obterClassePartida,
      iniciarPartida,
      // Partida
      partidaAtual,
      contarVitoriasMaos,
      contarTentosMaoAtual,
      adicionarPontoMao,
      desfazerUltimaMao,
      editarResultado,
      voltarParaBracket,
      // Compartilhamento e Exportação
      exportarTorneio,
      exportarTorneioJSON,
      gerarLinkSomenteLeitura,
      gerarQRCode,
      copiarLink,
      criarBackupAutomatico,
      restaurarBackup,
      calcularTotalPartidas,
      calcularMediaPartidasPorRodada,
      calcularTempoEstimado,
      duplasComEstatisticas,
      // Estados para compartilhamento
      linkCompartilhamento,
      gerandoLink,
      gerandoQR,
      mostrarQR,
      linkCopiado,
      backupsDisponiveis,
      modoVisualizacao,
      // Estados para sincronização
      clientesConectados,
      syncStatus,
      lastSyncTimestamp
    };
  }
}).mount('#app');