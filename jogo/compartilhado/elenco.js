/**
 * Elenco de personagens do jogo (usado pelos bots, pelo servidor e pela interface)
 * O desenho de cada um fica em js/personagens.js
 */
(function (raiz, fabrica) {
  if (typeof module === 'object' && module.exports) module.exports = fabrica();
  else raiz.TrucoElenco = fabrica();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  const ELENCO = [
    { id: 'ze', nome: 'Zé da Viola', genero: 'm' },
    { id: 'cida', nome: 'Dona Cida', genero: 'f' },
    { id: 'tiao', nome: 'Tião Boiadeiro', genero: 'm' },
    { id: 'mane', nome: 'Mané Zap', genero: 'm' },
    { id: 'rosinha', nome: 'Rosinha', genero: 'f' },
    { id: 'tonhao', nome: 'Tonhão', genero: 'm' },
    { id: 'quim', nome: 'Nhô Quim', genero: 'm' },
    { id: 'zefa', nome: 'Dona Zefa', genero: 'f' },
    { id: 'bene', nome: 'Doutor Bené', genero: 'm' },
    { id: 'lurdinha', nome: 'Lurdinha', genero: 'f' },
    { id: 'gerson', nome: 'Peão Gerson', genero: 'm' },
    { id: 'neide', nome: 'Neide do Bingo', genero: 'f' },
    { id: 'bastiao', nome: 'Seu Bastião', genero: 'm' },
    { id: 'juca', nome: 'Juca Caipira', genero: 'm' }
  ];

  const PREFIXO = 'p:';

  function porId(id) { return ELENCO.find(p => p.id === id) || null; }

  // Avatar válido: "p:<id>" de um personagem ou "foto" (foto enviada pelo jogador)
  function avatarValido(avatar) {
    if (avatar === 'foto') return 'foto';
    if (typeof avatar === 'string' && avatar.startsWith(PREFIXO) && porId(avatar.slice(PREFIXO.length))) return avatar;
    return PREFIXO + ELENCO[0].id;
  }

  // Sorteia bots sem repetir personagens já usados na mesa
  function sortearBots(qtd, usados, aleatorio) {
    aleatorio = aleatorio || Math.random;
    const ocupados = new Set(usados || []);
    const livres = ELENCO.filter(p => !ocupados.has(PREFIXO + p.id) && !ocupados.has(p.nome));
    const lista = livres.length >= qtd ? livres.slice() : ELENCO.slice();
    for (let i = lista.length - 1; i > 0; i--) {
      const j = Math.floor(aleatorio() * (i + 1));
      [lista[i], lista[j]] = [lista[j], lista[i]];
    }
    return lista.slice(0, qtd).map(p => ({ nome: p.nome, avatar: PREFIXO + p.id }));
  }

  // Foto do jogador: JPEG pequeno em data URL
  function fotoValida(foto) {
    return typeof foto === 'string' && /^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/.test(foto) && foto.length <= 16000;
  }

  return { ELENCO, PREFIXO, porId, avatarValido, sortearBots, fotoValida };
});
