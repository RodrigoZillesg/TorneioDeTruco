/**
 * Efeitos visuais: partículas (faíscas, confete, fogos), texto gigante,
 * tremor de tela, flash e o ambiente animado de fundo.
 */
window.Efeitos = (function () {
  'use strict';

  const reduzido = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const canvas = document.getElementById('fx');
  const ctx = canvas.getContext('2d');
  const particulas = [];
  let rodando = false;
  let dpr = 1;

  function redimensionar() {
    dpr = Math.min(2, window.devicePixelRatio || 1);
    canvas.width = innerWidth * dpr;
    canvas.height = innerHeight * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    fundo.redimensionar();
  }

  function laco() {
    ctx.clearRect(0, 0, innerWidth, innerHeight);
    for (let i = particulas.length - 1; i >= 0; i--) {
      const p = particulas[i];
      p.vida += 1;
      if (p.vida > p.max || p.y > innerHeight + 60) {
        particulas.splice(i, 1);
        if (p.foguete) explodir(p.x, p.y, { cores: p.cores, qtd: 70, vel: 7, gravidade: 0.06 });
        continue;
      }
      p.vx *= p.atrito;
      p.vy = p.vy * p.atrito + p.gravidade;
      p.x += p.vx;
      p.y += p.vy;
      p.rot += p.vrot;
      const fim = 1 - p.vida / p.max;
      ctx.save();
      ctx.globalAlpha = Math.max(0, Math.min(1, fim * 1.6));
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rot);
      if (p.tipo === 'confete') {
        ctx.fillStyle = p.cor;
        ctx.scale(1, Math.cos(p.vida * 0.15 + p.fase));
        ctx.fillRect(-p.tam / 2, -p.tam / 4, p.tam, p.tam / 2);
      } else if (p.tipo === 'moeda') {
        ctx.scale(Math.cos(p.vida * 0.2 + p.fase), 1);
        ctx.fillStyle = '#f5c542';
        ctx.beginPath(); ctx.arc(0, 0, p.tam, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#ffe9a0';
        ctx.beginPath(); ctx.arc(-p.tam * 0.25, -p.tam * 0.25, p.tam * 0.45, 0, Math.PI * 2); ctx.fill();
      } else if (p.tipo === 'naipe') {
        ctx.fillStyle = p.cor;
        ctx.font = `${p.tam}px serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(p.texto, 0, 0);
      } else {
        ctx.globalCompositeOperation = 'lighter';
        const r = p.tam * (0.4 + fim * 0.6);
        const g = ctx.createRadialGradient(0, 0, 0, 0, 0, r * 2.2);
        g.addColorStop(0, p.cor);
        g.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = g;
        ctx.beginPath(); ctx.arc(0, 0, r * 2.2, 0, Math.PI * 2); ctx.fill();
      }
      ctx.restore();
    }
    if (particulas.length) requestAnimationFrame(laco);
    else { rodando = false; ctx.clearRect(0, 0, innerWidth, innerHeight); }
  }

  function adicionar(p) {
    particulas.push(Object.assign({
      vx: 0, vy: 0, vida: 0, max: 60, tam: 4, cor: '#fff', tipo: 'faisca',
      gravidade: 0.12, atrito: 0.98, rot: 0, vrot: 0, fase: Math.random() * 6
    }, p));
    if (!rodando) { rodando = true; requestAnimationFrame(laco); }
  }

  function explodir(x, y, opcoes) {
    const o = Object.assign({ cores: ['#ffd65c', '#ff9d2e', '#fff3c4'], qtd: 40, vel: 6, tipo: 'faisca', gravidade: 0.1, tam: 4, vida: 60 }, opcoes);
    const qtd = reduzido ? Math.ceil(o.qtd / 4) : o.qtd;
    for (let i = 0; i < qtd; i++) {
      const ang = Math.random() * Math.PI * 2;
      const v = o.vel * (0.3 + Math.random() * 0.9);
      adicionar({
        x, y,
        vx: Math.cos(ang) * v,
        vy: Math.sin(ang) * v - (o.subir || 0),
        cor: o.cores[i % o.cores.length],
        tipo: o.tipo,
        tam: o.tam * (0.6 + Math.random() * 0.8),
        max: o.vida * (0.6 + Math.random() * 0.6),
        gravidade: o.gravidade,
        vrot: (Math.random() - 0.5) * 0.3,
        texto: o.textos ? o.textos[i % o.textos.length] : null
      });
    }
  }

  function confete(segundos) {
    if (reduzido) return;
    const cores = ['#ffd65c', '#38c3ff', '#ff5a5a', '#6dff9b', '#c48bff', '#ffffff'];
    const fim = Date.now() + (segundos || 3) * 1000;
    (function onda() {
      for (let i = 0; i < 12; i++) {
        adicionar({
          x: Math.random() * innerWidth, y: -20,
          vx: (Math.random() - 0.5) * 3, vy: 2 + Math.random() * 3,
          cor: cores[Math.floor(Math.random() * cores.length)],
          tipo: 'confete', tam: 8 + Math.random() * 8, max: 260,
          gravidade: 0.04, atrito: 0.995, vrot: (Math.random() - 0.5) * 0.2
        });
      }
      if (Date.now() < fim) setTimeout(onda, 90);
    })();
  }

  function fogos(qtd) {
    const paletas = [['#ffd65c', '#fff3c4'], ['#38c3ff', '#bfeaff'], ['#ff5a5a', '#ffc4c4'], ['#6dff9b', '#d3ffe1'], ['#c48bff', '#f0e0ff']];
    for (let i = 0; i < (qtd || 6); i++) {
      setTimeout(() => {
        const x = innerWidth * (0.15 + Math.random() * 0.7);
        adicionar({
          x, y: innerHeight + 10, vx: (Math.random() - 0.5) * 2, vy: -(10 + Math.random() * 5),
          cor: '#fff3c4', tam: 3, max: 38 + Math.random() * 18, gravidade: 0.18, atrito: 0.99,
          foguete: true, cores: paletas[i % paletas.length]
        });
        Som.tocar('tambor', 0.6, 0.35);
      }, i * 380);
    }
  }

  function chuvaMoedas(x, y, qtd) {
    for (let i = 0; i < (qtd || 14); i++) {
      adicionar({
        x, y, vx: (Math.random() - 0.5) * 8, vy: -4 - Math.random() * 7,
        tipo: 'moeda', tam: 6 + Math.random() * 4, max: 90, gravidade: 0.35, atrito: 0.99
      });
    }
  }

  function naipes(x, y) {
    explodir(x, y, { tipo: 'naipe', textos: ['♠', '♥', '♦', '♣'], cores: ['#ffd65c', '#ff5a5a', '#ffffff', '#ffd65c'], qtd: 18, vel: 8, tam: 26, vida: 70, gravidade: 0.15 });
  }

  // Texto gigante animado no centro da tela (anima o bloco inteiro, sem letras soltas)
  function textoGrande(texto, classes, duracao) {
    const alvo = document.getElementById('fx-texto');
    alvo.querySelectorAll('.texto-grande').forEach(e => e.remove());
    const el = document.createElement('div');
    el.className = 'texto-grande ' + (classes || '');
    el.textContent = texto;
    el.style.animationDuration = (duracao || 1600) + 'ms';
    alvo.appendChild(el);
    setTimeout(() => el.remove(), duracao || 1600);
  }

  // Anúncio de aposta: quem pediu, o nome da aposta e quanto passa a valer
  function anuncio(o) {
    let el = document.getElementById('anuncio');
    if (!el) {
      el = document.createElement('div');
      el.id = 'anuncio';
      el.innerHTML = '<div class="anuncio-faixa"><div class="anuncio-quem"><span class="anuncio-av"></span><span class="anuncio-nome"></span></div>' +
        '<div class="anuncio-titulo"></div><div class="anuncio-sub"></div></div>';
      document.body.appendChild(el);
    }
    document.getElementById('fx-texto').querySelectorAll('.texto-grande').forEach(e => e.remove());
    el.querySelector('.anuncio-av').innerHTML = o.avatarHtml || '';
    el.querySelector('.anuncio-nome').textContent = o.quem || '';
    el.querySelector('.anuncio-titulo').textContent = o.titulo || '';
    el.querySelector('.anuncio-sub').textContent = o.subtitulo || '';
    el.className = 'nivel-' + (o.nivel || 1) + ' ' + (o.equipe || '');
    el.style.setProperty('--duracao', (o.duracao || 1700) + 'ms');
    void el.offsetWidth;
    el.classList.add('ativo');
    clearTimeout(el._t);
    el._t = setTimeout(() => el.classList.remove('ativo'), o.duracao || 1700);
    const r = el.querySelector('.anuncio-titulo').getBoundingClientRect();
    setTimeout(() => {
      const cx = innerWidth / 2;
      const cy = r.top + r.height / 2 || innerHeight / 2;
      explodir(cx - r.width * 0.45, cy, { qtd: 22, vel: 7, cores: ['#ff4d00', '#ffd65c', '#ff9d2e'] });
      explodir(cx + r.width * 0.45, cy, { qtd: 22, vel: 7, cores: ['#ff4d00', '#ffd65c', '#ff9d2e'] });
    }, 180);
  }

  function tremer(elemento, nivel) {
    if (reduzido || !elemento) return;
    const n = Math.max(1, Math.min(4, nivel || 1));
    elemento.classList.remove('tremor-1', 'tremor-2', 'tremor-3', 'tremor-4');
    void elemento.offsetWidth;
    elemento.classList.add('tremor-' + n);
    setTimeout(() => elemento.classList.remove('tremor-' + n), 1100);
  }

  function flash(cor) {
    const el = document.getElementById('flash');
    el.style.background = cor || 'rgba(255,255,255,.5)';
    el.classList.remove('ativo');
    void el.offsetWidth;
    el.classList.add('ativo');
  }

  // Número que voa de um ponto até o placar
  function pontosVoando(texto, de, para, cor) {
    const el = document.createElement('div');
    el.className = 'pontos-voando';
    el.textContent = texto;
    el.style.color = cor;
    el.style.left = de.x + 'px';
    el.style.top = de.y + 'px';
    el.style.transform = 'translate(-50%,-50%) scale(.3)';
    document.body.appendChild(el);
    requestAnimationFrame(() => {
      el.style.transition = 'transform .35s cubic-bezier(.3,1.8,.5,1)';
      el.style.transform = 'translate(-50%,-50%) scale(1.4)';
      setTimeout(() => {
        el.style.transition = 'transform .9s cubic-bezier(.6,-0.2,.7,1), opacity .9s ease-in';
        el.style.transform = `translate(calc(-50% + ${para.x - de.x}px), calc(-50% + ${para.y - de.y}px)) scale(.6)`;
        el.style.opacity = '0.2';
      }, 450);
    });
    setTimeout(() => el.remove(), 1500);
  }

  // ---------- Fundo animado: vaga-lumes e poeira de luz ----------
  const fundo = (function () {
    const cv = document.getElementById('fundo');
    const c = cv.getContext('2d');
    let pontos = [];
    let w = 0, h = 0;
    function redimensionar() {
      w = cv.width = innerWidth;
      h = cv.height = innerHeight;
      const qtd = reduzido ? 0 : Math.round(Math.min(60, (w * h) / 22000));
      pontos = Array.from({ length: qtd }, () => ({
        x: Math.random() * w, y: Math.random() * h,
        r: 1 + Math.random() * 2.5, vx: (Math.random() - 0.5) * 0.25, vy: -0.1 - Math.random() * 0.3,
        f: Math.random() * Math.PI * 2
      }));
    }
    function desenhar(t) {
      c.clearRect(0, 0, w, h);
      for (const p of pontos) {
        p.x += p.vx + Math.sin(t / 2000 + p.f) * 0.15;
        p.y += p.vy;
        if (p.y < -10) { p.y = h + 10; p.x = Math.random() * w; }
        if (p.x < -10) p.x = w + 10;
        if (p.x > w + 10) p.x = -10;
        const brilho = 0.35 + 0.35 * Math.sin(t / 700 + p.f);
        const g = c.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.r * 5);
        g.addColorStop(0, `rgba(255, 220, 120, ${brilho})`);
        g.addColorStop(1, 'rgba(255, 220, 120, 0)');
        c.fillStyle = g;
        c.beginPath(); c.arc(p.x, p.y, p.r * 5, 0, Math.PI * 2); c.fill();
      }
      requestAnimationFrame(desenhar);
    }
    return { redimensionar, iniciar() { redimensionar(); requestAnimationFrame(desenhar); } };
  })();

  window.addEventListener('resize', redimensionar);
  fundo.iniciar();
  redimensionar();

  return { explodir, confete, fogos, chuvaMoedas, naipes, textoGrande, anuncio, tremer, flash, pontosVoando, reduzido };
})();
