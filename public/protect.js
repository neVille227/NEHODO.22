/* NEHODO.22 — protection des plans (dissuasion).
   Un navigateur ne peut JAMAIS empêcher une capture d'écran : ces mesures la rendent plus difficile
   et laissent un filigrane visible sur chaque plan. */
(function () {
  'use strict';
  var root = document.documentElement;
  function isField(t) { return t && t.closest && t.closest('input, textarea, select, [contenteditable="true"]'); }
  function viewerOpen() { return root.classList.contains('viewer-open'); }

  /* 1. clic droit, glisser-déposer, sélection et copie (sauf dans les champs de saisie) */
  ['contextmenu', 'dragstart', 'selectstart', 'copy', 'cut'].forEach(function (ev) {
    document.addEventListener(ev, function (e) { if (!isField(e.target)) e.preventDefault(); }, true);
  });

  /* 2. écran masqué : on cache le contenu protégé */
  var shield = document.createElement('div');
  shield.className = 'shield'; shield.setAttribute('aria-hidden', 'true');
  shield.innerHTML = '<div><strong>Contenu protégé</strong><span>Reviens sur cette fenêtre pour continuer.</span></div>';
  function mount() { if (!shield.parentNode && document.body) document.body.appendChild(shield); }
  var timer = 0;
  function hide(ms) {
    mount(); root.classList.add('is-shielded');
    clearTimeout(timer);
    if (ms) timer = setTimeout(show, ms);
  }
  function show() { clearTimeout(timer); root.classList.remove('is-shielded'); }

  /* Les outils de capture prennent le focus de la fenêtre : on masque quand la visionneuse est ouverte. */
  window.addEventListener('blur', function () { if (viewerOpen()) hide(); });
  window.addEventListener('focus', show);
  document.addEventListener('visibilitychange', function () { if (document.hidden && viewerOpen()) hide(); else show(); });

  /* 3. raccourcis de capture, impression, enregistrement, code source */
  function wipeClipboard() {
    try { if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(' ').catch(function () {}); } catch (e) { /* ignoré */ }
  }
  document.addEventListener('keydown', function (e) {
    var k = (e.key || '').toLowerCase(), mod = e.ctrlKey || e.metaKey;
    var snip = (e.metaKey && e.shiftKey && k === 's') || (e.metaKey && e.shiftKey && (k === '3' || k === '4' || k === '5'));
    if (k === 'printscreen' || snip) { hide(1800); wipeClipboard(); e.preventDefault(); return; }
    if (mod && (k === 'p' || k === 's' || k === 'u')) { if (!isField(e.target) || k === 'p') e.preventDefault(); return; }
    if (k === 'f12' || (mod && e.shiftKey && (k === 'i' || k === 'j' || k === 'c'))) { e.preventDefault(); }
  }, true);
  document.addEventListener('keyup', function (e) {
    if ((e.key || '').toLowerCase() === 'printscreen') { hide(1800); wipeClipboard(); }
  }, true);

  /* 4. impression : rien à imprimer (voir aussi style.css) */
  window.addEventListener('beforeprint', function () { hide(); });
  window.addEventListener('afterprint', function () { show(); });
})();
