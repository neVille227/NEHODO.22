/* NEHODO.22 — essai gratuit de 72 h et règles d'accès aux plans
   ⚠ Tout est enregistré dans le navigateur du visiteur (localStorage) : c'est un cadre simple, pas une sécurité.
   Pour des règles inviolables (essai unique par personne, abonnements payés), il faudra un serveur avec comptes. */
(function () {
  'use strict';
  var KEY = 'nehodo-access';
  var TRIAL_MS = 72 * 3600 * 1000;
  var RANK = { premium: 1, vip: 2 };

  function load() {
    try { var s = JSON.parse(localStorage.getItem(KEY) || '{}'); return s && typeof s === 'object' ? s : {}; } catch (e) { return {}; }
  }
  function save(s) { try { localStorage.setItem(KEY, JSON.stringify(s)); } catch (e) { /* ignoré */ } }

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
  

  var OWN = 'nehodo-owner';
  function ownerOn() { try { return localStorage.getItem(OWN) === '1'; } catch (e) { return false; } }

  /* connexion propriétaire : #owner=phrase (comparée à ownerHash de config.js) */
  (function () {
    var m = /[#&]owner=([^&]+)/.exec(window.location.hash || '');
    if (!m) return;
    var cfg = window.NEHODO_CONFIG || {};
    try {
      if (cfg.ownerHash && sha256('nehodo22|' + decodeURIComponent(m[1])) === cfg.ownerHash) localStorage.setItem(OWN, '1');
    } catch (e) { /* ignoré */ }
    try { history.replaceState(null, '', window.location.pathname + window.location.search); } catch (e) { /* ignoré */ }
  })();

  var A = {
    isOwner: ownerOn,
    TRIAL_MS: TRIAL_MS,
    /* { tier, active, expired, remaining } */
    status: function () {
      if (ownerOn()) return { tier: 'vip', active: true, expired: false, remaining: 0, owner: true };
      var s = load();
      /* abonnement payé (FedaPay) : prioritaire sur l'essai */
      if (s.paid && s.paid.end > Date.now()) return { tier: s.paid.tier, active: true, expired: false, paid: true, remaining: s.paid.end - Date.now(), end: s.paid.end, ref: s.paid.ref || '' };
      if (!s.trialStart) return { tier: 'premium', active: false, expired: false, remaining: 0 };
      var left = s.trialStart + TRIAL_MS - Date.now();
      return { tier: s.tier || 'premium', active: left > 0, expired: left <= 0, remaining: Math.max(0, left) };
    },
    /* démarre l'essai (une seule fois par appareil) */
    startTrial: function (tier) {
      if (ownerOn()) return false;
      var s = load();
      if (s.trialStart) return false;
      s.tier = tier === 'vip' ? 'vip' : 'premium';
      s.trialStart = Date.now();
      s.opened = {};
      save(s);
      A.banner();
      return true;
    },
    /* abonnement payé : 30 jours (les jours restants sont conservés si on prolonge la même formule) */
    activate: function (tier, ref, days) {
      var s = load(), t = tier === 'vip' ? 'vip' : 'premium', now = Date.now();
      var base = (s.paid && s.paid.tier === t && s.paid.end > now) ? s.paid.end : now;
      s.paid = { tier: t, end: base + (days || 30) * 86400000, ref: ref || '' };
      save(s); A.banner();
      try { document.dispatchEvent(new CustomEvent('nehodo-access-change')); } catch (e) { /* ignoré */ }
    },
    /* achat d'un plan à l'unité : les 12 vues restent acquises sur cet appareil */
    owns: function (id) { var b = load().bought || {}; return !!b[id]; },
    addPurchase: function (id, ref) {
      var s = load(); s.bought = s.bought || {}; s.bought[id] = { ref: ref || '', t: Date.now() }; save(s);
      try { document.dispatchEvent(new CustomEvent('nehodo-access-change')); } catch (e) { /* ignoré */ }
    },
    /* annule l'abonnement payé sur cet appareil */
    cancelPaid: function () {
      var s = load(); delete s.paid; save(s); A.banner();
      try { document.dispatchEvent(new CustomEvent('nehodo-access-change')); } catch (e) { /* ignoré */ }
    },
    /* un plan Premium/VIP est-il couvert par l'essai en cours ? */
    covers: function (planAcces) {
      var st = A.status();
      return st.active && RANK[st.tier] >= RANK[planAcces === 'vip' ? 'vip' : 'premium'];
    },
    wasOpened: function (id, view) { var o = load().opened || {}; return !!o[id + ':' + view]; },
    markOpened: function (id, view) {
      var s = load(); s.opened = s.opened || {}; s.opened[id + ':' + view] = Date.now(); save(s);
    },
    fmt: function (ms) {
      var h = Math.floor(ms / 3600000), m = Math.floor((ms % 3600000) / 60000);
      if (h >= 48) return Math.floor(h / 24) + ' j ' + (h % 24) + ' h';
      return h + ' h ' + (m < 10 ? '0' : '') + m + ' min';
    },
    /* pastille « essai en cours » sur toutes les pages */
    banner: function () {
      var st = A.status(), b = document.getElementById('trial-banner');
      if (st.owner) {
        if (!b) { b = document.createElement('div'); b.id = 'trial-banner'; b.className = 'trial-banner'; b.setAttribute('role', 'status'); document.body.appendChild(b); }
        b.innerHTML = '<i></i><span>Mode propriétaire · accès total</span><button type="button" aria-label="Quitter le mode propriétaire" title="Voir le site comme un visiteur">×</button>';
        b.querySelector('button').onclick = function () { try { localStorage.removeItem(OWN); } catch (e) { /* ignoré */ } window.location.reload(); };
        return;
      }
      if (!st.active) { if (b) b.remove(); return; }
      if (!b) {
        b = document.createElement('div'); b.id = 'trial-banner'; b.className = 'trial-banner';
        b.setAttribute('role', 'status');
        document.body.appendChild(b);
      }
      b.innerHTML = '<i></i><span>' + (st.paid ? '' : 'Essai ') + (st.tier === 'vip' ? 'VIP' : 'Premium') + ' · ' + A.fmt(st.remaining) + ' restantes</span>';
    }
  };
  window.NehodoAccess = A;

  function init() { A.banner(); setInterval(A.banner, 60000); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
