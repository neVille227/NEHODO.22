/* NEHODO.22 — abonnements (essai 72 h, Premium, VIP) et paiement FedaPay */
(function () {
  'use strict';

  var cfg = window.NEHODO_CONFIG || {};
  var fp = cfg.fedapay || {};
  var tarifs = cfg.tarifs || { premium: 5.13, vip: 10.25 };
  var NAMES = { premium: 'Premium', vip: 'VIP' };

  function $(s, r) { return (r || document).querySelector(s); }
  function $$(s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); }
  function el(tag, cls, text) { var n = document.createElement(tag); if (cls) n.className = cls; if (text != null) n.textContent = text; return n; }
  function fmtNum(n) { return String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, ' '); }
  function toXOF(usd) { return Math.round(usd * (fp.tauxXOF || 585) / 25) * 25; }
  function xofOf(o) { return o.amountXOF ? Math.round(o.amountXOF) : toXOF(o.amountUSD); }

  function A() { return window.NehodoAccess; }
  function dateFr(t) { return new Date(t).toLocaleDateString(({fr:'fr-FR',en:'en-GB',es:'es-ES',pt:'pt-PT',ar:'ar'})[window.NEHODO_LANG_CODE||'fr'], { day: 'numeric', month: 'long', year: 'numeric' }); }
  function trialUsed() { var st = A() && A().status(); return !!(st && (st.expired || st.active) ); }

  /* ── message flottant ── */
  var toastTimer = 0;
  function toast(msg) {
    var t = $('#toast');
    if (!t) { t = el('div', 'toast'); t.id = 'toast'; t.setAttribute('role', 'status'); document.body.appendChild(t); }
    t.textContent = msg; t.classList.add('is-on');
    clearTimeout(toastTimer); toastTimer = setTimeout(function () { t.classList.remove('is-on'); }, 4200);
  }

  /* ── fenêtre de paiement ── */
  var modal = null, last = null;

  function ensureModal() {
    if (modal) return;
    modal = el('div', 'modal'); modal.hidden = true;
    modal.setAttribute('role', 'dialog'); modal.setAttribute('aria-modal', 'true'); modal.setAttribute('aria-labelledby', 'pay-title');
    modal.innerHTML =
      '<div class="modal-backdrop" data-close></div>' +
      '<div class="modal-box">' +
      '<button class="modal-close" type="button" data-close aria-label="Fermer">×</button>' +
      '<p class="eyebrow">PAIEMENT SÉCURISÉ</p><h2 id="pay-title"></h2>' +
      '<div class="pay-sum"><span id="pay-label"></span><strong id="pay-amount"></strong></div>' +
      '<form class="form" id="pay-form" novalidate>' +
      '<div class="field-row"><label class="field"><span>Ton nom</span><input name="nom" type="text" autocomplete="name" required></label>' +
      '<label class="field"><span>E-mail</span><input name="email" type="email" autocomplete="email" required></label></div>' +
      '<label class="field"><span>Téléphone (facultatif)</span><input name="tel" type="tel" autocomplete="tel"></label>' +
      '<div class="net-box"><p class="net-title">Réseaux acceptés <small>(selon ton pays)</small></p>' +
      '<div class="net-group"><span>Mobile Money Bénin</span><b>MTN MoMo</b><b>Moov Money</b><b>Celtiis Cash</b></div>' +
      '<div class="net-group"><span>Autres pays d’Afrique de l’Ouest</span><b>Orange Money</b><b>Wave</b><b>T-Money</b><b>Flooz</b></div>' +
      '<div class="net-group"><span>Cartes (universel)</span><b>Visa</b><b>Mastercard</b></div></div>' +
      '<button class="button button-primary" type="submit" id="pay-go">Payer avec FedaPay</button>' +
      '<p class="form-status" id="pay-status" role="status"></p>' +
      '<p class="hint">Tu choisis ton réseau dans la fenêtre FedaPay. PayPal ou virement : <a class="text-link" id="pay-alt" href="contact.html" data-transition>écris-moi</a>.</p>' +
      '</form></div>';
    document.body.appendChild(modal);
    modal.addEventListener('click', function (e) { if (e.target.hasAttribute('data-close')) closeModal(); });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && modal && !modal.hidden) closeModal(); });
    $('#pay-form', modal).addEventListener('submit', function (e) { e.preventDefault(); go(); });
  }

  function closeModal() {
    if (!modal) return;
    modal.hidden = true; document.documentElement.classList.remove('modal-open');
    if (last && last.focus) last.focus();
  }

  var job = null;

  function pay(opts) {
    ensureModal(); job = opts; last = document.activeElement;
    var xof = xofOf(opts);
    $('#pay-title', modal).textContent = opts.title || 'Paiement';
    $('#pay-label', modal).textContent = opts.label;
    $('#pay-amount', modal).textContent = fmtNum(xof) + ' FCFA' + (opts.amountUSD ? '  ·  ' + opts.amountUSD + ' $' : '');
    $('#pay-go', modal).textContent = 'Payer ' + fmtNum(xof) + ' FCFA avec FedaPay';
    $('#pay-alt', modal).href = 'contact.html?sujet=' + encodeURIComponent(opts.plan ? NAMES[opts.plan] : (opts.title || 'Soutien'));
    var f = $('#pay-form', modal);
    if (opts.customer) {
      if (opts.customer.name && !f.elements.nom.value) f.elements.nom.value = opts.customer.name;
      if (opts.customer.email && !f.elements.email.value) f.elements.email.value = opts.customer.email;
    }
    setStatus('', '');
    $('#pay-go', modal).disabled = false;
    modal.hidden = false; document.documentElement.classList.add('modal-open');
    setTimeout(function () { var i = f.elements.nom; if (i) i.focus(); }, 60);
  }

  function setStatus(msg, cls) { var s = $('#pay-status', modal); s.textContent = msg; s.className = 'form-status' + (cls ? ' ' + cls : ''); }

  function loadFedaPay() {
    return new Promise(function (resolve, reject) {
      if (window.FedaPay) return resolve(window.FedaPay);
      var s = document.createElement('script');
      s.src = 'https://cdn.fedapay.com/checkout.js?v=1.1.7';
      s.onload = function () { window.FedaPay ? resolve(window.FedaPay) : reject(new Error('FedaPay indisponible')); };
      s.onerror = function () { reject(new Error('Impossible de charger FedaPay')); };
      document.head.appendChild(s);
    });
  }

  function verify(id) {
    if (!fp.verifUrl) return Promise.resolve(true);          /* sans serveur : on fait confiance à la fenêtre FedaPay */
    return fetch(fp.verifUrl + (fp.verifUrl.indexOf('?') > -1 ? '&' : '?') + 'id=' + encodeURIComponent(id))
      .then(function (r) { return r.json(); })
      .then(function (j) { return j && j.status === 'approved'; });
  }

  function go() {
    var f = $('#pay-form', modal);
    var nom = f.elements.nom.value.trim(), email = f.elements.email.value.trim(), tel = f.elements.tel.value.trim();
    if (!nom || !/^\S+@\S+\.\S+$/.test(email)) { setStatus('Merci d’indiquer ton nom et un e-mail valide.', 'is-error'); return; }
    if (!fp.cle) {
      setStatus('Le paiement en ligne arrive très bientôt. En attendant, écris-moi : je te donne le numéro Mobile Money ou le lien PayPal.', 'is-error');
      try { console.info('NEHODO.22 : ajoute ta clé publique FedaPay dans config.js (fedapay.cle) pour activer le paiement.'); } catch (e) { /* ignoré */ }
      return;
    }
    var btn = $('#pay-go', modal); btn.disabled = true; setStatus('Ouverture du paiement…', '');
    var parts = nom.split(/\s+/), customer = { email: email, firstname: parts.slice(0, -1).join(' ') || parts[0], lastname: parts.length > 1 ? parts[parts.length - 1] : parts[0] };
    if (tel) customer.phone_number = { number: tel.replace(/[^\d+]/g, ''), country: 'bj' };
    var xof = xofOf(job);
    loadFedaPay().then(function (FedaPay) {
      var widget = FedaPay.init({
        public_key: fp.cle,
        transaction: { amount: xof, description: job.label },
        customer: customer,
        currency: { iso: 'XOF' },
        onComplete: function (resp) {
          btn.disabled = false;
          var ok = resp && resp.reason === FedaPay.CHECKOUT_COMPLETED && resp.transaction && resp.transaction.status === 'approved';
          if (!ok) { setStatus('Paiement non terminé. Tu peux réessayer quand tu veux.', 'is-error'); return; }
          var ref = String(resp.transaction.id || '');
          setStatus('Paiement reçu, vérification…', '');
          verify(ref).then(function (valid) {
            if (!valid) { setStatus('Le paiement n’a pas pu être confirmé. Écris-moi avec ta référence : ' + ref, 'is-error'); return; }
            closeModal();
            if (job.onSuccess) job.onSuccess(ref);
          }).catch(function () { setStatus('Vérification impossible pour le moment. Garde ta référence : ' + ref, 'is-error'); });
        }
      });
      widget.open();
    }).catch(function (err) { btn.disabled = false; setStatus(err.message + '. Vérifie ta connexion.', 'is-error'); });
  }

  function subscribe(plan) {
    var usd = tarifs[plan];
    if (!usd) return;
    pay({
      title: 'Formule ' + NAMES[plan], plan: plan, amountUSD: usd,
      label: NAMES[plan] + ' — ' + (cfg.dureeJours || 30) + ' jours d’accès',
      onSuccess: function (ref) {
        A().activate(plan, ref, cfg.dureeJours || 30);
        toast('Merci ! Ton abonnement ' + NAMES[plan] + ' est actif jusqu’au ' + dateFr(A().status().end) + '.');
        refreshUI();
      }
    });
  }

  /* ── affichage (panneau de la page Abonnements, prix en FCFA, boutons) ── */
  function status() {
    var box = $('#sub-status'); if (!box || !A()) return;
    var s = A().status(); box.textContent = '';
    box.classList.toggle('is-active', !!s.active);
    var t = el('p', 'sub-title');
    if (s.owner) { t.textContent = 'Mode propriétaire : accès total.'; box.appendChild(t); return; }
    if (!s.active) {
      t.textContent = 'Aucune formule active pour le moment.';
      box.appendChild(t);
      box.appendChild(el('p', 'sub-line', s.expired ? 'Ton essai gratuit est terminé. Abonne-toi pour retrouver les plans Premium et VIP.' : 'Lance un essai gratuit de 72 h : aucun paiement demandé.'));
      return;
    }
    t.textContent = 'Formule ' + NAMES[s.tier] + (s.paid ? '' : ' — essai gratuit') + ' active';
    box.appendChild(t);
    box.appendChild(el('p', 'sub-line', 'Il te reste ' + A().fmt(s.remaining) + (s.paid ? ' (jusqu’au ' + dateFr(s.end) + ').' : '.') + (s.ref ? ' Référence : ' + s.ref : '')));
    var row = el('div', 'sub-actions');
    var go = el('a', 'button button-primary', 'Voir les plans'); go.href = 'projets.html'; go.setAttribute('data-transition', ''); row.appendChild(go);
    if (s.paid) {
      var b = el('button', 'button button-ghost', 'Retirer cet abonnement de cet appareil'); b.type = 'button';
      b.addEventListener('click', function () { if (window.confirm('Retirer l’abonnement de cet appareil ? Ton paiement n’est pas remboursé.')) { A().cancelPaid(); refreshUI(); toast('Abonnement retiré de cet appareil.'); } });
      row.appendChild(b);
    }
    box.appendChild(row);
  }

  function buttons() {
    var s = A() ? A().status() : {};
    $$('[data-subscribe]').forEach(function (b) {
      var plan = b.getAttribute('data-subscribe'), same = s.paid && s.tier === plan;
      b.textContent = (same ? 'Prolonger de ' + (cfg.dureeJours || 30) + ' jours' : 'S’abonner') + ' · ' + fmtNum(toXOF(tarifs[plan])) + ' FCFA';
    });
    $$('[data-fcfa]').forEach(function (n) { n.textContent = '≈ ' + fmtNum(toXOF(tarifs[n.getAttribute('data-fcfa')])) + ' FCFA / mois'; });
  }

  function refreshUI() { status(); buttons(); }

  document.addEventListener('click', function (e) {
    var s = e.target.closest('[data-subscribe]');
    if (s) { e.preventDefault(); subscribe(s.getAttribute('data-subscribe')); }
  });
  document.addEventListener('nehodo-access-change', refreshUI);

  /* ── page Soutenir : paiement FedaPay du montant choisi ── */
  function support() {
    var b = $('#pay-support'); if (!b) return;
    var form = $('[data-mail-form="soutien"]');
    b.addEventListener('click', function () {
      var usd = Number(String(form.elements.montant.value).replace(',', '.'));
      var st = $('.form-status', form);
      if (!(usd > 0)) { st.textContent = 'Choisis d’abord un montant.'; st.className = 'form-status is-error'; return; }
      var c = form.elements.contact.value.trim();
      pay({
        title: 'Soutenir NEHODO.22', amountUSD: usd, label: 'Soutien à NEHODO.22',
        customer: { name: form.elements.nom.value.trim(), email: /@/.test(c) ? c : '' },
        onSuccess: function (ref) { st.textContent = 'Merci pour ton soutien ! Référence : ' + ref; st.className = 'form-status is-ok'; toast('Merci pour ton soutien !'); }
      });
    });
  }

  /* prix d'un plan à l'unité : champ « prix » ($) du plan, sinon prix du niveau (config.prixPlans, FCFA) */
  function planPrice(p) {
    var xof = Number(p && p.prix) > 0 ? toXOF(Number(p.prix)) : ((cfg.prixPlans || {})[p && p.niveau] || 0);
    return { xof: xof, label: xof ? fmtNum(xof) + ' FCFA' : 'sur devis' };
  }
  function buyPlan(p) {
    var pr = planPrice(p);
    if (!pr.xof) { window.location.href = 'contact.html?sujet=' + encodeURIComponent('Achat du plan ' + (p.titre || '')); return; }
    pay({
      title: 'Acheter ce plan', amountXOF: pr.xof, label: 'Plan « ' + (p.titre || 'sans titre') + ' » — les 12 vues, accès à vie',
      onSuccess: function (ref) { A().addPurchase(p.id || p.titre, ref); toast('Merci ! Le plan « ' + (p.titre || '') + ' » est à toi, toutes les vues sont ouvertes.'); }
    });
  }

  window.NehodoPay = { open: pay, subscribe: subscribe, buyPlan: buyPlan, planPrice: planPrice };

  function init() { refreshUI(); support(); setInterval(refreshUI, 60000); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
