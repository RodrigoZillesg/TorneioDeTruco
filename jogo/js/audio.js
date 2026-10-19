/**
 * Áudio do jogo: efeitos sintetizados (Web Audio), música caipira procedural
 * e narração por voz (Speech Synthesis em pt-BR). Sem arquivos externos.
 */
window.Som = (function () {
  'use strict';

  const CHAVE = 'truco.som';
  const cfg = Object.assign({ efeitos: 0.8, musica: 0.35, voz: true, vibrar: true, mudo: false }, ler());
  let ctx = null;
  let mestre, busEfeitos, busMusica, ruidoBuf;
  const cachePluck = new Map();

  function ler() {
    try { return JSON.parse(localStorage.getItem(CHAVE)) || {}; } catch (e) { return {}; }
  }
  function salvar() {
    try { localStorage.setItem(CHAVE, JSON.stringify(cfg)); } catch (e) { /* sem armazenamento */ }
  }

  function iniciar() {
    if (ctx) {
      if (ctx.state === 'suspended') ctx.resume();
      return true;
    }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return false;
    ctx = new AC();
    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -14;
    comp.ratio.value = 4;
    mestre = ctx.createGain();
    busEfeitos = ctx.createGain();
    busMusica = ctx.createGain();
    busEfeitos.connect(mestre);
    busMusica.connect(mestre);
    mestre.connect(comp);
    comp.connect(ctx.destination);
    ruidoBuf = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
    const d = ruidoBuf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    aplicarVolumes();
    return true;
  }

  function aplicarVolumes() {
    if (!ctx) return;
    const t = ctx.currentTime;
    mestre.gain.setTargetAtTime(cfg.mudo ? 0 : 1, t, 0.05);
    busEfeitos.gain.setTargetAtTime(cfg.efeitos, t, 0.05);
    busMusica.gain.setTargetAtTime(cfg.musica * 0.5, t, 0.05);
  }

  function ativo() { return ctx && !cfg.mudo; }
  function agora() { return ctx.currentTime; }

  // ---------- Blocos de síntese ----------
  function envelope(g, t, ataque, pico, duracao) {
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(Math.max(pico, 0.0002), t + ataque);
    g.gain.exponentialRampToValueAtTime(0.0001, t + ataque + duracao);
  }

  function ruido(t, dur, { tipo = 'bandpass', freq = 2000, freqFim = null, q = 1, ganho = 0.4, ataque = 0.003, destino } = {}) {
    const src = ctx.createBufferSource();
    src.buffer = ruidoBuf;
    const f = ctx.createBiquadFilter();
    f.type = tipo;
    f.frequency.setValueAtTime(freq, t);
    if (freqFim) f.frequency.exponentialRampToValueAtTime(freqFim, t + dur);
    f.Q.value = q;
    const g = ctx.createGain();
    envelope(g, t, ataque, ganho, dur);
    src.connect(f); f.connect(g); g.connect(destino || busEfeitos);
    src.start(t, Math.random() * 1.5);
    src.stop(t + dur + ataque + 0.05);
  }

  function tom(t, freq, dur, { tipo = 'sine', ganho = 0.3, freqFim = null, ataque = 0.005, destino, filtro = null } = {}) {
    const o = ctx.createOscillator();
    o.type = tipo;
    o.frequency.setValueAtTime(freq, t);
    if (freqFim) o.frequency.exponentialRampToValueAtTime(freqFim, t + dur);
    const g = ctx.createGain();
    envelope(g, t, ataque, ganho, dur);
    let saida = o;
    if (filtro) {
      const f = ctx.createBiquadFilter();
      f.type = 'lowpass';
      f.frequency.setValueAtTime(filtro[0], t);
      f.frequency.exponentialRampToValueAtTime(filtro[1], t + Math.min(dur, 0.12));
      if (filtro[2]) f.frequency.exponentialRampToValueAtTime(filtro[2], t + dur);
      o.connect(f); saida = f;
    }
    saida.connect(g); g.connect(destino || busEfeitos);
    o.start(t);
    o.stop(t + dur + ataque + 0.05);
    return o;
  }

  // Corda dedilhada (Karplus-Strong) pré-calculada
  function bufferPluck(freq, dur, brilho) {
    const chave = Math.round(freq) + ':' + dur + ':' + brilho;
    if (cachePluck.has(chave)) return cachePluck.get(chave);
    const sr = ctx.sampleRate;
    const total = Math.floor(sr * dur);
    const buf = ctx.createBuffer(1, total, sr);
    const d = buf.getChannelData(0);
    const n = Math.max(2, Math.round(sr / freq));
    const linha = new Float32Array(n);
    for (let i = 0; i < n; i++) linha[i] = Math.random() * 2 - 1;
    let idx = 0;
    const amort = 0.4985 + brilho * 0.0012;
    for (let i = 0; i < total; i++) {
      const prox = (idx + 1) % n;
      const v = linha[idx];
      linha[idx] = (v + linha[prox]) * amort;
      d[i] = v;
      idx = prox;
    }
    cachePluck.set(chave, buf);
    return buf;
  }

  function pluck(t, freq, { ganho = 0.25, dur = 1.6, brilho = 1, destino } = {}) {
    const src = ctx.createBufferSource();
    src.buffer = bufferPluck(freq, dur, brilho);
    const g = ctx.createGain();
    g.gain.value = ganho;
    src.connect(g); g.connect(destino || busEfeitos);
    src.start(t);
  }

  const nota = (n) => 440 * Math.pow(2, (n - 69) / 12);

  // ---------- Efeitos ----------
  const efeitos = {
    carta() {
      const t = agora();
      ruido(t, 0.07, { freq: 2600 + Math.random() * 1200, q: 0.9, ganho: 0.55 });
      tom(t, 190, 0.07, { freqFim: 80, ganho: 0.3 });
    },
    deslizar() {
      const t = agora();
      ruido(t, 0.22, { freq: 700, freqFim: 3800, q: 1.4, ganho: 0.22, ataque: 0.03 });
    },
    embaralhar() {
      const t = agora();
      for (let i = 0; i < 16; i++) {
        ruido(t + i * 0.038 + Math.random() * 0.01, 0.04, { freq: 3000 + Math.random() * 1500, q: 0.8, ganho: 0.25 });
      }
      ruido(t + 0.66, 0.1, { freq: 1500, q: 0.7, ganho: 0.4 });
      tom(t + 0.66, 130, 0.1, { freqFim: 60, ganho: 0.35 });
    },
    distribuir(qtd, intervalo) {
      const t = agora();
      for (let i = 0; i < qtd; i++) {
        ruido(t + i * intervalo, 0.12, { freq: 900, freqFim: 3200, q: 1.2, ganho: 0.18, ataque: 0.02 });
        ruido(t + i * intervalo + 0.11, 0.05, { freq: 2600, q: 0.9, ganho: 0.25 });
      }
    },
    virar() {
      const t = agora();
      ruido(t, 0.05, { tipo: 'highpass', freq: 3000, ganho: 0.3 });
      tom(t, 900, 0.05, { tipo: 'triangle', ganho: 0.12 });
    },
    clique() {
      const t = agora();
      tom(t, 1300, 0.04, { tipo: 'triangle', ganho: 0.15 });
    },
    pop() {
      const t = agora();
      tom(t, 520, 0.08, { freqFim: 980, ganho: 0.18 });
    },
    suaVez() {
      const t = agora();
      tom(t, nota(84), 0.25, { tipo: 'triangle', ganho: 0.12 });
      tom(t + 0.1, nota(88), 0.35, { tipo: 'triangle', ganho: 0.12 });
    },
    tique() {
      const t = agora();
      tom(t, 2200, 0.025, { tipo: 'square', ganho: 0.05 });
    },
    moeda(atraso) {
      const t = agora() + (atraso || 0);
      tom(t, 1975, 0.5, { tipo: 'sine', ganho: 0.16 });
      tom(t, 2637, 0.4, { tipo: 'sine', ganho: 0.1 });
      tom(t + 0.07, 3951, 0.35, { tipo: 'sine', ganho: 0.07 });
    },
    tambor(atraso, forca) {
      const t = agora() + (atraso || 0);
      const f = forca || 1;
      tom(t, 160, 0.4, { freqFim: 42, ganho: 0.9 * f });
      ruido(t, 0.12, { tipo: 'lowpass', freq: 600, ganho: 0.5 * f });
    },
    prato(atraso, dur) {
      const t = agora() + (atraso || 0);
      ruido(t, dur || 1.4, { tipo: 'highpass', freq: 5500, ganho: 0.28 });
      ruido(t, (dur || 1.4) * 0.6, { tipo: 'bandpass', freq: 9000, q: 0.5, ganho: 0.15 });
    },
    // Estrondo de metais para TRUCO/SEIS/NOVE/DOZE
    truco(nivel) {
      const t = agora();
      const raiz = [45, 47, 49, 52][Math.max(0, Math.min(3, nivel - 1))];
      const acorde = [0, 7, 12, 16, 19];
      const golpe = (inicio, dur, ganho) => {
        for (const iv of acorde) {
          for (const desafino of [-6, 6]) {
            const o = tom(inicio, nota(raiz + iv), dur, { tipo: 'sawtooth', ganho: ganho / acorde.length, ataque: 0.02, filtro: [300, 3200, 500] });
            o.detune.value = desafino;
          }
        }
      };
      if (nivel >= 2) {
        golpe(t, 0.18, 0.5);
        efeitos.tambor(0, 0.8);
        golpe(t + 0.22, 1.1, 0.65);
        efeitos.tambor(0.22, 1.2);
        efeitos.prato(0.22, 1.6);
      } else {
        golpe(t, 1.0, 0.6);
        efeitos.tambor(0, 1.1);
        efeitos.prato(0, 1.3);
      }
      if (nivel >= 3) {
        for (let i = 0; i < 6; i++) efeitos.tambor(0.5 + i * 0.09, 0.5);
      }
    },
    aceitar() {
      const t = agora();
      tom(t, nota(72), 0.14, { tipo: 'square', ganho: 0.08, filtro: [1200, 2400] });
      tom(t + 0.12, nota(79), 0.3, { tipo: 'square', ganho: 0.08, filtro: [1200, 2400] });
      efeitos.tambor(0.12, 0.5);
    },
    correr() {
      const t = agora();
      tom(t, 520, 0.6, { tipo: 'triangle', freqFim: 140, ganho: 0.22 });
      ruido(t, 0.5, { freq: 3000, freqFim: 400, q: 2, ganho: 0.15, ataque: 0.05 });
    },
    ganharVaza(manilha) {
      const t = agora();
      const base = manilha ? 67 : 64;
      [0, 4, 7, 12].forEach((iv, i) => pluck(t + i * 0.07, nota(base + iv), { ganho: 0.3, dur: 1.4 }));
      if (manilha) efeitos.moeda(0.25);
    },
    perderVaza() {
      const t = agora();
      [7, 3, 0].forEach((iv, i) => pluck(t + i * 0.09, nota(52 + iv), { ganho: 0.28, dur: 1.4 }));
    },
    empate() {
      const t = agora();
      pluck(t, nota(60), { ganho: 0.3 });
      pluck(t + 0.12, nota(60), { ganho: 0.25 });
    },
    ganharMao(pontos) {
      const n = Math.min(8, 2 + (pontos || 1));
      for (let i = 0; i < n; i++) efeitos.moeda(i * 0.08);
    },
    perderMao() {
      const t = agora();
      tom(t, 220, 0.5, { tipo: 'triangle', freqFim: 150, ganho: 0.18 });
    },
    especial() {
      const t = agora();
      [0, 3, 7, 10, 12].forEach((iv, i) => pluck(t + i * 0.05, nota(50 + iv), { ganho: 0.25, dur: 2 }));
      efeitos.tambor(0, 1);
      efeitos.prato(0.05, 2);
    },
    vitoria() {
      const t = agora();
      const melodia = [[67, 0, 0.18], [72, 0.18, 0.18], [76, 0.36, 0.18], [79, 0.54, 0.5], [76, 1.04, 0.18], [79, 1.22, 1.2]];
      for (const [n, ini, dur] of melodia) {
        for (const iv of [0, -12]) {
          tom(t + ini, nota(n + iv), dur, { tipo: 'sawtooth', ganho: 0.07, ataque: 0.02, filtro: [600, 3000, 1200] });
        }
        tom(t + ini, nota(n + 4), dur, { tipo: 'square', ganho: 0.03, ataque: 0.02, filtro: [800, 2400] });
      }
      [0, 0.54, 1.22].forEach(a => efeitos.tambor(a, 1));
      efeitos.prato(1.22, 2.5);
      for (let i = 0; i < 10; i++) efeitos.moeda(1.3 + i * 0.07);
    },
    derrota() {
      const t = agora();
      const notas = [[55, 0, 0.45], [54, 0.5, 0.45], [53, 1.0, 0.45], [52, 1.5, 1.4]];
      for (const [n, ini, dur] of notas) {
        const o = tom(t + ini, nota(n), dur, { tipo: 'sawtooth', ganho: 0.14, ataque: 0.04, filtro: [400, 1100, 500] });
        if (ini >= 1.5) {
          const lfo = ctx.createOscillator();
          const lg = ctx.createGain();
          lfo.frequency.value = 6;
          lg.gain.value = 18;
          lfo.connect(lg); lg.connect(o.detune);
          lfo.start(t + ini); lfo.stop(t + ini + dur + 0.1);
        }
      }
    }
  };

  // ---------- Música (viola caipira procedural) ----------
  const musica = { tocando: false, timer: null, proximo: 0, passo: 0 };
  const PROGRESSAO = [
    { baixo: 43, acorde: [59, 62, 67] }, // Sol
    { baixo: 48, acorde: [60, 64, 67] }, // Dó
    { baixo: 50, acorde: [62, 66, 69] }, // Ré
    { baixo: 43, acorde: [59, 62, 67] }, // Sol
    { baixo: 40, acorde: [59, 64, 67] }, // Mi menor
    { baixo: 48, acorde: [60, 64, 67] }, // Dó
    { baixo: 50, acorde: [62, 66, 69] }, // Ré
    { baixo: 50, acorde: [60, 66, 69] }  // Ré7
  ];
  const ESCALA = [67, 69, 71, 74, 76, 79, 81];
  let notaMelodia = 3;

  function agendarMusica() {
    if (!musica.tocando || !ctx) return;
    const colcheia = 60 / 100 / 2;
    while (musica.proximo < ctx.currentTime + 0.4) {
      const t = musica.proximo;
      const compasso = Math.floor(musica.passo / 8) % PROGRESSAO.length;
      const pos = musica.passo % 8;
      const ac = PROGRESSAO[compasso];
      const g = { destino: busMusica };
      if (pos === 0 || pos === 4) pluck(t, nota(pos === 0 ? ac.baixo : ac.baixo + 7), Object.assign({ ganho: 0.42, dur: 1.8, brilho: 0.4 }, g));
      if (pos === 2 || pos === 6) ac.acorde.forEach((n, i) => pluck(t + i * 0.012, nota(n), Object.assign({ ganho: 0.16, dur: 1.2 }, g)));
      if (pos === 3 || pos === 7) pluck(t, nota(ac.acorde[2] + 12), Object.assign({ ganho: 0.08, dur: 0.8 }, g));
      // Ponteado de viola em terças, de vez em quando
      if ((pos === 1 || pos === 5) && Math.random() < 0.55) {
        notaMelodia = Math.max(0, Math.min(ESCALA.length - 1, notaMelodia + Math.floor(Math.random() * 3) - 1));
        pluck(t, nota(ESCALA[notaMelodia]), Object.assign({ ganho: 0.13, dur: 1.4, brilho: 1.4 }, g));
        pluck(t, nota(ESCALA[notaMelodia] - 4), Object.assign({ ganho: 0.09, dur: 1.4, brilho: 1.4 }, g));
      }
      musica.proximo += colcheia;
      musica.passo++;
    }
  }

  function tocarMusica() {
    if (!iniciar() || musica.tocando) return;
    musica.tocando = true;
    musica.proximo = ctx.currentTime + 0.1;
    musica.timer = setInterval(agendarMusica, 120);
  }

  function pararMusica() {
    musica.tocando = false;
    clearInterval(musica.timer);
  }

  function abafarMusica(segundos) {
    if (!ctx) return;
    const t = ctx.currentTime;
    busMusica.gain.cancelScheduledValues(t);
    busMusica.gain.setTargetAtTime(cfg.musica * 0.08, t, 0.1);
    busMusica.gain.setTargetAtTime(cfg.musica * 0.5, t + segundos, 0.6);
  }

  // ---------- Voz ----------
  let vozes = [];
  function carregarVozes() {
    if (!('speechSynthesis' in window)) return;
    vozes = speechSynthesis.getVoices().filter(v => /^pt/i.test(v.lang));
    vozes.sort((a, b) => (/BR/i.test(b.lang) ? 1 : 0) - (/BR/i.test(a.lang) ? 1 : 0));
  }
  if ('speechSynthesis' in window) {
    carregarVozes();
    speechSynthesis.onvoiceschanged = carregarVozes;
  }

  function falar(texto, perfil) {
    if (!cfg.voz || cfg.mudo || !('speechSynthesis' in window)) return;
    const limpo = String(texto).replace(/[^\p{L}\p{N}\s!?.,]/gu, '').trim();
    if (!limpo) return;
    try {
      if (speechSynthesis.speaking && perfil && perfil.urgente) speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(limpo);
      u.lang = 'pt-BR';
      if (vozes.length) u.voice = vozes[(perfil && perfil.voz) % vozes.length] || vozes[0];
      u.pitch = (perfil && perfil.tom) || 1;
      u.rate = (perfil && perfil.velocidade) || 1.08;
      u.volume = Math.min(1, 0.4 + cfg.efeitos);
      speechSynthesis.speak(u);
    } catch (e) { /* voz indisponível */ }
  }

  function vibrar(padrao) {
    if (cfg.vibrar && !cfg.mudo && navigator.vibrate) {
      try { navigator.vibrate(padrao); } catch (e) { /* sem vibração */ }
    }
  }

  // Desbloqueia o áudio no primeiro toque (exigência dos navegadores)
  ['pointerdown', 'keydown', 'touchstart'].forEach(ev => {
    window.addEventListener(ev, function desbloquear() {
      iniciar();
      if (cfg.musica > 0 && !musica.tocando) tocarMusica();
    }, { once: true, passive: true });
  });

  const api = {
    cfg,
    iniciar,
    tocar(nome, ...args) {
      if (!ativo() || !efeitos[nome]) return;
      try { efeitos[nome](...args); } catch (e) { /* ignora falhas de áudio */ }
    },
    falar,
    vibrar,
    tocarMusica,
    pararMusica,
    abafarMusica,
    definir(chave, valor) {
      cfg[chave] = valor;
      salvar();
      aplicarVolumes();
      if (chave === 'musica') {
        if (valor > 0) tocarMusica(); else pararMusica();
      }
      if (chave === 'voz' && !valor && 'speechSynthesis' in window) speechSynthesis.cancel();
    }
  };
  return api;
})();
