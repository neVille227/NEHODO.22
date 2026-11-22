/* NEHODO.22admin — tableau de bord : plans, publication, réglages */
(function () {
  'use strict';
function sha256(str) {
      var K = [0x428a2f98,0x71374491,0xb5c0fbcf,0xe9b5dba5,0x3956c25b,0x59f111f1,0x923f82a4,0xab1c5ed5,0xd807aa98,0x12835b01,0x243185be,0x550c7dc3,0x72be5d74,0x80deb1fe,0x9bdc06a7,0xc19bf174,0xe49b69c1,0xefbe4786,0x0fc19dc6,0x240ca1cc,0x2de92c6f,0x4a7484aa,0x5cb0a9dc,0x76f988da,0x983e5152,0xa831c66d,0xb00327c8,0xbf597fc7,0xc6e00bf3,0xd5a79147,0x06ca6351,0x14292967,0x27b70a85,0x2e1b2138,0x4d2c6dfc,0x53380d13,0x650a7354,0x766a0abb,0x81c2c92e,0x92722c85,0xa2bfe8a1,0xa81a664b,0xc24b8b70,0xc76c51a3,0xd192e819,0xd6990624,0xf40e3585,0x106aa070,0x19a4c116,0x1e376c08,0x2748774c,0x34b0bcb5,0x391c0cb3,0x4ed8aa4a,0x5b9cca4f,0x682e6ff3,0x748f82ee,0x78a5636f,0x84c87814,0x8cc70208,0x90befffa,0xa4506ceb,0xbef9a3f7,0xc67178f2];
      var H = [0x6a09e667,0xbb67ae85,0x3c6ef372,0xa54ff53a,0x510e527f,0x9b05688c,0x1f83d9ab,0x5be0cd19];
      var b = unescape(encodeURIComponent(str)), l = b.length, w = [], i, j;
      for (i = 0; i < l; i++) w[i >> 2] |= b.charCodeAt(i) << (24 - (i % 4) * 8);
      w[l >> 2] |= 0x80 << (24 - (l % 4) * 8);
      w[(((l + 8) >> 6) << 4) + 15] = l * 8;
      function r(x, n) { return (x >>> n) | (x << (32 - n)); }
      for (i = 0; i < w.length; i += 16) {
        var a = H.slice(), x = [];
        for (j = 0; j < 64; j++) {
          if (j < 16) x[j] = w[i + j] | 0;
          else x[j] = (x[j - 16] + (r(x[j - 15], 7) ^ r(x[j - 15], 18) ^ (x[j - 15] >>> 3)) + x[j - 7] + (r(x[j - 2], 17) ^ r(x[j - 2], 19) ^ (x[j - 2] >>> 10))) | 0;
          var t1 = (a[7] + (r(a[4], 6) ^ r(a[4], 11) ^ r(a[4], 25)) + ((a[4] & a[5]) ^ (~a[4] & a[6])) + K[j] + x[j]) | 0;
          var t2 = ((r(a[0], 2) ^ r(a[0], 13) ^ r(a[0], 22)) + ((a[0] & a[1]) ^ (a[0] & a[2]) ^ (a[1] & a[2]))) | 0;
          a = [(t1 + t2) | 0, a[0], a[1], a[2], (a[3] + t1) | 0, a[4], a[5], a[6]];
        }
        for (j = 0; j < 8; j++) H[j] = (H[j] + a[j]) | 0;
      }
      return H.map(function (h) { return ('00000000' + (h >>> 0).toString(16)).slice(-8); }).join('');
  }
  


  var LEVELS = { rdc: 'RDC', r1: 'R+1', r2: 'R+2', r3: 'R+3', r4: 'R+4', atelier: 'Atelier' };
  var ROOFS = { dalle: 'Toiture dalle', charpente: 'Toiture charpente', mixte: 'Charpente mixte', terrasse: 'Terrasses', cuisine: 'Cuisines', garage: 'Garages', engins: 'Engins et matériel', divers: 'Autres créations' };
  var ACCES = { premium: 'Premium', vip: 'VIP', libre: 'Gratuit' };
  var VIEWS = [['masse', 'Plan de masse'], ['plan', 'Vue en plan'], ['cote', 'Plan coté'], ['amenage', 'Plan aménagé'], ['electricite', 'Plan d’électricité'], ['plomberie', 'Plan de plomberie'], ['coupes', 'Coupes'], ['facades', 'Façades'], ['toiture', 'Plan de toiture'], ['vrd', 'Plan VRD'], ['perspective', 'Perspective'], ['animation', 'Animation intérieure (vidéo)']];
  var TITLES = { dash: 'Tableau de bord', suivi: 'Suivi : idées, commandes, soutiens', list: 'Mes plans', form: 'Ajouter / modifier', publish: 'Publication', settings: 'Réglages' };

  var Store = window.AdminStore;
  var gate = document.getElementById('gate');
  var app = document.getElementById('app');
  var plans = [];
  var views = {};      /* vues du plan en cours d'édition : { cle: dataURL } */

  function $(id) { return document.getElementById(id); }
  function el(tag, cls, text) { var n = document.createElement(tag); if (cls) n.className = cls; if (text != null) n.textContent = text; return n; }
  function say(node, msg, kind) { node.textContent = msg; node.className = 'status' + (kind ? ' is-' + kind : ''); }
  function ls(k, v) {
    try { if (v === undefined) return localStorage.getItem(k); localStorage.setItem(k, v); } catch (e) { return null; }
    return null;
  }
  function fmtDate(t) { return new Date(t).toLocaleString('fr-FR', { day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' }); }

  /* ── mot de passe (protection locale à ce navigateur) ── */
  function hash(pass, salt) {
    var data = salt + '|' + pass;
    if (window.crypto && crypto.subtle && window.TextEncoder) {
      return crypto.subtle.digest('SHA-256', new TextEncoder().encode(data)).then(function (buf) {
        return Array.prototype.map.call(new Uint8Array(buf), function (b) { return ('0' + b.toString(16)).slice(-2); }).join('');
      });
    }
    var h = 5381, i;
    for (i = 0; i < data.length; i++) h = ((h << 5) + h + data.charCodeAt(i)) | 0;
    return Promise.resolve('x' + (h >>> 0).toString(16));
  }
  function newSalt() { return Math.random().toString(36).slice(2) + Date.now().toString(36); }

  function initGate() {
    var creating = !ls('nehodo-admin-hash');
    $('gate-title').textContent = creating ? 'Créer ton accès' : 'Connexion';
    $('gate-lead').textContent = creating ? 'Choisis un mot de passe pour protéger le tableau de bord (6 caractères minimum).' : 'Entre ton mot de passe pour ouvrir le tableau de bord.';
    $('gate-label').textContent = creating ? 'Nouveau mot de passe' : 'Mot de passe';
    $('gate-confirm-row').hidden = !creating;
    $('gate-btn').textContent = creating ? 'Créer et entrer' : 'Se connecter';
    gate.hidden = false; app.hidden = true;

    $('gate-form').onsubmit = function (e) {
      e.preventDefault();
      var p = $('gate-pass').value, st = $('gate-status');
      if (creating) {
        if (p.length < 6) return say(st, 'Au moins 6 caractères.', 'error');
        if (p !== $('gate-pass2').value) return say(st, 'Les deux mots de passe sont différents.', 'error');
        var salt = newSalt();
        hash(p, salt).then(function (h) { ls('nehodo-admin-salt', salt); ls('nehodo-admin-hash', h); enter(); });
      } else {
        hash(p, ls('nehodo-admin-salt') || '').then(function (h) {
          if (h === ls('nehodo-admin-hash')) enter(); else say(st, 'Mot de passe incorrect.', 'error');
        });
      }
    };
  }

  function enter() {
    try { sessionStorage.setItem('nehodo-admin-open', '1'); } catch (e) { /* ignoré */ }
    gate.hidden = true; app.hidden = false;
    $('gate-pass').value = ''; $('gate-pass2').value = '';
    Store.list().then(function (list) { plans = list.map(function (p) { if (p.niveau === 'atelier') p.acces = 'libre'; else if (p.acces !== 'vip') p.acces = 'premium'; return p; }); renderAll(); tab('dash'); }).catch(function () {
      plans = []; renderAll(); tab('dash');
      say($('form-status'), 'Le stockage du navigateur est indisponible : les plans ne pourront pas être enregistrés ici.', 'error');
    });
  }

  $('btn-logout').addEventListener('click', function () {
    try { sessionStorage.removeItem('nehodo-admin-open'); } catch (e) { /* ignoré */ }
    initGate();
  });

  /* ── sections ── */
  function tab(name) {
    Array.prototype.forEach.call(document.querySelectorAll('#side-nav button'), function (b) { b.classList.toggle('is-on', b.getAttribute('data-tab') === name); });
    Array.prototype.forEach.call(document.querySelectorAll('[data-view]'), function (v) { v.hidden = v.getAttribute('data-view') !== name; });
    $('view-title').textContent = TITLES[name];
    $('btn-new').hidden = name === 'form';
  }
  Array.prototype.forEach.call(document.querySelectorAll('#side-nav button'), function (b) {
    b.addEventListener('click', function () { tab(b.getAttribute('data-tab')); });
  });

  /* ── suivi des changements non publiés ── */
  function changed() { ls('nehodo-admin-changed', String(Date.now())); renderDash(); }

  /* ── tableau de bord ── */
  function renderAll() { renderDash(); renderTable(); }

  function count(fn) { return plans.filter(fn).length; }

  function bars(id, entries) {
    var box = $(id); box.textContent = '';
    var max = Math.max.apply(null, entries.map(function (e) { return e[1]; }).concat([1]));
    entries.forEach(function (e) {
      var row = el('div', 'bar');
      row.appendChild(el('span', null, e[0]));
      var tr = el('div', 'bar-track'), fl = el('div', 'bar-fill');
      fl.style.width = (e[1] / max * 100) + '%';
      tr.appendChild(fl); row.appendChild(tr);
      row.appendChild(el('b', null, String(e[1])));
      box.appendChild(row);
    });
  }

  function renderDash() {
    var pub = count(function (p) { return p.statut !== 'brouillon'; });
    var s = $('stats'); s.textContent = '';
    [['Plans', plans.length], ['Publiés', pub], ['Brouillons', plans.length - pub],
     ['Premium', count(function (p) { return p.acces !== 'vip' && p.acces !== 'libre'; })],
     ['VIP', count(function (p) { return p.acces === 'vip'; })]].forEach(function (x) {
      var d = el('div', 'stat'); d.appendChild(el('strong', null, String(x[1]))); d.appendChild(el('span', null, x[0])); s.appendChild(d);
    });

    bars('bars-level', Object.keys(LEVELS).map(function (k) { return [LEVELS[k], count(function (p) { return p.niveau === k; })]; }));
    bars('bars-roof', Object.keys(ROOFS).map(function (k) { return [ROOFS[k], count(function (p) { return p.toiture === k; })]; }));
    bars('bars-acces', Object.keys(ACCES).map(function (k) { return [ACCES[k], count(function (p) { return (p.acces === 'vip' ? 'vip' : (p.acces === 'libre' ? 'libre' : 'premium')) === k; })]; }));

    /* état de la publication */
    var b = $('pub-banner'), ch = Number(ls('nehodo-admin-changed')) || 0, ex = Number(ls('nehodo-admin-exported')) || 0;
    b.textContent = ''; b.className = 'banner';
    if (!plans.length) {
      b.textContent = 'Aucun plan pour le moment. Ajoute ton premier plan, ou importe un plans-data.js existant dans « Publication ».';
    } else if (!ex || ch > ex) {
      b.className = 'banner is-warn';
      b.appendChild(document.createTextNode('Des plans ne sont pas encore exportés pour le site.'));
      var go = el('button', 'link', 'Aller à Publication →'); go.type = 'button';
      go.addEventListener('click', function () { tab('publish'); });
      b.appendChild(go);
    } else {
      b.className = 'banner is-ok';
      b.textContent = 'Tout est exporté. Dernière publication : ' + fmtDate(ex) + '.';
    }

    var list = $('recent'); list.textContent = '';
    var recent = plans.slice().sort(function (a, c) { return (c.date || 0) - (a.date || 0); }).slice(0, 5);
    $('recent-empty').hidden = recent.length > 0;
    recent.forEach(function (p) {
      var li = el('li');
      li.appendChild(thumb(p));
      var g = el('div', 'grow');
      g.appendChild(el('strong', null, p.titre || 'Sans titre'));
      g.appendChild(el('small', null, (LEVELS[p.niveau] || '') + ' · ' + (ROOFS[p.toiture] || '') + ' · ' + (ACCES[p.acces] || '') + (p.statut === 'brouillon' ? ' · Brouillon' : '')));
      li.appendChild(g);
      var e = el('button', 'link', 'Modifier'); e.type = 'button'; e.addEventListener('click', function () { edit(p); });
      li.appendChild(e);
      list.appendChild(li);
    });
  }

  function thumb(p) {
    var img = (p.vues && (p.vues.perspective || p.vues.facades || p.vues.plan || p.vues.masse)) || '';
    if (!img) return el('span', 'mini blank');
    var im = document.createElement('img'); im.src = img; im.alt = ''; im.className = 'mini';
    return im;
  }

  /* ── liste des plans ── */
  function renderTable() {
    var t = $('admin-table'); t.textContent = '';
    $('admin-empty').hidden = plans.length > 0;
    if (!plans.length) return;
    var head = el('tr');
    ['Plan', 'Niveau', 'Toiture', 'Accès', 'Vues', 'Statut', ''].forEach(function (h) { head.appendChild(el('th', null, h)); });
    var thead = el('thead'); thead.appendChild(head); t.appendChild(thead);
    var body = el('tbody');
    plans.slice().sort(function (a, b) { return (b.date || 0) - (a.date || 0); }).forEach(function (p) {
      var tr = el('tr');
      var c1 = el('td', 'first'); c1.appendChild(thumb(p)); c1.appendChild(el('span', null, p.titre || 'Sans titre')); tr.appendChild(c1);
      tr.appendChild(el('td', null, LEVELS[p.niveau] || ''));
      tr.appendChild(el('td', null, ROOFS[p.toiture] || ''));
      tr.appendChild(el('td', null, ACCES[p.acces] || ''));
      tr.appendChild(el('td', null, String(Object.keys(p.vues || {}).filter(function (k) { return p.vues[k]; }).length) + ' / 5'));
      tr.appendChild(el('td', null, p.statut === 'brouillon' ? 'Brouillon' : 'Publié'));
      var act = el('td', 'acts');
      var e = el('button', 'link', 'Modifier'); e.type = 'button'; e.addEventListener('click', function () { edit(p); });
      var d = el('button', 'link danger', 'Supprimer'); d.type = 'button'; d.addEventListener('click', function () { del(p); });
      act.appendChild(e); act.appendChild(d); tr.appendChild(act);
      body.appendChild(tr);
    });
    t.appendChild(body);
  }

  function del(p) {
    if (!window.confirm('Supprimer « ' + (p.titre || 'ce plan') + ' » ?')) return;
    Store.remove(p.id).then(function () {
      plans = plans.filter(function (x) { return x.id !== p.id; }); changed(); renderTable();
    });
  }

  /* ── formulaire ── */
  var form = $('plan-form');

  function buildViewSlots() {
    var g = $('views-grid'); g.textContent = '';
    VIEWS.forEach(function (v) {
      var slot = el('div', 'view-slot');
      slot.setAttribute('data-key', v[0]);
      slot.appendChild(el('span', 'view-label', v[1]));
      if (v[0] === 'animation') {
        var ti = document.createElement('input'); ti.type = 'text'; ti.placeholder = 'videos/mon-animation.mp4'; ti.value = views.animation || '';
        ti.addEventListener('input', function () { if (ti.value.trim()) views.animation = ti.value.trim(); else delete views.animation; });
        slot.appendChild(el('div', 'view-box', 'Vidéo : mets le fichier dans le dossier videos/ du site, puis écris son chemin ci-dessous.'));
        slot.appendChild(ti); g.appendChild(slot); return;
      }
      slot.appendChild(el('div', 'view-box'));
      var row = el('div', 'view-actions');
      var lab = el('label', 'file-link', 'Choisir une image');
      var inp = document.createElement('input'); inp.type = 'file'; inp.accept = 'image/*';
      inp.addEventListener('change', function () {
        if (!inp.files[0]) return;
        shrink(inp.files[0]).then(function (url) { views[v[0]] = url; paintSlot(slot); }).catch(function () { say($('form-status'), 'Image illisible.', 'error'); });
        inp.value = '';
      });
      lab.appendChild(inp); row.appendChild(lab);
      var rm = el('button', 'link danger', 'Retirer'); rm.type = 'button';
      rm.addEventListener('click', function () { delete views[v[0]]; paintSlot(slot); });
      row.appendChild(rm); slot.appendChild(row);
      g.appendChild(slot); paintSlot(slot);
    });
  }

  function paintSlot(slot) {
    var key = slot.getAttribute('data-key'), box = slot.querySelector('.view-box');
    box.textContent = '';
    if (views[key]) { var im = document.createElement('img'); im.src = views[key]; im.alt = ''; box.appendChild(im); }
    else box.appendChild(el('span', null, 'Aucune image'));
  }

  function shrink(file) {
    return new Promise(function (resolve, reject) {
      var fr = new FileReader();
      fr.onerror = reject;
      fr.onload = function () {
        var img = new Image();
        img.onerror = reject;
        img.onload = function () {
          var max = 1600, r = Math.min(1, max / Math.max(img.width, img.height));
          var c = document.createElement('canvas');
          c.width = Math.round(img.width * r); c.height = Math.round(img.height * r);
          var g = c.getContext('2d');
          g.fillStyle = '#ffffff'; g.fillRect(0, 0, c.width, c.height);
          g.drawImage(img, 0, 0, c.width, c.height);
          resolve(c.toDataURL('image/jpeg', 0.82));
        };
        img.src = fr.result;
      };
      fr.readAsDataURL(file);
    });
  }

  function resetForm() {
    form.reset(); form.elements.id.value = ''; views = {};
    $('form-title').textContent = 'Nouveau plan';
    say($('form-status'), '');
    buildViewSlots();
  }

  function edit(p) {
    resetForm();
    $('form-title').textContent = 'Modifier le plan';
    ['id', 'titre', 'niveau', 'toiture', 'acces', 'surface', 'chambres', 'sdb', 'terrain', 'prix', 'format', 'statut', 'description'].forEach(function (k) {
      if (form.elements[k] && p[k] != null) form.elements[k].value = p[k];
    });
    views = JSON.parse(JSON.stringify(p.vues || {}));
    buildViewSlots();
    tab('form'); window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  $('btn-new').addEventListener('click', function () { resetForm(); tab('form'); });
  $('btn-cancel').addEventListener('click', function () { resetForm(); tab('list'); });

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    var st = $('form-status'), f = form.elements;
    if (!f.titre.value.trim()) return say(st, 'Donne un titre au plan.', 'error');
    var plan = {
      id: f.id.value || 'p' + Date.now().toString(36),
      titre: f.titre.value.trim(), niveau: f.niveau.value, toiture: f.toiture.value, acces: f.acces.value,
      surface: Number(f.surface.value) || 0, chambres: Number(f.chambres.value) || 0, sdb: Number(f.sdb.value) || 0,
      terrain: f.terrain.value.trim(), prix: Number(f.prix.value) || 0, format: f.format.value.trim(), statut: f.statut.value,
      description: f.description.value.trim(), vues: views, date: Date.now()
    };
    Store.put(plan).then(function () {
      var i = -1; plans.forEach(function (x, n) { if (x.id === plan.id) i = n; });
      if (i >= 0) plans[i] = plan; else plans.push(plan);
      changed(); renderTable(); resetForm(); tab('list');
    }).catch(function () { say(st, 'Enregistrement impossible : stockage plein ou indisponible. Exporte tes plans puis réduis les images.', 'error'); });
  });

  /* ── publication ── */
  $('btn-export').addEventListener('click', function () {
    var js = '/* Plans NEHODO.22 — exporté le ' + new Date().toLocaleString('fr-FR') + ' */\nwindow.NEHODO_PLANS = ' + JSON.stringify(plans) + ';\n';
    var blob = new Blob([js], { type: 'text/javascript' });
    var a = document.createElement('a');
    a.href = URL.createObjectURL(blob); a.download = 'plans-data.js';
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(function () { URL.revokeObjectURL(a.href); }, 2000);
    ls('nehodo-admin-exported', String(Date.now())); renderDash();
  });

  $('file-import').addEventListener('change', function (e) {
    var file = e.target.files[0], st = $('import-status');
    if (!file) return;
    var fr = new FileReader();
    fr.onload = function () {
      try {
        var txt = String(fr.result), a = txt.indexOf('['), b = txt.lastIndexOf(']');
        var arr = JSON.parse(txt.slice(a, b + 1));
        if (!Array.isArray(arr)) throw new Error('format');
        if (!window.confirm('Remplacer les plans actuels par les ' + arr.length + ' plans du fichier ?')) return;
        Store.replaceAll(arr).then(function () {
          plans = arr; ls('nehodo-admin-exported', String(Date.now())); ls('nehodo-admin-changed', '0');
          renderAll(); say(st, arr.length + ' plans importés.', 'ok');
        });
      } catch (err) { say(st, 'Fichier non reconnu.', 'error'); }
    };
    fr.readAsText(file); e.target.value = '';
  });

  $('btn-wipe').addEventListener('click', function () {
    if (!window.confirm('Effacer tous les plans de ce navigateur ? Cette action est définitive.')) return;
    Store.replaceAll([]).then(function () { plans = []; changed(); renderTable(); });
  });

  /* ── réglages ── */
  $('pass-form').addEventListener('submit', function (e) {
    e.preventDefault();
    var f = e.target.elements, st = $('pass-status');
    if (f.new.value.length < 6) return say(st, 'Au moins 6 caractères.', 'error');
    hash(f.old.value, ls('nehodo-admin-salt') || '').then(function (h) {
      if (h !== ls('nehodo-admin-hash')) return say(st, 'Mot de passe actuel incorrect.', 'error');
      var salt = newSalt();
      hash(f.new.value, salt).then(function (nh) { ls('nehodo-admin-salt', salt); ls('nehodo-admin-hash', nh); e.target.reset(); say(st, 'Mot de passe mis à jour.', 'ok'); });
    });
  });

  /* ── démarrage ── */
  buildViewSlots();
  var open = false;
  try { open = sessionStorage.getItem('nehodo-admin-open') === '1'; } catch (e) { /* ignoré */ }
  if (open && ls('nehodo-admin-hash')) enter(); else initGate();

  /* ── accès propriétaire sur le site public ── */
  var ownerForm = document.getElementById('owner-form');
  if (ownerForm) ownerForm.addEventListener('submit', function (e) {
    e.preventDefault();
    var ph = ownerForm.elements.phrase.value.trim();
    var out = document.getElementById('owner-out');
    if (ph.length < 8) { out.hidden = false; out.textContent = 'Choisis une phrase d\'au moins 8 caractères.'; return; }
    out.hidden = false;
    out.innerHTML = '<p class="hint"><b>1.</b> Dans <code>config.js</code> du site public, ajoute cette ligne dans <code>window.NEHODO_CONFIG</code> :</p><p><code id="owner-line" style="user-select:all;word-break:break-all"></code></p><p class="hint"><b>2.</b> Sur chaque appareil où tu veux l\'accès total, ouvre une fois le site avec <code id="owner-url" style="user-select:all"></code>. Une pastille « Mode propriétaire » apparaît ; tu peux la fermer pour revoir le site comme un visiteur.</p>';
    document.getElementById('owner-line').textContent = "ownerHash: '" + sha256('nehodo22|' + ph) + "',";
    document.getElementById('owner-url').textContent = 'index.html#owner=' + ph;
  });
})();
