/**
 * Personagens do jogo em estilo flat: formas lisas, sem contorno,
 * sombra chapada do lado direito e olhos de pontinho.
 * Expressões: neutro, feliz, bravo e grito.
 */
window.Personagens = (function () {
  'use strict';

  const ESCURO = '#2a1a10';
  const PELES = {
    clara: '#f3cfae',
    rosada: '#eebd98',
    morena: '#d99a66',
    parda: '#b97a4f',
    escura: '#8a5636',
    retinta: '#5b3622'
  };

  // Ficha de cada personagem do elenco (TrucoElenco)
  // rosto: topo e base (altura), largura no topo (lt), no meio (lm) e na base (lb)
  const FICHAS = {
    ze: {
      fundo: '#3fa38a', pele: PELES.morena, cabelo: '#3b2416', rosto: { topo: 56, base: 164, lt: 38, lm: 43, lb: 38 },
      nariz: 'batata', cabeloTipo: 'curto', chapeu: { tipo: 'palha', cor: '#f2c14e', faixa: '#d23b2e' },
      bigode: 'grosso', roupa: { tipo: 'xadrez', cor: '#e0533d', cor2: '#c2412e' }, extras: ['palito', 'barba-rala']
    },
    cida: {
      fundo: '#9b7fd1', pele: PELES.clara, cabelo: '#e3dfdc', rosto: { topo: 60, base: 162, lt: 42, lm: 46, lb: 40 },
      nariz: 'redondo', cabeloTipo: 'coque', oculos: { tipo: 'redondo', cor: '#7a4b9c' },
      roupa: { tipo: 'xale', cor: '#f4e7d3', cor2: '#8e5bb5' }, extras: ['brinco', 'batom', 'rugas'], sobrancelha: 'fina'
    },
    tiao: {
      fundo: '#6c9fc0', pele: PELES.parda, cabelo: '#24170e', rosto: { topo: 54, base: 166, lt: 36, lm: 41, lb: 38 },
      nariz: 'gancho', cabeloTipo: 'curto', chapeu: { tipo: 'couro', cor: '#8a5530' },
      barba: 'cheia', roupa: { tipo: 'camisa', cor: '#e6dcc4' }, extras: ['lenco-pescoco'], corLenco: '#d23b2e'
    },
    mane: {
      fundo: '#e58a3a', pele: PELES.escura, cabelo: '#171009', rosto: { topo: 58, base: 166, lt: 36, lm: 40, lb: 30 },
      nariz: 'redondo', cabeloTipo: 'raspado', chapeu: { tipo: 'bone', cor: '#f1c40f', aba: '#d4a50a' },
      barba: 'cavanhaque', roupa: { tipo: 'regata', cor: '#f5f5f5' }, extras: ['dente-ouro', 'corrente']
    },
    rosinha: {
      fundo: '#f08fae', pele: PELES.rosada, cabelo: '#6b3a1e', rosto: { topo: 60, base: 160, lt: 36, lm: 40, lb: 30 },
      nariz: 'pequeno', cabeloTipo: 'cacheado', roupa: { tipo: 'vestido', cor: '#e84a6f', cor2: '#ffd1dc' },
      extras: ['flor', 'argola', 'batom', 'cilios'], sobrancelha: 'fina'
    },
    tonhao: {
      fundo: '#5a8f5e', pele: PELES.rosada, cabelo: '#4a2e1a', rosto: { topo: 56, base: 164, lt: 44, lm: 50, lb: 48 },
      nariz: 'batata', cabeloTipo: 'careca', bigode: 'guidao',
      roupa: { tipo: 'camiseta', cor: '#2f6fb5' }, extras: ['sobrancelhao', 'papada']
    },
    quim: {
      fundo: '#c9a86a', pele: PELES.clara, cabelo: '#f2f2f2', rosto: { topo: 58, base: 166, lt: 32, lm: 37, lb: 27 },
      nariz: 'gancho', cabeloTipo: 'careca', chapeu: { tipo: 'feltro', cor: '#5b4a3a', faixa: '#2e241a' },
      barba: 'branca', bigode: 'grosso', roupa: { tipo: 'terno', cor: '#4a3b2e', cor2: '#efe6d2' }, extras: ['rugas']
    },
    zefa: {
      fundo: '#f2b632', pele: PELES.parda, cabelo: '#2a1a10', rosto: { topo: 60, base: 162, lt: 42, lm: 48, lb: 44 },
      nariz: 'redondo', cabeloTipo: 'curto', chapeu: { tipo: 'lenco', cor: '#d64545', cor2: '#ffffff' },
      roupa: { tipo: 'avental', cor: '#3f6fb5', cor2: '#f7f2e8' }, extras: ['argola', 'batom', 'papada'], sobrancelha: 'fina'
    },
    bene: {
      fundo: '#5d86c9', pele: PELES.clara, cabelo: '#9a9a9a', rosto: { topo: 54, base: 164, lt: 42, lm: 42, lb: 29 },
      nariz: 'pequeno', cabeloTipo: 'careca', oculos: { tipo: 'quadrado', cor: '#1f1f1f' },
      bigode: 'fino', roupa: { tipo: 'terno', cor: '#2c3e50', cor2: '#ffffff', gravata: 'borboleta' }, extras: ['rugas']
    },
    lurdinha: {
      fundo: '#45b7a6', pele: PELES.morena, cabelo: '#2e1a0e', rosto: { topo: 62, base: 160, lt: 36, lm: 40, lb: 30 },
      nariz: 'pequeno', cabeloTipo: 'trancas', roupa: { tipo: 'xadrez', cor: '#3a7bd5', cor2: '#2a5fa8' },
      extras: ['sardas', 'cilios', 'laco'], sobrancelha: 'fina'
    },
    gerson: {
      fundo: '#c96f4a', pele: PELES.morena, cabelo: '#4a2e1a', rosto: { topo: 56, base: 166, lt: 38, lm: 43, lb: 42 },
      nariz: 'gancho', cabeloTipo: 'curto', chapeu: { tipo: 'cowboy', cor: '#efe0c2', faixa: '#5b3a1e' },
      bigode: 'grosso', roupa: { tipo: 'jeans', cor: '#4a78b0' }, extras: ['costeleta']
    },
    neide: {
      fundo: '#9c5fc7', pele: PELES.clara, cabelo: '#d0452f', rosto: { topo: 60, base: 162, lt: 40, lm: 44, lb: 36 },
      nariz: 'redondo', cabeloTipo: 'volume', oculos: { tipo: 'sol-cabeca', cor: '#ff5fa2' },
      roupa: { tipo: 'vestido', cor: '#f1c40f', cor2: '#e67e22' }, extras: ['argola', 'batom', 'cilios', 'pinta'], sobrancelha: 'fina'
    },
    bastiao: {
      fundo: '#8cc06b', pele: PELES.retinta, cabelo: '#e8e8e8', rosto: { topo: 60, base: 164, lt: 40, lm: 44, lb: 38 },
      nariz: 'batata', cabeloTipo: 'crespo', bigode: 'grosso', bigodeCor: '#e8e8e8',
      roupa: { tipo: 'camisa', cor: '#f4d03f' }, extras: ['rugas', 'lenco-pescoco'], corLenco: '#2e86c1'
    },
    juca: {
      fundo: '#7cbf5a', pele: PELES.clara, cabelo: '#c98a3a', rosto: { topo: 58, base: 162, lt: 38, lm: 42, lb: 34 },
      nariz: 'redondo', cabeloTipo: 'topete', chapeu: { tipo: 'palha', cor: '#e9c46a', faixa: '#8a5530' },
      roupa: { tipo: 'xadrez', cor: '#e67e22', cor2: '#c4651a' }, extras: ['sardas', 'dentuco']
    }
  };

  // ---------- Cores e formas ----------
  function misturar(hex, alvo, f) {
    const a = parseInt(hex.slice(1), 16);
    const b = parseInt(alvo.slice(1), 16);
    const ch = (n, s) => (n >> s) & 255;
    const m = (s) => Math.round(ch(a, s) + (ch(b, s) - ch(a, s)) * f);
    return '#' + ((1 << 24) + (m(16) << 16) + (m(8) << 8) + m(0)).toString(16).slice(1);
  }
  const escuro = (c, f) => misturar(c, '#000000', f == null ? 0.16 : f);
  const claro = (c, f) => misturar(c, '#ffffff', f == null ? 0.2 : f);
  const n1 = (v) => Math.round(v * 10) / 10;

  // Curva suave fechada passando pelos pontos (Catmull-Rom em Bézier)
  function suave(pts) {
    const n = pts.length;
    let d = `M ${n1(pts[0][0])} ${n1(pts[0][1])}`;
    for (let i = 0; i < n; i++) {
      const p0 = pts[(i - 1 + n) % n], p1 = pts[i], p2 = pts[(i + 1) % n], p3 = pts[(i + 2) % n];
      d += ` C ${n1(p1[0] + (p2[0] - p0[0]) / 6)} ${n1(p1[1] + (p2[1] - p0[1]) / 6)}, ${n1(p2[0] - (p3[0] - p1[0]) / 6)} ${n1(p2[1] - (p3[1] - p1[1]) / 6)}, ${n1(p2[0])} ${n1(p2[1])}`;
    }
    return d + ' Z';
  }

  let seq = 0;

  // Desenha a forma e repete a metade direita com a cor de sombra (sombra chapada)
  function chapado(d, cor, g, sombra) {
    return `<path d="${d}" fill="${cor}"/><path d="${d}" fill="${sombra || escuro(cor)}" clip-path="url(#ld${g.id})"/>`;
  }

  // ---------- Partes ----------
  function caminhoRosto(r) {
    const cx = 100;
    const h = r.base - r.topo;
    return suave([
      [cx, r.topo],
      [cx + r.lt * 0.86, r.topo + h * 0.08],
      [cx + r.lm, r.topo + h * 0.42],
      [cx + r.lb, r.topo + h * 0.76],
      [cx + r.lb * 0.5, r.base - h * 0.03],
      [cx, r.base],
      [cx - r.lb * 0.5, r.base - h * 0.03],
      [cx - r.lb, r.topo + h * 0.76],
      [cx - r.lm, r.topo + h * 0.42],
      [cx - r.lt * 0.86, r.topo + h * 0.08]
    ]);
  }

  function corpo(f, g) {
    const r = f.roupa;
    const torso = 'M 26 204 C 28 172, 58 154, 100 154 C 142 154, 172 172, 174 204 Z';
    let s = '';
    if (r.tipo === 'regata') {
      s += chapado(torso, f.pele, g, escuro(f.pele));
      s += chapado('M 62 204 C 64 184, 70 166, 76 160 Q 100 178 124 160 C 130 166, 136 184, 138 204 Z', r.cor, g, escuro(r.cor, 0.1));
      return s;
    }
    s += chapado(torso, r.cor, g, escuro(r.cor, 0.14));
    if (r.tipo === 'xadrez') {
      s += `<g fill="${r.cor2}" opacity=".75" clip-path="url(#tr${g.id})">`;
      for (let x = 34; x < 176; x += 22) s += `<rect x="${x}" y="150" width="7" height="60"/>`;
      for (let y = 166; y < 204; y += 14) s += `<rect x="20" y="${y}" width="160" height="5"/>`;
      s += '</g>';
    }
    if (r.tipo === 'vestido') {
      s += `<g fill="${r.cor2}" clip-path="url(#tr${g.id})">`;
      for (let y = 168, k = 0; y < 204; y += 13, k++) for (let x = 36 + (k % 2) * 10; x < 170; x += 20) s += `<circle cx="${x}" cy="${y}" r="3.2"/>`;
      s += '</g>';
      s += `<path d="M 74 157 Q 100 186 126 157 Z" fill="${f.pele}"/>`;
    } else if (r.tipo === 'camiseta') {
      s += `<path d="M 78 156 Q 100 174 122 156 Z" fill="${escuro(f.pele)}"/>`;
      s += `<path d="M 78 156 Q 100 174 122 156" fill="none" stroke="${escuro(r.cor, 0.22)}" stroke-width="4"/>`;
    } else if (r.tipo === 'terno') {
      s += `<path d="M 80 156 L 100 204 L 120 156 Z" fill="${r.cor2}"/>`;
      s += `<path d="M 80 156 L 96 194 L 72 204 L 62 170 Z" fill="${escuro(r.cor, 0.22)}"/><path d="M 120 156 L 104 194 L 128 204 L 138 170 Z" fill="${escuro(r.cor, 0.3)}"/>`;
      s += r.gravata === 'borboleta'
        ? `<path d="M 100 167 L 86 159 L 86 175 Z M 100 167 L 114 159 L 114 175 Z" fill="#d23b2e"/><circle cx="100" cy="167" r="4" fill="#a82d22"/>`
        : `<path d="M 100 162 L 94 170 L 100 198 L 106 170 Z" fill="#a82d22"/>`;
    } else if (r.tipo === 'avental') {
      s += `<path d="M 72 176 Q 100 184 128 176 L 136 204 L 64 204 Z" fill="${r.cor2}"/>`;
      s += `<path d="M 100 176 Q 114 182 128 176 L 136 204 L 100 204 Z" fill="${escuro(r.cor2, 0.06)}"/>`;
      s += `<rect x="74" y="160" width="6" height="18" rx="3" fill="${r.cor2}" transform="rotate(-14 77 169)"/><rect x="120" y="160" width="6" height="18" rx="3" fill="${r.cor2}" transform="rotate(14 123 169)"/>`;
      s += `<rect x="88" y="188" width="24" height="10" rx="3" fill="${escuro(r.cor2, 0.1)}"/>`;
    } else if (r.tipo === 'xale') {
      s += `<path d="M 78 156 Q 100 172 122 156 Z" fill="${r.cor}"/>`;
      s += chapado('M 24 196 C 38 170, 74 166, 100 194 C 126 166, 162 170, 176 196 L 178 206 L 22 206 Z', r.cor2, g, escuro(r.cor2, 0.14));
      s += `<circle cx="100" cy="190" r="6" fill="#f1c40f"/>`;
    } else if (r.tipo === 'jeans') {
      s += `<path d="M 80 156 L 92 176 L 100 165 L 108 176 L 120 156 Z" fill="${claro(r.cor, 0.18)}"/>`;
      s += `<rect x="98.5" y="168" width="3" height="40" fill="${escuro(r.cor, 0.25)}"/>`;
      s += `<rect x="56" y="180" width="22" height="16" rx="3" fill="${escuro(r.cor, 0.12)}"/><rect x="122" y="180" width="22" height="16" rx="3" fill="${escuro(r.cor, 0.25)}"/>`;
    } else {
      // Camisa com gola e botões (também usada pelo xadrez)
      s += `<path d="M 80 155 L 92 176 L 100 165 L 108 176 L 120 155 Z" fill="${claro(r.cor, 0.35)}"/>`;
      s += `<rect x="98.5" y="168" width="3" height="40" fill="${escuro(r.cor, 0.25)}" opacity=".7"/>`;
      s += `<circle cx="100" cy="184" r="2.6" fill="${escuro(r.cor, 0.35)}"/><circle cx="100" cy="196" r="2.6" fill="${escuro(r.cor, 0.35)}"/>`;
    }
    return s;
  }

  function lencoPescoco(cor) {
    return `<path d="M 76 156 Q 100 170 124 156 L 112 180 Q 100 188 88 180 Z" fill="${cor}"/>` +
      `<path d="M 100 165 Q 112 162 124 156 L 112 180 Q 106 184 100 185 Z" fill="${escuro(cor, 0.18)}"/>` +
      `<circle cx="88" cy="166" r="2" fill="#fff" opacity=".8"/><circle cx="104" cy="175" r="2" fill="#fff" opacity=".8"/>`;
  }

  function cabeloAtras(f, g) {
    const c = f.cabelo;
    const r = f.rosto;
    const cx = 100;
    const h = r.base - r.topo;
    switch (f.cabeloTipo) {
      case 'coque':
        return chapado(`M ${cx - 20} ${r.topo - 8} a 20 20 0 1 1 40 0 a 20 20 0 1 1 -40 0 Z`, c, g);
      case 'cacheado': {
        let s = '';
        const pts = [[-1.12, 0.32], [-1.18, 0.58], [-1.05, 0.82], [1.12, 0.32], [1.18, 0.58], [1.05, 0.82], [-0.9, 0.08], [0.9, 0.08], [-0.5, -0.06], [0.5, -0.06], [0, -0.1]];
        for (const [px, py] of pts) s += chapado(`M ${cx + px * r.lm - 17} ${r.topo + py * h} a 17 17 0 1 1 34 0 a 17 17 0 1 1 -34 0 Z`, c, g);
        return s;
      }
      case 'volume':
        return chapado(suave([[cx, r.topo - 22], [cx + r.lm + 22, r.topo + 4], [cx + r.lm + 28, r.topo + h * 0.6], [cx + r.lm + 8, r.topo + h * 0.86], [cx - r.lm - 8, r.topo + h * 0.86], [cx - r.lm - 28, r.topo + h * 0.6], [cx - r.lm - 22, r.topo + 4]]), c, g);
      case 'trancas': {
        let s = '';
        for (const l of [-1, 1]) {
          const x = cx + l * (r.lm + 4);
          for (let k = 0; k < 5; k++) {
            const y = r.topo + 46 + k * 13;
            s += `<ellipse cx="${x + l * (k * 0.8)}" cy="${y}" rx="${9 - k * 0.6}" ry="8" fill="${k % 2 ? escuro(c, 0.18) : c}"/>`;
          }
          s += `<path d="M ${x + l * 4 - 8} ${r.topo + 112} l 8 -6 l 8 6 l -8 6 Z" fill="#e84a6f"/>`;
        }
        return s;
      }
      default:
        return '';
    }
  }

  function orelhas(f) {
    const r = f.rosto;
    const y = r.topo + (r.base - r.topo) * 0.5;
    const e = 100 - r.lm + 1;
    const d = 100 + r.lm - 1;
    let s = `<circle cx="${e}" cy="${y}" r="11" fill="${f.pele}"/><circle cx="${d}" cy="${y}" r="11" fill="${escuro(f.pele)}"/>`;
    s += `<circle cx="${e}" cy="${y}" r="5" fill="${escuro(f.pele, 0.12)}"/><circle cx="${d}" cy="${y}" r="5" fill="${escuro(f.pele, 0.26)}"/>`;
    if (f.extras.includes('argola')) {
      s += `<circle cx="${e - 2}" cy="${y + 16}" r="8" fill="none" stroke="#f1c40f" stroke-width="3.5"/><circle cx="${d + 2}" cy="${y + 16}" r="8" fill="none" stroke="#d4a50a" stroke-width="3.5"/>`;
    } else if (f.extras.includes('brinco')) {
      s += `<circle cx="${e - 1}" cy="${y + 12}" r="4" fill="#fffdf2"/><circle cx="${d + 1}" cy="${y + 12}" r="4" fill="#e9e3d2"/>`;
    }
    return s;
  }

  function cabeloFrente(f, g) {
    const c = f.cabelo;
    const r = f.rosto;
    const cx = 100;
    const h = r.base - r.topo;
    const testa = r.topo + h * 0.26;
    switch (f.cabeloTipo) {
      case 'careca': {
        const y = r.topo + h * 0.42;
        return chapado(suave([[cx - r.lm - 2, y - 18], [cx - r.lm + 10, y - 22], [cx - r.lm + 8, y + 2], [cx - r.lm - 3, y + 8]]), c, g) +
          chapado(suave([[cx + r.lm + 2, y - 18], [cx + r.lm - 10, y - 22], [cx + r.lm - 8, y + 2], [cx + r.lm + 3, y + 8]]), c, g) +
          `<ellipse cx="${cx - 14}" cy="${r.topo + 14}" rx="12" ry="6" fill="#fff" opacity=".28" transform="rotate(-18 ${cx - 14} ${r.topo + 14})"/>`;
      }
      case 'raspado':
        return `<path d="${suave([[cx, r.topo - 1], [cx + r.lt * 0.9, r.topo + 8], [cx + r.lm - 2, r.topo + h * 0.3], [cx, r.topo + h * 0.18], [cx - r.lm + 2, r.topo + h * 0.3], [cx - r.lt * 0.9, r.topo + 8]])}" fill="${c}" opacity=".8"/>`;
      case 'crespo': {
        let s = chapado(suave([[cx, r.topo - 10], [cx + r.lt + 6, r.topo + 2], [cx + r.lm + 4, r.topo + h * 0.34], [cx + r.lm - 6, r.topo + h * 0.3], [cx, r.topo + h * 0.18], [cx - r.lm + 6, r.topo + h * 0.3], [cx - r.lm - 4, r.topo + h * 0.34], [cx - r.lt - 6, r.topo + 2]]), c, g);
        for (let k = 0; k < 9; k++) {
          const a = Math.PI * (1.1 + 0.8 * k / 8);
          s += `<circle cx="${n1(cx + Math.cos(a) * (r.lm + 2))}" cy="${n1(r.topo + h * 0.3 + Math.sin(a) * (h * 0.36))}" r="9" fill="${k > 4 ? escuro(c) : c}"/>`;
        }
        return s;
      }
      case 'coque':
        return chapado(suave([[cx, r.topo - 4], [cx + r.lt + 4, r.topo + 6], [cx + r.lm + 3, r.topo + h * 0.4], [cx + r.lm - 8, r.topo + h * 0.26], [cx, r.topo + h * 0.16], [cx - r.lm + 8, r.topo + h * 0.26], [cx - r.lm - 3, r.topo + h * 0.4], [cx - r.lt - 4, r.topo + 6]]), c, g);
      case 'cacheado':
      case 'volume':
        return chapado(suave([[cx, r.topo - 8], [cx + r.lt + 8, r.topo + 4], [cx + r.lm + 6, r.topo + h * 0.4], [cx + r.lm - 10, r.topo + h * 0.24], [cx + 10, testa - 6], [cx - 6, testa + 2], [cx - r.lm + 6, r.topo + h * 0.3], [cx - r.lm - 6, r.topo + h * 0.4], [cx - r.lt - 8, r.topo + 4]]), c, g);
      case 'trancas':
        return chapado(suave([[cx, r.topo - 3], [cx + r.lt + 4, r.topo + 6], [cx + r.lm + 3, r.topo + h * 0.42], [cx + r.lm - 8, r.topo + h * 0.24], [cx + 2, r.topo + h * 0.14], [cx - r.lm + 8, r.topo + h * 0.24], [cx - r.lm - 3, r.topo + h * 0.42], [cx - r.lt - 4, r.topo + 6]]), c, g) +
          `<rect x="98.5" y="${r.topo - 2}" width="3" height="${n1(h * 0.16)}" fill="${escuro(c, 0.3)}"/>`;
      case 'topete':
        return chapado(suave([[cx, r.topo - 4], [cx + r.lt + 4, r.topo + 6], [cx + r.lm + 3, r.topo + h * 0.36], [cx + r.lm - 8, r.topo + h * 0.22], [cx, testa - 4], [cx - r.lm + 8, r.topo + h * 0.22], [cx - r.lm - 3, r.topo + h * 0.36], [cx - r.lt - 4, r.topo + 6]]), c, g) +
          chapado(suave([[cx - 22, r.topo + 4], [cx - 18, r.topo - 22], [cx + 6, r.topo - 30], [cx + 24, r.topo - 14], [cx + 16, r.topo + 2]]), c, g);
      default:
        // Curto, com franja
        return chapado(suave([[cx, r.topo - 5], [cx + r.lt + 5, r.topo + 5], [cx + r.lm + 3, r.topo + h * 0.38], [cx + r.lm - 7, r.topo + h * 0.24], [cx + 14, testa], [cx - 4, testa - 5], [cx - 20, testa + 2], [cx - r.lm + 7, r.topo + h * 0.24], [cx - r.lm - 3, r.topo + h * 0.38], [cx - r.lt - 5, r.topo + 5]]), c, g);
    }
  }

  function costeletas(f) {
    const r = f.rosto;
    const y = r.topo + (r.base - r.topo) * 0.36;
    return `<path d="M ${100 - r.lm + 1} ${y} L ${100 - r.lm + 9} ${y} L ${100 - r.lm + 7} ${y + 24} L ${100 - r.lm + 2} ${y + 22} Z" fill="${f.cabelo}"/>` +
      `<path d="M ${100 + r.lm - 1} ${y} L ${100 + r.lm - 9} ${y} L ${100 + r.lm - 7} ${y + 24} L ${100 + r.lm - 2} ${y + 22} Z" fill="${escuro(f.cabelo)}"/>`;
  }

  function chapeu(f, g) {
    const h = f.chapeu;
    const r = f.rosto;
    const cx = 100;
    const base = r.topo + (r.base - r.topo) * 0.2;
    const cor = h.cor;
    const sombra = escuro(cor, 0.14);
    switch (h.tipo) {
      case 'palha':
        return chapado(`M ${cx - 76} ${base} a 76 14 0 1 0 152 0 a 76 14 0 1 0 -152 0 Z`, cor, g, sombra) +
          chapado(`M ${cx - 36} ${base} C ${cx - 37} ${base - 44}, ${cx + 37} ${base - 44}, ${cx + 36} ${base} Z`, cor, g, sombra) +
          chapado(`M ${cx - 36} ${base - 13} L ${cx + 36} ${base - 13} L ${cx + 36} ${base - 2} L ${cx - 36} ${base - 2} Z`, h.faixa, g);
      case 'couro':
        return chapado(`M ${cx - 70} ${base + 4} C ${cx - 64} ${base - 16}, ${cx + 64} ${base - 16}, ${cx + 70} ${base + 4} C ${cx + 40} ${base - 4}, ${cx - 40} ${base - 4}, ${cx - 70} ${base + 4} Z`, escuro(cor, 0.06), g, escuro(cor, 0.2)) +
          chapado(`M ${cx - 34} ${base - 4} C ${cx - 36} ${base - 50}, ${cx + 36} ${base - 50}, ${cx + 34} ${base - 4} Z`, cor, g, sombra) +
          `<path d="M ${cx} ${base - 38} l 4.5 9.5 l 10.5 1 l -8 7 l 2.5 10 l -9.5 -5.5 l -9.5 5.5 l 2.5 -10 l -8 -7 l 10.5 -1 Z" fill="#f1c40f"/>`;
      case 'bone':
        return chapado(`M ${cx - r.lt - 6} ${base + 10} C ${cx - r.lt - 6} ${base - 44}, ${cx + r.lt + 6} ${base - 44}, ${cx + r.lt + 6} ${base + 10} Z`, cor, g, sombra) +
          chapado(`M ${cx - r.lt + 2} ${base + 8} C ${cx - 14} ${base + 2}, ${cx + 14} ${base + 2}, ${cx + r.lt - 2} ${base + 8} C ${cx + 18} ${base + 22}, ${cx - 18} ${base + 22}, ${cx - r.lt + 2} ${base + 8} Z`, h.aba, g, escuro(h.aba, 0.12)) +
          `<circle cx="${cx}" cy="${base - 30}" r="4.5" fill="${h.aba}"/>` +
          `<path d="M ${cx - 9} ${base - 16} h 18 l -14 14 h 14" fill="none" stroke="${escuro(cor, 0.45)}" stroke-width="3.5" stroke-linejoin="round"/>`;
      case 'cowboy':
        return chapado(`M ${cx - 76} ${base - 10} C ${cx - 66} ${base + 14}, ${cx + 66} ${base + 14}, ${cx + 76} ${base - 10} C ${cx + 56} ${base}, ${cx - 56} ${base}, ${cx - 76} ${base - 10} Z`, cor, g, sombra) +
          chapado(`M ${cx - 34} ${base + 1} C ${cx - 40} ${base - 46}, ${cx - 12} ${base - 54}, ${cx} ${base - 40} C ${cx + 12} ${base - 54}, ${cx + 40} ${base - 46}, ${cx + 34} ${base + 1} Z`, cor, g, sombra) +
          chapado(`M ${cx - 35} ${base - 11} L ${cx + 35} ${base - 11} L ${cx + 34} ${base - 1} L ${cx - 34} ${base - 1} Z`, h.faixa, g);
      case 'feltro':
        return chapado(`M ${cx - 52} ${base + 1} a 52 9 0 1 0 104 0 a 52 9 0 1 0 -104 0 Z`, cor, g, sombra) +
          chapado(`M ${cx - 32} ${base} L ${cx - 28} ${base - 34} Q ${cx} ${base - 44} ${cx + 28} ${base - 34} L ${cx + 32} ${base} Z`, cor, g, sombra) +
          chapado(`M ${cx - 31} ${base - 9} L ${cx + 31} ${base - 9} L ${cx + 32} ${base} L ${cx - 32} ${base} Z`, h.faixa, g) +
          `<path d="M ${cx + 18} ${base - 8} q 14 -14 8 -30 q -6 14 -14 26 Z" fill="#d23b2e"/>`;
      case 'lenco': {
        const forma = suave([[cx, r.topo - 12], [cx + r.lt + 10, r.topo], [cx + r.lm + 6, base + 14], [cx, base + 2], [cx - r.lm - 6, base + 14], [cx - r.lt - 10, r.topo]]);
        let pontos = `<g fill="${h.cor2}" clip-path="url(#lc${g.id})">`;
        for (let y = r.topo - 6, k = 0; y < base + 14; y += 10, k++) for (let x = cx - 60 + (k % 2) * 5; x < cx + 60; x += 11) pontos += `<circle cx="${n1(x)}" cy="${n1(y)}" r="2.3"/>`;
        pontos += '</g>';
        return `<clipPath id="lc${g.id}"><path d="${forma}"/></clipPath>` +
          chapado(forma, cor, g, sombra) + pontos +
          `<path d="M ${cx + r.lm + 2} ${base + 4} l 20 -12 l 4 12 Z M ${cx + r.lm + 2} ${base + 4} l 22 6 l -8 10 Z" fill="${sombra}"/>` +
          `<circle cx="${cx + r.lm + 3}" cy="${base + 4}" r="6" fill="${escuro(cor, 0.24)}"/>`;
      }
      default:
        return '';
    }
  }

  function sobrancelhas(f, exp) {
    const r = f.rosto;
    const y = r.topo + (r.base - r.topo) * 0.38 + (exp === 'grito' ? -6 : exp === 'feliz' ? -3 : 0);
    const cor = f.bigodeCor || (['careca', 'raspado'].includes(f.cabeloTipo) ? escuro(f.cabelo, 0.15) : f.cabelo === '#e3dfdc' ? '#9a948f' : f.cabelo);
    const esp = f.extras.includes('sobrancelhao') ? 9 : f.sobrancelha === 'fina' ? 4.5 : 6.5;
    let s = '';
    for (const l of [-1, 1]) {
      let ang = l * 6;
      if (exp === 'bravo') ang = l * -18;
      if (exp === 'grito') ang = l * 10;
      const x = 100 + l * 19;
      s += `<rect x="${x - 11}" y="${n1(y - esp / 2)}" width="22" height="${esp}" rx="${esp / 2}" fill="${cor}" transform="rotate(${ang} ${x} ${n1(y)})"/>`;
    }
    return s;
  }

  function olhos(f, exp) {
    const r = f.rosto;
    const y = n1(r.topo + (r.base - r.topo) * 0.48);
    let s = '';
    for (const l of [-1, 1]) {
      const x = 100 + l * 18;
      if (exp === 'feliz') {
        s += `<path d="M ${x - 7} ${y + 2} Q ${x} ${y - 8} ${x + 7} ${y + 2}" fill="none" stroke="${ESCURO}" stroke-width="4.5" stroke-linecap="round"/>`;
      } else if (exp === 'grito') {
        s += `<ellipse cx="${x}" cy="${y}" rx="8" ry="9" fill="#fff"/><circle cx="${x}" cy="${y + 1}" r="3.6" fill="${ESCURO}"/>`;
      } else if (exp === 'bravo') {
        const a = l === 1 ? -1 : 3;
        const b = l === 1 ? 3 : -1;
        s += `<path d="M ${x - 6} ${y - 2 + a} L ${x + 6} ${y - 2 + b} L ${x + 5} ${y + 5} Q ${x} ${y + 9} ${x - 5} ${y + 5} Z" fill="${ESCURO}"/>`;
      } else {
        s += `<ellipse cx="${x}" cy="${y}" rx="5.2" ry="6.8" fill="${ESCURO}"/><circle cx="${x + 1.8}" cy="${y - 2}" r="1.9" fill="#fff"/>`;
      }
      if (f.extras.includes('cilios') && exp !== 'feliz') {
        s += `<path d="M ${x + l * 5} ${y - 5} l ${l * 5} -4" stroke="${ESCURO}" stroke-width="2.6" stroke-linecap="round"/>`;
      }
      if (f.extras.includes('rugas') && exp !== 'feliz') {
        s += `<path d="M ${x + l * 10} ${y - 2} l ${l * 5} -2 M ${x + l * 10} ${y + 3} l ${l * 5} 2" stroke="${escuro(f.pele, 0.3)}" stroke-width="1.8" stroke-linecap="round"/>`;
      }
    }
    return s;
  }

  function oculos(f) {
    const o = f.oculos;
    const r = f.rosto;
    const y = n1(r.topo + (r.base - r.topo) * 0.48);
    if (o.tipo === 'sol-cabeca') {
      const yy = r.topo + 6;
      return `<rect x="66" y="${yy - 2}" width="68" height="4" rx="2" fill="${o.cor}"/>` +
        `<rect x="68" y="${yy - 9}" width="28" height="17" rx="8" fill="#2a2a2a"/><rect x="104" y="${yy - 9}" width="28" height="17" rx="8" fill="#2a2a2a"/>` +
        `<rect x="72" y="${yy - 6}" width="9" height="3" rx="1.5" fill="#fff" opacity=".5"/><rect x="108" y="${yy - 6}" width="9" height="3" rx="1.5" fill="#fff" opacity=".5"/>`;
    }
    let s = '';
    for (const l of [-1, 1]) {
      const x = 100 + l * 18;
      s += o.tipo === 'quadrado'
        ? `<rect x="${x - 12}" y="${y - 10}" width="24" height="20" rx="4" fill="#ffffff" fill-opacity=".18" stroke="${o.cor}" stroke-width="3.5"/>`
        : `<circle cx="${x}" cy="${y}" r="12" fill="#ffffff" fill-opacity=".18" stroke="${o.cor}" stroke-width="3.5"/>`;
    }
    s += `<path d="M 94 ${y - 2} Q 100 ${y - 6} 106 ${y - 2}" fill="none" stroke="${o.cor}" stroke-width="3.5"/>`;
    return s;
  }

  function nariz(f) {
    const r = f.rosto;
    const y = n1(r.topo + (r.base - r.topo) * 0.6);
    const cor = escuro(f.pele, 0.14);
    switch (f.nariz) {
      case 'batata':
        return `<path d="M 96 ${y - 12} C 92 ${y}, 84 ${y + 6}, 89 ${y + 13} C 95 ${y + 19}, 109 ${y + 18}, 111 ${y + 11} C 113 ${y + 4}, 104 ${y}, 102 ${y - 12} Z" fill="${cor}"/>` +
          `<ellipse cx="95" cy="${y + 7}" rx="4" ry="3" fill="#fff" opacity=".25"/>`;
      case 'gancho':
        return `<path d="M 99 ${y - 14} C 104 ${y - 6}, 112 ${y + 4}, 106 ${y + 11} C 102 ${y + 15}, 94 ${y + 14}, 91 ${y + 9} C 96 ${y + 6}, 99 ${y - 2}, 99 ${y - 14} Z" fill="${cor}"/>`;
      case 'pequeno':
        return `<path d="M 100 ${y - 6} C 104 ${y + 2}, 107 ${y + 6}, 104 ${y + 8} C 101 ${y + 10}, 96 ${y + 9}, 95 ${y + 7} Z" fill="${cor}"/>`;
      default:
        return `<circle cx="100" cy="${y + 4}" r="9" fill="${cor}"/><circle cx="97" cy="${y + 1}" r="3" fill="#fff" opacity=".25"/>`;
    }
  }

  function boca(f, exp) {
    const r = f.rosto;
    const y = n1(r.topo + (r.base - r.topo) * 0.8);
    const labio = f.extras.includes('batom') ? '#c0392b' : '#7a2416';
    const ouro = f.extras.includes('dente-ouro');
    switch (exp) {
      case 'feliz':
        return `<path d="M 86 ${y - 4} Q 100 ${y - 1} 114 ${y - 4} Q 112 ${y + 12} 100 ${y + 12} Q 88 ${y + 12} 86 ${y - 4} Z" fill="#6b1d12"/>` +
          `<path d="M 88 ${y - 3} Q 100 ${y} 112 ${y - 3} L 111 ${y + 2} Q 100 ${y + 4} 89 ${y + 2} Z" fill="#fff"/>` +
          (ouro ? `<rect x="101" y="${y - 2}" width="6" height="5" fill="#f1c40f"/>` : '') +
          `<ellipse cx="100" cy="${y + 8.5}" rx="6" ry="3" fill="#e0675a"/>`;
      case 'bravo':
        return `<path d="M 88 ${y + 5} Q 100 ${y - 4} 112 ${y + 5} L 110 ${y + 9} Q 100 ${y + 2} 90 ${y + 9} Z" fill="#fff"/>` +
          `<path d="M 88 ${y + 5} Q 100 ${y - 4} 112 ${y + 5}" fill="none" stroke="${labio}" stroke-width="3" stroke-linecap="round"/>`;
      case 'grito':
        return `<ellipse cx="100" cy="${y + 4}" rx="10" ry="12" fill="#5c140b"/>` +
          `<path d="M 92 ${y - 4} Q 100 ${y - 8} 108 ${y - 4} L 107 ${y - 1} Q 100 ${y - 3} 93 ${y - 1} Z" fill="#fff"/>` +
          `<ellipse cx="100" cy="${y + 11}" rx="6" ry="3.5" fill="#e0675a"/>`;
      default:
        return `<path d="M 90 ${y} Q 100 ${y + 8} 110 ${y}" fill="none" stroke="${labio}" stroke-width="3.6" stroke-linecap="round"/>` +
          (f.extras.includes('dentuco') ? `<rect x="95" y="${y + 2}" width="10" height="7" rx="1.5" fill="#fff"/><rect x="99.5" y="${y + 2}" width="1" height="7" fill="#d9d4cc"/>` : '') +
          (ouro ? `<rect x="103" y="${y + 1}" width="5" height="4" rx="1" fill="#f1c40f"/>` : '');
    }
  }

  function barba(f, g) {
    const r = f.rosto;
    const h = r.base - r.topo;
    const c = f.barba === 'branca' ? '#efefef' : f.cabelo;
    switch (f.barba) {
      case 'cheia':
      case 'branca': {
        const longa = f.barba === 'branca' ? 22 : 6;
        const d = suave([[100 - r.lm + 1, r.topo + h * 0.5], [100 - r.lb + 2, r.topo + h * 0.8], [100 - 14, r.base + longa - 4], [100, r.base + longa], [100 + 14, r.base + longa - 4], [100 + r.lb - 2, r.topo + h * 0.8], [100 + r.lm - 1, r.topo + h * 0.5], [100 + 18, r.topo + h * 0.74], [100, r.topo + h * 0.9], [100 - 18, r.topo + h * 0.74]]);
        return chapado(d, c, g);
      }
      case 'cavanhaque':
        return chapado(suave([[100 - 10, r.base - 12], [100 + 10, r.base - 12], [100 + 6, r.base + 8], [100, r.base + 12], [100 - 6, r.base + 8]]), c, g);
      default:
        return '';
    }
  }

  function bigode(f, g) {
    const r = f.rosto;
    const y = n1(r.topo + (r.base - r.topo) * 0.72);
    const c = f.bigodeCor || (f.barba === 'branca' ? '#efefef' : f.cabelo);
    switch (f.bigode) {
      case 'grosso':
        return chapado(`M 100 ${y} C 90 ${y - 7}, 74 ${y - 4}, 68 ${y + 9} C 80 ${y + 4}, 90 ${y + 7}, 100 ${y + 5} C 110 ${y + 7}, 120 ${y + 4}, 132 ${y + 9} C 126 ${y - 4}, 110 ${y - 7}, 100 ${y} Z`, c, g);
      case 'guidao':
        return chapado(`M 100 ${y} C 88 ${y - 8}, 72 ${y - 2}, 64 ${y - 10} C 58 ${y}, 68 ${y + 10}, 80 ${y + 6} C 88 ${y + 4}, 94 ${y + 6}, 100 ${y + 4} C 106 ${y + 6}, 112 ${y + 4}, 120 ${y + 6} C 132 ${y + 10}, 142 ${y}, 136 ${y - 10} C 128 ${y - 2}, 112 ${y - 8}, 100 ${y} Z`, c, g);
      case 'fino':
        return `<path d="M 84 ${y + 4} Q 92 ${y - 3} 100 ${y + 1} Q 108 ${y - 3} 116 ${y + 4}" fill="none" stroke="${c}" stroke-width="3.5" stroke-linecap="round"/>`;
      default:
        return '';
    }
  }

  function detalhesRosto(f, exp) {
    const r = f.rosto;
    const h = r.base - r.topo;
    let s = '';
    const yb = n1(r.topo + h * 0.66);
    const forte = exp === 'feliz' ? 0.6 : 0.4;
    s += `<circle cx="${n1(100 - r.lm * 0.62)}" cy="${yb}" r="8" fill="#ef7f62" opacity="${forte}"/><circle cx="${n1(100 + r.lm * 0.62)}" cy="${yb}" r="8" fill="#ef7f62" opacity="${forte - 0.08}"/>`;
    if (f.extras.includes('sardas')) {
      for (const [dx, dy] of [[-26, -4], [-21, 0], [-30, 1], [26, -4], [21, 0], [30, 1]]) s += `<circle cx="${100 + dx}" cy="${yb + dy}" r="1.7" fill="${escuro(f.pele, 0.32)}"/>`;
    }
    if (f.extras.includes('pinta')) s += `<circle cx="120" cy="${n1(r.topo + h * 0.82)}" r="2.2" fill="${ESCURO}"/>`;
    if (f.extras.includes('barba-rala')) {
      s += `<path d="${suave([[100 - r.lb + 4, r.topo + h * 0.72], [100, r.base - 2], [100 + r.lb - 4, r.topo + h * 0.72], [100, r.topo + h * 0.9]])}" fill="${escuro(f.pele, 0.2)}" opacity=".45"/>`;
    }
    if (f.extras.includes('papada')) {
      s += `<path d="M ${n1(100 - r.lb * 0.55)} ${r.base - 4} Q 100 ${r.base + 6} ${n1(100 + r.lb * 0.55)} ${r.base - 4}" fill="none" stroke="${escuro(f.pele, 0.22)}" stroke-width="3" stroke-linecap="round"/>`;
    }
    return s;
  }

  function enfeites(f, exp) {
    const r = f.rosto;
    const h = r.base - r.topo;
    let s = '';
    if (f.extras.includes('palito') && exp !== 'grito') {
      const y = n1(r.topo + h * 0.8);
      s += `<rect x="106" y="${y + 1}" width="28" height="3.4" rx="1.7" fill="#f2d49b" transform="rotate(-14 106 ${y + 2})"/>`;
    }
    if (f.extras.includes('flor')) {
      const fx = 100 + r.lm - 4;
      const fy = r.topo + 10;
      for (let k = 0; k < 5; k++) {
        const a = (k / 5) * Math.PI * 2;
        s += `<circle cx="${n1(fx + Math.cos(a) * 8)}" cy="${n1(fy + Math.sin(a) * 8)}" r="6.5" fill="#fff35c"/>`;
      }
      s += `<circle cx="${fx}" cy="${fy}" r="5" fill="#e67e22"/>`;
    }
    if (f.extras.includes('laco')) {
      s += `<path d="M 100 ${r.topo - 2} l -18 -10 l 0 20 Z" fill="#e84a6f"/><path d="M 100 ${r.topo - 2} l 18 -10 l 0 20 Z" fill="#c93a5b"/><circle cx="100" cy="${r.topo - 2}" r="5" fill="#a82d4a"/>`;
    }
    if (f.extras.includes('corrente')) {
      s += `<path d="M 78 158 Q 100 192 122 158" fill="none" stroke="#f1c40f" stroke-width="4" stroke-dasharray="5 3"/>`;
      s += `<circle cx="100" cy="180" r="6" fill="#f1c40f"/><circle cx="102" cy="178" r="2" fill="#fff" opacity=".6"/>`;
    }
    return s;
  }

  /**
   * Gera o SVG de um personagem
   * @param {string} id id do personagem (TrucoElenco)
   * @param {string} [exp] neutro | feliz | bravo | grito
   */
  function svg(id, exp) {
    const f = FICHAS[id] || FICHAS.ze;
    f.extras = f.extras || [];
    exp = exp || 'neutro';
    const g = { id: (++seq).toString(36) };
    const r = f.rosto;
    const rosto = caminhoRosto(r);
    let s = `<svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg" class="personagem exp-${exp}" aria-hidden="true">`;
    s += `<defs><clipPath id="ld${g.id}"><path d="M 106 -10 L 210 -10 L 210 210 L 94 210 Z"/></clipPath>` +
      `<clipPath id="tr${g.id}"><path d="M 26 204 C 28 172, 58 154, 100 154 C 142 154, 172 172, 174 204 Z"/></clipPath>` +
      `<clipPath id="rs${g.id}"><path d="${rosto}"/></clipPath></defs>`;
    s += `<rect width="200" height="200" fill="${f.fundo}"/>`;
    s += `<circle cx="100" cy="100" r="80" fill="${claro(f.fundo, 0.12)}"/>`;
    s += cabeloAtras(f, g);
    s += corpo(f, g);
    if (f.extras.includes('lenco-pescoco')) s += lencoPescoco(f.corLenco || '#d23b2e');
    s += `<rect x="86" y="${r.base - 22}" width="28" height="${170 - r.base + 22}" rx="9" fill="${escuro(f.pele, 0.18)}"/>`;
    s += orelhas(f);
    s += chapado(rosto, f.pele, g);
    // Sombra do chapéu ou do cabelo na testa
    if (f.chapeu || ['curto', 'topete', 'coque', 'trancas', 'cacheado', 'volume', 'crespo'].includes(f.cabeloTipo)) {
      const yb = n1(r.topo + (r.base - r.topo) * (f.chapeu ? 0.26 : 0.24));
      s += `<rect x="40" y="${yb - 8}" width="120" height="${f.chapeu ? 14 : 10}" fill="${escuro(f.pele, 0.22)}" opacity=".55" clip-path="url(#rs${g.id})"/>`;
    }
    if (f.extras.includes('costeleta')) s += costeletas(f);
    s += detalhesRosto(f, exp);
    s += barba(f, g);
    s += boca(f, exp);
    s += bigode(f, g);
    s += nariz(f);
    s += olhos(f, exp);
    s += sobrancelhas(f, exp);
    s += cabeloFrente(f, g);
    if (f.oculos) s += oculos(f);
    if (f.chapeu) s += chapeu(f, g);
    s += enfeites(f, exp);
    s += '</svg>';
    return s;
  }

  // ---------- Fotos dos jogadores ----------
  const fotos = new Map();
  function definirFoto(chave, dataUrl) {
    if (dataUrl && TrucoElenco.fotoValida(dataUrl)) fotos.set(String(chave), dataUrl);
    else fotos.delete(String(chave));
  }

  /**
   * HTML de um avatar: personagem ("p:<id>") ou foto ("foto", buscada pela chave)
   */
  function html(avatar, opcoes) {
    opcoes = opcoes || {};
    if (avatar === 'foto') {
      const url = fotos.get(String(opcoes.chaveFoto));
      if (url) return `<img class="foto-jogador" src="${url}" alt="">`;
      avatar = 'p:ze';
    }
    const id = typeof avatar === 'string' && avatar.startsWith('p:') ? avatar.slice(2) : 'ze';
    return svg(FICHAS[id] ? id : 'ze', opcoes.expressao);
  }

  // Reduz e recorta uma imagem enviada pelo jogador para um JPEG quadrado pequeno
  function prepararFoto(arquivo) {
    return new Promise((resolve, reject) => {
      if (!arquivo || !/^image\//.test(arquivo.type)) return reject(new Error('Escolha um arquivo de imagem'));
      const leitor = new FileReader();
      leitor.onerror = () => reject(new Error('Não foi possível ler a imagem'));
      leitor.onload = () => {
        const img = new Image();
        img.onerror = () => reject(new Error('Imagem inválida'));
        img.onload = () => {
          const lado = Math.min(img.width, img.height);
          const c = document.createElement('canvas');
          for (const [tam, qual] of [[160, 0.8], [128, 0.7], [96, 0.6]]) {
            c.width = c.height = tam;
            const ctx = c.getContext('2d');
            ctx.drawImage(img, (img.width - lado) / 2, (img.height - lado) / 2, lado, lado, 0, 0, tam, tam);
            const url = c.toDataURL('image/jpeg', qual);
            if (TrucoElenco.fotoValida(url)) return resolve(url);
          }
          reject(new Error('A imagem ficou grande demais'));
        };
        img.src = leitor.result;
      };
      leitor.readAsDataURL(arquivo);
    });
  }

  return { svg, html, definirFoto, prepararFoto, FICHAS };
})();
