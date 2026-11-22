/* NEHODO.22 — galerie qui défile (villas et plans d'illustration) */
(function () {
  'use strict';
  var VILLAS = ['RDC · Toiture dalle', 'R+1 · Toiture dalle', 'R+1 · Charpente mixte', 'R+2 · Toiture dalle', 'RDC · Toiture charpente', 'R+1 · Toiture charpente', 'R+2 · Charpente mixte', 'R+1 · Toiture dalle'];
  function item(src, cap, kind) {
    var f = document.createElement('figure'); f.className = 'g-item';
    var i = document.createElement('img'); i.src = src; i.alt = cap; i.loading = 'lazy'; i.draggable = false;
    var c = document.createElement('figcaption'); c.textContent = (kind === 'plan' ? 'Plan aménagé · ' : 'Villa · ') + cap;
    f.appendChild(i); f.appendChild(c); return f;
  }
  function row(kind, reverse, offset) {
    var wrap = document.createElement('div'); wrap.className = 'g-row'; wrap.setAttribute('aria-hidden', 'true');
    var track = document.createElement('div'); track.className = 'g-track' + (reverse ? ' is-reverse' : '');
    var idx = []; for (var k = 0; k < 8; k++) idx.push((k + offset) % 8);
    for (var rep = 0; rep < 2; rep++) idx.forEach(function (n) { track.appendChild(item('img/' + kind + '-' + (n + 1) + '.jpg', VILLAS[n], kind)); });
    wrap.appendChild(track); return wrap;
  }
  Array.prototype.forEach.call(document.querySelectorAll('[data-galerie]'), function (box) {
    box.classList.add('galerie');
    box.appendChild(row('villa', false, 0));
    box.appendChild(row('plan', true, 3));
  });
})();
