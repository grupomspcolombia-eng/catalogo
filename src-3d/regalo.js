/* Punto de entrada: arranca la animación de la caja de regalo (celular + Power Bank en 3D) */
import { initDeck } from './scene.js';
(function () {
  var deck = document.getElementById('deck');
  if (!deck) return;
  var src = document.currentScript && document.currentScript.src;
  var base = src ? new URL('./', src).href : 'assets/';
  try {
    initDeck(deck, { base: base, onReady: function () { deck.classList.add('is-3d'); }, onFail: function () { deck.classList.remove('is-3d'); deck.classList.add('no-3d'); } });
  } catch (err) {
    deck.classList.add('no-3d');
    if (window.console) console.error(err);
  }
})();
