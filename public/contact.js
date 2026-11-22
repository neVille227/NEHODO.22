/* NEHODO.22 — formulaires « Proposition », « Idées » et « Soutien » (ouvrent le courrier électronique) */
(function () {
  'use strict';
  var cfg = window.NEHODO_CONFIG || {};
  var email = cfg.email || 'contact@nehodo22.com';

  function val(form, name) { var f = form.elements[name]; return f ? String(f.value || '').trim() : ''; }

  function build(kind, form) {
    var lines = [], subject;
    if (kind === 'proposition') {
      subject = 'Proposition — ' + val(form, 'nom');
      lines.push('PROPOSITION / DEMANDE', '', 'Nom : ' + val(form, 'nom'), 'Contact : ' + val(form, 'contact'));
      if (val(form, 'niveau')) lines.push('Niveau : ' + val(form, 'niveau'));
      if (val(form, 'toiture')) lines.push('Toiture : ' + val(form, 'toiture'));
      if (val(form, 'surface')) lines.push('Surface : ' + val(form, 'surface') + ' m²');
      if (val(form, 'chambres')) lines.push('Chambres : ' + val(form, 'chambres'));
    } else if (kind === 'perso') {
      subject = 'Plan sur mesure — ' + val(form, 'nom');
      lines.push('DEMANDE DE PLAN SUR MESURE', '', 'Nom : ' + val(form, 'nom'), 'Contact : ' + val(form, 'contact'));
      [['lieu', 'Lieu du terrain'], ['terrain', 'Terrain'], ['niveau', 'Niveau'], ['toiture', 'Toiture'], ['surface', 'Surface (m²)'], ['chambres', 'Chambres'], ['sdb', 'Salles de bain'], ['style', 'Style'], ['budget', 'Budget']].forEach(function (f) {
        if (val(form, f[0])) lines.push(f[1] + ' : ' + val(form, f[0]));
      });
      var pcs = Array.prototype.map.call(form.querySelectorAll('input[name="pieces"]:checked'), function (x) { return x.value; });
      if (pcs.length) lines.push('Pièces / extras : ' + pcs.join(', '));
    } else if (kind === 'idee') {
      subject = 'Idée — ' + (val(form, 'titre') || val(form, 'type'));
      lines.push('IDÉE', '', 'Nom : ' + val(form, 'nom'), 'Contact : ' + val(form, 'contact'), 'Type : ' + val(form, 'type'));
      if (val(form, 'titre')) lines.push('Titre : ' + val(form, 'titre'));
    } else {
      subject = 'Soutien financier — ' + val(form, 'montant') + ' $ — ' + val(form, 'nom');
      lines.push('SOUTIEN FINANCIER', '', 'Nom : ' + val(form, 'nom'), 'Contact : ' + val(form, 'contact'),
        'Montant : ' + val(form, 'montant') + ' $', 'Moyen de paiement : ' + val(form, 'moyen'),
        'Référence de la transaction : (à compléter)');
    }
    if (val(form, 'message')) lines.push('', val(form, 'message'));
    return { subject: subject, body: lines.join('\n') };
  }

  /* champs obligatoires selon le formulaire */
  var REQUIRED = { proposition: ['nom', 'contact', 'message'], perso: ['nom', 'contact', 'message'], idee: ['nom', 'contact', 'message'], soutien: ['nom', 'contact', 'montant'] };

  Array.prototype.forEach.call(document.querySelectorAll('[data-mail-form]'), function (form) {
    var kind = form.getAttribute('data-mail-form');
    var status = form.querySelector('.form-status');
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var missing = REQUIRED[kind].some(function (n) { return !val(form, n); });
      if (missing) {
        status.textContent = kind === 'soutien' ? 'Merci d\'indiquer ton nom, ton contact et le montant.' : 'Merci de remplir ton nom, ton contact et ton message.';
        status.className = 'form-status is-error';
        return;
      }
      if (kind === 'soutien' && !(Number(val(form, 'montant').replace(',', '.')) > 0)) {
        status.textContent = 'Le montant doit être un nombre positif.';
        status.className = 'form-status is-error';
        return;
      }
      var m = build(kind, form);
      status.className = 'form-status is-ok';
      status.textContent = 'Ton application e-mail s\'ouvre. Si rien ne se passe, écris à ' + email + '. ';
      if (cfg.whatsapp) {
        var a = document.createElement('a');
        a.className = 'text-link';
        a.href = 'https://wa.me/' + cfg.whatsapp + '?text=' + encodeURIComponent(m.subject + '\n\n' + m.body);
        a.target = '_blank'; a.rel = 'noopener';
        a.textContent = 'Envoyer par WhatsApp ↗';
        status.appendChild(a);
      }
      window.location.href = 'mailto:' + email + '?subject=' + encodeURIComponent(m.subject) + '&body=' + encodeURIComponent(m.body);
    });
  });

  /* ── Page Soutien : montants rapides et moyens de paiement ── */
  var amounts = document.getElementById('amounts');
  if (amounts) {
    var field = document.querySelector('[data-mail-form="soutien"] [name="montant"]');
    amounts.addEventListener('click', function (e) {
      var b = e.target.closest('[data-amount]');
      if (!b) return;
      field.value = b.getAttribute('data-amount');
      Array.prototype.forEach.call(amounts.children, function (x) { x.classList.toggle('is-on', x === b); });
    });
    field.addEventListener('input', function () {
      Array.prototype.forEach.call(amounts.children, function (x) { x.classList.toggle('is-on', x.getAttribute('data-amount') === field.value.trim()); });
    });

    var list = (cfg.paiements || []).filter(function (p) { return p.detail; });
    var box = document.getElementById('pay-methods'), sel = document.getElementById('pay-select');
    if (!list.length) {
      list = [{ nom: 'À convenir', detail: '' }];
      var note = document.createElement('p');
      note.className = 'hint';
      note.textContent = 'Les moyens de paiement seront communiqués par e-mail après ta confirmation.';
      box.appendChild(note);
    }
    list.forEach(function (p) {
      var o = document.createElement('option'); o.value = p.nom; o.textContent = p.nom; sel.appendChild(o);
      if (!p.detail) return;
      var d = document.createElement('div'); d.className = 'pay';
      var n = document.createElement('span'); n.textContent = p.nom;
      var v = document.createElement('strong'); v.textContent = p.detail;
      d.appendChild(n); d.appendChild(v); box.appendChild(d);
    });
  }

  /* arrivée depuis la page Abonnements ou depuis un plan VIP */
  var qs = new URLSearchParams(window.location.search);
  var sujet = qs.get('sujet'), plan = qs.get('plan'), niv = qs.get('niveau');
  var msg = '';
  if (sujet === 'Premium' || sujet === 'VIP') msg = 'Je souhaite m\'abonner à la formule ' + sujet + '.';
  if (sujet === 'Fichier') msg = 'Je suis abonné VIP et je souhaite payer le plan « ' + (plan || '') + ' »' + (niv ? ' (' + niv + ')' : '') + ' pour recevoir le fichier modifiable (DWG, Revit ou SketchUp).';
  if (sujet === 'Modification') msg = 'Je souhaite une modification sur mesure du plan « ' + (plan || '') + ' »' + (niv ? ' (' + niv + ')' : '') + '. Voici ce que je voudrais changer : ';
  if (msg) {
    var f = document.querySelector('[data-mail-form="proposition"]');
    if (f && f.elements.message) f.elements.message.value = msg;
    var t = document.getElementById('proposition');
    if (t) setTimeout(function () { t.scrollIntoView({ behavior: 'smooth' }); }, 1800);
  }
})();
