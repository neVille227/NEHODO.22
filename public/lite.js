/* NEHODO.22 — mode léger : coupe animations, fumée, fonds animés, curseur et musique automatique
   (à charger tout en haut, sans « defer », avant les autres scripts) */
(function () {
  'use strict';
  var KEY = 'nehodo-lite', root = document.documentElement;
  function get() { try { return localStorage.getItem(KEY); } catch (e) { return null; } }
  function set(v) { try { localStorage.setItem(KEY, v); } catch (e) { /* ignoré */ } }

  var on = get() === '1';
  if (on) root.classList.add('lite');

  /* Les scripts du site savent déjà se calmer pour « prefers-reduced-motion » : en mode léger on leur répond oui. */
  if (on && window.matchMedia) {
    var orig = window.matchMedia.bind(window);
    window.matchMedia = function (q) {
      var m = orig(q);
      if (/prefers-reduced-motion\s*:\s*reduce/.test(q)) {
        return { matches: true, media: q, onchange: null, addListener: function () {}, removeListener: function () {}, addEventListener: function () {}, removeEventListener: function () {}, dispatchEvent: function () { return false; } };
      }
      return m;
    };
  }

  function weak() {
    var n = navigator, c = n.connection || {};
    return (n.deviceMemory && n.deviceMemory <= 2) || (n.hardwareConcurrency && n.hardwareConcurrency <= 2) || c.saveData === true || /(^|-)2g$|3g/.test(c.effectiveType || '');
  }

  function toggle(v) { set(v ? '1' : '0'); window.location.reload(); }
  window.NehodoLite = { on: on, set: toggle };

  function ui() {
    var b = document.createElement('button');
    b.type = 'button'; b.className = 'lite-btn'; b.setAttribute('aria-pressed', on ? 'true' : 'false');
    b.title = 'Mode léger : pour les appareils lents';
    b.innerHTML = '<span aria-hidden="true">⚡</span><em>' + (on ? 'Mode léger activé' : 'Mode léger') + '</em>';
    b.addEventListener('click', function () { toggle(!on); });
    document.body.appendChild(b);

    /* appareil modeste détecté et aucun choix encore fait : on propose */
    if (get() === null && weak()) {
      var p = document.createElement('div');
      p.className = 'tuto-invite lite-invite';
      p.innerHTML = '<p><strong>Appareil un peu lent&nbsp;?</strong> Le mode léger désactive les animations pour que le site reste fluide.</p><div><button class="button button-primary" type="button" data-yes>Activer le mode léger</button><button class="button button-ghost" type="button" data-no>Non merci</button></div>';
      document.body.appendChild(p);
      p.querySelector('[data-yes]').addEventListener('click', function () { toggle(true); });
      p.querySelector('[data-no]').addEventListener('click', function () { set('0'); p.remove(); });
    }
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', ui); else ui();
})();
