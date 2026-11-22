/* NEHODO.22admin — suivi des idées, commandes et soutiens */
(function () {
  'use strict';
  var KEY = 'nehodo-admin-suivi';
  var TYPES = { idee: 'Idée', commande: 'Commande', soutien: 'Soutien' };
  var STATUTS = { idee: ['Nouvelle', 'Étudiée', 'Retenue', 'Écartée'], commande: ['Nouvelle', 'Devis envoyé', 'En cours', 'Livrée', 'Annulée'], soutien: ['À vérifier', 'Reçu'] };
  var filter = 'all', items = [];

  function $(id) { return document.getElementById(id); }
  function el(t, c, x) { var n = document.createElement(t); if (c) n.className = c; if (x != null) n.textContent = x; return n; }
  function load() { try { items = JSON.parse(localStorage.getItem(KEY) || '[]'); } catch (e) { items = []; } }
  function save() { try { localStorage.setItem(KEY, JSON.stringify(items)); } catch (e) { /* ignoré */ } }
  function uid() { return 's' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6); }
  function frDate(t) { return new Date(t).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' }); }

  function add(it) {
    it.id = uid(); it.date = Date.now(); it.statut = STATUTS[it.type][0];
    items.unshift(it); save(); render();
  }

  /* lit le texte des e-mails produits par les formulaires du site */
  function parse(txt) {
    var lines = txt.replace(/\r/g, '').split('\n').map(function (l) { return l.trim(); });
    var head = (lines.filter(Boolean)[0] || '').toUpperCase(), map = {}, rest = [];
    lines.forEach(function (l, i) {
      var m = /^([^:]{2,30}) : (.*)$/.exec(l);
      if (m && i > 0) map[m[1].toLowerCase()] = m[2]; else if (l && i > 0) rest.push(l);
    });
    var type = /SOUTIEN/.test(head) ? 'soutien' : /ID[ÉE]E/.test(head) ? 'idee' : 'commande';
    var detail = [];
    Object.keys(map).forEach(function (k) { if (['nom', 'contact', 'montant', 'référence de la transaction'].indexOf(k) === -1) detail.push(k.charAt(0).toUpperCase() + k.slice(1) + ' : ' + map[k]); });
    var kind = /SUR MESURE/.test(head) ? 'Sur mesure' : /PROPOSITION/.test(head) ? 'Proposition' : '';
    var text = (kind ? [kind] : []).concat(detail, rest).join('\n');
    var montant = parseFloat(String(map['montant'] || '').replace(',', '.'));
    return { type: type, nom: map['nom'] || '', contact: map['contact'] || '', detail: text, montant: montant > 0 ? montant : 0 };
  }

  function render() {
    var list = items.filter(function (i) { return filter === 'all' || i.type === filter; });
    var n = { idee: 0, commande: 0, soutien: 0 }, open = 0, total = 0, fresh = 0;
    items.forEach(function (i) {
      n[i.type]++;
      if (i.statut === STATUTS[i.type][0] && i.type !== 'soutien') fresh++;
      if (i.type === 'commande' && ['Nouvelle', 'Devis envoyé', 'En cours'].indexOf(i.statut) > -1) open++;
      if (i.type === 'soutien' && i.statut === 'Reçu') total += i.montant || 0;
    });
    var st = $('suivi-stats'); st.textContent = '';
    [[n.idee, 'Idées'], [open + ' / ' + n.commande, 'Commandes en cours'], [total + ' $', 'Soutiens reçus'], [fresh, 'À traiter']].forEach(function (s) {
      var d = el('div', 'stat'); d.appendChild(el('strong', null, String(s[0]))); d.appendChild(el('span', null, s[1])); st.appendChild(d);
    });
    var cnt = $('suivi-count'); cnt.hidden = !fresh; cnt.textContent = fresh;

    var fl = $('suivi-filters'); fl.textContent = '';
    [['all', 'Tout'], ['idee', 'Idées'], ['commande', 'Commandes'], ['soutien', 'Soutiens']].forEach(function (f) {
      var b = el('button', 'fchip' + (filter === f[0] ? ' is-on' : ''), f[1]); b.type = 'button';
      b.addEventListener('click', function () { filter = f[0]; render(); }); fl.appendChild(b);
    });

    var tb = $('suivi-table'); tb.textContent = '';
    $('suivi-empty').hidden = list.length > 0;
    if (!list.length) return;
    var th = el('tr'); ['Date', 'Type', 'De la part de', 'Détail', 'Montant', 'Statut', ''].forEach(function (h) { th.appendChild(el('th', null, h)); });
    var thead = el('thead'); thead.appendChild(th); tb.appendChild(thead);
    var body = el('tbody');
    list.forEach(function (i) {
      var tr = el('tr');
      tr.appendChild(el('td', null, frDate(i.date)));
      var tt = el('td'); tt.appendChild(el('span', 'tag t-' + i.type, TYPES[i.type])); tr.appendChild(tt);
      var who = el('td'); who.appendChild(document.createTextNode(i.nom || '—')); if (i.contact) { who.appendChild(document.createElement('br')); who.appendChild(el('small', 'muted', i.contact)); } tr.appendChild(who);
      tr.appendChild(el('td', 'detail', i.detail || ''));
      tr.appendChild(el('td', null, i.montant ? i.montant + ' $' : ''));
      var sc = el('td'), sel = el('select');
      STATUTS[i.type].forEach(function (s) { var o = el('option', null, s); o.value = s; if (s === i.statut) o.selected = true; sel.appendChild(o); });
      sel.addEventListener('change', function () { i.statut = sel.value; save(); render(); });
      sc.appendChild(sel); tr.appendChild(sc);
      var ac = el('td', 'acts'), del = el('button', 'link danger', 'Supprimer'); del.type = 'button';
      del.addEventListener('click', function () { if (confirm('Supprimer cette ligne ?')) { items = items.filter(function (x) { return x !== i; }); save(); render(); } });
      ac.appendChild(del); tr.appendChild(ac); body.appendChild(tr);
    });
    tb.appendChild(body);
  }

  function csv() {
    var q = function (v) { return '"' + String(v == null ? '' : v).replace(/"/g, '""') + '"'; };
    var rows = [['Date', 'Type', 'Nom', 'Contact', 'Détail', 'Montant ($)', 'Statut']].concat(items.map(function (i) { return [frDate(i.date), TYPES[i.type], i.nom, i.contact, i.detail, i.montant || '', i.statut]; }));
    var blob = new Blob(['﻿' + rows.map(function (r) { return r.map(q).join(';'); }).join('\n')], { type: 'text/csv;charset=utf-8' });
    var a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'suivi-nehodo22.csv'; document.body.appendChild(a); a.click(); a.remove();
  }

  function init() {
    load(); render();
    $('suivi-parse').addEventListener('click', function () {
      var t = $('suivi-paste').value.trim(), s = $('suivi-pstatus');
      if (!t) { s.textContent = 'Colle d’abord un message.'; s.className = 'status is-error'; return; }
      var it = parse(t); add(it); $('suivi-paste').value = '';
      s.textContent = 'Ajouté dans « ' + TYPES[it.type] + 's ».'; s.className = 'status is-ok';
    });
    $('suivi-form').addEventListener('submit', function (e) {
      e.preventDefault(); var f = e.target, m = parseFloat(f.elements.montant.value);
      add({ type: f.elements.type.value, nom: f.elements.nom.value.trim(), contact: f.elements.contact.value.trim(), detail: f.elements.detail.value.trim(), montant: m > 0 ? m : 0 });
      f.reset();
    });
    $('suivi-csv').addEventListener('click', csv);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
