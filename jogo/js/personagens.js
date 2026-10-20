/**
 * Personagens caricatos desenhados em SVG por código.
 * Cada personagem é montado por partes (rosto, cabelo, chapéu, roupa, acessórios)
 * com o mesmo traço, contorno e sombreamento, e tem expressões:
 * neutro, feliz, bravo e grito.
 */
window.Personagens = (function () {
  'use strict';

  const TRACO = '#2a1606';
  const PELES = {
    clara: '#f6d2b1',
    rosada: '#f2c09f',
    morena: '#d9a073',
    parda: '#b97a4f',
    escura: '#8a5234',
    retinta: '#5e3622'
  };

  // Ficha de cada personagem do elenco (TrucoElenco)
  const FICHAS = {
    ze: {
      fundo: '#e8a83a', pele: PELES.morena, cabelo: '#3a2414', cabeca: { rx: 48, ry: 56, queixo: 0.7 },
      olhos: '#4a2a12', nariz: 'batata', cabeloTipo: 'curto', chapeu: { tipo: 'palha', cor: '#e9c46a', faixa: '#b3261e' },
      bigode: 'grosso', barba: 'rala', roupa: { tipo: 'xadrez', cor: '#c0392b', cor2: '#7d1e14' }, extras: ['palito'], bochecha: true
    },
    cida: {
      fundo: '#b58bd1', pele: PELES.clara, cabelo: '#d9d4cf', cabeca: { rx: 50, ry: 54, queixo: 0.8 },
      olhos: '#3b5a7a', nariz: 'redondo', cabeloTipo: 'coque', oculos: { tipo: 'redondo', cor: '#7a4b9c' },
      roupa: { tipo: 'xale', cor: '#f4e7d3', cor2: '#8e5bb5' }, extras: ['brinco', 'rugas', 'batom'], bochecha: true, sobrancelha: 'fina'
    },
    tiao: {
      fundo: '#8fb3c9', pele: PELES.parda, cabelo: '#1f140c', cabeca: { rx: 47, ry: 58, queixo: 0.85 },
      olhos: '#2b1a0e', nariz: 'aquilino', cabeloTipo: 'curto', chapeu: { tipo: 'couro', cor: '#7a4a26' },
      barba: 'cheia', roupa: { tipo: 'camisa', cor: '#d8cfb8' }, extras: ['lenco-pescoco'], corLenco: '#c0392b'
    },
    mane: {
      fundo: '#5fc78a', pele: PELES.escura, cabelo: '#140c08', cabeca: { rx: 46, ry: 57, queixo: 0.55 },
      olhos: '#2b1a0e', nariz: 'redondo', cabeloTipo: 'raspado', chapeu: { tipo: 'bone', cor: '#f1c40f', aba: '#c99a00' },
      barba: 'cavanhaque', roupa: { tipo: 'regata', cor: '#ffffff' }, extras: ['dente-ouro', 'corrente']
    },
    rosinha: {
      fundo: '#f39bb6', pele: PELES.rosada, cabelo: '#6b3a1e', cabeca: { rx: 46, ry: 54, queixo: 0.5 },
      olhos: '#3f7a3a', nariz: 'fino', cabeloTipo: 'cacheado', roupa: { tipo: 'vestido', cor: '#e84a6f', cor2: '#ffd1dc' },
      extras: ['flor', 'argola', 'batom', 'cilios'], bochecha: true, sobrancelha: 'fina'
    },
    tonhao: {
      fundo: '#e07a4f', pele: PELES.rosada, cabelo: '#4a2e1a', cabeca: { rx: 56, ry: 54, queixo: 1.0 },
      olhos: '#3b2414', nariz: 'batata', cabeloTipo: 'careca', bigode: 'guidao',
      roupa: { tipo: 'camiseta', cor: '#2e8b57' }, extras: ['sobrancelhao'], bochecha: true
    },
    quim: {
      fundo: '#c9b27a', pele: PELES.clara, cabelo: '#efefef', cabeca: { rx: 44, ry: 58, queixo: 0.6 },
      olhos: '#4a6b8a', nariz: 'aquilino', cabeloTipo: 'careca', chapeu: { tipo: 'feltro', cor: '#5b4a3a', faixa: '#2a1e14' },
      barba: 'branca', bigode: 'grosso', roupa: { tipo: 'terno', cor: '#4a3b2e', cor2: '#e8e0cc' }, extras: ['rugas']
    },
    zefa: {
      fundo: '#f2c14e', pele: PELES.parda, cabelo: '#2a1a10', cabeca: { rx: 54, ry: 54, queixo: 0.9 },
      olhos: '#2b1a0e', nariz: 'redondo', cabeloTipo: 'curto', chapeu: { tipo: 'lenco', cor: '#d64545', cor2: '#ffffff' },
      roupa: { tipo: 'avental', cor: '#3f6fb5', cor2: '#ffffff' }, extras: ['argola', 'batom'], bochecha: true, sobrancelha: 'fina'
    },
    bene: {
      fundo: '#7fa7d9', pele: PELES.clara, cabelo: '#8a8a8a', cabeca: { rx: 50, ry: 58, queixo: 0.65 },
      olhos: '#3b2414', nariz: 'fino', cabeloTipo: 'careca', oculos: { tipo: 'quadrado', cor: '#1c1c1c' },
      bigode: 'fino', roupa: { tipo: 'terno', cor: '#2c3e50', cor2: '#ffffff', gravata: 'borboleta' }, extras: ['rugas']
    },
    lurdinha: {
      fundo: '#7ed6c4', pele: PELES.morena, cabelo: '#2e1a0e', cabeca: { rx: 45, ry: 53, queixo: 0.55 },
      olhos: '#4a2a12', nariz: 'fino', cabeloTipo: 'trancas', roupa: { tipo: 'xadrez', cor: '#3a7bd5', cor2: '#1d4f91' },
      extras: ['sardas', 'cilios', 'laco'], bochecha: true, sobrancelha: 'fina'
    },
    gerson: {
      fundo: '#d98c5f', pele: PELES.morena, cabelo: '#4a2e1a', cabeca: { rx: 49, ry: 58, queixo: 0.95 },
      olhos: '#2b1a0e', nariz: 'aquilino', cabeloTipo: 'curto', chapeu: { tipo: 'cowboy', cor: '#efe0c2', faixa: '#5b3a1e' },
      bigode: 'grosso', roupa: { tipo: 'jeans', cor: '#4a78b0' }, extras: ['costeleta']
    },
    neide: {
      fundo: '#ffb347', pele: PELES.clara, cabelo: '#c0392b', cabeca: { rx: 49, ry: 54, queixo: 0.7 },
      olhos: '#3f7a3a', nariz: 'redondo', cabeloTipo: 'volume', oculos: { tipo: 'sol-cabeca', cor: '#d63384' },
      roupa: { tipo: 'vestido', cor: '#8e44ad', cor2: '#f1c40f' }, extras: ['argola', 'batom', 'cilios', 'pinta'], bochecha: true, sobrancelha: 'fina'
    },
    bastiao: {
      fundo: '#9ccf6b', pele: PELES.retinta, cabelo: '#eaeaea', cabeca: { rx: 50, ry: 57, queixo: 0.8 },
      olhos: '#2b1a0e', nariz: 'batata', cabeloTipo: 'grisalho', bigode: 'grosso', bigodeCor: '#eaeaea',
      roupa: { tipo: 'camisa', cor: '#f4d03f' }, extras: ['rugas', 'lenco-pescoco'], corLenco: '#2e86c1'
    },
    juca: {
      fundo: '#a3d977', pele: PELES.clara, cabelo: '#c98a3a', cabeca: { rx: 47, ry: 55, queixo: 0.6 },
      olhos: '#3b5a7a', nariz: 'redondo', cabeloTipo: 'topete', chapeu: { tipo: 'palha-furada', cor: '#e9c46a', faixa: '#7a4a26' },
      roupa: { tipo: 'xadrez', cor: '#e67e22', cor2: '#a04000' }, extras: ['sardas', 'dentuco'], bochecha: true
    }
  };

  // ---------- Cores ----------
  function misturar(hex, alvo, f) {
    const a = parseInt(hex.slice(1), 16);
    const b = parseInt(alvo.slice(1), 16);
    const ch = (n, s) => (n >> s) & 255;
    const m = (s) => Math.round(ch(a, s) + (ch(b, s) - ch(a, s)) * f);
    return '#' + ((1 << 24) + (m(16) << 16) + (m(8) << 8) + m(0)).toString(16).slice(1);
  }
  const escuro = (c, f) => misturar(c, '#000000', f == null ? 0.22 : f);
  const claro = (c, f) => misturar(c, '#ffffff', f == null ? 0.3 : f);

  let seq = 0;
  const contorno = (w) => `stroke="${TRACO}" stroke-width="${w || 3}" stroke-linejoin="round" stroke-linecap="round"`;

  // ---------- Partes ----------
  function caminhoCabeca(cx, cy, rx, ry, queixo) {
    const jw = rx * queixo;
    return `M ${cx - rx} ${cy} A ${rx} ${ry} 0 0 1 ${cx + rx} ${cy} ` +
      `C ${cx + rx} ${cy + ry * 0.62}, ${cx + jw} ${cy + ry}, ${cx} ${cy + ry} ` +
      `C ${cx - jw} ${cy + ry}, ${cx - rx} ${cy + ry * 0.62}, ${cx - rx} ${cy} Z`;
  }

  function corpo(f, g) {
    const r = f.roupa;
    const pele = f.pele;
    const torso = 'M 8 204 C 12 170, 52 156, 100 156 C 148 156, 188 170, 192 204 Z';
    let s = '';
    // Pescoço
    s += `<path d="M ${g.cx - 17} ${g.cy + g.ry - 22} L ${g.cx - 19} 168 Q ${g.cx} 178 ${g.cx + 19} 168 L ${g.cx + 17} ${g.cy + g.ry - 22} Z" fill="${escuro(pele, 0.18)}" ${contorno(2.5)}/>`;
    if (r.tipo === 'regata') {
      s += `<path d="${torso}" fill="${pele}" ${contorno()}/>`;
      s += `<path d="M 52 204 C 54 182, 62 166, 70 160 Q 100 182 130 160 C 138 166, 146 182, 148 204 Z" fill="${r.cor}" ${contorno()}/>`;
      return s;
    }
    let fill = r.cor;
    if (r.tipo === 'xadrez') {
      const id = 'xz' + g.id;
      s += `<defs><pattern id="${id}" width="16" height="16" patternUnits="userSpaceOnUse">` +
        `<rect width="16" height="16" fill="${r.cor}"/><rect width="8" height="16" fill="${r.cor2}" opacity=".55"/>` +
        `<rect width="16" height="8" fill="${r.cor2}" opacity=".55"/><path d="M0 4h16M4 0v16" stroke="#fff" stroke-width="1" opacity=".35"/></pattern></defs>`;
      fill = `url(#${id})`;
    }
    if (r.tipo === 'vestido') {
      const id = 'vb' + g.id;
      s += `<defs><pattern id="${id}" width="18" height="18" patternUnits="userSpaceOnUse"><rect width="18" height="18" fill="${r.cor}"/>` +
        `<circle cx="5" cy="5" r="2.4" fill="${r.cor2}"/><circle cx="14" cy="13" r="2.4" fill="${r.cor2}"/></pattern></defs>`;
      fill = `url(#${id})`;
    }
    s += `<path d="${torso}" fill="${fill}" ${contorno()}/>`;
    // Sombra lateral da roupa
    s += `<path d="M 150 160 C 172 166, 188 180, 192 204 L 150 204 Z" fill="#000" opacity=".12"/>`;
    if (r.tipo === 'vestido') {
      s += `<path d="M 70 160 Q 100 190 130 160" fill="${pele}" ${contorno(2.5)}/>`;
    } else if (r.tipo === 'camiseta') {
      s += `<path d="M 74 160 Q 100 178 126 160" fill="none" ${contorno(3)}/>`;
      s += `<path d="M 40 204 Q 46 186 44 176 M 160 204 Q 154 186 156 176" fill="none" stroke="${TRACO}" stroke-width="2" opacity=".5"/>`;
    } else if (r.tipo === 'terno') {
      s += `<path d="M 78 158 L 100 204 L 122 158 Z" fill="${r.cor2}" ${contorno(2.5)}/>`;
      s += `<path d="M 78 158 L 96 196 L 70 204 L 60 168 Z M 122 158 L 104 196 L 130 204 L 140 168 Z" fill="${escuro(r.cor, 0.15)}" ${contorno(2.5)}/>`;
      if (r.gravata === 'borboleta') {
        s += `<path d="M 100 168 L 86 160 L 86 176 Z M 100 168 L 114 160 L 114 176 Z" fill="#c0392b" ${contorno(2.5)}/><circle cx="100" cy="168" r="3.5" fill="#962d22" ${contorno(2)}/>`;
      } else {
        s += `<path d="M 100 164 L 94 172 L 100 200 L 106 172 Z" fill="#7d1e14" ${contorno(2)}/>`;
      }
    } else if (r.tipo === 'avental') {
      s += `<path d="M 66 160 L 82 158 Q 100 172 118 158 L 134 160 L 140 204 L 60 204 Z" fill="none"/>`;
      s += `<path d="M 72 176 Q 100 184 128 176 L 136 204 L 64 204 Z" fill="${r.cor2}" ${contorno(2.5)}/>`;
      s += `<path d="M 80 176 L 74 160 M 120 176 L 126 160" stroke="${r.cor2}" stroke-width="5"/>`;
      s += `<path d="M 86 190 h 28" stroke="${TRACO}" stroke-width="2" opacity=".5"/>`;
    } else if (r.tipo === 'xale') {
      s += `<path d="M 74 160 Q 100 176 126 160" fill="${r.cor}" ${contorno(2.5)}/>`;
      s += `<path d="M 14 196 C 30 168, 70 166, 100 196 C 130 166, 170 168, 186 196 L 192 204 L 8 204 Z" fill="${r.cor2}" ${contorno()}/>`;
      s += `<path d="M 100 196 l -5 8 M 100 196 l 5 8 M 100 196 l 0 8" stroke="${escuro(r.cor2)}" stroke-width="2"/>`;
      s += `<circle cx="100" cy="190" r="5" fill="#f1c40f" ${contorno(2)}/>`;
    } else if (r.tipo === 'jeans') {
      s += `<path d="M 78 158 L 92 176 L 100 166 L 108 176 L 122 158" fill="${claro(r.cor, 0.15)}" ${contorno(2.5)}/>`;
      s += `<path d="M 100 168 V 204" stroke="${TRACO}" stroke-width="2"/><circle cx="100" cy="184" r="2" fill="${TRACO}"/><circle cx="100" cy="196" r="2" fill="${TRACO}"/>`;
      s += `<path d="M 54 182 h 22 v 14 h -22 Z M 124 182 h 22 v 14 h -22 Z" fill="none" stroke="#f1d27a" stroke-width="1.5" stroke-dasharray="3 2"/>`;
    } else {
      // Camisa de botão com gola
      s += `<path d="M 80 158 L 92 178 L 100 166 L 108 178 L 120 158" fill="${claro(fill.startsWith('url') ? r.cor : fill, 0.2)}" ${contorno(2.5)}/>`;
      s += `<path d="M 100 168 V 204" stroke="${TRACO}" stroke-width="2" opacity=".7"/>`;
      s += `<circle cx="100" cy="184" r="2" fill="${TRACO}"/><circle cx="100" cy="196" r="2" fill="${TRACO}"/>`;
    }
    return s;
  }

  function lencoPescoco(cor) {
    return `<path d="M 74 158 Q 100 172 126 158 L 112 182 Q 100 190 88 182 Z" fill="${cor}" ${contorno(2.5)}/>` +
      `<circle cx="84" cy="166" r="1.6" fill="#fff"/><circle cx="104" cy="176" r="1.6" fill="#fff"/><circle cx="116" cy="164" r="1.6" fill="#fff"/>`;
  }

  function orelhas(f, g) {
    const y = g.cy + 6;
    const pele = f.pele;
    let s = '';
    for (const lado of [-1, 1]) {
      const x = g.cx + lado * (g.rx - 1);
      s += `<ellipse cx="${x}" cy="${y}" rx="10" ry="14" fill="${pele}" ${contorno()}/>`;
      s += `<path d="M ${x + lado * -1} ${y - 7} q ${lado * 6} 6 0 13" fill="none" stroke="${escuro(pele, 0.35)}" stroke-width="2.5"/>`;
    }
    return s;
  }

  function brincos(f, g) {
    const tipo = f.extras.includes('argola') ? 'argola' : 'perola';
    let s = '';
    for (const lado of [-1, 1]) {
      const x = g.cx + lado * (g.rx + 1);
      const y = g.cy + 22;
      s += tipo === 'argola'
        ? `<circle cx="${x}" cy="${y + 6}" r="7" fill="none" stroke="#e8b923" stroke-width="3"/>`
        : `<circle cx="${x}" cy="${y}" r="3.6" fill="#fffdf2" ${contorno(1.5)}/>`;
    }
    return s;
  }

  function cabeloAtras(f, g) {
    const c = f.cabelo;
    const { cx, cy, rx, ry } = g;
    switch (f.cabeloTipo) {
      case 'coque':
        return `<circle cx="${cx}" cy="${cy - ry - 4}" r="20" fill="${c}" ${contorno()}/>` +
          `<path d="M ${cx - 12} ${cy - ry - 10} q 12 -8 24 0" fill="none" stroke="${escuro(c, 0.2)}" stroke-width="2.5"/>`;
      case 'cacheado': {
        let s = '';
        const pts = [[-1.05, -0.2], [-1.12, 0.25], [-1.0, 0.65], [1.05, -0.2], [1.12, 0.25], [1.0, 0.65], [-0.75, -0.85], [0.75, -0.85], [0, -1.08], [-0.4, -1.02], [0.4, -1.02]];
        for (const [px, py] of pts) s += `<circle cx="${cx + px * rx}" cy="${cy + py * ry}" r="17" fill="${c}" ${contorno()}/>`;
        return s;
      }
      case 'volume':
        return `<path d="M ${cx - rx - 22} ${cy + 30} C ${cx - rx - 40} ${cy - ry - 10}, ${cx + rx + 40} ${cy - ry - 10}, ${cx + rx + 22} ${cy + 30} C ${cx + rx + 10} ${cy + 46}, ${cx - rx - 10} ${cy + 46}, ${cx - rx - 22} ${cy + 30} Z" fill="${c}" ${contorno()}/>`;
      case 'trancas':
        return [-1, 1].map(l => {
          const x = cx + l * (rx + 4);
          let s = `<path d="M ${x} ${cy - 6} q ${l * 6} 30 ${l * 2} 62" fill="none" stroke="${TRACO}" stroke-width="17" stroke-linecap="round"/>` +
            `<path d="M ${x} ${cy - 6} q ${l * 6} 30 ${l * 2} 62" fill="none" stroke="${c}" stroke-width="12" stroke-linecap="round"/>`;
          for (let k = 0; k < 4; k++) s += `<path d="M ${x - 5 + l * 2} ${cy + 6 + k * 13} q 5 4 10 0" fill="none" stroke="${escuro(c, 0.3)}" stroke-width="2"/>`;
          s += `<path d="M ${x + l * 2 - 7} ${cy + 58} l 7 -5 l 7 5 l -7 5 Z" fill="#e84a6f" ${contorno(2)}/>`;
          return s;
        }).join('');
      default:
        return '';
    }
  }

  function cabeloFrente(f, g) {
    const c = f.cabelo;
    const { cx, cy, rx, ry } = g;
    const topo = cy - ry * 1.36 - 8;
    const sombra = escuro(c, 0.25);
    switch (f.cabeloTipo) {
      case 'careca':
        // Tufos nas laterais e brilho na careca
        return `<path d="M ${cx - rx - 2} ${cy + 4} C ${cx - rx - 8} ${cy - 22}, ${cx - rx + 8} ${cy - 34}, ${cx - rx + 16} ${cy - 30} C ${cx - rx + 8} ${cy - 18}, ${cx - rx + 6} ${cy - 6}, ${cx - rx + 4} ${cy + 4} Z" fill="${c}" ${contorno(2.5)}/>` +
          `<path d="M ${cx + rx + 2} ${cy + 4} C ${cx + rx + 8} ${cy - 22}, ${cx + rx - 8} ${cy - 34}, ${cx + rx - 16} ${cy - 30} C ${cx + rx - 8} ${cy - 18}, ${cx + rx - 6} ${cy - 6}, ${cx + rx - 4} ${cy + 4} Z" fill="${c}" ${contorno(2.5)}/>` +
          `<ellipse cx="${cx - 16}" cy="${cy - ry + 14}" rx="12" ry="6" fill="#fff" opacity=".35" transform="rotate(-20 ${cx - 16} ${cy - ry + 14})"/>`;
      case 'raspado':
        return `<path d="M ${cx - rx + 2} ${cy - 10} C ${cx - rx} ${cy - ry - 4}, ${cx + rx} ${cy - ry - 4}, ${cx + rx - 2} ${cy - 10} C ${cx + rx - 14} ${cy - ry * 0.6}, ${cx - rx + 14} ${cy - ry * 0.6}, ${cx - rx + 2} ${cy - 10} Z" fill="${c}" opacity=".85"/>`;
      case 'grisalho': {
        let t = `<path d="M ${cx - rx - 3} ${cy + 2} C ${cx - rx - 6} ${topo + 14}, ${cx + rx + 6} ${topo + 14}, ${cx + rx + 3} ${cy + 2} ` +
          `C ${cx + rx - 6} ${cy - 22}, ${cx + rx * 0.5} ${cy - ry * 0.66}, ${cx} ${cy - ry * 0.64} C ${cx - rx * 0.5} ${cy - ry * 0.66}, ${cx - rx + 6} ${cy - 22}, ${cx - rx - 3} ${cy + 2} Z" fill="${c}" ${contorno()}/>`;
        for (let k = 0; k < 18; k++) {
          const a = Math.PI * (1.08 + 0.84 * (k / 17));
          const r = 0.86 + (k % 3) * 0.06;
          t += `<circle cx="${(cx + Math.cos(a) * rx * r).toFixed(1)}" cy="${(cy - 6 + Math.sin(a) * ry * r * 0.92).toFixed(1)}" r="3.2" fill="none" stroke="#b9b9b9" stroke-width="1.6"/>`;
        }
        return t;
      }
      case 'topete':
        return `<path d="M ${cx - rx - 3} ${cy + 2} C ${cx - rx - 8} ${topo + 6}, ${cx + rx + 8} ${topo + 6}, ${cx + rx + 3} ${cy + 2} C ${cx + rx - 4} ${cy - 18}, ${cx + rx * 0.4} ${cy - ry * 0.56}, ${cx} ${cy - ry * 0.52} C ${cx - rx * 0.4} ${cy - ry * 0.56}, ${cx - rx + 4} ${cy - 18}, ${cx - rx - 3} ${cy + 2} Z" fill="${c}" ${contorno()}/>` +
          `<path d="M ${cx - 24} ${cy - ry + 6} C ${cx - 30} ${cy - ry - 30}, ${cx + 26} ${cy - ry - 34}, ${cx + 22} ${cy - ry + 2} C ${cx + 6} ${cy - ry - 8}, ${cx - 10} ${cy - ry - 4}, ${cx - 24} ${cy - ry + 6} Z" fill="${c}" ${contorno()}/>` +
          `<path d="M ${cx - 10} ${cy - ry - 8} q 12 -14 26 -4" fill="none" stroke="${sombra}" stroke-width="2.5"/>`;
      case 'coque':
        return `<path d="M ${cx - rx - 2} ${cy + 4} C ${cx - rx - 6} ${topo + 14}, ${cx + rx + 6} ${topo + 14}, ${cx + rx + 2} ${cy + 4} ` +
          `C ${cx + rx - 8} ${cy - 26}, ${cx + 10} ${cy - ry * 0.7}, ${cx} ${cy - ry * 0.68} C ${cx - 10} ${cy - ry * 0.7}, ${cx - rx + 8} ${cy - 26}, ${cx - rx - 2} ${cy + 4} Z" fill="${c}" ${contorno()}/>` +
          `<path d="M ${cx} ${cy - ry * 0.68} q -18 -8 -34 6 M ${cx} ${cy - ry * 0.68} q 18 -8 34 6" fill="none" stroke="${escuro(c, 0.2)}" stroke-width="2"/>`;
      case 'cacheado':
      case 'volume':
        return `<path d="M ${cx - rx - 4} ${cy - 2} C ${cx - rx - 4} ${topo + 18}, ${cx + rx + 4} ${topo + 18}, ${cx + rx + 4} ${cy - 2} ` +
          `C ${cx + rx - 6} ${cy - 30}, ${cx + 22} ${cy - ry * 0.55}, ${cx + 6} ${cy - ry * 0.62} C ${cx - 8} ${cy - ry * 0.4}, ${cx - rx + 6} ${cy - 26}, ${cx - rx - 4} ${cy - 2} Z" fill="${c}" ${contorno()}/>` +
          `<path d="M ${cx - 26} ${cy - ry + 4} q 8 -10 16 0 q 8 -10 16 0 q 8 -10 16 0" fill="none" stroke="${sombra}" stroke-width="2.5"/>`;
      case 'trancas':
        return `<path d="M ${cx - rx - 3} ${cy + 2} C ${cx - rx - 6} ${topo + 12}, ${cx + rx + 6} ${topo + 12}, ${cx + rx + 3} ${cy + 2} C ${cx + rx - 6} ${cy - 24}, ${cx + 4} ${cy - ry * 0.66}, ${cx} ${cy - ry * 0.7} C ${cx - 4} ${cy - ry * 0.66}, ${cx - rx + 6} ${cy - 24}, ${cx - rx - 3} ${cy + 2} Z" fill="${c}" ${contorno()}/>` +
          `<path d="M ${cx} ${cy - ry * 0.7} L ${cx} ${cy - ry - 4}" stroke="${sombra}" stroke-width="2.5"/>`;
      default:
        // Curto com franja
        return `<path d="M ${cx - rx - 3} ${cy + 2} C ${cx - rx - 8} ${topo}, ${cx + rx + 8} ${topo}, ${cx + rx + 3} ${cy + 2} ` +
          `C ${cx + rx - 4} ${cy - 16}, ${cx + rx * 0.45} ${cy - ry * 0.52}, ${cx + rx * 0.15} ${cy - ry * 0.46} ` +
          `L ${cx + 2} ${cy - ry * 0.58} L ${cx - rx * 0.22} ${cy - ry * 0.44} ` +
          `C ${cx - rx * 0.5} ${cy - ry * 0.52}, ${cx - rx + 4} ${cy - 16}, ${cx - rx - 3} ${cy + 2} Z" fill="${c}" ${contorno()}/>` +
          `<path d="M ${cx - 18} ${cy - ry + 6} q 10 -6 22 -2" fill="none" stroke="${sombra}" stroke-width="2.5"/>`;
    }
  }

  function costeletas(f, g) {
    return [-1, 1].map(l => `<path d="M ${g.cx + l * (g.rx - 2)} ${g.cy - 6} L ${g.cx + l * (g.rx - 9)} ${g.cy + 18} L ${g.cx + l * (g.rx - 1)} ${g.cy + 16} Z" fill="${f.cabelo}" ${contorno(2)}/>`).join('');
  }

  function chapeu(f, g) {
    const h = f.chapeu;
    const { cx, cy, rx, ry } = g;
    const base = cy - ry * 0.55;
    const cor = h.cor;
    switch (h.tipo) {
      case 'palha':
      case 'palha-furada': {
        let s = `<ellipse cx="${cx}" cy="${base}" rx="${rx + 34}" ry="15" fill="${cor}" ${contorno()}/>`;
        s += `<path d="M ${cx - rx * 0.78} ${base} C ${cx - rx * 0.8} ${base - 44}, ${cx + rx * 0.8} ${base - 44}, ${cx + rx * 0.78} ${base} Z" fill="${cor}" ${contorno()}/>`;
        s += `<path d="M ${cx - rx * 0.78} ${base - 4} C ${cx - rx * 0.6} ${base - 14}, ${cx + rx * 0.6} ${base - 14}, ${cx + rx * 0.78} ${base - 4} L ${cx + rx * 0.78} ${base + 1} C ${cx + rx * 0.6} ${base - 8}, ${cx - rx * 0.6} ${base - 8}, ${cx - rx * 0.78} ${base + 1} Z" fill="${h.faixa}" ${contorno(2)}/>`;
        // Trama da palha
        for (let k = -3; k <= 3; k++) s += `<path d="M ${cx + k * 13} ${base - 14} L ${cx + k * 15} ${base - 34}" stroke="${escuro(cor, 0.25)}" stroke-width="1.5" opacity=".6"/>`;
        for (let k = -5; k <= 5; k++) s += `<path d="M ${cx + k * 12} ${base + 4} L ${cx + k * 13.5} ${base + 12}" stroke="${escuro(cor, 0.25)}" stroke-width="1.5" opacity=".5"/>`;
        if (h.tipo === 'palha-furada') {
          s += `<path d="M ${cx + 18} ${base - 30} l 6 -3 l 2 6 l -6 2 Z" fill="${f.cabelo}" ${contorno(1.5)}/>`;
          s += `<path d="M ${cx - 46} ${base + 2} l -8 6 M ${cx - 50} ${base - 2} l -9 2" stroke="${escuro(cor, 0.35)}" stroke-width="2"/>`;
        }
        return s;
      }
      case 'couro':
        return `<path d="M ${cx - rx - 26} ${base + 6} C ${cx - rx - 20} ${base - 14}, ${cx + rx + 20} ${base - 14}, ${cx + rx + 26} ${base + 6} C ${cx + rx} ${base - 2}, ${cx - rx} ${base - 2}, ${cx - rx - 26} ${base + 6} Z" fill="${escuro(cor, 0.1)}" ${contorno()}/>` +
          `<path d="M ${cx - rx * 0.76} ${base - 4} C ${cx - rx * 0.8} ${base - 50}, ${cx + rx * 0.8} ${base - 50}, ${cx + rx * 0.76} ${base - 4} Z" fill="${cor}" ${contorno()}/>` +
          `<path d="M ${cx - rx * 0.74} ${base - 10} Q ${cx} ${base - 18} ${cx + rx * 0.74} ${base - 10}" fill="none" stroke="${claro(cor, 0.35)}" stroke-width="2" stroke-dasharray="4 3"/>` +
          `<path d="M ${cx} ${base - 40} l 4 9 l 10 1 l -8 6 l 3 10 l -9 -6 l -9 6 l 3 -10 l -8 -6 l 10 -1 Z" fill="#f1c40f" ${contorno(1.5)}/>`;
      case 'bone':
        return `<path d="M ${cx - rx - 2} ${base + 12} C ${cx - rx - 2} ${base - 46}, ${cx + rx + 2} ${base - 46}, ${cx + rx + 2} ${base + 12} Z" fill="${cor}" ${contorno()}/>` +
          `<path d="M ${cx - rx + 2} ${base + 10} C ${cx - rx * 0.4} ${base + 2}, ${cx + rx * 0.4} ${base + 2}, ${cx + rx - 2} ${base + 10} C ${cx + rx * 0.5} ${base + 24}, ${cx - rx * 0.5} ${base + 24}, ${cx - rx + 2} ${base + 10} Z" fill="${h.aba}" ${contorno()}/>` +
          `<circle cx="${cx}" cy="${base - 31}" r="4" fill="${h.aba}" ${contorno(2)}/>` +
          `<path d="M ${cx - 12} ${base - 12} h 24" stroke="${TRACO}" stroke-width="2.5"/><text x="${cx}" y="${base - 6}" font-family="Arial Black, sans-serif" font-size="13" font-weight="900" text-anchor="middle" fill="${TRACO}">Z</text>`;
      case 'cowboy':
        return `<path d="M ${cx - rx - 30} ${base - 10} C ${cx - rx - 20} ${base + 12}, ${cx + rx + 20} ${base + 12}, ${cx + rx + 30} ${base - 10} C ${cx + rx + 14} ${base - 2}, ${cx - rx - 14} ${base - 2}, ${cx - rx - 30} ${base - 10} Z" fill="${cor}" ${contorno()}/>` +
          `<path d="M ${cx - rx * 0.72} ${base} C ${cx - rx * 0.9} ${base - 46}, ${cx - 12} ${base - 54}, ${cx} ${base - 40} C ${cx + 12} ${base - 54}, ${cx + rx * 0.9} ${base - 46}, ${cx + rx * 0.72} ${base} Z" fill="${cor}" ${contorno()}/>` +
          `<path d="M ${cx - rx * 0.74} ${base - 8} Q ${cx} ${base - 16} ${cx + rx * 0.74} ${base - 8} L ${cx + rx * 0.72} ${base - 1} Q ${cx} ${base - 9} ${cx - rx * 0.72} ${base - 1} Z" fill="${h.faixa}" ${contorno(2)}/>` +
          `<path d="M ${cx - 20} ${base - 30} q 8 -6 12 2" fill="none" stroke="${escuro(cor, 0.25)}" stroke-width="2"/>`;
      case 'feltro':
        return `<ellipse cx="${cx}" cy="${base + 2}" rx="${rx + 16}" ry="9" fill="${cor}" ${contorno()}/>` +
          `<path d="M ${cx - rx * 0.7} ${base + 1} L ${cx - rx * 0.62} ${base - 34} Q ${cx} ${base - 44} ${cx + rx * 0.62} ${base - 34} L ${cx + rx * 0.7} ${base + 1} Z" fill="${cor}" ${contorno()}/>` +
          `<path d="M ${cx - rx * 0.69} ${base - 6} L ${cx + rx * 0.69} ${base - 6} L ${cx + rx * 0.7} ${base + 1} L ${cx - rx * 0.7} ${base + 1} Z" fill="${h.faixa}" ${contorno(2)}/>` +
          `<path d="M ${cx - 6} ${base - 40} q 6 8 12 0" fill="none" stroke="${escuro(cor, 0.3)}" stroke-width="2"/>` +
          `<path d="M ${cx + rx * 0.4} ${base - 4} q 10 -12 6 -22" fill="none" stroke="#c0392b" stroke-width="3"/>`;
      case 'lenco': {
        const id = 'lc' + g.id;
        return `<defs><pattern id="${id}" width="12" height="12" patternUnits="userSpaceOnUse"><rect width="12" height="12" fill="${cor}"/><circle cx="6" cy="6" r="2.2" fill="${h.cor2}"/></pattern></defs>` +
          `<path d="M ${cx - rx - 4} ${cy - 6} C ${cx - rx - 8} ${cy - ry - 30}, ${cx + rx + 8} ${cy - ry - 30}, ${cx + rx + 4} ${cy - 6} C ${cx + rx - 10} ${cy - ry * 0.55}, ${cx - rx + 10} ${cy - ry * 0.55}, ${cx - rx - 4} ${cy - 6} Z" fill="url(#${id})" ${contorno()}/>` +
          `<path d="M ${cx + rx - 2} ${cy - ry * 0.6} l 18 -14 l 6 10 Z M ${cx + rx - 2} ${cy - ry * 0.6} l 22 2 l -4 12 Z" fill="${cor}" ${contorno(2.5)}/>` +
          `<circle cx="${cx + rx}" cy="${cy - ry * 0.6}" r="5" fill="${escuro(cor, 0.15)}" ${contorno(2)}/>`;
      }
      default:
        return '';
    }
  }

  function sobrancelhas(f, g, exp) {
    const cor = f.bigodeCor || (f.cabeloTipo === 'careca' || f.cabeloTipo === 'raspado' ? escuro(f.cabelo, 0.1) : f.cabelo);
    const grossa = f.extras.includes('sobrancelhao') ? 8 : f.sobrancelha === 'fina' ? 3.5 : 5.5;
    const y = g.cy - 20 + (exp === 'grito' ? -7 : exp === 'feliz' ? -3 : 0);
    let s = '';
    for (const l of [-1, 1]) {
      const x0 = g.cx + l * 8;
      const x1 = g.cx + l * 30;
      let y0 = y;
      let y1 = y;
      let curva = -5;
      if (exp === 'bravo') { y0 = y + 7; y1 = y - 4; curva = 0; }
      if (exp === 'grito') { y0 = y - 2; y1 = y + 2; curva = -8; }
      if (exp === 'feliz') { y0 = y; y1 = y + 1; curva = -7; }
      s += `<path d="M ${x0} ${y0} Q ${(x0 + x1) / 2} ${Math.min(y0, y1) + curva} ${x1} ${y1}" fill="none" stroke="${TRACO}" stroke-width="${grossa + 3}" stroke-linecap="round"/>`;
      s += `<path d="M ${x0} ${y0} Q ${(x0 + x1) / 2} ${Math.min(y0, y1) + curva} ${x1} ${y1}" fill="none" stroke="${cor}" stroke-width="${grossa}" stroke-linecap="round"/>`;
    }
    return s;
  }

  function olhos(f, g, exp) {
    const y = g.cy - 4;
    let s = '';
    for (const l of [-1, 1]) {
      const x = g.cx + l * 19;
      if (exp === 'feliz') {
        s += `<path d="M ${x - 9} ${y + 3} Q ${x} ${y - 9} ${x + 9} ${y + 3}" fill="none" stroke="${TRACO}" stroke-width="3.5" stroke-linecap="round"/>`;
        if (f.extras.includes('cilios')) s += `<path d="M ${x + l * 9} ${y + 1} l ${l * 5} -4" stroke="${TRACO}" stroke-width="2.5"/>`;
        continue;
      }
      const rx = exp === 'grito' ? 10.5 : 9;
      const ry = exp === 'grito' ? 12 : 10.5;
      const iris = exp === 'grito' ? 4 : 5.5;
      s += `<ellipse cx="${x}" cy="${y}" rx="${rx}" ry="${ry}" fill="#fff" ${contorno(2.5)}/>`;
      s += `<circle cx="${x + l * -1.5}" cy="${y + 1.5}" r="${iris}" fill="${f.olhos}"/>`;
      s += `<circle cx="${x + l * -1.5}" cy="${y + 1.5}" r="${iris * 0.5}" fill="#120a04"/>`;
      s += `<circle cx="${x + l * -1.5 + 2}" cy="${y - 1}" r="1.8" fill="#fff"/>`;
      if (exp === 'bravo') {
        // Pálpebra baixa e inclinada
        s += `<path d="M ${x - rx - 2} ${y - ry - 2} L ${x + rx + 2} ${y - ry - 2} L ${x + l * -(rx + 2)} ${y - 1} Z" fill="${f.pele}" transform="${l === 1 ? '' : ''}"/>`;
        s += `<path d="M ${x + l * (rx + 1)} ${y - ry + 2} L ${x + l * -(rx + 1)} ${y - 2}" stroke="${TRACO}" stroke-width="3" stroke-linecap="round"/>`;
      } else if (exp !== 'grito') {
        // Pálpebra superior
        s += `<path d="M ${x - rx} ${y - 2} Q ${x} ${y - ry - 4} ${x + rx} ${y - 2}" fill="none" stroke="${TRACO}" stroke-width="3"/>`;
      }
      if (f.extras.includes('cilios')) {
        s += `<path d="M ${x + l * rx} ${y - 3} l ${l * 5} -4 M ${x + l * (rx - 3)} ${y - ry + 1} l ${l * 3} -5" stroke="${TRACO}" stroke-width="2.5" stroke-linecap="round"/>`;
      }
      if (f.extras.includes('rugas')) {
        s += `<path d="M ${x + l * (rx + 4)} ${y - 2} l ${l * 5} -3 M ${x + l * (rx + 4)} ${y + 3} l ${l * 5} 2" stroke="${escuro(f.pele, 0.35)}" stroke-width="1.8" stroke-linecap="round"/>`;
      }
    }
    return s;
  }

  function nariz(f, g) {
    const x = g.cx;
    const y = g.cy + 16;
    const p = f.pele;
    const sombra = escuro(p, 0.18);
    switch (f.nariz) {
      case 'batata':
        return `<path d="M ${x - 5} ${y - 18} Q ${x - 9} ${y - 2} ${x - 14} ${y + 4} C ${x - 20} ${y + 16}, ${x + 20} ${y + 16}, ${x + 14} ${y + 4} Q ${x + 9} ${y - 2} ${x + 5} ${y - 18}" fill="${sombra}" ${contorno(2.5)}/>` +
          `<ellipse cx="${x - 3}" cy="${y + 3}" rx="5" ry="3.5" fill="#fff" opacity=".45"/>` +
          `<path d="M ${x - 8} ${y + 10} q 2 2 5 1 M ${x + 8} ${y + 10} q -2 2 -5 1" fill="none" stroke="${TRACO}" stroke-width="2"/>`;
      case 'aquilino':
        return `<path d="M ${x - 3} ${y - 20} C ${x + 6} ${y - 10}, ${x + 14} ${y + 4}, ${x + 6} ${y + 10} C ${x + 2} ${y + 13}, ${x - 6} ${y + 12}, ${x - 9} ${y + 8}" fill="${sombra}" ${contorno(2.5)}/>` +
          `<path d="M ${x - 4} ${y + 8} q 3 2 6 0" fill="none" stroke="${TRACO}" stroke-width="2"/>`;
      case 'fino':
        return `<path d="M ${x - 1} ${y - 14} Q ${x + 4} ${y + 2} ${x + 6} ${y + 6} Q ${x} ${y + 10} ${x - 6} ${y + 6}" fill="none" ${contorno(2.5)}/>`;
      default:
        return `<circle cx="${x}" cy="${y + 2}" r="9" fill="${sombra}" ${contorno(2.5)}/>` +
          `<ellipse cx="${x - 3}" cy="${y - 1}" rx="3.5" ry="2.5" fill="#fff" opacity=".5"/>`;
    }
  }

  function boca(f, g, exp) {
    const x = g.cx;
    const y = g.cy + 35;
    const labio = f.extras.includes('batom') ? '#c0392b' : TRACO;
    const ouro = f.extras.includes('dente-ouro');
    const dentuco = f.extras.includes('dentuco');
    switch (exp) {
      case 'feliz':
        return `<path d="M ${x - 17} ${y - 4} Q ${x} ${y - 1} ${x + 17} ${y - 4} Q ${x + 14} ${y + 16} ${x} ${y + 16} Q ${x - 14} ${y + 16} ${x - 17} ${y - 4} Z" fill="#7a1f12" stroke="${labio}" stroke-width="3" stroke-linejoin="round"/>` +
          `<path d="M ${x - 14} ${y - 2} Q ${x} ${y + 1} ${x + 14} ${y - 2} L ${x + 12} ${y + 4} Q ${x} ${y + 6} ${x - 12} ${y + 4} Z" fill="#fff"/>` +
          (ouro ? `<rect x="${x + 2}" y="${y - 1}" width="6" height="5" fill="#f1c40f"/>` : '') +
          `<ellipse cx="${x}" cy="${y + 12}" rx="7" ry="3.5" fill="#e0675a"/>`;
      case 'bravo':
        return `<path d="M ${x - 14} ${y + 6} Q ${x} ${y - 4} ${x + 14} ${y + 6} L ${x + 12} ${y + 10} Q ${x} ${y + 2} ${x - 12} ${y + 10} Z" fill="#fff" stroke="${labio}" stroke-width="3" stroke-linejoin="round"/>` +
          `<path d="M ${x - 6} ${y + 2} v 6 M ${x} ${y} v 6 M ${x + 6} ${y + 2} v 6" stroke="${TRACO}" stroke-width="1.5"/>`;
      case 'grito':
        return `<ellipse cx="${x}" cy="${y + 6}" rx="13" ry="15" fill="#5a120a" stroke="${labio}" stroke-width="3"/>` +
          `<path d="M ${x - 9} ${y - 4} Q ${x} ${y - 7} ${x + 9} ${y - 4} L ${x + 8} ${y} Q ${x} ${y - 2} ${x - 8} ${y} Z" fill="#fff"/>` +
          `<ellipse cx="${x}" cy="${y + 15}" rx="7" ry="4" fill="#e0675a"/>`;
      default:
        return `<path d="M ${x - 14} ${y} Q ${x} ${y + 10} ${x + 14} ${y - 2}" fill="none" stroke="${labio}" stroke-width="3.5" stroke-linecap="round"/>` +
          (dentuco ? `<path d="M ${x - 6} ${y + 4} h 12 v 7 h -12 Z M ${x} ${y + 4} v 7" fill="#fff" ${contorno(2)}/>` : '') +
          (ouro ? `<rect x="${x + 4}" y="${y + 1}" width="5" height="5" fill="#f1c40f" ${contorno(1.2)}/>` : '') +
          `<path d="M ${x + 14} ${y - 2} q 3 -1 4 -4" fill="none" stroke="${TRACO}" stroke-width="2"/>`;
    }
  }

  function barba(f, g) {
    const { cx, cy, rx, ry } = g;
    const c = f.barba === 'branca' ? '#efefef' : f.cabelo;
    switch (f.barba) {
      case 'cheia':
      case 'branca': {
        const longa = f.barba === 'branca' ? 26 : 8;
        return `<path d="M ${cx - rx + 2} ${cy + 4} C ${cx - rx + 2} ${cy + ry * 0.7}, ${cx - 26} ${cy + ry + longa}, ${cx} ${cy + ry + longa} C ${cx + 26} ${cy + ry + longa}, ${cx + rx - 2} ${cy + ry * 0.7}, ${cx + rx - 2} ${cy + 4} ` +
          `C ${cx + rx - 8} ${cy + 24}, ${cx + 24} ${cy + 26}, ${cx + 16} ${cy + 30} Q ${cx} ${cy + 50} ${cx - 16} ${cy + 30} C ${cx - 24} ${cy + 26}, ${cx - rx + 8} ${cy + 24}, ${cx - rx + 2} ${cy + 4} Z" fill="${c}" ${contorno()}/>` +
          `<path d="M ${cx - 14} ${cy + ry} q 4 6 2 12 M ${cx + 10} ${cy + ry + 2} q 4 6 0 12" fill="none" stroke="${escuro(c, 0.2)}" stroke-width="2"/>`;
      }
      case 'rala': {
        let s = '';
        for (let i = 0; i < 26; i++) {
          const a = Math.PI * (0.15 + 0.7 * ((i * 37) % 26) / 26);
          const r = 0.82 + ((i * 13) % 7) / 50;
          s += `<circle cx="${(cx + Math.cos(a) * rx * r).toFixed(1)}" cy="${(cy + 6 + Math.sin(a) * ry * r * 0.9).toFixed(1)}" r="1.3" fill="${escuro(f.pele, 0.45)}"/>`;
        }
        return s;
      }
      case 'cavanhaque':
        return `<path d="M ${cx - 12} ${cy + ry - 8} Q ${cx} ${cy + ry - 14} ${cx + 12} ${cy + ry - 8} L ${cx + 6} ${cy + ry + 10} Q ${cx} ${cy + ry + 14} ${cx - 6} ${cy + ry + 10} Z" fill="${f.cabelo}" ${contorno(2.5)}/>`;
      default:
        return '';
    }
  }

  function bigode(f, g) {
    const x = g.cx;
    const y = g.cy + 29;
    const c = f.bigodeCor || (f.barba === 'branca' ? '#efefef' : f.cabelo);
    switch (f.bigode) {
      case 'grosso':
        return `<path d="M ${x} ${y - 2} C ${x - 10} ${y - 10}, ${x - 28} ${y - 6}, ${x - 30} ${y + 8} C ${x - 20} ${y + 2}, ${x - 8} ${y + 6}, ${x} ${y + 2} C ${x + 8} ${y + 6}, ${x + 20} ${y + 2}, ${x + 30} ${y + 8} C ${x + 28} ${y - 6}, ${x + 10} ${y - 10}, ${x} ${y - 2} Z" fill="${c}" ${contorno(2.5)}/>`;
      case 'guidao':
        return `<path d="M ${x} ${y - 2} C ${x - 12} ${y - 10}, ${x - 30} ${y - 4}, ${x - 34} ${y - 12} C ${x - 40} ${y - 2}, ${x - 30} ${y + 8}, ${x - 18} ${y + 4} C ${x - 10} ${y + 2}, ${x - 4} ${y + 4}, ${x} ${y + 2} C ${x + 4} ${y + 4}, ${x + 10} ${y + 2}, ${x + 18} ${y + 4} C ${x + 30} ${y + 8}, ${x + 40} ${y - 2}, ${x + 34} ${y - 12} C ${x + 30} ${y - 4}, ${x + 12} ${y - 10}, ${x} ${y - 2} Z" fill="${c}" ${contorno(2.5)}/>`;
      case 'fino':
        return `<path d="M ${x - 18} ${y + 2} Q ${x - 8} ${y - 6} ${x} ${y - 1} Q ${x + 8} ${y - 6} ${x + 18} ${y + 2}" fill="none" stroke="${TRACO}" stroke-width="5" stroke-linecap="round"/>` +
          `<path d="M ${x - 18} ${y + 2} Q ${x - 8} ${y - 6} ${x} ${y - 1} Q ${x + 8} ${y - 6} ${x + 18} ${y + 2}" fill="none" stroke="${c}" stroke-width="3" stroke-linecap="round"/>`;
      default:
        return '';
    }
  }

  function oculos(f, g) {
    const o = f.oculos;
    const y = g.cy - 4;
    if (o.tipo === 'sol-cabeca') {
      const yy = g.cy - g.ry * 0.62;
      return `<path d="M ${g.cx - 40} ${yy} h 80" stroke="${o.cor}" stroke-width="4"/>` +
        `<rect x="${g.cx - 36}" y="${yy - 9}" width="30" height="18" rx="8" fill="#1c1c1c" stroke="${o.cor}" stroke-width="3.5"/>` +
        `<rect x="${g.cx + 6}" y="${yy - 9}" width="30" height="18" rx="8" fill="#1c1c1c" stroke="${o.cor}" stroke-width="3.5"/>` +
        `<path d="M ${g.cx - 30} ${yy - 4} l 8 -2 M ${g.cx + 12} ${yy - 4} l 8 -2" stroke="#fff" stroke-width="2" opacity=".6"/>`;
    }
    let s = '';
    for (const l of [-1, 1]) {
      const x = g.cx + l * 19;
      s += o.tipo === 'quadrado'
        ? `<rect x="${x - 14}" y="${y - 11}" width="28" height="22" rx="4" fill="#cfe8ff" fill-opacity=".25" stroke="${o.cor}" stroke-width="3.5"/>`
        : `<circle cx="${x}" cy="${y}" r="14" fill="#cfe8ff" fill-opacity=".25" stroke="${o.cor}" stroke-width="3.5"/>`;
      s += `<path d="M ${x + l * 14} ${y - 3} L ${g.cx + l * (g.rx + 2)} ${y - 6}" stroke="${o.cor}" stroke-width="3"/>`;
    }
    s += `<path d="M ${g.cx - 5} ${y - 2} Q ${g.cx} ${y - 6} ${g.cx + 5} ${y - 2}" fill="none" stroke="${o.cor}" stroke-width="3"/>`;
    return s;
  }

  function extrasRosto(f, g, exp) {
    let s = '';
    const { cx, cy } = g;
    if (f.bochecha) {
      s += `<ellipse cx="${cx - 30}" cy="${cy + 18}" rx="9" ry="6" fill="#ff6b6b" opacity="${exp === 'feliz' ? 0.45 : 0.28}"/>`;
      s += `<ellipse cx="${cx + 30}" cy="${cy + 18}" rx="9" ry="6" fill="#ff6b6b" opacity="${exp === 'feliz' ? 0.45 : 0.28}"/>`;
    }
    if (f.extras.includes('sardas')) {
      for (const [dx, dy] of [[-30, 10], [-25, 15], [-34, 16], [30, 10], [25, 15], [34, 16], [-28, 21], [28, 21]]) {
        s += `<circle cx="${cx + dx}" cy="${cy + dy}" r="1.6" fill="${escuro(f.pele, 0.4)}"/>`;
      }
    }
    if (f.extras.includes('pinta')) s += `<circle cx="${cx + 22}" cy="${cy + 30}" r="2.2" fill="${TRACO}"/>`;
    if (f.extras.includes('rugas')) {
      s += `<path d="M ${cx - 18} ${cy - 34} q 18 -5 36 0 M ${cx - 12} ${cy - 40} q 12 -4 24 0" fill="none" stroke="${escuro(f.pele, 0.3)}" stroke-width="1.8" opacity=".8"/>`;
      s += `<path d="M ${cx - 20} ${cy + 22} q -6 8 -2 16 M ${cx + 20} ${cy + 22} q 6 8 2 16" fill="none" stroke="${escuro(f.pele, 0.3)}" stroke-width="1.8" opacity=".8"/>`;
    }
    return s;
  }

  function extrasFinais(f, g, exp) {
    let s = '';
    const { cx, cy, rx, ry } = g;
    if (f.extras.includes('palito') && exp !== 'grito') {
      s += `<path d="M ${cx + 12} ${cy + 36} L ${cx + 38} ${cy + 30}" stroke="${TRACO}" stroke-width="5" stroke-linecap="round"/>`;
      s += `<path d="M ${cx + 12} ${cy + 36} L ${cx + 38} ${cy + 30}" stroke="#f2d49b" stroke-width="2.5" stroke-linecap="round"/>`;
    }
    if (f.extras.includes('flor')) {
      const fx = cx + rx - 6;
      const fy = cy - ry * 0.55;
      for (let k = 0; k < 5; k++) {
        const a = (k / 5) * Math.PI * 2;
        s += `<circle cx="${(fx + Math.cos(a) * 8).toFixed(1)}" cy="${(fy + Math.sin(a) * 8).toFixed(1)}" r="6" fill="#fff35c" ${contorno(2)}/>`;
      }
      s += `<circle cx="${fx}" cy="${fy}" r="5" fill="#e67e22" ${contorno(2)}/>`;
    }
    if (f.extras.includes('laco')) {
      s += `<path d="M ${cx} ${cy - ry - 2} l -16 -9 l 0 18 Z M ${cx} ${cy - ry - 2} l 16 -9 l 0 18 Z" fill="#e84a6f" ${contorno(2.5)}/><circle cx="${cx}" cy="${cy - ry - 2}" r="4" fill="#c0392b" ${contorno(2)}/>`;
    }
    if (f.extras.includes('corrente')) {
      s += `<path d="M 74 162 Q 100 196 126 162" fill="none" stroke="#e8b923" stroke-width="4" stroke-dasharray="5 2"/>`;
      s += `<circle cx="100" cy="184" r="6" fill="#f1c40f" ${contorno(2)}/>`;
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
    const g = { id: (++seq).toString(36), cx: 100, cy: 98, rx: f.cabeca.rx, ry: f.cabeca.ry };
    const cab = caminhoCabeca(g.cx, g.cy, g.rx, g.ry, f.cabeca.queixo);
    const clip = 'cc' + g.id;
    let s = `<svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg" class="personagem exp-${exp}" aria-hidden="true">`;
    s += `<defs><radialGradient id="fd${g.id}" cx="50%" cy="38%" r="70%"><stop offset="0" stop-color="${claro(f.fundo, 0.35)}"/><stop offset="1" stop-color="${escuro(f.fundo, 0.15)}"/></radialGradient>` +
      `<clipPath id="${clip}"><path d="${cab}"/></clipPath></defs>`;
    s += `<rect width="200" height="200" fill="url(#fd${g.id})"/>`;
    s += `<circle cx="100" cy="98" r="86" fill="#fff" opacity=".12"/>`;
    s += '<g transform="translate(9 16) scale(.91)">';
    s += cabeloAtras(f, g);
    s += corpo(f, g);
    if (f.extras.includes('lenco-pescoco')) s += lencoPescoco(f.corLenco || '#c0392b');
    s += orelhas(f, g);
    if (f.extras.some(e => e === 'brinco' || e === 'argola')) s += brincos(f, g);
    // Rosto com sombreamento lateral
    // Sombra em meia-lua: rosto escuro por baixo e a mesma forma deslocada por cima
    s += `<path d="${cab}" fill="${escuro(f.pele, 0.16)}"/>`;
    s += `<g clip-path="url(#${clip})"><path d="${cab}" fill="${f.pele}" transform="translate(-9 -5)"/>` +
      `<ellipse cx="${g.cx - g.rx * 0.38}" cy="${g.cy - g.ry * 0.42}" rx="${g.rx * 0.32}" ry="${g.ry * 0.22}" fill="#fff" opacity=".2"/></g>`;
    s += `<path d="${cab}" fill="none" ${contorno()}/>`;
    if (f.extras.includes('costeleta')) s += costeletas(f, g);
    s += extrasRosto(f, g, exp);
    s += barba(f, g);
    s += boca(f, g, exp);
    s += bigode(f, g);
    s += nariz(f, g);
    s += olhos(f, g, exp);
    s += sobrancelhas(f, g, exp);
    s += cabeloFrente(f, g);
    if (f.oculos) s += oculos(f, g);
    if (f.chapeu) s += chapeu(f, g);
    s += extrasFinais(f, g, exp);
    s += '</g></svg>';
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
