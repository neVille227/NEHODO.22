/* NEHODO.22 — langues : français (défaut), anglais, arabe (droite→gauche), espagnol, portugais.
   Le français est écrit dans les pages ; les autres langues sont des dictionnaires lang/xx.js (texte français → traduction).
   Un texte absent du dictionnaire reste en français. Charger sans « defer », en haut de <head>. */
(function () {
  'use strict';
  var LANGS = [['fr', 'Français', '🇫🇷'], ['en', 'English', '🇬🇧'], ['ar', 'العربية', '🇸🇦'], ['es', 'Español', '🇪🇸'], ['pt', 'Português', '🇵🇹']];
  var root = document.documentElement, KEY = 'nehodo-lang';
  var cur = 'fr';
  try { cur = localStorage.getItem(KEY) || ''; } catch (e) { cur = ''; }
  if (!cur) { var nav = (navigator.language || 'fr').slice(0, 2).toLowerCase(); cur = LANGS.some(function (l) { return l[0] === nav; }) ? nav : 'fr'; }
  if (!LANGS.some(function (l) { return l[0] === cur; })) cur = 'fr';
  root.lang = cur; root.dir = cur === 'ar' ? 'rtl' : 'ltr';
  window.NEHODO_LANG_CODE = cur;

  if (cur !== 'fr') document.write('<script src="lang/' + cur + '.js"><\/script>');

  function norm(s) { return s.replace(/ /g, ' ').replace(/\s+/g, ' ').trim(); }
  var D = null, P = null;
  function esc(s) { return s.replace(/[.*+?^$()|[\]\\]/g, '\\$&'); }
  function prepare() {
    D = {}; P = [];
    var src = window.NEHODO_LANG || {};
    Object.keys(src).forEach(function (k) {
      var nk = norm(k);
      if (/\{\d+\}/.test(nk)) {
        var idx = [], re = '^' + esc(nk).replace(/\{(\d+)\}/g, function (m, n) { idx.push(+n); return '(.+?)'; }) + '$';
        P.push({ re: new RegExp(re), idx: idx, to: src[k] });
      } else D[nk] = src[k];
    });
    P.sort(function (a, b) { return b.re.source.length - a.re.source.length; });
  }

  var UNITS = { j: '@j', h: '@h', min: '@min' };
  function units(s) {
    var src = window.NEHODO_LANG || {};
    return s.replace(/(\d+) (j|h|min)\b/g, function (m, n, u) { var t = src[UNITS[u]]; return t ? n + ' ' + t : m; });
  }

  function tr(text, depth) {
    var n = norm(text);
    if (!n) return null;
    if (D[n] != null) return D[n];
    for (var i = 0; i < P.length; i++) {
      var m = P[i].re.exec(n);
      if (m) {
        var out = P[i].to;
        for (var k = 0; k < P[i].idx.length; k++) {
          var part = m[k + 1], sub = (depth || 0) < 2 ? tr(part, (depth || 0) + 1) : null;
          out = out.split('{' + P[i].idx[k] + '}').join(sub != null ? sub : units(part));
        }
        return out;
      }
    }
    /* préfixe/suffixe décoratif : « 🔒 Plan coté », « Voir tout ↗ » */
    var pm = /^([🔒⚡✓×•·\s]+)?(.*?)(\s*[↗→↓←]+)?$/u.exec(n);
    if (pm && (pm[1] || pm[3]) && pm[2]) {
      var inner = (depth || 0) < 2 ? tr(pm[2], (depth || 0) + 1) : null;
      if (inner != null) return (pm[1] || '') + inner + (pm[3] || '');
    }
    return null;
  }

  var SKIP = { SCRIPT: 1, STYLE: 1, NOSCRIPT: 1, TEXTAREA: 1, CODE: 1 };
  var ATTRS = ['placeholder', 'title', 'aria-label', 'alt', 'content'];
  var missing = {};
  function node(n) {
    if (n.nodeType === 3) {
      var p = n.parentNode; if (!p || SKIP[p.nodeName] || (p.closest && p.closest('[data-notranslate]'))) return;
      var v = n.nodeValue; if (!/\S/.test(v)) return;
      var t = tr(v);
      if (t != null) { var lead = /^\s*/.exec(v)[0], trail = /\s*$/.exec(v)[0]; var nv = lead + t + trail; if (nv !== v) n.nodeValue = nv; }
      else if (/[A-Za-zÀ-ÿ]{3}/.test(v) && !/^[\d\s.,:;%$€·—–-]+$/.test(v)) missing[norm(v)] = 1;
    } else if (n.nodeType === 1) {
      if (SKIP[n.nodeName] || n.hasAttribute('data-notranslate')) return;
      for (var i = 0; i < ATTRS.length; i++) {
        var a = ATTRS[i];
        if (!n.hasAttribute(a)) continue;
        if (a === 'content' && !(n.nodeName === 'META' && /^(description|og:title|og:description)$/.test(n.getAttribute('name') || n.getAttribute('property') || ''))) continue;
        var av = n.getAttribute(a), at = tr(av);
        if (at != null && at !== av) n.setAttribute(a, at); else if (at == null && /[A-Za-zÀ-ÿ]{3}/.test(av) && a !== 'content') missing[norm(av)] = 1;
      }
      if (n.nodeName === 'INPUT' && /^(submit|button)$/.test(n.type) && n.value) { var tv = tr(n.value); if (tv != null) n.value = tv; }
      for (var c = n.firstChild; c; c = c.nextSibling) node(c);
    }
  }

  var busy = false, mo = null;
  function run(rootNode) { busy = true; try { node(rootNode); } finally { busy = false; if (mo) mo.takeRecords(); } }

  function selector() {
    var nav = document.querySelector('.navigation'); if (!nav || document.querySelector('.lang')) return;
    var box = document.createElement('div'); box.className = 'lang'; box.setAttribute('data-notranslate', '');
    var cl = LANGS.filter(function (l) { return l[0] === cur; })[0];
    box.innerHTML = '<button type="button" class="lang-btn" aria-haspopup="true" aria-expanded="false" aria-label="Langue / Language"><span aria-hidden="true">' + cl[2] + '</span><b>' + cur.toUpperCase() + '</b></button><div class="lang-menu" role="menu" hidden></div>';
    var menu = box.querySelector('.lang-menu'), btn = box.querySelector('.lang-btn');
    LANGS.forEach(function (l) {
      var b = document.createElement('button'); b.type = 'button'; b.setAttribute('role', 'menuitem'); b.lang = l[0];
      if (l[0] === cur) b.className = 'is-on';
      b.innerHTML = '<span aria-hidden="true">' + l[2] + '</span><span>' + l[1] + '</span>';
      b.addEventListener('click', function () { try { localStorage.setItem(KEY, l[0]); } catch (e) { /* ignoré */ } if (l[0] === cur) { menu.hidden = true; return; } window.location.reload(); });
      menu.appendChild(b);
    });
    btn.addEventListener('click', function (e) { e.stopPropagation(); menu.hidden = !menu.hidden; btn.setAttribute('aria-expanded', menu.hidden ? 'false' : 'true'); });
    document.addEventListener('click', function () { menu.hidden = true; btn.setAttribute('aria-expanded', 'false'); });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape') menu.hidden = true; });
    nav.appendChild(box);
  }

  function init() {
    selector();
    if (cur === 'fr') return;
    prepare();
    run(document.head.querySelector('title') || document.head);
    run(document.documentElement);
    mo = new MutationObserver(function (list) {
      if (busy) return;
      busy = true;
      try {
        list.forEach(function (m) {
          if (m.type === 'characterData') node(m.target);
          else if (m.type === 'attributes') { /* attributs gérés à l'ajout */ }
          else m.addedNodes.forEach(function (n) { node(n); });
        });
      } finally { busy = false; mo.takeRecords(); }
    });
    mo.observe(document.documentElement, { childList: true, subtree: true, characterData: true });
    window.NEHODO_I18N_MISSING = function () { return Object.keys(missing); };
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
  window.NehodoLang = { current: cur, langs: LANGS, translate: function (s) { var t = D && tr(s); return t != null ? t : s; } };
})();
