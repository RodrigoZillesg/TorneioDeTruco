/**
 * Interface da mesa: posiciona as cartas, anima os eventos e mostra as ações.
 */
window.Interface = (function () {
  'use strict';

  const M = TrucoMotor;
  const $ = (id) => document.getElementById(id);
  const el = {
    mesa: $('mesa'),
    camada: $('camada-cartas'),
    jogadores: $('jogadores'),
    acoes: $('painel-acoes'),
    decisao: $('painel-decisao'),
    decisaoTitulo: $('decisao-titulo'),
    decisaoTexto: $('decisao-texto'),
    decisaoBotoes: $('decisao-botoes'),
    valendo: $('valendo'),
    pips: $('vazas-pips'),
    manilha: $('info-manilha'),
    aviso: $('aviso-central'),
    pontosNos: $('pontos-nos'),
    pontosEles: $('pontos-eles'),
    tentosNos: $('tentos-nos'),
    tentosEles: $('tentos-eles'),
    emotes: $('emotes'),
    fim: $('fim-jogo')
  };

  const NOMES_VALOR = { 1: 'Vale', 3: 'Truco', 6: 'Seis', 9: 'Nove', 12: 'Doze' };
  const FRASES = ['Truco nele!', 'Desce!', 'Vem tranquilo', 'Tô com zap!', 'Cai dentro!', 'Que mão!', 'Sorte, hein?', 'Bora, parceiro!', 'Kkkkk', 'Tá com medo?'];
  const EMOJIS = ['😂', '😎', '😡', '🤔', '👏', '🔥', '😱', '🙏'];

  let conexao = null;
  let callbacks = {};
  let visao = null;
  let pacoteAtual = null;
  let geo = null;
  const mapa = new Map();
  let infos = [];
  let fila = [];
  let processando = false;
  let encobrir = false;
  let selecionada = null;
  let enviando = false;
  let eraMinhaVez = false;
  let timerPrazo = null;
  let ultimoTique = 0;
  let ativo = false;
  let geracao = 0;

  const espera = (ms) => new Promise(r => setTimeout(r, rapido() ? Math.min(ms, 60) : ms));
  const rapido = () => fila.length > 3 || document.hidden;

  function hash(texto) {
    let h = 0;
    for (const c of String(texto)) h = (h * 31 + c.charCodeAt(0)) | 0;
    return Math.abs(h);
  }

  // Chaves únicas por mão (o mesmo baralho é usado em todas as mãos)
  function chaveJogada(numero, vaza, assento, carta) {
    return carta ? `c${numero}:${carta.id}` : `e${numero}:${vaza}:${assento}`;
  }

  // ---------- Geometria ----------
  function posicao(assento) {
    const n = visao.numJogadores;
    const rel = (assento - visao.meuAssento + n) % n;
    return n === 2 ? ['baixo', 'cima'][rel] : ['baixo', 'dir', 'cima', 'esq'][rel];
  }

  function calcularGeo() {
    // Tamanho sem transformações (a tela pode estar em transição)
    const r = el.mesa.getBoundingClientRect();
    const W = el.mesa.clientWidth || r.width;
    const H = el.mesa.clientHeight || r.height;
    const estreito = W < 600;
    let cw = estreito ? Math.min(W / 6.2, H / 9) : Math.min(W / 8.4, H / 6.6);
    cw = Math.max(estreito ? 54 : 58, Math.min(cw, estreito ? 72 : 106));
    const ch = cw * 1.5;
    const escMinha = estreito ? Math.min(1.32, (W * 0.78) / (cw * 3.1)) : 1.1;
    el.mesa.style.setProperty('--cw', cw + 'px');
    el.mesa.style.setProperty('--ch', ch + 'px');
    const escOutros = estreito ? 0.5 : 0.62;
    const topoMao = H - ch * escMinha - 18;
    const topoCentro = estreito ? 120 : 140;
    const g = {
      W, H, cw, ch, estreito, escMinha, escOutros, rect: r,
      cx: W / 2,
      cy: (topoCentro + topoMao) / 2,
      topoMao
    };
    g.cimaY = (estreito ? 72 : 22) + (ch * escOutros) / 2;
    g.ladoY = g.cy + (estreito ? 0 : 10);
    const escMonte = estreito ? 0.5 : 0.62;
    g.monte = { x: 18 + (cw * escMonte) / 2, y: (estreito ? 82 : 112) + (ch * escMonte) / 2, esc: escMonte };
    g.vira = { x: g.monte.x + cw * escMonte * 1.12, y: g.monte.y + 2, esc: escMonte, rot: 8 };
    g.escHist = estreito ? 0.34 : 0.38;
    g.topoHist = estreito ? 110 : 134;
    return g;
  }

  function posMao(pos, i, total) {
    const g = geo;
    const off = i - (total - 1) / 2;
    if (pos === 'baixo') {
      const e = g.escMinha;
      return { x: g.cx + off * g.cw * e * 0.96, y: g.H - (g.ch * e) / 2 - 16 + Math.abs(off) * 7, rot: off * 6, esc: e };
    }
    const e = g.escOutros;
    const esp = g.cw * e * 0.58;
    if (pos === 'cima') return { x: g.cx + off * esp, y: g.cimaY, rot: 180 - off * 8, esc: e };
    if (pos === 'esq') return { x: 16 + (g.ch * e) / 2, y: g.ladoY + off * esp, rot: 90 + off * 8, esc: e };
    return { x: g.W - 16 - (g.ch * e) / 2, y: g.ladoY + off * esp, rot: -90 - off * 8, esc: e };
  }

  function centroMao(pos) {
    const p = posMao(pos, 1, 3);
    return { x: p.x, y: p.y, rot: p.rot, esc: p.esc };
  }

  function posVaza(pos, chave) {
    const g = geo;
    const jit = (hash(chave) % 15) - 7;
    const esc = g.estreito ? 0.92 : 1;
    if (visao.numJogadores === 2) {
      const d = g.ch * 0.3;
      if (pos === 'baixo') return { x: g.cx + g.cw * 0.14, y: g.cy + d, rot: jit, esc };
      return { x: g.cx - g.cw * 0.14, y: g.cy - d, rot: 180 + jit, esc };
    }
    const dy = g.ch * 0.36;
    const dx = g.cw * 0.8;
    if (pos === 'baixo') return { x: g.cx, y: g.cy + dy, rot: jit, esc };
    if (pos === 'cima') return { x: g.cx, y: g.cy - dy, rot: 180 + jit, esc };
    if (pos === 'esq') return { x: g.cx - dx, y: g.cy, rot: 90 + jit, esc };
    return { x: g.cx + dx, y: g.cy, rot: -90 + jit, esc };
  }

  function posHistorico(k, ordem, n) {
    const g = geo;
    const e = g.escHist;
    const w = g.cw * e;
    const h = g.ch * e;
    const passo = w * 0.55;
    const largura = w + passo * (n - 1);
    return { x: g.W - 18 - largura + w / 2 + ordem * passo, y: g.topoHist + k * (h + 8) + h / 2, rot: 0, esc: e };
  }

  function posInfo(pos) {
    const g = geo;
    const larg = g.estreito ? 80 : 110;
    const alt = g.estreito ? 76 : 102;
    if (pos === 'baixo') {
      const metade = g.cw * g.escMinha * 1.5 + 10;
      if (g.estreito) return { x: 8, y: g.topoMao - alt - 4 };
      return { x: g.cx - metade - larg - 14, y: g.H - alt - 22 };
    }
    if (pos === 'cima') {
      const metade = g.cw * g.escOutros * 0.58 + (g.cw * g.escOutros) / 2;
      return { x: g.cx - metade - larg - 8, y: Math.max(6, g.cimaY - alt / 2) };
    }
    const metadeLarg = (g.ch * g.escOutros) / 2;
    if (g.estreito) {
      // No celular, os jogadores laterais ficam acima das próprias cartas
      const metadeAlt = g.cw * g.escOutros * 0.58 + (g.cw * g.escOutros) / 2;
      const y = g.ladoY - metadeAlt - alt - 2;
      return pos === 'esq' ? { x: 6, y } : { x: g.W - 6 - larg, y };
    }
    if (pos === 'esq') return { x: 16 + metadeLarg * 2 + 8, y: g.ladoY - alt / 2 };
    return { x: g.W - 16 - metadeLarg * 2 - 8 - larg, y: g.ladoY - alt / 2 };
  }

  // ---------- Cálculo do que mostrar ----------
  function calcularAlvos(v, op) {
    const alvos = new Map();
    const m = v.mao;
    if (!m) return alvos;
    const n = v.numJogadores;
    const eu = v.meuAssento;
    const g = geo;
    let ordemDist = 0;
    const atrasoDist = (s, i) => {
      if (!op.distribuir) return 0;
      // Ordem de distribuição: uma carta por jogador, três voltas
      const rel = (s - m.distribuidor - 1 + n) % n;
      return 250 + (i * n + rel) * 85;
    };

    alvos.set('monte', { x: g.monte.x, y: g.monte.y, rot: -4, esc: g.monte.esc, face: 'verso', z: 4, classes: ['monte'] });
    alvos.set('v' + m.numero, {
      x: g.vira.x, y: g.vira.y, rot: g.vira.rot, esc: g.vira.esc, face: 'frente', carta: m.vira, z: 3,
      origem: { x: g.monte.x, y: g.monte.y, rot: 0, esc: g.monte.esc }, atraso: op.distribuir ? 250 + 3 * n * 85 + 150 : 0
    });

    for (let s = 0; s < n; s++) {
      const pos = posicao(s);
      if (s === eu) {
        const cartas = m.minhasCartas;
        cartas.forEach((c, i) => {
          const p = posMao(pos, i, cartas.length);
          const chave = c ? `c${m.numero}:${c.id}` : `h${m.numero}:${s}:${i}`;
          alvos.set(chave, Object.assign(p, {
            face: c ? 'frente' : 'verso', carta: c, z: 60 + i, minha: true, indice: i,
            origem: g.monte, atraso: atrasoDist(s, i), cega: !c
          }));
        });
      } else {
        const parceiroVisivel = m.cartasParceiro && s === (eu + 2) % 4 ? m.cartasParceiro : null;
        const qtd = parceiroVisivel ? parceiroVisivel.length : v.jogadores[s].numCartas;
        for (let i = 0; i < qtd; i++) {
          const p = posMao(pos, i, qtd);
          const c = parceiroVisivel ? parceiroVisivel[i] : null;
          alvos.set(c ? `c${m.numero}:${c.id}` : `h${m.numero}:${s}:${i}`, Object.assign(p, {
            face: c ? 'frente' : 'verso', carta: c, z: 20 + i, origem: g.monte, atraso: atrasoDist(s, i)
          }));
        }
      }
    }

    m.vazas.forEach((vz, k) => {
      const noCentro = vz.equipe === null || op.segurarVaza === k;
      vz.jogadas.forEach((j, ordem) => {
        const pos = posicao(j.assento);
        const chave = chaveJogada(m.numero, k, j.assento, j.carta);
        const p = noCentro ? posVaza(pos, chave) : posHistorico(k, ordem, n);
        const classes = [];
        if (vz.equipe !== null && vz.equipe !== -1) classes.push(j.assento === vz.assento ? 'vencedora' : 'perdedora');
        alvos.set(chave, Object.assign(p, {
          face: j.encoberta ? 'verso' : 'frente', carta: j.carta, z: (noCentro ? 40 : 8) + ordem + k * 4,
          origem: centroMao(pos), classes
        }));
      });
    });
    return alvos;
  }

  function aplicarTransform(e, a) {
    const g = geo;
    e.style.transform = `translate3d(${a.x - g.cw / 2}px, ${a.y - g.ch / 2}px, 0) rotate(${a.rot || 0}deg) scale(${a.esc || 1})`;
  }

  // Desenha as cartas na posição da visão atual
  function desenhar(v, op) {
    op = op || {};
    geo = calcularGeo();
    const alvos = calcularAlvos(v, op);
    const manilha = v.mao && v.mao.manilha;
    const minhaVezDeJogar = v.acoes.jogar && !enviando;
    const novos = [];

    for (const [chave, a] of alvos) {
      let e = mapa.get(chave);
      if (!e) {
        e = Cartas.criar(a.carta);
        e.dataset.chave = chave;
        e.classList.add('sem-transicao', 'virada');
        aplicarTransform(e, a.origem || a);
        el.camada.appendChild(e);
        mapa.set(chave, e);
        novos.push([e, a]);
      } else if (a.carta) {
        Cartas.definir(e, a.carta);
      }
      e.style.zIndex = a.z;
      e.classList.remove('saindo');
      Cartas.marcarManilha(e, a.face === 'frente' ? a.carta : null, manilha);
      ['monte', 'vencedora', 'perdedora'].forEach(c => e.classList.toggle(c, (a.classes || []).includes(c)));
      e.classList.toggle('minha', !!a.minha);
      e.classList.toggle('cega', !!a.cega);
      const jogavel = !!a.minha && minhaVezDeJogar;
      e.classList.toggle('jogavel', jogavel);
      e.classList.toggle('encobrir', jogavel && encobrir);
      if (!jogavel) e.classList.remove('selecionada');
      if (!novos.find(x => x[0] === e)) {
        aplicarTransform(e, a);
        e.classList.toggle('virada', a.face === 'verso');
      }
      e.alvo = a;
    }

    if (novos.length) {
      void el.camada.offsetWidth;
      for (const [e, a] of novos) {
        e.classList.remove('sem-transicao');
        if (a.atraso) {
          e.style.transitionDelay = a.atraso + 'ms';
          e.style.setProperty('--atraso-giro', (a.atraso + 380) / 1000 + 's');
          setTimeout(() => { e.style.transitionDelay = ''; e.style.removeProperty('--atraso-giro'); }, a.atraso + 1200);
        }
        aplicarTransform(e, a);
        e.classList.toggle('virada', a.face === 'verso');
      }
    }

    for (const [chave, e] of mapa) {
      if (alvos.has(chave)) continue;
      mapa.delete(chave);
      e.classList.remove('jogavel');
      if (chave.startsWith('h')) {
        // Carta escondida que virou jogada: some rapidamente
        e.style.transition = 'opacity .15s';
        e.style.opacity = '0';
      } else {
        aplicarTransform(e, { x: geo.monte.x, y: geo.monte.y, rot: 0, esc: geo.monte.esc });
        e.classList.add('virada', 'saindo');
      }
      setTimeout(() => e.remove(), 650);
    }
  }

  function centroNaTela(chave) {
    const e = mapa.get(chave);
    if (!e || !e.alvo) return { x: innerWidth / 2, y: innerHeight / 2 };
    return { x: geo.rect.left + e.alvo.x, y: geo.rect.top + e.alvo.y };
  }

  function centroDoAssento(assento) {
    const info = infos[assento];
    if (!info) return { x: innerWidth / 2, y: innerHeight / 2 };
    const r = info.querySelector('.avatar').getBoundingClientRect();
    return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
  }

  // ---------- Jogadores ----------
  function montarJogadores(v) {
    el.jogadores.innerHTML = '';
    infos = v.jogadores.map((j, s) => {
      const d = document.createElement('div');
      d.className = 'jogador equipe-' + (s % 2 === v.minhaEquipe ? 0 : 1);
      d.innerHTML = '<div class="avatar"><div class="retrato"></div><div class="anel"></div><span class="selo oculto">D</span></div>' +
        '<div class="nome"></div><div class="balao"></div>';
      el.jogadores.appendChild(d);
      return d;
    });
  }

  function atualizarJogadores(v) {
    if (infos.length !== v.numJogadores) montarJogadores(v);
    const m = v.mao;
    const quemAge = new Set();
    if (m && v.fase === 'jogando') {
      if (m.estado === 'jogando') quemAge.add(m.vez);
      else if (m.estado === 'aposta' || m.estado === 'maoDeOnze') {
        const eq = m.estado === 'aposta' ? m.aposta.aguardando : m.maoDeOnze;
        v.jogadores.forEach((j, s) => { if (s % 2 === eq) quemAge.add(s); });
      }
    }
    v.jogadores.forEach((j, s) => {
      const d = infos[s];
      const pos = posicao(s);
      d.classList.remove('pos-baixo', 'pos-cima', 'pos-esq', 'pos-dir');
      d.classList.add('pos-' + pos);
      const p = posInfo(pos);
      d.style.left = p.x + 'px';
      d.style.top = p.y + 'px';
      const retrato = d.querySelector('.retrato');
      if (retrato.dataset.avatar !== j.avatar) {
        retrato.dataset.avatar = j.avatar;
        retrato.innerHTML = Personagens.html(j.avatar, { chaveFoto: 'a' + s });
      }
      let nome = j.nome;
      if (j.bot) nome = '🤖 ' + nome;
      d.querySelector('.nome').textContent = nome;
      d.classList.toggle('vez', quemAge.has(s));
      d.classList.toggle('offline', j.conectado === false);
      const selo = d.querySelector('.selo');
      selo.classList.toggle('oculto', !m || m.distribuidor !== s);
      selo.title = 'Embaralhou';
    });
  }

  // Balão de fala do jogador; com "titulo", vira um balão de resposta (Desce!, Correu!...)
  function mostrarFala(assento, texto, opcoes) {
    const d = infos[assento];
    if (!d) return;
    opcoes = opcoes || {};
    const b = d.querySelector('.balao');
    b.className = 'balao' + (opcoes.dica ? ' dica' : '') + (opcoes.tipo ? ' ' + opcoes.tipo : '');
    b.innerHTML = (opcoes.titulo ? `<b class="balao-titulo">${escapar(opcoes.titulo)}</b>` : '') + (texto ? `<span>${escapar(texto)}</span>` : '');
    void b.offsetWidth;
    b.classList.add('visivel');
    clearTimeout(b._timer);
    b._timer = setTimeout(() => b.classList.remove('visivel'), opcoes.dica ? 4200 : 2800);
  }

  // Resposta a uma aposta: um único balão com o título e a frase do jogador
  function mostrarResposta(assento, titulo, tipo, fala) {
    mostrarFala(assento, fala ? fala.texto : '', { titulo, tipo });
    if (fala) {
      fala.usada = true;
      if (fala.voz) Som.falar(fala.texto, perfilVoz(assento));
    }
  }

  // Reação do personagem (feliz, bravo, grito) por alguns instantes
  function expressar(assento, expressao, duracao) {
    const d = infos[assento];
    const j = visao && visao.jogadores[assento];
    if (!d || !j) return;
    d.classList.remove('reage');
    void d.offsetWidth;
    d.classList.add('reage');
    if (j.avatar === 'foto') return;
    const retrato = d.querySelector('.retrato');
    retrato.innerHTML = Personagens.html(j.avatar, { expressao });
    clearTimeout(retrato._t);
    retrato._t = setTimeout(() => { retrato.innerHTML = Personagens.html(j.avatar, {}); }, duracao || 1800);
  }

  function expressarEquipe(equipe, expressao, duracao) {
    if (!visao) return;
    visao.jogadores.forEach((j, s) => { if (s % 2 === equipe) expressar(s, expressao, duracao); });
  }

  function perfilVoz(assento) {
    const j = visao && visao.jogadores[assento];
    const h = hash(j ? j.nome : assento);
    const p = j && j.avatar && j.avatar.startsWith('p:') ? TrucoElenco.porId(j.avatar.slice(2)) : null;
    const feminino = p ? p.genero === 'f' : !!(j && /(Dona|Maria|Ana)/i.test(j.nome));
    return { voz: h % 7, tom: feminino ? 1.35 + (h % 3) * 0.05 : 0.75 + (h % 6) * 0.08, velocidade: 1.0 + (h % 4) * 0.06 };
  }

  // ---------- HUD ----------
  function atualizarPlacar(v, animar) {
    const nos = v.placar[v.minhaEquipe];
    const eles = v.placar[1 - v.minhaEquipe];
    const atualizar = (span, tentos, valor) => {
      if (span.textContent !== String(valor)) {
        span.textContent = valor;
        if (animar) { span.classList.remove('pulsa'); void span.offsetWidth; span.classList.add('pulsa'); }
      }
      if (tentos.children.length !== 12) tentos.innerHTML = '<i></i>'.repeat(12);
      [...tentos.children].forEach((t, i) => t.classList.toggle('on', i < valor));
    };
    atualizar(el.pontosNos, el.tentosNos, nos);
    atualizar(el.pontosEles, el.tentosEles, eles);
  }

  function atualizarHUD(v) {
    const m = v.mao;
    atualizarJogadores(v);
    if (!m) return;
    let texto;
    let classe;
    if (m.maoDeFerro) { texto = 'Mão de ferro • <b>1</b>'; classe = 'especial'; }
    else if (m.maoDeOnze !== null) { texto = 'Mão de onze • <b>3</b>'; classe = 'especial'; }
    else {
      texto = (m.valor === 1 ? 'Vale ' : NOMES_VALOR[m.valor] + ' • ') + '<b>' + m.valor + '</b>';
      classe = 'nivel-' + M.ESCADA_APOSTA.indexOf(m.valor);
    }
    el.valendo.innerHTML = texto;
    el.valendo.className = 'valendo ' + classe;

    [...el.pips.children].forEach((p, k) => {
      const vz = m.vazas[k];
      p.className = '';
      if (vz && vz.equipe !== null) p.classList.add(vz.equipe === -1 ? 'empate' : vz.equipe === v.minhaEquipe ? 'nos' : 'eles');
    });

    const sim = Cartas.SIMBOLO;
    el.manilha.innerHTML = `Manilha<b>${m.manilha}</b><span style="font-size:10px;opacity:.8">${sim.o} ${sim.e} ${sim.c} ${sim.p}</span>`;
    el.manilha.style.left = (geo.monte.x - (geo.cw * geo.monte.esc) / 2) + 'px';
    el.manilha.style.top = (geo.monte.y + (geo.ch * geo.monte.esc) / 2 + 8) + 'px';
    el.manilha.style.width = (geo.cw * geo.monte.esc * 2.2) + 'px';

    atualizarAcoes(v);
    atualizarDecisao(v);
    atualizarAviso(v);
  }

  function atualizarAcoes(v) {
    const a = v.acoes;
    el.acoes.innerHTML = '';
    el.acoes.classList.toggle('estreito', geo.estreito);
    el.acoes.style.bottom = geo.estreito ? (geo.H - geo.topoMao + 16) + 'px' : '';
    if (!a.encobrir) encobrir = false;
    if (a.trucar && !enviando) {
      const b = document.createElement('button');
      b.className = 'btn-truco';
      b.textContent = M.NOMES_APOSTA[a.proximaAposta] + '!';
      b.title = 'Pedir ' + M.NOMES_APOSTA[a.proximaAposta].toLowerCase() + ' (T)';
      b.onclick = () => enviar({ tipo: 'trucar' });
      el.acoes.appendChild(b);
    }
    if (a.encobrir && a.jogar && !enviando) {
      const b = document.createElement('button');
      b.className = 'btn-encobrir' + (encobrir ? ' ativo' : '');
      b.textContent = encobrir ? '🂠 Encobrindo' : '🂠 Encobrir';
      b.title = 'Jogar a próxima carta virada para baixo (E)';
      b.onclick = () => { encobrir = !encobrir; Som.tocar('clique'); atualizarAcoes(visao); desenhar(visao); };
      el.acoes.appendChild(b);
    }
  }

  function botao(texto, classe, fn) {
    const b = document.createElement('button');
    b.className = classe;
    b.innerHTML = texto;
    b.onclick = () => { Som.tocar('clique'); fn(); };
    return b;
  }

  function atualizarDecisao(v) {
    const a = v.acoes;
    const m = v.mao;
    el.decisaoBotoes.innerHTML = '';
    if (enviando || !(a.responder || a.decidirOnze)) {
      el.decisao.classList.add('oculto');
      return;
    }
    const estavaOculto = el.decisao.classList.contains('oculto');
    if (a.responder) {
      const ap = m.aposta;
      const quem = v.jogadores[ap.assento].nome;
      el.decisaoTitulo.textContent = M.NOMES_APOSTA[ap.valor] + '!';
      el.decisaoTexto.innerHTML = `<b>${escapar(quem)}</b> pediu ${M.NOMES_APOSTA[ap.valor].toLowerCase()}. ` +
        `Aceitando, a mão vale <b>${ap.valor}</b>. Correndo, eles levam <b>${m.valor}</b>.`;
      el.decisaoBotoes.appendChild(botao('✅ Aceitar', 'btn btn-secundario', () => enviar({ tipo: 'responder', resposta: 'aceitar' })));
      el.decisaoBotoes.appendChild(botao('🏃 Correr', 'btn btn-perigo', () => enviar({ tipo: 'responder', resposta: 'correr' })));
      if (a.aumentar) el.decisaoBotoes.appendChild(botao(M.NOMES_APOSTA[a.aumentar] + '!', 'btn-truco', () => enviar({ tipo: 'responder', resposta: 'aumentar' })));
    } else {
      el.decisaoTitulo.textContent = 'Mão de onze!';
      let html = 'Sua equipe tem 11 pontos. Olhe as cartas e decida: jogando, a mão vale <b>3</b>; correndo, eles ganham <b>1</b>.';
      if (m.cartasParceiro) html += '<div class="mini-cartas" id="mini-parceiro"></div><div style="font-size:12px;margin-top:4px">Cartas do parceiro</div>';
      el.decisaoTexto.innerHTML = html;
      if (m.cartasParceiro) {
        const alvo = $('mini-parceiro');
        m.cartasParceiro.forEach(c => {
          const e = Cartas.criar(c);
          Cartas.marcarManilha(e, c, m.manilha);
          alvo.appendChild(e);
        });
      }
      el.decisaoBotoes.appendChild(botao('🃏 Jogar', 'btn btn-secundario', () => enviar({ tipo: 'onze', decisao: 'jogar' })));
      el.decisaoBotoes.appendChild(botao('🏃 Correr', 'btn btn-perigo', () => enviar({ tipo: 'onze', decisao: 'correr' })));
    }
    el.decisao.classList.remove('oculto');
    if (estavaOculto) Som.tocar('suaVez');
  }

  function atualizarAviso(v) {
    const m = v.mao;
    let texto = '';
    if (m && v.fase === 'jogando' && !enviando) {
      if (m.estado === 'aposta' && m.aposta.equipe === v.minhaEquipe) texto = 'Aguardando a resposta...';
      else if (m.estado === 'maoDeOnze' && m.maoDeOnze !== v.minhaEquipe) texto = 'Eles estão decidindo a mão de onze...';
      else if (m.estado === 'aposta' && !v.acoes.responder) texto = 'Seu parceiro está decidindo...';
    }
    const minhaVez = !!v.acoes.jogar;
    if (minhaVez && !eraMinhaVez && v.fase === 'jogando') {
      Som.tocar('suaVez');
      texto = m.maoDeFerro ? 'Mão de ferro: jogue às cegas!' : 'Sua vez!';
      clearTimeout(el.aviso._t);
      el.aviso._t = setTimeout(() => atualizarAviso(visao), 1400);
    }
    eraMinhaVez = minhaVez;
    el.aviso.textContent = texto;
    el.aviso.classList.toggle('visivel', !!texto);
    if (texto === 'Sua vez!' || /cegas/.test(texto)) {
      el.aviso.style.top = (geo.topoMao - (geo.estreito ? 92 : 30)) + 'px';
    } else {
      el.aviso.style.top = '';
    }
  }

  // Anel de contagem regressiva (partidas online)
  function atualizarPrazo(p) {
    clearInterval(timerPrazo);
    infos.forEach(d => { const a = d.querySelector('.anel'); a.style.background = ''; });
    if (!p || !p.prazo) return;
    const fim = Date.now() + p.prazo.restanteMs;
    const total = p.prazo.totalMs || p.prazo.restanteMs;
    const assentos = p.prazo.assentos;
    const tick = () => {
      const resta = Math.max(0, fim - Date.now());
      const pct = (resta / total) * 100;
      const cor = pct < 25 ? '#ff5a5a' : '#f5c542';
      assentos.forEach(s => {
        const d = infos[s];
        if (d) d.querySelector('.anel').style.background = `conic-gradient(${cor} ${pct}%, transparent 0)`;
      });
      if (assentos.includes(visao.meuAssento) && resta < 6000 && resta > 0) {
        const seg = Math.ceil(resta / 1000);
        if (seg !== ultimoTique) { ultimoTique = seg; Som.tocar('tique'); }
      }
      if (!resta) clearInterval(timerPrazo);
    };
    tick();
    timerPrazo = setInterval(tick, 250);
  }

  // ---------- Fila de pacotes e animação dos eventos ----------
  function receber(pacote) {
    if (!ativo) return;
    fila.push(pacote);
    if (!processando) processarFila();
  }

  async function processarFila() {
    processando = true;
    const minhaGeracao = geracao;
    while (fila.length && minhaGeracao === geracao) {
      const p = fila.shift();
      try { await processarPacote(p); } catch (e) { console.error('Erro ao processar jogada', e); }
    }
    processando = false;
  }

  async function processarPacote(p) {
    const v = p.visao;
    const eventos = p.eventos || [];
    const primeira = !visao;
    visao = v;
    pacoteAtual = p;
    if (primeira || infos.length !== v.numJogadores) montarJogadores(v);
    enviando = false;

    const novaMao = eventos.find(e => e.tipo === 'novaMao');
    const fimVaza = eventos.find(e => e.tipo === 'fimVaza');
    const fimMao = eventos.find(e => e.tipo === 'fimMao');
    const fimJogo = eventos.find(e => e.tipo === 'fimJogo');

    if (novaMao) {
      el.fim.classList.add('oculto');
      if (novaMao.numero === 1 && !primeira) {
        // Revanche: limpa a mesa da partida anterior
        mapa.forEach((e, chave) => { if (chave !== 'monte') { e.remove(); mapa.delete(chave); } });
      }
      atualizarPlacar(v, false);
      Som.tocar('embaralhar');
      desenhar(v, { distribuir: true });
      atualizarJogadores(v);
      const qtd = v.numJogadores * 3;
      setTimeout(() => Som.tocar('distribuir', qtd, 0.085), 250);
      setTimeout(() => Som.tocar('virar'), 250 + qtd * 85 + 200);
      await espera(250 + qtd * 85 + 450);
      if (novaMao.maoDeFerro) {
        Efeitos.textoGrande('MÃO DE FERRO', 'frio medio', 2000);
        Som.tocar('especial');
        Som.falar('Mão de ferro!', { urgente: true });
        Efeitos.tremer(el.mesa, 2);
        await espera(1600);
      } else if (novaMao.maoDeOnze !== null) {
        Efeitos.textoGrande('MÃO DE ONZE', 'ouro medio', 2000);
        Som.tocar('especial');
        Som.falar('Mão de onze!', { urgente: true });
        await espera(1600);
      }
    } else {
      desenhar(v, { segurarVaza: fimVaza ? fimVaza.vaza : undefined });
    }

    // Frase que acompanha uma resposta do mesmo jogador (vai no mesmo balão)
    const falaDe = (assento) => eventos.find(f => f.tipo === 'fala' && f.assento === assento && !f.dica && !f.usada);

    for (const e of eventos) {
      switch (e.tipo) {
        case 'jogada': {
          Som.tocar(e.encoberta ? 'deslizar' : 'carta');
          const chave = chaveJogada(v.mao.numero, e.vaza, e.assento, e.carta);
          if (e.carta && e.carta.valor === v.mao.manilha && !e.encoberta) {
            setTimeout(() => {
              const c = centroNaTela(chave);
              Efeitos.explodir(c.x, c.y, { qtd: e.carta.naipe === 'p' ? 50 : 26, vel: 5, cores: e.carta.naipe === 'p' ? ['#ff9d2e', '#ffd65c', '#ff4d00'] : ['#ffd65c', '#fff3c4'] });
            }, 380);
          }
          await espera(fimVaza ? 600 : 300);
          break;
        }
        case 'fimVaza': {
          await espera(250);
          const vz = v.mao.vazas[e.vaza];
          const venc = vz && vz.jogadas.find(j => j.assento === e.assento);
          if (e.equipe === -1) {
            Som.tocar('empate');
            Efeitos.textoGrande('EMPACHOU!', 'frio medio', 1300);
          } else if (venc) {
            const chave = venc.carta ? chaveJogada(v.mao.numero, e.vaza, e.assento, venc.carta) : null;
            const c = chave ? centroNaTela(chave) : centroDoAssento(e.assento);
            const nossa = e.equipe === v.minhaEquipe;
            const manilha = venc.carta && venc.carta.valor === v.mao.manilha;
            expressar(e.assento, 'feliz', 1500);
            Som.tocar(nossa ? 'ganharVaza' : 'perderVaza', manilha);
            Efeitos.explodir(c.x, c.y, { qtd: manilha ? 60 : 30, vel: manilha ? 8 : 5, cores: nossa ? ['#38c3ff', '#bfeaff', '#ffd65c'] : ['#ff5a5a', '#ffc4c4', '#ffd65c'] });
            if (manilha && venc.carta.naipe === 'p') {
              Efeitos.textoGrande('ZAP!', 'fogo medio', 1300);
              Efeitos.tremer(el.mesa, 1);
            }
          }
          atualizarHUD(v);
          await espera(1000);
          if (!fimMao) desenhar(v);
          break;
        }
        case 'aposta': {
          const nivel = M.ESCADA_APOSTA.indexOf(e.valor);
          const j = v.jogadores[e.assento];
          const duracao = 1700 + nivel * 150;
          const eu = e.assento === v.meuAssento;
          expressar(e.assento, 'grito', duracao + 400);
          Efeitos.anuncio({
            avatarHtml: Personagens.html(j.avatar, { chaveFoto: 'a' + e.assento, expressao: 'grito' }),
            quem: eu ? 'Você pediu' : j.nome + ' pediu',
            titulo: e.nome + '!',
            subtitulo: 'A mão passa a valer ' + e.valor + ' pontos',
            nivel,
            equipe: e.assento % 2 === v.minhaEquipe ? 'nos' : 'eles',
            duracao
          });
          Efeitos.tremer(el.mesa, nivel);
          Efeitos.flash(['', 'rgba(255,140,0,.3)', 'rgba(255,60,0,.35)', 'rgba(255,0,60,.4)', 'rgba(170,60,255,.45)'][nivel]);
          Som.tocar('truco', nivel);
          Som.abafarMusica(2);
          Som.vibrar([80, 40, 80 + nivel * 40]);
          Som.falar(e.nome.charAt(0) + e.nome.slice(1).toLowerCase() + '!', Object.assign(perfilVoz(e.assento), { urgente: true, velocidade: 1.1 }));
          await espera(duracao);
          break;
        }
        case 'resposta': {
          if (e.resposta === 'aceitar') { mostrarResposta(e.assento, '✔ Aceitou', 'aceito', falaDe(e.assento)); Som.tocar('aceitar'); expressar(e.assento, 'feliz', 1600); }
          else if (e.resposta === 'correr') { mostrarResposta(e.assento, '✖ Correu', 'correu', falaDe(e.assento)); Som.tocar('correr'); expressar(e.assento, 'bravo', 1800); }
          await espera(e.resposta === 'aumentar' ? 100 : 900);
          break;
        }
        case 'onze': {
          if (e.decisao === 'jogar') mostrarResposta(e.assento, '✔ Vai jogar', 'aceito', falaDe(e.assento));
          else { mostrarResposta(e.assento, '✖ Correu', 'correu', falaDe(e.assento)); Som.tocar('correr'); }
          await espera(700);
          break;
        }
        case 'fala':
          if (e.usada) break;
          mostrarFala(e.assento, e.texto, { dica: e.dica });
          Som.tocar('pop');
          if (e.voz) Som.falar(e.texto, perfilVoz(e.assento));
          break;
        case 'conexao':
          toast(v.jogadores[e.assento].nome + (e.conectado ? ' voltou para a mesa' : ' saiu. A IA assumiu o lugar.'));
          break;
        default:
          break;
      }
    }

    if (fimMao) await animarFimMao(v, fimMao);
    if (fimJogo) await animarFimJogo(v, fimJogo);
    if (fimVaza && !fimMao) desenhar(v);
    if (!novaMao && !fimMao) atualizarPlacar(v, false);
    atualizarHUD(v);
    desenhar(v);
    atualizarPrazo(p);
  }

  async function animarFimMao(v, e) {
    desenhar(v);
    atualizarHUD(v);
    if (e.equipe === null) {
      Efeitos.textoGrande('NINGUÉM PONTUA', 'frio medio', 1600);
      Som.tocar('empate');
      await espera(1400);
      return;
    }
    const nossa = e.equipe === v.minhaEquipe;
    expressarEquipe(e.equipe, 'feliz', 2200);
    expressarEquipe(1 - e.equipe, 'bravo', 2200);
    const de = { x: geo.rect.left + geo.cx, y: geo.rect.top + geo.cy };
    const alvoEl = nossa ? el.pontosNos : el.pontosEles;
    const r = alvoEl.getBoundingClientRect();
    if (nossa) {
      Som.tocar('ganharMao', e.pontos);
      Efeitos.chuvaMoedas(de.x, de.y, 8 + e.pontos * 2);
    } else {
      Som.tocar('perderMao');
    }
    if (e.motivo === 'correu' || e.motivo === 'correuOnze') {
      Efeitos.textoGrande(nossa ? 'CORRERAM!' : 'CORREMOS...', nossa ? 'ouro medio' : 'ruim medio', 1500);
    } else if (e.pontos >= 6) {
      Efeitos.textoGrande(nossa ? 'QUE MÃO!' : 'PERDEMOS...', nossa ? 'ouro medio' : 'ruim medio', 1500);
    }
    Efeitos.pontosVoando('+' + e.pontos, de, { x: r.left + r.width / 2, y: r.top + r.height / 2 }, nossa ? '#38c3ff' : '#ff5a5a');
    await espera(1300);
    atualizarPlacar(v, true);
    await espera(500);
  }

  async function animarFimJogo(v, e) {
    const ganhamos = e.equipe === v.minhaEquipe;
    expressarEquipe(e.equipe, 'feliz', 6000);
    expressarEquipe(1 - e.equipe, 'bravo', 6000);
    await espera(400);
    Som.abafarMusica(6);
    if (ganhamos) {
      Som.tocar('vitoria');
      Efeitos.confete(4);
      Efeitos.fogos(7);
      Efeitos.textoGrande(v.numJogadores === 4 ? 'VENCEMOS!' : 'VITÓRIA!', 'ouro', 2200);
    } else {
      Som.tocar('derrota');
      Efeitos.textoGrande('DERROTA', 'ruim', 2200);
    }
    Som.falar(ganhamos ? 'É campeão!' : 'Não foi dessa vez...', { urgente: true });
    await espera(2000);
    mostrarFimJogo(v, ganhamos);
  }

  function mostrarFimJogo(v, ganhamos) {
    el.fim.classList.remove('oculto', 'derrota');
    if (!ganhamos) el.fim.classList.add('derrota');
    $('fim-icone').textContent = ganhamos ? '🏆' : '🥀';
    $('fim-titulo').textContent = ganhamos ? (v.numJogadores === 4 ? 'Vencemos!' : 'Você venceu!') : (v.numJogadores === 4 ? 'Perdemos...' : 'Você perdeu...');
    $('fim-placar').innerHTML = `<span style="color:var(--nos)">Nós ${v.placar[v.minhaEquipe]}</span> &nbsp;×&nbsp; <span style="color:var(--eles)">${v.placar[1 - v.minhaEquipe]} Eles</span>`;
    const pode = conexao && conexao.podeRevanche();
    $('btn-revanche').classList.toggle('oculto', !pode);
    $('fim-dica').textContent = pode ? '' : 'Aguardando o anfitrião iniciar a revanche...';
  }

  // ---------- Ações do jogador ----------
  async function enviar(acao) {
    if (!conexao || enviando) return;
    enviando = true;
    selecionada = null;
    if (visao) { atualizarAcoes(visao); atualizarDecisao(visao); desenhar(visao); }
    const r = await conexao.enviar(acao);
    if (!r || !r.ok) {
      enviando = false;
      toast((r && r.erro) || 'Não foi possível jogar', true);
      if (visao) atualizarHUD(visao), desenhar(visao);
    } else if (acao.tipo === 'jogar') {
      encobrir = false;
    }
  }

  function jogarChave(chave) {
    const e = mapa.get(chave);
    if (!e || !e.alvo || !e.alvo.minha || !visao.acoes.jogar) return;
    Som.tocar('clique');
    enviar({ tipo: 'jogar', indice: e.alvo.indice, encoberta: encobrir });
  }

  el.camada.addEventListener('click', (ev) => {
    const carta = ev.target.closest('.carta.jogavel');
    if (!carta) return;
    const chave = carta.dataset.chave;
    const toque = ev.pointerType === 'touch' || (window.matchMedia && matchMedia('(hover: none)').matches);
    if (toque && selecionada !== chave) {
      // No celular: primeiro toque seleciona, segundo toque joga
      mapa.forEach(e => e.classList.remove('selecionada'));
      carta.classList.add('selecionada');
      selecionada = chave;
      Som.tocar('clique');
      return;
    }
    jogarChave(chave);
  });

  document.addEventListener('keydown', (ev) => {
    if (!ativo || !visao || ev.target.tagName === 'INPUT') return;
    const a = visao.acoes;
    const k = ev.key.toLowerCase();
    if (['1', '2', '3'].includes(k) && a.jogar) {
      const minhas = [...mapa.values()].filter(e => e.alvo && e.alvo.minha).sort((x, y) => x.alvo.indice - y.alvo.indice);
      const e = minhas[Number(k) - 1];
      if (e) jogarChave(e.dataset.chave);
    } else if (k === 't' && a.trucar) enviar({ tipo: 'trucar' });
    else if (k === 'e' && a.encobrir && a.jogar) { encobrir = !encobrir; atualizarAcoes(visao); desenhar(visao); }
    else if (k === 'a' && a.responder) enviar({ tipo: 'responder', resposta: 'aceitar' });
    else if (k === 'c' && a.responder) enviar({ tipo: 'responder', resposta: 'correr' });
  });

  window.addEventListener('resize', () => {
    if (!ativo || !visao) return;
    desenhar(visao);
    atualizarHUD(visao);
  });

  // ---------- Emotes ----------
  function montarEmotes() {
    el.emotes.innerHTML = '';
    FRASES.forEach(f => el.emotes.appendChild(botao(f, '', () => { conexao && conexao.falar(f, true); el.emotes.classList.add('oculto'); })));
    EMOJIS.forEach(f => el.emotes.appendChild(botao(f, 'emoji', () => { conexao && conexao.falar(f, false); el.emotes.classList.add('oculto'); })));
  }
  montarEmotes();
  $('btn-emotes').onclick = () => { Som.tocar('clique'); el.emotes.classList.toggle('oculto'); };

  // ---------- Utilidades ----------
  function escapar(t) {
    return String(t).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  }

  function toast(texto, erro) {
    const t = document.createElement('div');
    t.className = 'toast' + (erro ? ' erro' : '');
    t.textContent = texto;
    $('toasts').appendChild(t);
    setTimeout(() => t.remove(), 3200);
  }

  function limpar() {
    geracao++;
    fila = [];
    processando = false;
    visao = null;
    pacoteAtual = null;
    enviando = false;
    encobrir = false;
    eraMinhaVez = false;
    clearInterval(timerPrazo);
    mapa.forEach(e => e.remove());
    mapa.clear();
    el.jogadores.innerHTML = '';
    infos = [];
    el.acoes.innerHTML = '';
    el.decisao.classList.add('oculto');
    el.emotes.classList.add('oculto');
    el.fim.classList.add('oculto');
    el.aviso.classList.remove('visivel');
    el.manilha.innerHTML = '';
    el.valendo.className = 'valendo nivel-0';
    el.valendo.innerHTML = 'Vale <b>1</b>';
    [...el.pips.children].forEach(p => { p.className = ''; });
    el.pontosNos.textContent = '0';
    el.pontosEles.textContent = '0';
    el.tentosNos.innerHTML = '<i></i>'.repeat(12);
    el.tentosEles.innerHTML = '<i></i>'.repeat(12);
  }

  return {
    iniciar(novaConexao, cbs) {
      limpar();
      ativo = true;
      conexao = novaConexao;
      callbacks = cbs || {};
      geo = calcularGeo();
      conexao.iniciar(receber);
    },
    receber,
    parar() {
      ativo = false;
      limpar();
      conexao = null;
    },
    revanche() {
      if (!conexao) return;
      el.fim.classList.add('oculto');
      conexao.revanche().then(r => { if (r && r.ok === false) toast(r.erro || 'Não foi possível reiniciar', true); });
    },
    mostrarFimJogo() { if (visao) mostrarFimJogo(visao, visao.vencedor === visao.minhaEquipe); },
    toast,
    get conexao() { return conexao; },
    get callbacks() { return callbacks; }
  };
})();
