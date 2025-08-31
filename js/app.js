/**
 * App Principal - Sistema 100% Online
 * Toda a persistência é feita no servidor
 */

const { createApp, ref, reactive, computed, onMounted, nextTick } = Vue;

createApp({
  setup() {
    // Estado da aplicação
    const currentRoute = ref('home');
    const torneioAtual = ref(null);
    const torneiosSalvos = ref([]);
    const usuarioLocal = ref(null);
    const statusConexao = ref('conectando');
    const usuariosOnline = ref(0);
    
    // Toast para notificações
    const toast = reactive({
      show: false,
      message: '',
      tipo: 'sucesso'
    });

    // Formulário de novo torneio
    const novoTorneio = reactive({
      nome: '',
      regras: {
        formato: 'eliminatoria_simples',
        melhorDe: 3,
        pontosPorMao: 1,
        criterioDesempate: 'mao_extra'
      }
    });

    // Participantes e duplas
    const participantes = ref([]);
    const novoParticipante = ref('');
    const duplas = ref([]);
    const mostrarFormacaoDuplas = ref(false);
    const dupla1Selecionada = reactive({ jogador1: '', jogador2: '' });
    const dupla2Selecionada = reactive({ jogador1: '', jogador2: '' });
    
    // Partidas e bracket
    const bracket = ref(null);
    const partidaAtual = ref(null);
    const proximasPartidas = ref([]);
    const bracketStats = ref(null);

    // Formulário de dupla (mantido para compatibilidade)
    const mostrarFormularioDupla = ref(false);
    const duplaEditando = ref(null);
    const formularioDupla = reactive({
      nome: '',
      jogadores: ['', '']
    });
    
    // Variáveis legacy (mantidas para não quebrar)
    const jogadoresSalvos = ref([]);
    const sugestoesJogador1 = ref([]);
    const sugestoesJogador2 = ref([]);
    const mostrarSugestoesJ1 = ref(false);
    const mostrarSugestoesJ2 = ref(false);

    // Computed properties
    const pageTitle = computed(() => {
      const titles = {
        'home': 'Torneio de Truco',
        'novo-torneio': 'Novo Torneio',
        'duplas': 'Cadastro de Duplas',
        'bracket': 'Bracket do Torneio',
        'partida': 'Pontuação da Partida',
        'usuario': 'Meu Perfil'
      };
      return titles[currentRoute.value] || 'Torneio de Truco';
    });

    const showTabBar = computed(() => {
      return torneioAtual.value && ['duplas', 'bracket'].includes(currentRoute.value);
    });

    const bracketDisponivel = computed(() => {
      return torneioAtual.value?.bracket?.rodadas?.length > 0;
    });

    const appVersion = computed(() => {
      return window.AppVersion ? window.AppVersion.getDisplayVersion() : 'v1.0.0';
    });

    // Navegação
    function navigate(route, params = {}) {
      currentRoute.value = route;
      
      if (params.torneioId) {
        abrirTorneio(params.torneioId);
      }
      
      window.location.hash = route;
    }

    function goBack() {
      if (currentRoute.value === 'novo-torneio' || currentRoute.value === 'usuario') {
        navigate('home');
      } else if (torneioAtual.value) {
        navigate('bracket');
      } else {
        navigate('home');
      }
    }

    // Toast de notificação
    function mostrarToast(message, tipo = 'sucesso', duration = 3000) {
      toast.message = message;
      toast.tipo = tipo;
      toast.show = true;
      
      setTimeout(() => {
        toast.show = false;
      }, duration);
    }

    // ===== OPERAÇÕES ONLINE =====

    /**
     * Carrega lista de torneios do servidor
     */
    async function carregarTorneiosSalvos() {
      try {
        mostrarToast('Carregando torneios...', 'info');
        const torneios = await window.OnlineManager.listarTorneios();
        
        // Ordenar por data de modificação
        torneiosSalvos.value = torneios.sort((a, b) => 
          new Date(b.modificadoEm || b.criadoEm) - new Date(a.modificadoEm || a.criadoEm)
        );
        
        console.log(`📊 ${torneiosSalvos.value.length} torneios carregados do servidor`);
        
        if (torneiosSalvos.value.length === 0) {
          mostrarToast('Nenhum torneio encontrado', 'info');
        }
      } catch (error) {
        console.error('Erro ao carregar torneios:', error);
        mostrarToast('Erro ao conectar com servidor', 'erro');
        torneiosSalvos.value = [];
      }
    }

    /**
     * Abre um torneio específico
     */
    async function abrirTorneio(id) {
      try {
        mostrarToast('Abrindo torneio...', 'info');
        
        // Carregar do servidor
        const torneio = await window.OnlineManager.carregarTorneio(id);
        
        if (!torneio) {
          mostrarToast('Torneio não encontrado', 'erro');
          navigate('home');
          return;
        }
        
        torneioAtual.value = torneio;
        participantes.value = torneio.participantes || [];
        duplas.value = torneio.duplas || [];
        bracket.value = torneio.bracket || { rodadas: [] };
        
        // Conectar WebSocket para este torneio
        window.OnlineManager.conectarWebSocket(id);
        
        // Configurar callbacks
        configurarCallbacks();
        
        // Navegar para tela apropriada
        if (!torneio.duplas?.length) {
          navigate('duplas');
        } else if (torneio.bracket?.rodadas?.length > 0) {
          navigate('bracket');
        } else {
          navigate('duplas');
        }
        
        mostrarToast('Torneio carregado!', 'sucesso');
      } catch (error) {
        console.error('Erro ao abrir torneio:', error);
        mostrarToast('Erro ao abrir torneio', 'erro');
        navigate('home');
      }
    }

    /**
     * Cria novo torneio
     */
    async function criarTorneio() {
      if (!novoTorneio.nome.trim()) {
        mostrarToast('Nome do torneio é obrigatório', 'erro');
        return;
      }

      try {
        mostrarToast('Criando torneio...', 'info');
        
        const torneio = await window.OnlineManager.criarTorneio({
          nome: novoTorneio.nome,
          regras: { ...novoTorneio.regras },
          duplas: [],
          bracket: { rodadas: [] },
          status: 'configuracao',
          campeao: null
        });
        
        torneioAtual.value = torneio;
        duplas.value = [];
        bracket.value = { rodadas: [] };
        
        // Limpar formulário
        novoTorneio.nome = '';
        
        // Configurar callbacks
        configurarCallbacks();
        
        navigate('duplas');
        mostrarToast('Torneio criado com sucesso!', 'sucesso');
        
        // Recarregar lista
        await carregarTorneiosSalvos();
      } catch (error) {
        console.error('Erro ao criar torneio:', error);
        mostrarToast('Erro ao criar torneio', 'erro');
      }
    }

    /**
     * Exclui torneio
     */
    async function excluirTorneio(torneioId) {
      if (!confirm('Tem certeza que deseja excluir este torneio? Esta ação não pode ser desfeita.')) {
        return;
      }
      
      try {
        mostrarToast('Excluindo torneio...', 'info');
        
        await window.OnlineManager.excluirTorneio(torneioId);
        
        // Se for o torneio atual, limpar
        if (torneioAtual.value?.id === torneioId) {
          torneioAtual.value = null;
          duplas.value = [];
          bracket.value = null;
          partidaAtual.value = null;
        }
        
        // Recarregar lista
        await carregarTorneiosSalvos();
        
        mostrarToast('Torneio excluído com sucesso!', 'sucesso');
      } catch (error) {
        console.error('Erro ao excluir torneio:', error);
        mostrarToast('Erro ao excluir torneio', 'erro');
      }
    }

    /**
     * Salva alterações do torneio atual
     */
    async function salvarTorneioAtual() {
      if (!torneioAtual.value) return;
      
      try {
        torneioAtual.value.duplas = [...duplas.value];
        torneioAtual.value.bracket = bracket.value;
        
        await window.OnlineManager.atualizarTorneio(
          torneioAtual.value.id,
          torneioAtual.value
        );
        
        console.log('Torneio salvo no servidor');
      } catch (error) {
        console.error('Erro ao salvar torneio:', error);
        mostrarToast('Erro ao salvar alterações', 'erro');
      }
    }

    // ===== PARTICIPANTES =====
    
    async function adicionarParticipante() {
      const nome = novoParticipante.value.trim();
      if (!nome) {
        mostrarToast('Digite o nome do participante', 'erro');
        return;
      }
      
      // Verificar se j\u00e1 existe
      if (participantes.value.includes(nome)) {
        mostrarToast('Participante j\u00e1 cadastrado', 'erro');
        return;
      }
      
      participantes.value.push(nome);
      novoParticipante.value = '';
      
      // Salvar no torneio
      if (torneioAtual.value) {
        torneioAtual.value.participantes = [...participantes.value];
        await salvarTorneioAtual();
      }
      
      mostrarToast(`${nome} adicionado!`, 'sucesso');
    }
    
    async function removerParticipante(nome) {
      participantes.value = participantes.value.filter(p => p !== nome);
      
      if (torneioAtual.value) {
        torneioAtual.value.participantes = [...participantes.value];
        await salvarTorneioAtual();
      }
      
      mostrarToast('Participante removido', 'sucesso');
    }
    
    function formarDuplasAleatorias() {
      if (participantes.value.length < 4) {
        mostrarToast('Adicione pelo menos 4 participantes', 'erro');
        return;
      }
      
      if (participantes.value.length % 2 !== 0) {
        mostrarToast('N\u00famero de participantes deve ser par', 'erro');
        return;
      }
      
      // Embaralhar participantes
      const embaralhados = [...participantes.value].sort(() => Math.random() - 0.5);
      
      // Limpar duplas anteriores
      duplas.value = [];
      
      // Formar duplas
      for (let i = 0; i < embaralhados.length; i += 2) {
        const dupla = {
          id: `dupla_${Date.now()}_${i}`,
          nome: `${embaralhados[i]} & ${embaralhados[i + 1]}`,
          jogadores: [embaralhados[i], embaralhados[i + 1]],
          pontos: 0
        };
        duplas.value.push(dupla);
      }
      
      salvarTorneioAtual();
      mostrarToast('Duplas formadas aleatoriamente!', 'sucesso');
    }
    
    async function formarDuplaManual(jogador1, jogador2) {
      if (!jogador1 || !jogador2) {
        mostrarToast('Selecione dois jogadores', 'erro');
        return;
      }
      
      if (jogador1 === jogador2) {
        mostrarToast('Selecione jogadores diferentes', 'erro');
        return;
      }
      
      // Verificar se jogadores j\u00e1 est\u00e3o em duplas
      const jogadorEmDupla = duplas.value.some(d => 
        d.jogadores.includes(jogador1) || d.jogadores.includes(jogador2)
      );
      
      if (jogadorEmDupla) {
        mostrarToast('Um dos jogadores j\u00e1 est\u00e1 em uma dupla', 'erro');
        return;
      }
      
      const dupla = {
        id: `dupla_${Date.now()}`,
        nome: `${jogador1} & ${jogador2}`,
        jogadores: [jogador1, jogador2],
        pontos: 0
      };
      
      duplas.value.push(dupla);
      await salvarTorneioAtual();
      
      mostrarToast('Dupla formada!', 'sucesso');
      
      // Limpar sele\u00e7\u00e3o
      dupla1Selecionada.jogador1 = '';
      dupla1Selecionada.jogador2 = '';
    }
    
    function getParticipantesDisponiveis() {
      const emDuplas = duplas.value.flatMap(d => d.jogadores);
      return participantes.value.filter(p => !emDuplas.includes(p));
    }

    // ===== DUPLAS (mantido para compatibilidade) =====

    async function adicionarDupla() {
      if (!formularioDupla.nome.trim()) {
        mostrarToast('Nome da dupla é obrigatório', 'erro');
        return;
      }

      if (!formularioDupla.jogadores[0].trim() || !formularioDupla.jogadores[1].trim()) {
        mostrarToast('Nomes dos jogadores são obrigatórios', 'erro');
        return;
      }

      const novaDupla = {
        id: duplaEditando.value ? duplaEditando.value.id : `dupla_${Date.now()}`,
        nome: formularioDupla.nome.trim(),
        jogadores: formularioDupla.jogadores.map(j => j.trim()),
        pontos: 0
      };

      if (duplaEditando.value) {
        const index = duplas.value.findIndex(d => d.id === duplaEditando.value.id);
        if (index !== -1) {
          duplas.value[index] = novaDupla;
        }
      } else {
        duplas.value.push(novaDupla);
      }

      await salvarTorneioAtual();

      formularioDupla.nome = '';
      formularioDupla.jogadores = ['', ''];
      mostrarFormularioDupla.value = false;
      duplaEditando.value = null;

      mostrarToast(duplaEditando.value ? 'Dupla atualizada!' : 'Dupla adicionada!');
    }

    async function removerDupla(dupla) {
      if (!confirm(`Remover a dupla ${dupla.nome}?`)) return;
      
      duplas.value = duplas.value.filter(d => d.id !== dupla.id);
      await salvarTorneioAtual();
      mostrarToast('Dupla removida');
    }

    // ===== BRACKET =====

    async function gerarBracket() {
      console.log('Gerando bracket com duplas:', duplas.value);
      
      if (duplas.value.length < 2) {
        mostrarToast('Adicione pelo menos 2 duplas', 'erro');
        return;
      }

      if (bracket.value?.rodadas?.length > 0) {
        if (!confirm('Gerar novo bracket? Isso apagará o progresso atual.')) {
          return;
        }
      }

      try {
        // Verificar se BracketSystem existe
        if (!window.BracketSystem || !window.BracketSystem.gerarBracket) {
          console.error('BracketSystem não encontrado');
          mostrarToast('Erro: Sistema de bracket não carregado', 'erro');
          return;
        }
        
        bracket.value = window.BracketSystem.gerarBracket(
          duplas.value,
          torneioAtual.value?.regras || { formato: 'eliminatoria_simples', melhorDe: 3 }
        );
        
        console.log('Bracket gerado:', bracket.value);
        
        // Salvar e navegar
        await salvarTorneioAtual();
        
        atualizarBracketStats();
        atualizarProximasPartidas();
        
        mostrarToast('Bracket gerado com sucesso!');
        
        // Navegar para a tela do bracket
        navigate('bracket');
      } catch (error) {
        console.error('Erro ao gerar bracket:', error);
        mostrarToast('Erro ao gerar bracket: ' + error.message, 'erro');
      }
    }

    function atualizarBracketStats() {
      if (!bracket.value) return;
      
      // Verificar se a função existe
      if (window.BracketSystem && window.BracketSystem.calcularEstatisticas) {
        bracketStats.value = window.BracketSystem.calcularEstatisticas(bracket.value);
      } else if (window.BracketSystem && window.BracketSystem.obterEstatisticasBracket) {
        bracketStats.value = window.BracketSystem.obterEstatisticasBracket(bracket.value);
      }
    }

    function atualizarProximasPartidas() {
      if (!bracket.value) return;
      
      proximasPartidas.value = window.BracketSystem.obterProximasPartidas(bracket.value);
    }

    // ===== PARTIDAS =====

    function iniciarPartida(partida) {
      partidaAtual.value = partida;
      partidaAtual.value.pontuacao = partidaAtual.value.pontuacao || {
        duplaA: { maos: [], pontosTotais: 0 },
        duplaB: { maos: [], pontosTotais: 0 }
      };
      navigate('partida');
    }

    async function finalizarPartida() {
      if (!partidaAtual.value) return;

      const resultado = window.ScoringSystem.determinarVencedor(
        partidaAtual.value.pontuacao,
        torneioAtual.value.regras
      );

      partidaAtual.value.vencedor = resultado.vencedor;
      partidaAtual.value.status = 'finalizada';
      partidaAtual.value.finalizadaEm = new Date().toISOString();

      // Atualizar bracket
      window.BracketSystem.atualizarPartida(bracket.value, partidaAtual.value);
      
      // Avançar vencedor
      window.BracketSystem.avancarVencedor(bracket.value, partidaAtual.value);
      
      // Verificar se torneio acabou
      const campeao = window.BracketSystem.obterCampeao(bracket.value);
      if (campeao) {
        torneioAtual.value.campeao = campeao;
        torneioAtual.value.status = 'finalizado';
        mostrarToast(`🏆 ${campeao.nome} é o campeão!`, 'sucesso', 5000);
      }
      
      await salvarTorneioAtual();
      
      // Enviar atualização via WebSocket
      if (window.OnlineManager.estaConectado()) {
        window.OnlineManager.atualizarPartida({
          partidaId: partidaAtual.value.id,
          pontuacao: partidaAtual.value.pontuacao,
          vencedor: partidaAtual.value.vencedor,
          status: partidaAtual.value.status
        });
      }
      
      partidaAtual.value = null;
      navigate('bracket');
      
      atualizarBracketStats();
      atualizarProximasPartidas();
    }

    // ===== CALLBACKS WEBSOCKET =====

    function configurarCallbacks() {
      window.OnlineManager.setCallbacks({
        onConnect: () => {
          statusConexao.value = 'conectado';
          console.log('Conectado ao servidor');
        },
        
        onDisconnect: () => {
          statusConexao.value = 'desconectado';
          console.log('Desconectado do servidor');
        },
        
        onEstadoInicial: (dados) => {
          console.log('Estado inicial recebido:', dados);
          if (dados) {
            torneioAtual.value = dados;
            duplas.value = dados.duplas || [];
            bracket.value = dados.bracket || { rodadas: [] };
            atualizarBracketStats();
            atualizarProximasPartidas();
          }
        },
        
        onTorneioAtualizado: (dados) => {
          console.log('Torneio atualizado:', dados);
          if (dados && dados.id === torneioAtual.value?.id) {
            torneioAtual.value = dados;
            duplas.value = dados.duplas || [];
            bracket.value = dados.bracket || { rodadas: [] };
            atualizarBracketStats();
            atualizarProximasPartidas();
          }
        },
        
        onBracketAtualizado: (dados) => {
          console.log('Bracket atualizado:', dados);
          if (dados.bracket) {
            bracket.value = dados.bracket;
            atualizarBracketStats();
            atualizarProximasPartidas();
          }
        },
        
        onPartidaAtualizada: (dados) => {
          console.log('Partida atualizada:', dados);
          if (partidaAtual.value && dados.partidaId === partidaAtual.value.id) {
            Object.assign(partidaAtual.value, dados);
          }
          if (bracket.value) {
            atualizarBracketStats();
            atualizarProximasPartidas();
          }
        },
        
        onUsuariosAtualizado: (dados) => {
          usuariosOnline.value = dados.total;
          console.log(`Usuários online: ${dados.total}`);
        }
      });
    }

    // ===== USUÁRIO LOCAL =====

    function carregarUsuarioLocal() {
      const usuario = window.OnlineManager.getUsuarioLocal();
      if (usuario) {
        usuarioLocal.value = usuario;
      }
    }

    function salvarUsuarioLocal() {
      const nome = prompt('Digite seu nome:');
      if (nome && nome.trim()) {
        usuarioLocal.value = window.OnlineManager.setUsuarioLocal(nome.trim());
        mostrarToast('Perfil salvo!', 'sucesso');
      }
    }

    // ===== LIFECYCLE =====

    onMounted(async () => {
      console.log('🚀 App Online iniciado');
      
      // Carregar usuário local
      carregarUsuarioLocal();
      
      // Verificar servidor
      const status = await window.OnlineManager.verificarServidor();
      if (status.status === 'online') {
        statusConexao.value = 'online';
        mostrarToast('Conectado ao servidor', 'sucesso');
      } else {
        statusConexao.value = 'offline';
        mostrarToast('Servidor offline', 'erro');
      }
      
      // Carregar torneios
      await carregarTorneiosSalvos();
      
      // Processar rota inicial
      const hash = window.location.hash.slice(1);
      if (hash) {
        currentRoute.value = hash;
      }
    });

    // Funções auxiliares que faltavam
    function editarDupla(dupla) {
      duplaEditando.value = dupla;
      formularioDupla.nome = dupla.nome;
      formularioDupla.jogadores = [...dupla.jogadores];
      mostrarFormularioDupla.value = true;
    }

    function cancelarEdicaoDupla() {
      duplaEditando.value = null;
      formularioDupla.nome = '';
      formularioDupla.jogadores = ['', ''];
      mostrarFormularioDupla.value = false;
    }

    function ordenarDuplas() {
      // Função vazia por enquanto - ordenação manual removida
    }

    async function adicionarPontoMao(dupla) {
      if (!partidaAtual.value) return;
      
      const pontuacao = partidaAtual.value.pontuacao;
      const lado = partidaAtual.value.duplaA?.id === dupla.id ? 'duplaA' : 'duplaB';
      
      if (!pontuacao[lado]) {
        pontuacao[lado] = { maos: [], pontosTotais: 0 };
      }
      
      pontuacao[lado].maos.push(1);
      pontuacao[lado].pontosTotais = pontuacao[lado].maos.reduce((a, b) => a + b, 0);
      
      await salvarTorneioAtual();
    }

    async function removerPontoMao(dupla) {
      if (!partidaAtual.value) return;
      
      const pontuacao = partidaAtual.value.pontuacao;
      const lado = partidaAtual.value.duplaA?.id === dupla.id ? 'duplaA' : 'duplaB';
      
      if (pontuacao[lado]?.maos?.length > 0) {
        pontuacao[lado].maos.pop();
        pontuacao[lado].pontosTotais = pontuacao[lado].maos.reduce((a, b) => a + b, 0);
        await salvarTorneioAtual();
      }
    }

    async function adicionarTento(dupla, valor) {
      if (!partidaAtual.value) return;
      
      const pontuacao = partidaAtual.value.pontuacao;
      const lado = partidaAtual.value.duplaA?.id === dupla.id ? 'duplaA' : 'duplaB';
      
      if (!pontuacao[lado]) {
        pontuacao[lado] = { maos: [], pontosTotais: 0 };
      }
      
      pontuacao[lado].maos.push(valor);
      pontuacao[lado].pontosTotais = pontuacao[lado].maos.reduce((a, b) => a + b, 0);
      
      await salvarTorneioAtual();
    }

    async function removerUltimoTento(dupla) {
      if (!partidaAtual.value) return;
      
      const pontuacao = partidaAtual.value.pontuacao;
      const lado = partidaAtual.value.duplaA?.id === dupla.id ? 'duplaA' : 'duplaB';
      
      if (pontuacao[lado]?.maos?.length > 0) {
        pontuacao[lado].maos.pop();
        pontuacao[lado].pontosTotais = pontuacao[lado].maos.reduce((a, b) => a + b, 0);
        await salvarTorneioAtual();
      }
    }

    function voltarPartida() {
      partidaAtual.value = null;
      navigate('bracket');
    }

    async function reiniciarTorneio(torneioId) {
      if (!confirm('Tem certeza que deseja reiniciar este torneio? Todas as partidas serão zeradas.')) {
        return;
      }
      
      try {
        const torneio = await window.OnlineManager.carregarTorneio(torneioId);
        if (!torneio) {
          mostrarToast('Torneio não encontrado', 'erro');
          return;
        }
        
        torneio.bracket = { rodadas: [] };
        torneio.campeao = null;
        torneio.status = 'configuracao';
        
        await window.OnlineManager.atualizarTorneio(torneioId, torneio);
        await carregarTorneiosSalvos();
        
        mostrarToast('Torneio reiniciado com sucesso!');
      } catch (error) {
        console.error('Erro ao reiniciar torneio:', error);
        mostrarToast('Erro ao reiniciar torneio', 'erro');
      }
    }

    function compartilharTorneio() {
      if (!torneioAtual.value) return;
      
      const url = `${window.location.origin}/#torneio/${torneioAtual.value.id}`;
      
      if (navigator.share) {
        navigator.share({
          title: torneioAtual.value.nome,
          text: `Acompanhe o torneio ${torneioAtual.value.nome}`,
          url: url
        });
      } else {
        navigator.clipboard.writeText(url);
        mostrarToast('Link copiado!', 'sucesso');
      }
    }

    const canGoBack = computed(() => {
      return currentRoute.value !== 'home';
    });

    const mainClass = computed(() => {
      return showTabBar.value ? 'pb-20' : '';
    });

    // Polling para atualizar torneios automaticamente
    setInterval(async () => {
      if (statusConexao.value === 'online' && currentRoute.value === 'home') {
        const torneios = await window.OnlineManager.listarTorneios();
        if (torneios.length !== torneiosSalvos.value.length) {
          torneiosSalvos.value = torneios.sort((a, b) => 
            new Date(b.modificadoEm || b.criadoEm) - new Date(a.modificadoEm || a.criadoEm)
          );
        }
      }
    }, 5000); // Atualiza a cada 5 segundos

    // Retornar API pública
    return {
      // Estado
      currentRoute,
      torneioAtual,
      torneiosSalvos,
      usuarioLocal,
      statusConexao,
      usuariosOnline,
      toast,
      novoTorneio,
      participantes,
      novoParticipante,
      duplas,
      mostrarFormacaoDuplas,
      dupla1Selecionada,
      dupla2Selecionada,
      bracket,
      partidaAtual,
      proximasPartidas,
      bracketStats,
      mostrarFormularioDupla,
      duplaEditando,
      formularioDupla,
      jogadoresSalvos,
      sugestoesJogador1,
      sugestoesJogador2,
      mostrarSugestoesJ1,
      mostrarSugestoesJ2,
      
      // Computed
      pageTitle,
      showTabBar,
      bracketDisponivel,
      appVersion,
      canGoBack,
      mainClass,
      
      // Métodos - Navegação
      navigate,
      goBack,
      
      // Métodos - Torneios
      carregarTorneiosSalvos,
      abrirTorneio,
      criarTorneio,
      excluirTorneio,
      reiniciarTorneio,
      compartilharTorneio,
      
      // Métodos - Participantes
      adicionarParticipante,
      removerParticipante,
      formarDuplasAleatorias,
      formarDuplaManual,
      getParticipantesDisponiveis,
      
      // Métodos - Duplas
      adicionarDupla,
      editarDupla,
      removerDupla,
      cancelarEdicaoDupla,
      ordenarDuplas,
      
      // Métodos - Bracket
      gerarBracket,
      
      // Métodos - Partidas
      iniciarPartida,
      finalizarPartida,
      voltarPartida,
      adicionarPontoMao,
      removerPontoMao,
      adicionarTento,
      removerUltimoTento,
      
      // Métodos - Usuário
      salvarUsuarioLocal,
      
      // Métodos - Utilidades
      mostrarToast,
      formatarData: (date) => dayjs(date).format('DD/MM/YYYY HH:mm')
    };
  }
}).mount('#app');