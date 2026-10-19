/**
 * Criação visual das cartas (baralho espanhol/francês simplificado em CSS)
 */
window.Cartas = (function () {
  'use strict';

  const SIMBOLO = { o: '♦', e: '♠', c: '♥', p: '♣' };
  const FIGURAS = { K: '♚', Q: '♛', J: '♞' };
  // Posições dos naipes (em % da área central) para cada valor numérico
  const PIPS = {
    2: [[50, 0], [50, 100, 1]],
    3: [[50, 0], [50, 50], [50, 100, 1]],
    4: [[0, 0], [100, 0], [0, 100, 1], [100, 100, 1]],
    5: [[0, 0], [100, 0], [50, 50], [0, 100, 1], [100, 100, 1]],
    6: [[0, 0], [100, 0], [0, 50], [100, 50], [0, 100, 1], [100, 100, 1]],
    7: [[0, 0], [100, 0], [50, 25], [0, 50], [100, 50], [0, 100, 1], [100, 100, 1]]
  };

  function vermelha(naipe) { return naipe === 'o' || naipe === 'c'; }

  function preencherFrente(frente, carta) {
    const s = SIMBOLO[carta.naipe];
    frente.className = 'face frente' + (vermelha(carta.naipe) ? ' vermelha' : '');
    let centro;
    if (FIGURAS[carta.valor]) {
      centro = `<div class="figura"><span class="rei">${FIGURAS[carta.valor]}</span><span class="letra">${s}</span></div>`;
    } else if (carta.valor === 'A') {
      centro = `<div class="pips"><span class="pip as" style="left:50%;top:50%">${s}</span></div>`;
    } else {
      centro = '<div class="pips">' + PIPS[carta.valor].map(([x, y, inv]) =>
        `<span class="pip${inv ? ' inv' : ''}" style="left:${x}%;top:${y}%">${s}</span>`).join('') + '</div>';
    }
    frente.innerHTML =
      `<div class="canto sup"><span class="v">${carta.valor}</span><span class="n">${s}</span></div>` +
      centro +
      `<div class="canto inf"><span class="v">${carta.valor}</span><span class="n">${s}</span></div>` +
      '<span class="selo-manilha"></span>';
  }

  function criar(carta) {
    const el = document.createElement('div');
    el.className = 'carta';
    el.innerHTML = '<div class="carta-inner"><div class="face frente"></div><div class="face verso"></div></div>';
    if (carta) definir(el, carta);
    return el;
  }

  function definir(el, carta) {
    if (!carta) return;
    if (el.dataset.carta === carta.id) return;
    el.dataset.carta = carta.id;
    preencherFrente(el.querySelector('.frente'), carta);
  }

  function marcarManilha(el, carta, manilha) {
    const ehManilha = !!(carta && carta.valor === manilha);
    el.classList.toggle('manilha', ehManilha);
    el.classList.toggle('zap', ehManilha && carta.naipe === 'p');
    const selo = el.querySelector('.selo-manilha');
    if (selo) selo.textContent = ehManilha ? '★' : '';
  }

  function nome(carta) {
    if (!carta) return '';
    const nomes = { A: 'Ás', K: 'Rei', J: 'Valete', Q: 'Dama' };
    return (nomes[carta.valor] || carta.valor) + ' de ' + TrucoMotor.NOMES_NAIPES[carta.naipe];
  }

  return { criar, definir, marcarManilha, nome, SIMBOLO, vermelha };
})();
