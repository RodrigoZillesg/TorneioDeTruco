/**
 * Criação visual das cartas (baralho espanhol/francês simplificado em CSS)
 */
window.Cartas = (function () {
  'use strict';

  // \uFE0E força o símbolo de texto (sem ele, o iPad/iPhone mostra emoji colorido)
  const SIMBOLO = { o: '♦\uFE0E', e: '♠\uFE0E', c: '♥\uFE0E', p: '♣\uFE0E' };
  const FIGURAS = { K: '♚\uFE0E', Q: '♛\uFE0E', J: '♞\uFE0E' };

  function vermelha(naipe) { return naipe === 'o' || naipe === 'c'; }

  // Face limpa: índice nos cantos e um único símbolo grande no centro,
  // sem nada se sobrepondo ao número ou à letra
  function preencherFrente(frente, carta) {
    const s = SIMBOLO[carta.naipe];
    frente.className = 'face frente' + (vermelha(carta.naipe) ? ' vermelha' : '');
    let centro;
    if (FIGURAS[carta.valor]) {
      centro = `<div class="figura"><span class="rei">${FIGURAS[carta.valor]}</span><span class="naipe-fig">${s}</span></div>`;
    } else {
      centro = `<div class="centro-carta"><span class="naipe-grande${carta.valor === 'A' ? ' as' : ''}">${s}</span></div>`;
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
