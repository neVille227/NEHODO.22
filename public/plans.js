/* NEHODO.22 — catégories (compteurs) et catalogue de plans */
(function () {
  'use strict';

  var LEVELS = { rdc: 'RDC', r1: 'R+1', r2: 'R+2', r3: 'R+3', r4: 'R+4' };
  var ROOFS = { dalle: 'Toiture dalle', charpente: 'Toiture charpente', mixte: 'Charpente mixte' };
  /* catégorie « Atelier » : créations libres et gratuites */
  var ATELIER = { terrasse: 'Terrasses', cuisine: 'Cuisines', garage: 'Garages', engins: 'Engins et matériel', divers: 'Autres créations' };
  var ALLLEVELS = { rdc: 'RDC', r1: 'R+1', r2: 'R+2', r3: 'R+3', r4: 'R+4', atelier: 'Atelier' };
  var ALLSUBS = { dalle: 'Toiture dalle', charpente: 'Toiture charpente', mixte: 'Charpente mixte', terrasse: 'Terrasses', cuisine: 'Cuisines', garage: 'Garages', engins: 'Engins et matériel', divers: 'Autres créations' };
  var ACCES = { premium: 'Premium', vip: 'VIP', libre: 'Gratuit' };
  /* 12 vues : [clé, nom, formule minimale] — Premium = le dossier de base, VIP = le dossier technique complet + animation */
  var VIEWS = [['masse', 'Plan de masse', 'premium'], ['plan', 'Vue en plan', 'premium'], ['cote', 'Plan coté', 'premium'], ['amenage', 'Plan aménagé', 'premium'],
    ['electricite', 'Plan d’électricité', 'vip'], ['plomberie', 'Plan de plomberie', 'vip'], ['coupes', 'Coupes', 'vip'], ['facades', 'Façades', 'premium'],
    ['toiture', 'Plan de toiture', 'vip'], ['vrd', 'Plan VRD', 'vip'], ['perspective', 'Perspective', 'free'], ['animation', 'Animation intérieure', 'vip']];
  var isAdmin = false; /* l'administration est un site séparé ; ici = mode propriétaire (accès total), mis à jour au chargement */
  function owner() { return !!(window.NehodoAccess && window.NehodoAccess.isOwner()); }

  function el(tag, cls, text) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = text;
    return n;
  }

  function firstImage(p) {
    var v = p.vues || {};
    return v.perspective || v.facades || v.amenage || v.plan || v.cote || '';
  }

  /* Règles d'accès : deux formules (Premium, VIP). Aperçu en perspective pour tous, le reste pendant l'essai de 72 h
     (un même fichier ne s'ouvre qu'une fois pendant l'essai) */
  function acc() { return window.NehodoAccess; }
  function viewTier(p, key) {
    var v = VIEWS.filter(function (x) { return x[0] === key; })[0];
    var need = v ? v[2] : 'premium';
    return (need === 'vip' || p.acces === 'vip') ? 'vip' : 'premium';
  }
  function owns(p) { return !!(acc() && acc().owns && acc().owns(p.id || p.titre)); }
  function isFree(p, key) { return owner() || key === 'perspective' || p.acces === 'libre' || owns(p); }
  function canSee(p, key) {
    if (isFree(p, key)) return true;
    return !!(acc() && acc().covers(viewTier(p, key)));
  }
  function trialOn() { var s = acc() && acc().status(); return !!(s && s.active && !s.paid); }

  if (!window.NehodoStore) return;


  /* ── carte d'un plan (même rendu partout) ── */
  function planCard(p, onOpen) {
    var card = el('button', 'plan-card');
    card.type = 'button';
    var thumb = el('div', 'plan-thumb');
    var img = firstImage(p);
    if (img && canSee(p, 'perspective')) {
      var im = document.createElement('img'); im.src = img; im.alt = p.titre || 'Plan'; im.loading = 'lazy';
      thumb.appendChild(im);
    } else {
      thumb.appendChild(el('span', 'plan-thumb-mark', ALLLEVELS[p.niveau] || ''));
    }
    thumb.appendChild(el('span', 'plan-badge acces-' + (p.acces === 'vip' ? 'vip' : 'premium'), ACCES[p.acces] || 'Premium'));
    card.appendChild(thumb);
    var info = el('div', 'plan-info');
    info.appendChild(el('span', 'cat-tag', (ALLLEVELS[p.niveau] || '') + ' · ' + (ALLSUBS[p.toiture] || '')));
    info.appendChild(el('h3', null, p.titre || 'Plan sans titre'));
    var bits = [];
    if (p.surface) bits.push(p.surface + ' m²');
    if (p.chambres) bits.push(p.chambres + ' ch.');
    if (p.sdb) bits.push(p.sdb + ' sdb');
    if (bits.length) info.appendChild(el('p', 'plan-meta', bits.join(' · ')));
    card.appendChild(info);
    card.addEventListener('click', function () { onOpen(p); });
    return card;
  }

  /* ── visionneuse : créée à la demande si la page n'en a pas ── */
  var viewer = null, tabs, stage, lastFocus = null;

  function ensureViewer() {
    if (viewer) return;
    viewer = document.getElementById('viewer');
    if (!viewer) {
      viewer = el('div', 'viewer'); viewer.id = 'viewer'; viewer.hidden = true;
      viewer.setAttribute('role', 'dialog'); viewer.setAttribute('aria-modal', 'true'); viewer.setAttribute('aria-labelledby', 'viewer-title');
      viewer.innerHTML = '<div class="viewer-backdrop" data-close></div><div class="viewer-box">' +
        '<button class="viewer-close" type="button" data-close aria-label="Fermer">×</button>' +
        '<div class="viewer-head"><p class="eyebrow" id="viewer-tag"></p><h2 id="viewer-title"></h2></div>' +
        '<div class="viewer-tabs" id="viewer-tabs"></div><div class="viewer-stage" id="viewer-stage"></div>' +
        '<div class="viewer-foot"><div class="viewer-specs" id="viewer-specs"></div><p class="viewer-desc" id="viewer-desc"></p></div></div>';
      document.body.appendChild(viewer);
    }
    tabs = document.getElementById('viewer-tabs');
    stage = document.getElementById('viewer-stage');
    viewer.addEventListener('click', function (e) { if (e.target.hasAttribute('data-close')) closeViewer(); });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && !viewer.hidden) { e.stopImmediatePropagation(); closeViewer(); }
    }, true);
  }

  var shown = {};   /* vues déjà ouvertes dans cette ouverture de la visionneuse */

  function lockBox(title, text, btnLabel, href, plan) {
    var lock = el('div', 'lock');
    lock.appendChild(el('strong', null, title));
    lock.appendChild(el('p', null, text));
    var row = el('div', 'lock-actions');
    var a = el('a', 'button button-primary', btnLabel);
    a.href = href; a.setAttribute('data-transition', '');
    row.appendChild(a);
    if (plan && plan.acces !== 'libre' && window.NehodoPay && window.NehodoPay.buyPlan) {
      var b = el('button', 'button button-ghost', 'Acheter ce plan · ' + window.NehodoPay.planPrice(plan).label); b.type = 'button';
      b.addEventListener('click', function () { window.NehodoPay.buyPlan(plan); });
      row.appendChild(b);
    }
    lock.appendChild(row);
    return lock;
  }

  function showView(p, key) {
    stage.textContent = '';
    var src = (p.vues || {})[key];
    var label = VIEWS.filter(function (v) { return v[0] === key; })[0][1];
    var need = viewTier(p, key), tier = need === 'vip' ? 'VIP' : 'Premium';
    var free = isFree(p, key), bought = owns(p);
    var st = acc() ? acc().status() : { active: false, expired: false };

    if (!free) {
      if (!st.active) {
        stage.appendChild(st.expired
          ? lockBox('Ton essai de 72 h est terminé', 'Cette vue est incluse dans la formule ' + tier + '. Abonne-toi pour la retrouver.', 'Voir les abonnements', 'abonnements.html', p)
          : lockBox('Réservé aux abonnés ' + tier, 'Cette vue est incluse dans la formule ' + tier + '. Essai gratuit de 72 h.', 'Voir les abonnements', 'abonnements.html', p));
        return;
      }
      if (!acc().covers(need)) {
        stage.appendChild(lockBox('Réservé aux abonnés VIP', 'Cette vue fait partie du dossier technique complet : elle est incluse dans la formule VIP.', 'Voir les abonnements', 'abonnements.html', p));
        return;
      }
      /* essai en cours : un fichier ne s'ouvre qu'une seule fois (pas pour les abonnés payants) */
      var id = p.id || p.titre;
      if (!st.paid && !bought) {
        if (shown[key]) { stage.appendChild(shown[key]); return; }
        if (acc().wasOpened(id, key)) {
          stage.appendChild(lockBox('Fichier déjà ouvert', 'Pendant l\'essai de 72 h, chaque fichier ne peut être ouvert qu\'une seule fois. Abonne-toi pour le consulter à volonté.', 'Voir les abonnements', 'abonnements.html', p));
          return;
        }
        acc().markOpened(id, key);
      }
    }
    var wrap = shown[key];
    if (!wrap) {
      wrap = el('div', 'view-wrap');
      var im;
      if (key === 'animation') {
        im = document.createElement('video'); im.src = src; im.controls = true; im.playsInline = true; im.preload = 'metadata';
        im.setAttribute('controlslist', 'nodownload noplaybackrate'); im.disablePictureInPicture = true;
      } else {
        im = document.createElement('img'); im.src = src; im.alt = label + ' — ' + (p.titre || ''); im.draggable = false;
      }
      wrap.appendChild(im);
      wrap.appendChild(el('div', 'wm'));   /* filigrane NEHODO.22 */
      /* pas de téléchargement pendant l'essai pour les vues payantes */
      if (free || !trialOn()) {
        var dl = el('a', 'text-link dl', 'Télécharger cette vue ↓');
        dl.href = src; dl.download = ((p.titre || 'plan') + ' - ' + label).replace(/[^\w\-. ]+/g, '') + (key === 'animation' ? '.mp4' : '.jpg');
        wrap.appendChild(dl);
      }
      if (!free && !st.paid && !bought) shown[key] = wrap;
    }
    stage.appendChild(wrap);
  }

  /* fichier modifiable (format logiciel) — VIP, après paiement du plan */
  function sourceBox(p) {
    var box = el('div', 'source-box');
    var fmt = p.format || 'DWG, Revit ou SketchUp';
    var txt = el('div', 'source-txt');
    txt.appendChild(el('strong', null, 'Fichier modifiable · ' + fmt));
    txt.appendChild(el('p', null, 'Réservé aux abonnés VIP. Après paiement du plan, tu reçois le fichier au format du logiciel pour y apporter tes modifications.'));
    box.appendChild(txt);
    var act = el('div', 'source-act');
    var q = '&plan=' + encodeURIComponent(p.titre || '') + '&niveau=' + encodeURIComponent(ALLLEVELS[p.niveau] || '');
    var a1 = el('a', 'button button-primary', 'Payer et recevoir le fichier'); a1.href = 'contact.html?sujet=Fichier' + q; a1.setAttribute('data-transition', '');
    var a2 = el('a', 'button button-ghost', 'Demander une modification'); a2.href = 'contact.html?sujet=Modification' + q; a2.setAttribute('data-transition', '');
    act.appendChild(a1); act.appendChild(a2); box.appendChild(act);
    return box;
  }

  /* achat du plan complet (carte bancaire / mobile money via FedaPay) */
  function buyBox(p) {
    var box = el('div', 'source-box buy-box');
    var pr = window.NehodoPay.planPrice(p);
    var txt = el('div', 'source-txt');
    txt.appendChild(el('strong', null, 'Acheter ce plan · ' + pr.label));
    txt.appendChild(el('p', null, 'Paiement unique : les 12 vues de ce plan restent à toi, sans limite de durée et sans abonnement.'));
    box.appendChild(txt);
    var act = el('div', 'source-act');
    var b = el('button', 'button button-primary', 'Acheter · ' + pr.label); b.type = 'button';
    b.addEventListener('click', function () { window.NehodoPay.buyPlan(p); });
    act.appendChild(b); box.appendChild(act);
    return box;
  }

  var current = null;
  function openViewer(p) {
    ensureViewer();
    current = p;
    shown = {};
    lastFocus = document.activeElement;
    document.getElementById('viewer-tag').textContent = (ALLLEVELS[p.niveau] || '') + ' · ' + (ALLSUBS[p.toiture] || '') + ' · ' + (ACCES[p.acces] || 'Premium');
    document.getElementById('viewer-title').textContent = p.titre || 'Plan';
    document.getElementById('viewer-desc').textContent = p.description || '';
    var sp = document.getElementById('viewer-specs'); sp.textContent = '';
    [['Surface', p.surface ? p.surface + ' m²' : ''], ['Chambres', p.chambres], ['Salles de bain', p.sdb], ['Terrain', p.terrain], ['Prix à l\'unité', (p.acces !== 'libre' && window.NehodoPay && window.NehodoPay.planPrice) ? window.NehodoPay.planPrice(p).label : '']].forEach(function (s) {
      if (!s[1]) return;
      var d = el('div', 'spec'); d.appendChild(el('span', null, s[0])); d.appendChild(el('strong', null, String(s[1]))); sp.appendChild(d);
    });
    tabs.textContent = '';
    var available = VIEWS.filter(function (v) { return (p.vues || {})[v[0]]; });
    var startKey = (p.vues || {}).perspective ? 'perspective' : (available[0] || [])[0];
    stage.textContent = '';
    if (!available.length) stage.appendChild(el('p', 'plans-empty', 'Les vues de ce plan arrivent bientôt.'));
    available.forEach(function (v) {
      var b = el('button', 'chip' + (v[0] === startKey ? ' is-on' : ''), (canSee(p, v[0]) ? '' : '🔒 ') + v[1]);
      b.type = 'button';
      b.addEventListener('click', function () {
        Array.prototype.forEach.call(tabs.children, function (x) { x.classList.remove('is-on'); });
        b.classList.add('is-on'); showView(p, v[0]);
      });
      tabs.appendChild(b);
    });
    Array.prototype.forEach.call(viewer.querySelectorAll('.source-box'), function (n) { n.remove(); });
    var foot = viewer.querySelector('.viewer-foot');
    if (p.acces !== 'libre' && !owner() && !owns(p) && window.NehodoPay && window.NehodoPay.buyPlan) foot.appendChild(buyBox(p));
    if (p.acces === 'vip') foot.appendChild(sourceBox(p));
    if (startKey) showView(p, startKey);
    viewer.hidden = false;
    document.documentElement.classList.add('viewer-open');
    viewer.querySelector('.viewer-close').focus();
  }

  document.addEventListener('nehodo-access-change', function () { if (viewer && !viewer.hidden && current) openViewer(current); });

  function closeViewer() {
    viewer.hidden = true;
    document.documentElement.classList.remove('viewer-open');
    if (lastFocus && lastFocus.focus) lastFocus.focus();
  }

  window.NehodoStore.list().then(function (all) {
    var plans = all.filter(function (p) { return p.statut !== 'brouillon'; }).map(function (p) { if (p.niveau === 'atelier') p.acces = 'libre'; else if (p.acces !== 'vip') p.acces = 'premium'; return p; });
    counts(plans);
    if (document.getElementById('plans-root')) catalogue(plans);
    else { flipCards(plans); collage(plans); }
  });


  /* ── Page « Catégories » : bandeau d'images tirées au hasard (plans et perspectives) ── */
  function collage(plans) {
    var box = document.getElementById('cat-collage');
    if (!box) return;
    var pool = [];
    plans.forEach(function (p) {
      Object.keys(p.vues || {}).forEach(function (k) {
        if (p.vues[k]) pool.push({ p: p, key: k, src: p.vues[k] });
      });
    });
    var DEMO = false;
    if (!pool.length) {   /* aucun plan publié : villas et plans d'illustration, qui défilent */
      DEMO = true;
      for (var di = 1; di <= 8; di++) { pool.push({ demo: true, key: 'perspective', src: 'img/villa-' + di + '.jpg' }); pool.push({ demo: true, key: 'amenage', src: 'img/plan-' + di + '.jpg' }); }
    }
    function rnd(n) { return Math.floor(Math.random() * n); }
    function label(it) {
      if (it.demo) return it.key === 'perspective' ? 'Villa' : 'Plan aménagé';
      var v = VIEWS.filter(function (x) { return x[0] === it.key; })[0];
      return v ? v[1] : 'Plan';
    }
    /* sans plan publié : croquis de villas à la place */
    function sketch(n, roof) {
      var fh = 24, top = 138 - fh * n, s = '<svg viewBox="0 -34 200 184" aria-hidden="true"><g fill="rgba(var(--acc),0.12)" stroke="var(--violet-3)" stroke-width="1.3" stroke-linejoin="round"><path d="M10 138H190" fill="none" opacity=".5"/><rect x="40" y="' + top + '" width="120" height="' + (fh * n) + '"/>';
      for (var i = 0; i < n; i++) { var y = 138 - fh * (i + 1); [54, 100, 134].forEach(function (x) { s += (i === 0 && x === 100) ? '<rect x="100" y="' + (y + 4) + '" width="12" height="' + (fh - 4) + '" fill="var(--door)"/>' : '<rect x="' + x + '" y="' + (y + 7) + '" width="16" height="9" fill="rgba(var(--acc3),.45)" stroke="none"/>'; }); }
      s += roof === 'dalle' ? '<rect x="33" y="' + (top - 6) + '" width="134" height="6" fill="rgba(var(--acc2),.4)"/>' : '<polygon points="32,' + top + ' 100,' + (top - 38) + ' 168,' + top + '" fill="rgba(var(--acc2),.35)"/>';
      return s + '</g></svg>';
    }
    function fill(tile, it) {
      tile.textContent = '';
      var locked = false;
      if (it) {
        locked = !it.demo && !(owner() || it.key === 'perspective');
        var im = document.createElement('img'); im.src = it.src; im.alt = ''; im.draggable = false; im.loading = 'lazy';
        if (locked) im.className = 'is-blur';
        tile.appendChild(im);
        tile.appendChild(el('span', 'tile-tag', (locked ? '🔒 ' : '') + label(it)));
        if (!it.demo) { tile.onclick = function () { openViewer(it.p); }; tile.classList.add('is-link'); }
      } else {
        var d = el('div', 'tile-art'); d.innerHTML = sketch(1 + rnd(4), rnd(2) ? 'dalle' : 'charpente');
        tile.appendChild(d); tile.appendChild(el('span', 'tile-tag', rnd(2) ? 'Perspective' : 'Plan'));
      }
    }
    var N = window.innerWidth < 700 ? 3 : 6, picks = [], tiles = [];
    function pick(excl) {
      if (!pool.length) return null;
      for (var t = 0; t < 12; t++) { var c = pool[rnd(pool.length)]; if (excl.indexOf(c) < 0) return c; }
      return pool[rnd(pool.length)];
    }
    for (var i = 0; i < N; i++) {
      var tile = el('div', 'tile'); tile.style.setProperty('--r', ((i % 2 ? 1 : -1) * (0.6 + Math.random() * 1.6)).toFixed(2) + 'deg'); tile.style.animationDelay = (i * 0.09) + 's';
      var it = pick(picks); picks.push(it); fill(tile, it); box.appendChild(tile); tiles.push(tile);
    }
    box.hidden = false;
    /* une case change de temps en temps */
    if (pool.length > N && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setInterval(function () {
        var k = rnd(N), tl = tiles[k], it2 = pick(picks);
        tl.classList.add('is-swap');
        setTimeout(function () { picks[k] = it2; fill(tl, it2); tl.classList.remove('is-swap'); }, 400);
      }, 3800);
    }
  }

  /* ── Page « Catégories » : nombre de plans par carte ── */
  function counts(plans) {
    var cards = document.querySelectorAll('.cat-card[data-niveau]');
    for (var i = 0; i < cards.length; i++) {
      var c = cards[i], n = 0;
      for (var j = 0; j < plans.length; j++) {
        if (plans[j].niveau === c.getAttribute('data-niveau') && plans[j].toiture === c.getAttribute('data-toiture')) n++;
      }
      var badge = c.querySelector('.cat-soon');
      if (badge) {
        badge.textContent = n ? n + (n > 1 ? ' plans' : ' plan') : 'Bientôt';
        if (n) badge.classList.add('has-plans');
      }
    }
  }

  /* ── Page « Catégories » : la carte fait un quart de tour en fondu, puis le panneau se retourne ── */
  function flipCards(plans) {
    var cards = document.querySelectorAll('a.cat-card[data-niveau]');
    if (!cards.length) return;
    var layer = null, openCard = null, closing = false, closeTimer = 0;

    function build() {
      layer = el('div', 'flip-layer'); layer.hidden = true;
      layer.setAttribute('role', 'dialog'); layer.setAttribute('aria-modal', 'true'); layer.setAttribute('aria-labelledby', 'flip-title');
      layer.innerHTML = '<div class="flip-backdrop" data-flip-close></div>' +
        '<div class="flip-panel"><button class="flip-close" type="button" data-flip-close aria-label="Fermer">×</button>' +
        '<div class="flip-head"><p class="eyebrow" id="flip-tag"></p><h2 id="flip-title"></h2><p id="flip-sub"></p></div>' +
        '<div class="flip-body" id="flip-body"></div></div>';
      document.body.appendChild(layer);
      layer.addEventListener('click', function (e) { if (e.target.hasAttribute('data-flip-close')) closeFlip(); });
      document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && layer && !layer.hidden && (!viewer || viewer.hidden)) closeFlip(); });
    }

    function openFlip(card) {
      if (openCard) return;
      if (!layer) build();
      var niv = card.getAttribute('data-niveau'), toi = card.getAttribute('data-toiture');
      var list = plans.filter(function (p) { return p.niveau === niv && p.toiture === toi; });
      document.getElementById('flip-tag').textContent = 'CATÉGORIE · ' + (ALLLEVELS[niv] || '').toUpperCase();
      document.getElementById('flip-title').textContent = (ALLLEVELS[niv] || '') + ' — ' + (ALLSUBS[toi] || '');
      document.getElementById('flip-sub').textContent = list.length ? (list.length + (list.length > 1 ? ' plans disponibles' : ' plan disponible') + '. Touche un plan pour voir ses vues.') : '';
      var body = document.getElementById('flip-body'); body.textContent = '';
      if (list.length) {
        var grid = el('div', 'flip-grid');
        list.forEach(function (p) { grid.appendChild(planCard(p, openViewer)); });
        body.appendChild(grid);
      } else {
        var em = el('div', 'flip-empty');
        em.appendChild(el('strong', null, 'Les plans arrivent bientôt'));
        em.appendChild(el('p', null, 'Cette catégorie est en préparation. Dis-moi ce que tu cherches, je dessine un plan rien que pour toi.'));
        var a = el('a', 'button button-primary', 'Demander un plan sur mesure ↗'); a.href = 'personnalise.html'; a.setAttribute('data-transition', '');
        em.appendChild(a);
        body.appendChild(em);
      }
      openCard = card;
      card.classList.remove('is-returning');
      card.classList.add('is-flipping');
      layer.classList.remove('is-closing');
      layer.hidden = false;
      document.documentElement.classList.add('flip-open');
      setTimeout(function () { var c = layer.querySelector('.flip-close'); if (c && !layer.hidden) c.focus(); }, 380);
    }

    function closeFlip() {
      if (!layer || layer.hidden || closing) return;
      closing = true;
      layer.classList.add('is-closing');
      var card = openCard;
      closeTimer = setTimeout(function () {
        layer.hidden = true; closing = false;
        document.documentElement.classList.remove('flip-open');
        if (card) {
          card.classList.remove('is-flipping');
          card.classList.add('is-returning');
          setTimeout(function () { card.classList.remove('is-returning'); }, 520);
          card.focus();
        }
        openCard = null;
      }, 320);
    }

    Array.prototype.forEach.call(cards, function (card) {
      card.addEventListener('click', function (e) {
        if (e.defaultPrevented || e.metaKey || e.ctrlKey || e.shiftKey || e.button) return;
        e.preventDefault();          /* empêche aussi la transition de fumée : on reste sur la page */
        openFlip(card);
      });
      card.removeAttribute('data-transition');
    });
  }

  /* ── Page « Plans » ── */
  function catalogue(plans) {
    var root = document.getElementById('plans-root');
    var empty = document.getElementById('plans-empty');
    var filters = document.getElementById('plans-filters');
    var q = new URLSearchParams(window.location.search);
    var state = { niveau: ALLLEVELS[q.get('niveau')] ? q.get('niveau') : '', toiture: ALLSUBS[q.get('toiture')] ? q.get('toiture') : '' };

    function buildFilters() {
      filters.textContent = '';
      var groups = [['niveau', 'Tous les niveaux', ALLLEVELS], ['toiture', state.niveau === 'atelier' ? 'Toutes les créations' : 'Toutes les toitures', state.niveau === 'atelier' ? ATELIER : ROOFS]];
      groups.forEach(function (g) {
        var wrap = el('div', 'filter-group');
        var all = el('button', 'chip' + (state[g[0]] === '' ? ' is-on' : ''), g[1]);
        all.type = 'button';
        all.addEventListener('click', function () { state[g[0]] = ''; if (g[0] === 'niveau') state.toiture = ''; update(); });
        wrap.appendChild(all);
        Object.keys(g[2]).forEach(function (k) {
          var b = el('button', 'chip' + (state[g[0]] === k ? ' is-on' : ''), g[2][k]);
          b.type = 'button';
          b.addEventListener('click', function () { state[g[0]] = k; if (g[0] === 'niveau' && state.toiture && ((k === 'atelier') !== !!ATELIER[state.toiture])) state.toiture = ''; update(); });
          wrap.appendChild(b);
        });
        filters.appendChild(wrap);
      });
    }

    function heading() {
      var eb = document.getElementById('plans-eyebrow'), t = document.getElementById('plans-title');
      var label = [state.niveau ? ALLLEVELS[state.niveau] : '', state.toiture ? ALLSUBS[state.toiture] : ''].filter(Boolean).join(' · ');
      eb.textContent = label ? 'CATALOGUE · ' + label.toUpperCase() : 'CATALOGUE';
      t.textContent = '';
      if (label) { t.appendChild(el('span', null, label.replace(' · ', ' — '))); }
      else { t.appendChild(document.createTextNode('Les ')); t.appendChild(el('span', null, 'plans.')); }
    }

    function render() {
      root.textContent = '';
      var list = plans.filter(function (p) {
        return (!state.niveau || p.niveau === state.niveau) && (!state.toiture || p.toiture === state.toiture);
      });
      empty.hidden = list.length > 0;
      list.forEach(function (p) { root.appendChild(planCard(p, openViewer)); });
    }

    function update() {
      var u = new URL(window.location.href);
      ['niveau', 'toiture'].forEach(function (k) { if (state[k]) u.searchParams.set(k, state[k]); else u.searchParams.delete(k); });
      try { history.replaceState(null, '', u.pathname + u.search); } catch (e) { /* ignoré */ }
      buildFilters(); heading(); render();
    }
    update();
  }
})();
