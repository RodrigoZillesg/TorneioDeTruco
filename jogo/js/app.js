/**
 * Aplicativo: menu, salas online, modais e navegação entre telas
 */
(function () {
  'use strict';

  const $ = (id) => document.getElementById(id);
  const AVATARES = ['🙂', '😎', '🤠', '🧔', '👩', '👴', '👵', '🦊', '🐂', '🐔', '🦁', '🐸', '🤖', '👽', '🎩', '🌵'];
  const CHAVE = 'truco.perfil';

  const perfil = Object.assign({
    nome: '',
    avatar: AVATARES[Math.floor(Math.random() * AVATARES.length)],
    modoLocal: '2',
    dificuldade: 'medio',
    modoOnline: '4',
    token: Math.random().toString(36).slice(2) + Date.now().toString(36)
  }, lerPerfil());
  salvarPerfil();

  function lerPerfil() {
    try { return JSON.parse(localStorage.getItem(CHAVE)) || {}; } catch (e) { return {}; }
  }
  function salvarPerfil() {
    try { localStorage.setItem(CHAVE, JSON.stringify(perfil)); } catch (e) { /* sem armazenamento */ }
  }

  // Com servidor Node usa Socket.IO; hospedado no WordPress usa o relay.php
  const cliente = window.TRUCO_RELAY ? new Conexoes.ClienteRelay(window.TRUCO_RELAY) : new Conexoes.ClienteOnline();
  let conexaoOnline = null;

  // ---------- Telas ----------
  function mostrarTela(id) {
    document.querySelectorAll('.tela').forEach(t => t.classList.toggle('ativa', t.id === id));
  }

  function nomeJogador() {
    const nome = $('inp-nome').value.trim().slice(0, 16);
    return nome || 'Você';
  }

  // ---------- Menu ----------
  function montarLeque() {
    const alvo = $('leque');
    const cartas = [{ id: '4p', valor: '4', naipe: 'p' }, { id: '7c', valor: '7', naipe: 'c' }, { id: 'Ae', valor: 'A', naipe: 'e' }, { id: '7o', valor: '7', naipe: 'o' }];
    alvo.style.setProperty('--cw', '92px');
    alvo.style.setProperty('--ch', '138px');
    cartas.forEach((c, i) => {
      const e = Cartas.criar(c);
      e.classList.add('manilha');
      if (i === 0) e.classList.add('zap');
      const ang = (i - 1.5) * 16;
      e.style.transform = `translateX(-50%) rotate(${ang}deg) translateY(-6px)`;
      e.style.transformOrigin = '50% 120%';
      e.style.animation = `abreLeque .9s cubic-bezier(.3,1.4,.5,1) ${0.15 * i}s both`;
      e.style.setProperty('--ang', ang + 'deg');
      alvo.appendChild(e);
    });
    const estilo = document.createElement('style');
    estilo.textContent = '@keyframes abreLeque { from { transform: translateX(-50%) rotate(0deg) translateY(60px); opacity: 0; } }';
    document.head.appendChild(estilo);
    alvo.addEventListener('pointerenter', () => { Som.iniciar(); Som.tocar('deslizar'); });
  }

  function montarAvatares() {
    const alvo = $('avatares');
    alvo.innerHTML = '';
    AVATARES.forEach(a => {
      const b = document.createElement('button');
      b.textContent = a;
      b.setAttribute('role', 'radio');
      b.setAttribute('aria-label', 'Avatar ' + a);
      b.classList.toggle('ativo', a === perfil.avatar);
      b.onclick = () => {
        perfil.avatar = a;
        salvarPerfil();
        alvo.querySelectorAll('button').forEach(x => x.classList.toggle('ativo', x === b));
        Som.tocar('pop');
      };
      alvo.appendChild(b);
    });
  }

  function configurarSeletores() {
    document.querySelectorAll('.seletor').forEach(sel => {
      const grupo = sel.dataset.grupo;
      if (perfil[grupo]) sel.querySelectorAll('button').forEach(b => b.classList.toggle('ativo', b.dataset.valor === perfil[grupo]));
      sel.addEventListener('click', (ev) => {
        const b = ev.target.closest('button');
        if (!b || sel.classList.contains('bloqueado')) return;
        sel.querySelectorAll('button').forEach(x => x.classList.toggle('ativo', x === b));
        Som.tocar('clique');
        if (grupo === 'dificuldadeSala') {
          cliente.enviar('configurar', { dificuldade: b.dataset.valor });
          return;
        }
        perfil[grupo] = b.dataset.valor;
        salvarPerfil();
      });
    });
  }

  $('inp-nome').value = perfil.nome;
  $('inp-nome').addEventListener('input', () => { perfil.nome = $('inp-nome').value.trim().slice(0, 16); salvarPerfil(); });

  // ---------- Jogo local ----------
  $('btn-jogar-ia').onclick = () => {
    Som.iniciar();
    Som.tocar('clique');
    const conexao = new Conexoes.ConexaoLocal({
      numJogadores: Number(perfil.modoLocal) === 4 ? 4 : 2,
      dificuldade: perfil.dificuldade,
      nome: nomeJogador(),
      avatar: perfil.avatar
    });
    entrarNaMesa(conexao);
  };

  function entrarNaMesa(conexao) {
    mostrarTela('tela-jogo');
    // Espera a transição da tela para medir a mesa corretamente
    setTimeout(() => Interface.iniciar(conexao), 80);
  }

  function voltarAoMenu() {
    const c = Interface.conexao;
    if (c) c.sair();
    Interface.parar();
    if (cliente.codigo) cliente.sair();
    conexaoOnline = null;
    mostrarTela('tela-menu');
    history.replaceState(null, '', location.pathname);
  }

  // ---------- Online ----------
  function carregarSocketIO() {
    return new Promise((resolve) => {
      if (window.io) return resolve(true);
      const s = document.createElement('script');
      s.src = '/socket.io/socket.io.js';
      s.onload = () => resolve(true);
      s.onerror = () => resolve(false);
      document.head.appendChild(s);
    });
  }

  let onlinePronto = null;
  function prepararOnline() {
    if (!onlinePronto) {
      const pronto = window.TRUCO_RELAY ? Promise.resolve(true) : carregarSocketIO();
      onlinePronto = pronto.then(ok => {
        if (!ok) {
          $('online-status').textContent = 'Modo online indisponível neste servidor (rode com "npm start").';
          return false;
        }
        configurarCliente();
        cliente.conectar();
        return true;
      });
    }
    return onlinePronto;
  }

  function configurarCliente() {
    cliente.on('sala', (sala) => renderizarSala(sala));
    cliente.on('estado', (pacote) => {
      if (!conexaoOnline || !$('tela-jogo').classList.contains('ativa')) {
        conexaoOnline = new Conexoes.ConexaoOnline(cliente);
        entrarNaMesa(conexaoOnline);
      }
      conexaoOnline.receber(pacote);
    });
    cliente.on('chat', (m) => adicionarChat(`<b>${escapar(m.avatar + ' ' + m.nome)}:</b> ${escapar(m.texto)}`));
    cliente.on('aviso', (m) => Interface.toast(m.texto));
    cliente.on('expulso', (m) => { Interface.toast(m.texto, true); voltarAoMenu(); });
    cliente.on('desconectado', () => { if (cliente.codigo) Interface.toast('Conexão perdida. Tentando reconectar...', true); });
    cliente.on('conectado', () => { $('online-status').textContent = ''; });
  }

  function dadosEntrada() {
    return { nome: nomeJogador(), avatar: perfil.avatar, token: perfil.token };
  }

  $('btn-criar-sala').onclick = async () => {
    Som.iniciar();
    Som.tocar('clique');
    if (!(await prepararOnline())) return;
    const r = await cliente.criar(Object.assign(dadosEntrada(), { numJogadores: Number(perfil.modoOnline) === 4 ? 4 : 2, dificuldade: perfil.dificuldade }));
    if (!r.ok) return Interface.toast(r.erro || 'Não foi possível criar a sala', true);
    abrirSala(r.codigo);
  };

  async function entrarSala(codigo) {
    codigo = String(codigo || '').trim().toUpperCase();
    if (codigo.length !== 4) return Interface.toast('Digite o código de 4 letras da sala', true);
    if (!(await prepararOnline())) return;
    const r = await cliente.entrar(Object.assign(dadosEntrada(), { codigo }));
    if (!r.ok) return Interface.toast(r.erro || 'Não foi possível entrar', true);
    abrirSala(r.codigo);
  }

  $('btn-entrar-sala').onclick = () => { Som.iniciar(); Som.tocar('clique'); entrarSala($('inp-codigo').value); };
  $('inp-codigo').addEventListener('keydown', (e) => { if (e.key === 'Enter') entrarSala($('inp-codigo').value); });

  function linkSala(codigo) {
    return location.origin + location.pathname + '?sala=' + codigo;
  }

  function abrirSala(codigo) {
    $('sala-codigo').textContent = codigo;
    $('chat-msgs').innerHTML = '';
    adicionarChat('Sala criada! Chame a galera com o código ou o link.', true);
    const link = linkSala(codigo);
    $('btn-whats').href = 'https://wa.me/?text=' + encodeURIComponent('Bora jogar truco? Entra na minha sala: ' + link);
    history.replaceState(null, '', location.pathname + '?sala=' + codigo);
    if (!cliente.sala || cliente.sala.estado !== 'jogo') mostrarTela('tela-sala');
  }

  function renderizarSala(sala) {
    if (sala.estado === 'jogo') return;
    if (!$('tela-sala').classList.contains('ativa') && !$('tela-jogo').classList.contains('ativa')) mostrarTela('tela-sala');
    if ($('tela-jogo').classList.contains('ativa') && Interface.conexao && Interface.conexao.tipo === 'online') {
      // A partida terminou e o anfitrião voltou ao lobby
      return;
    }
    $('sala-codigo').textContent = sala.codigo;
    [0, 1].forEach(eq => {
      const alvo = document.querySelector(`.assentos[data-equipe="${eq}"]`);
      alvo.innerHTML = '';
      sala.assentos.forEach((a, i) => {
        if (i % 2 !== eq) return;
        const d = document.createElement('div');
        if (!a) {
          d.className = 'assento vazio';
          d.innerHTML = '<span>＋ Lugar vago</span>';
          if (sala.souHost) {
            const acoes = document.createElement('div');
            acoes.className = 'acoes-assento';
            const b = document.createElement('button');
            b.textContent = '🤖 Bot';
            b.onclick = (ev) => { ev.stopPropagation(); cliente.enviar('bot', { assento: i, adicionar: true }); };
            acoes.appendChild(b);
            d.appendChild(acoes);
          }
          d.onclick = () => cliente.enviar('assento', { assento: i });
        } else {
          d.className = 'assento' + (i === sala.meuAssento ? ' eu' : '') + (a.conectado ? '' : ' offline');
          d.innerHTML = `<span class="av">${escapar(a.avatar)}</span><span class="nome">${escapar(a.nome)}</span>` +
            (a.host ? '<span class="tag">👑 anfitrião</span>' : '') + (a.bot ? '<span class="tag">🤖 bot</span>' : '') +
            (i === sala.meuAssento ? '<span class="tag">você</span>' : '');
          if (sala.souHost && i !== sala.meuAssento) {
            const b = document.createElement('button');
            b.className = 'tag';
            b.style.border = '0';
            b.style.color = 'inherit';
            b.textContent = '✕';
            b.title = 'Remover';
            b.onclick = () => cliente.enviar('bot', { assento: i, adicionar: false });
            d.appendChild(b);
          }
        }
        alvo.appendChild(d);
      });
    });
    const sel = document.querySelector('[data-grupo="dificuldadeSala"]');
    sel.querySelectorAll('button').forEach(b => b.classList.toggle('ativo', b.dataset.valor === sala.dificuldade));
    sel.classList.toggle('bloqueado', !sala.souHost);
    $('btn-iniciar').classList.toggle('oculto', !sala.souHost);
    $('sala-aguarde').classList.toggle('oculto', sala.souHost);
  }

  $('btn-iniciar').onclick = async () => {
    Som.tocar('clique');
    const r = await cliente.emitir('iniciar', {});
    if (!r.ok) Interface.toast(r.erro || 'Não foi possível iniciar', true);
  };

  $('btn-sair-sala').onclick = () => { Som.tocar('clique'); voltarAoMenu(); };

  $('btn-copiar-link').onclick = async () => {
    const link = linkSala($('sala-codigo').textContent);
    try {
      if (navigator.share && matchMedia('(hover: none)').matches) await navigator.share({ title: 'Truco Online', text: 'Bora jogar truco?', url: link });
      else { await navigator.clipboard.writeText(link); Interface.toast('Link copiado! 📋'); }
    } catch (e) {
      Interface.toast(link);
    }
  };

  $('chat-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const inp = $('chat-inp');
    const texto = inp.value.trim();
    if (!texto || !cliente.codigo) return;
    cliente.enviar('falar', { texto });
    inp.value = '';
  });

  function adicionarChat(html, sistema) {
    const d = document.createElement('div');
    d.className = 'msg' + (sistema ? ' sistema' : '');
    d.innerHTML = html;
    const alvo = $('chat-msgs');
    alvo.appendChild(d);
    alvo.scrollTop = alvo.scrollHeight;
    if (!sistema) Som.tocar('pop');
  }

  // ---------- Fim de jogo ----------
  $('btn-revanche').onclick = () => { Som.tocar('clique'); Interface.revanche(); };
  $('btn-fim-menu').onclick = () => { Som.tocar('clique'); voltarAoMenu(); };

  // ---------- Modais ----------
  function abrirModal(html) {
    $('modal-conteudo').innerHTML = html;
    $('modal').classList.remove('oculto');
  }
  function fecharModal() { $('modal').classList.add('oculto'); }
  $('modal-fechar').onclick = fecharModal;
  $('modal').addEventListener('click', (e) => { if (e.target.id === 'modal') fecharModal(); });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') fecharModal(); });

  function htmlRegras() {
    const ordem = TrucoMotor.VALORES.map(v => `<span>${v}</span>`).join('‹');
    return `<h2>Regras do Truco Paulista</h2>
      <p>Baralho de 40 cartas (sem 8, 9, 10 e coringas). Cada jogador recebe 3 cartas e uma carta é virada na mesa: a <b>vira</b>.</p>
      <h3>Força das cartas</h3>
      <div class="ordem-cartas">${ordem}</div>
      <p>As <b>manilhas</b> são as cartas logo acima da vira (se a vira for 7, a manilha é a Dama). Elas vencem todas as outras, na ordem:
      <b>♦ Pica-fumo</b> ‹ <b>♠ Espadilha</b> ‹ <b>♥ Copas</b> ‹ <b>♣ Zap</b>.</p>
      <h3>A mão</h3>
      <ul>
        <li>Cada mão tem até 3 <b>vazas</b> (rodadas). Ganha quem vencer 2.</li>
        <li>Empate na 1ª vaza: quem ganhar a 2ª leva. Empate na 2ª ou 3ª: vence quem ganhou a 1ª.</li>
        <li>A partir da 2ª vaza você pode <b>encobrir</b> uma carta (jogar virada): ela não vale nada, mas esconde seu jogo.</li>
        <li>No 2 x 2, parceiros ficam frente a frente. Equipes jogam alternadas.</li>
      </ul>
      <h3>Truco!</h3>
      <ul>
        <li>A mão vale 1 ponto. Na sua vez, peça <b>TRUCO</b> (3). O adversário pode <b>aceitar</b>, <b>correr</b> (você ganha o valor atual) ou pedir <b>SEIS</b>.</li>
        <li>Depois vêm <b>NOVE</b> e <b>DOZE</b>. A mesma equipe não pode aumentar duas vezes seguidas.</li>
      </ul>
      <h3>Mão de onze e mão de ferro</h3>
      <ul>
        <li><b>Mão de onze</b>: a equipe com 11 pontos vê as cartas (e as do parceiro) e decide se joga valendo 3 ou corre (o adversário ganha 1). Não há truco.</li>
        <li><b>Mão de ferro</b>: as duas equipes com 11. Todos jogam às cegas, sem ver as próprias cartas!</li>
      </ul>
      <p>Vence quem fizer <b>12 pontos</b> primeiro.</p>
      <h3>Atalhos</h3>
      <p><b>1, 2, 3</b> jogam as cartas • <b>T</b> pede truco • <b>E</b> encobre • <b>A</b> aceita • <b>C</b> corre</p>`;
  }

  function htmlConfig() {
    const c = Som.cfg;
    return `<h2>Som e voz</h2>
      <div class="config-linha"><span>🔊 Efeitos sonoros</span><input type="range" min="0" max="1" step="0.05" value="${c.efeitos}" data-cfg="efeitos"></div>
      <div class="config-linha"><span>🎻 Música de viola</span><input type="range" min="0" max="1" step="0.05" value="${c.musica}" data-cfg="musica"></div>
      <div class="config-linha"><span>🗣️ Narração por voz</span><input type="checkbox" ${c.voz ? 'checked' : ''} data-cfg="voz"></div>
      <div class="config-linha"><span>📳 Vibrar no truco</span><input type="checkbox" ${c.vibrar ? 'checked' : ''} data-cfg="vibrar"></div>
      <div class="config-linha"><span>🔇 Silenciar tudo</span><input type="checkbox" ${c.mudo ? 'checked' : ''} data-cfg="mudo"></div>
      <p class="dica">A voz usa o narrador do seu navegador em português.</p>
      <button class="btn btn-secundario" id="btn-testar-som" style="width:100%;margin-top:10px">🃏 Testar: TRUCO!</button>`;
  }

  function abrirConfig() {
    abrirModal(htmlConfig());
    $('modal-conteudo').querySelectorAll('[data-cfg]').forEach(inp => {
      inp.addEventListener('input', () => {
        Som.iniciar();
        Som.definir(inp.dataset.cfg, inp.type === 'checkbox' ? inp.checked : Number(inp.value));
        atualizarBotaoSom();
      });
    });
    $('btn-testar-som').onclick = () => {
      Som.iniciar();
      Som.tocar('truco', 1);
      Efeitos.textoGrande('TRUCO!', 'aposta nivel-1', 1400);
      Som.falar('Truco!', { urgente: true });
    };
  }

  function atualizarBotaoSom() { $('btn-som').textContent = Som.cfg.mudo ? '🔇' : '🔊'; }

  $('btn-regras').onclick = () => { Som.tocar('clique'); abrirModal(htmlRegras()); };
  $('btn-config').onclick = () => { Som.tocar('clique'); abrirConfig(); };
  $('btn-som').onclick = () => { Som.iniciar(); Som.definir('mudo', !Som.cfg.mudo); atualizarBotaoSom(); };
  $('btn-menu-jogo').onclick = () => {
    Som.tocar('clique');
    abrirModal(`<h2>Menu</h2><div class="menu-jogo-botoes">
      <button class="btn btn-secundario" id="mj-continuar">▶ Continuar</button>
      <button class="btn btn-secundario" id="mj-regras">📜 Regras</button>
      <button class="btn btn-secundario" id="mj-som">🔊 Som e voz</button>
      <button class="btn btn-perigo" id="mj-sair">🚪 Sair da partida</button></div>`);
    $('mj-continuar').onclick = fecharModal;
    $('mj-regras').onclick = () => abrirModal(htmlRegras());
    $('mj-som').onclick = abrirConfig;
    $('mj-sair').onclick = () => {
      const online = Interface.conexao && Interface.conexao.tipo === 'online';
      if (!online || confirm('Sair da partida? A IA vai assumir o seu lugar.')) { fecharModal(); voltarAoMenu(); }
    };
  };

  function escapar(t) {
    return String(t).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  }

  // ---------- Início ----------
  montarLeque();
  montarAvatares();
  configurarSeletores();
  atualizarBotaoSom();
  prepararOnline();

  const salaUrl = new URLSearchParams(location.search).get('sala');
  if (salaUrl) {
    $('inp-codigo').value = salaUrl.toUpperCase().slice(0, 4);
    if (perfil.nome) {
      entrarSala(salaUrl);
    } else {
      Interface.toast('Digite seu nome e toque em Entrar para jogar na sala ' + salaUrl.toUpperCase());
      $('inp-nome').focus();
    }
  }
})();
