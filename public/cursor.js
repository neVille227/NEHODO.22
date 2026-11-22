/* NEHODO.22 — curseur « souris gamer » animée (désactivé en mode léger, sur écran tactile et pour prefers-reduced-motion) */
(function () {
  'use strict';
  var root = document.documentElement;
  if (root.classList.contains('lite')) return;
  if (!window.matchMedia || !window.matchMedia('(pointer: fine)').matches || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  var m = document.createElement('div');
  m.className = 'gmouse'; m.setAttribute('aria-hidden', 'true');
  m.innerHTML =
    '<svg viewBox="0 0 32 52" width="26" height="42">' +
    '<defs><linearGradient id="gm-rgb" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#a855f7"/><stop offset="0.5" stop-color="#22d3ee"/><stop offset="1" stop-color="#f472b6"/></linearGradient></defs>' +
    '<path class="gm-cable" d="M16 50 C16 58 8 58 8 66"/>' +
    '<path class="gm-body" d="M16 2 C25 2 30 11 30 24 V31 C30 42 24 50 16 50 C8 50 2 42 2 31 V24 C2 11 7 2 16 2Z"/>' +
    '<path class="gm-btn gm-l" d="M16 3 C8 3 3.5 11 3.5 22 H15.2 V3.1Z"/>' +
    '<path class="gm-btn gm-r" d="M16 3 C24 3 28.5 11 28.5 22 H16.8 V3.1Z"/>' +
    '<rect class="gm-wheel" x="14" y="8" width="4" height="9" rx="2"/>' +
    '<path class="gm-line" d="M5 24 H27"/>' +
    '<circle class="gm-logo" cx="16" cy="35" r="3.2"/>' +
    '</svg>';
  document.body ? start() : document.addEventListener('DOMContentLoaded', start);

  function start() {
    document.body.appendChild(m);
    root.classList.add('gcursor');
    var x = -100, y = -100, raf = 0;
    function paint() { raf = 0; m.style.transform = 'translate3d(' + x + 'px,' + y + 'px,0)'; }
    document.addEventListener('pointermove', function (e) {
      if (e.pointerType && e.pointerType !== 'mouse') return;
      x = e.clientX; y = e.clientY; m.classList.add('is-on');
      if (!raf) raf = requestAnimationFrame(paint);
      var t = e.target && e.target.closest ? e.target.closest('a, button, [role="button"], summary, label, select, .chip, .plan-card, .cat-card') : null;
      m.classList.toggle('is-hot', !!t);
      var f = e.target && e.target.closest ? e.target.closest('input, textarea, [contenteditable="true"]') : null;
      m.classList.toggle('is-text', !!f);
    }, { passive: true });
    document.addEventListener('pointerdown', function (e) { m.classList.add(e.button === 2 ? 'is-r' : 'is-l'); }, true);
    document.addEventListener('pointerup', function () { m.classList.remove('is-l', 'is-r'); }, true);
    document.addEventListener('wheel', function () { m.classList.add('is-scroll'); clearTimeout(start.t); start.t = setTimeout(function () { m.classList.remove('is-scroll'); }, 160); }, { passive: true });
    document.documentElement.addEventListener('mouseleave', function () { m.classList.remove('is-on'); });
  }
})();
