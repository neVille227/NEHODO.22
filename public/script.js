/* NEHODO.22 — comportement du site */
(function () {
  'use strict';

  var root = document.documentElement;
  var intro = document.querySelector('.intro');
  var replayLink = document.getElementById('replay-intro');
  var reduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  var leaveTimer = null;
  var doneTimer = null;
  var LEAVE_AT = 2500;      /* ms : début du fondu de sortie (logo N seul) */
  var SMOKE_MS = 650;       /* ms : durée de la fumée à l'aller comme au retour */
  var FADE_MS = 700;         /* ms : durée du fondu */

  /* ───────── Thème sombre / clair ───────── */
  function theme() { return root.getAttribute('data-theme') === 'light' ? 'light' : 'dark'; }
  function applyTheme(t, save) {
    if (t === 'light') root.setAttribute('data-theme', 'light'); else root.removeAttribute('data-theme');
    if (save) { try { localStorage.setItem('nehodo-theme', t); } catch (e) { /* ignoré */ } }
    var meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute('content', t === 'light' ? '#f3f9ff' : '#0b0910');
    smokeSprites = null;
    var b = document.querySelector('.theme-toggle');
    if (b) { b.setAttribute('aria-label', t === 'light' ? 'Passer au thème sombre' : 'Passer au thème clair'); b.setAttribute('title', t === 'light' ? 'Thème sombre' : 'Thème clair'); }
    window.dispatchEvent(new Event('nehodo-theme'));
  }
  (function buildToggle() {
    var hdr = document.querySelector('.header');
    if (!hdr || hdr.querySelector('.theme-toggle')) return;
    var b = document.createElement('button');
    b.type = 'button'; b.className = 'theme-toggle';
    b.innerHTML = '<svg class="i-moon" viewBox="0 0 24 24" aria-hidden="true"><path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5z"/></svg>' +
      '<svg class="i-sun" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="4"/><path d="M12 2.5v2.2M12 19.3v2.2M2.5 12h2.2M19.3 12h2.2M5.3 5.3l1.6 1.6M17.1 17.1l1.6 1.6M18.7 5.3l-1.6 1.6M6.9 17.1l-1.6 1.6"/></svg>';
    var nav = hdr.querySelector('.navigation');
    if (nav && nav.nextSibling) hdr.insertBefore(b, nav.nextSibling); else hdr.appendChild(b);
    b.addEventListener('click', function () { applyTheme(theme() === 'light' ? 'dark' : 'light', true); });
  })();

  /* ───────── Transition entre les pages : fondu de fumée ───────── */
  var pt = document.querySelector('.page-transition');
  var ptCanvas = pt ? pt.querySelector('.pt-canvas') : null;
  var navigating = false;
  var smokeRaf = 0;
  var smokeSprites = null;

  function smooth(v) { v = Math.min(1, Math.max(0, v)); return v * v * (3 - 2 * v); }

  function makeSmokeSprites() {
    var list = [], n, i, j, c, g, cols = theme() === 'light' ? ['186,230,253', '125,211,252', '56,189,248', '224,242,254'] : ['76,29,149', '38,20,80', '109,40,217', '24,14,52'];
    for (n = 0; n < 4; n++) {
      c = document.createElement('canvas'); c.width = c.height = 256;
      g = c.getContext('2d');
      for (i = 0; i < 9; i++) {
        var a = Math.random() * Math.PI * 2, d = Math.random() * 70;
        var x = 128 + Math.cos(a) * d, y = 128 + Math.sin(a) * d, r = 44 + Math.random() * 46;
        var col = cols[(i + n) % cols.length];
        var gr = g.createRadialGradient(x, y, 0, x, y, r);
        gr.addColorStop(0, 'rgba(' + col + ',0.5)');
        gr.addColorStop(0.55, 'rgba(' + col + ',0.2)');
        gr.addColorStop(1, 'rgba(' + col + ',0)');
        g.fillStyle = gr; g.fillRect(0, 0, 256, 256);
      }
      list.push(c);
    }
    return list;
  }

  /* mode 'cover' : la fumée monte et recouvre l'écran ; mode 'reveal' : elle se dissipe */
  function runSmoke(mode, ox, oy, ms, done) {
    if (!ptCanvas || !ptCanvas.getContext) { if (done) done(); return; }
    cancelAnimationFrame(smokeRaf);
    if (!smokeSprites) smokeSprites = makeSmokeSprites();
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    var W = window.innerWidth, H = window.innerHeight;
    ptCanvas.width = Math.round(W * dpr); ptCanvas.height = Math.round(H * dpr);
    var g = ptCanvas.getContext('2d');
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    var R = Math.max(W, H) * 0.3;
    var cols = Math.ceil(W / (R * 0.7)) + 1, rows = Math.ceil(H / (R * 0.7)) + 1;
    var puffs = [], i, j;
    for (i = 0; i < cols; i++) for (j = 0; j < rows; j++) {
      puffs.push({
        x: (i + Math.random() * 0.6) * R * 0.7 - R * 0.2,
        y: (j + Math.random() * 0.6) * R * 0.7 - R * 0.2 + R * 0.25,
        s: Math.floor(Math.random() * 4), rot: Math.random() * 6.28, spin: (Math.random() - 0.5) * 0.8,
        d: Math.random() * 0.5, k: 0.8 + Math.random() * 0.6, drift: 30 + Math.random() * 70
      });
    }
    var t0 = performance.now();

    function frame(now) {
      var p = Math.max(0, Math.min(1, (now - t0) / ms));
      g.clearRect(0, 0, W, H);
      var base = mode === 'cover' ? smooth((p - 0.5) / 0.5) : 1 - smooth(p / 0.55);
      g.globalAlpha = base;
      g.fillStyle = theme() === 'light' ? '#eef7ff' : '#0b0910'; g.fillRect(0, 0, W, H);
      for (var q = 0; q < puffs.length; q++) {
        var f = puffs[q];
        var life = smooth((p - f.d) / 0.5);
        var a = mode === 'cover' ? life : 1 - life;
        if (a <= 0.01) continue;
        var size = R * 2 * f.k * (0.7 + 0.5 * (mode === 'cover' ? life : 1 + 0.3 * life));
        var up = (mode === 'cover' ? -life : -life) * f.drift;
        g.save();
        g.globalAlpha = Math.min(1, a * 1.1);
        g.translate(f.x, f.y + up);
        g.rotate(f.rot + p * f.spin);
        g.drawImage(smokeSprites[f.s], -size / 2, -size / 2, size, size);
        g.restore();
      }
      g.globalAlpha = 1;
      if (p < 1) smokeRaf = requestAnimationFrame(frame);
      else if (done) done();
    }
    smokeRaf = requestAnimationFrame(frame);
  }

  function goTo(url, ox, oy) {
    if (navigating) return;
    if (reduced || !pt) { window.location.href = url; return; }
    navigating = true;
    root.classList.add('page-leaving');
    try { sessionStorage.setItem('nehodo-origin', ox.toFixed(3) + ',' + oy.toFixed(3)); } catch (e) { /* ignoré */ }
    runSmoke('cover', ox, oy, SMOKE_MS, function () {
      try { sessionStorage.setItem('nehodo-arrive', '1'); } catch (e) { /* ignoré */ }
      window.location.href = url;
    });
  }

  document.addEventListener('click', function (e) {
    var a = e.target.closest ? e.target.closest('a[data-transition]') : null;
    if (!a || e.defaultPrevented || e.metaKey || e.ctrlKey || e.shiftKey || e.button) return;
    e.preventDefault();
    var ox = 0.5, oy = 0.5;
    if (e.clientX || e.clientY) { ox = e.clientX / window.innerWidth; oy = e.clientY / window.innerHeight; }
    goTo(a.getAttribute('href'), ox, oy);
  });

  /* retour arrière (cache du navigateur) : on enlève le voile */
  window.addEventListener('pageshow', function (e) {
    if (!e.persisted) return;
    navigating = false;
    cancelAnimationFrame(smokeRaf);
    root.classList.remove('page-leaving', 'page-arriving', 'page-revealing');
  });

  if (root.classList.contains('page-arriving')) {
    var ox = 0.5, oy = 0.5;
    try {
      var o = (sessionStorage.getItem('nehodo-origin') || '').split(',');
      if (o.length === 2) { ox = parseFloat(o[0]) || 0.5; oy = parseFloat(o[1]) || 0.5; }
    } catch (e) { /* ignoré */ }
    runSmoke('reveal', ox, oy, SMOKE_MS, function () {
      root.classList.remove('page-arriving', 'page-revealing');
    });
    root.classList.add('page-revealing');
  }

  /* ───────── Fond de l'accueil : villas modernes à perte de vue ───────── */
  (function city() {
    var cv = document.querySelector('.city-bg');
    if (!cv || !cv.getContext) return;
    var ctx = cv.getContext('2d');
    var PAL = {
      dark: { sky: ['#07050d', '#1b0e3e', '#4c1d95', '#8b5cf6'], ground: '#0d0818', stars: 1, horizon: 'rgba(196,181,253,0.35)', winA: '233,213,255', winB: '167,139,250', mull: 'rgba(11,9,16,0.7)', strip: '221,200,255', stripGlow: '167,139,250', body: ['#241346', '#130a27'], garage: '#0a0614', door: '#0d0820', slab: '#2d1a57', up: ['#2a1752', '#190e33'], upDoor: '#0c0719', balc: '167,139,250', slab2: '#31205f', roofline: '196,181,253', hedge: '#10091f', palm: '#150b2b', block: '#23134a', blockWin: 'rgba(196,181,253,0.4)', groundLine: 'rgba(167,139,250,0.22)', fog: ['109,40,217', '76,29,149'] },
      light: { sky: ['#ffffff', '#dcefff', '#98d3fa', '#5db9f2'], ground: '#cfe6f8', stars: 0, horizon: 'rgba(255,255,255,0.7)', winA: '150,210,250', winB: '56,150,222', mull: 'rgba(255,255,255,0.85)', strip: '14,165,233', stripGlow: '56,189,248', body: ['#f7fbff', '#c9e0f3'], garage: '#7ea6c4', door: '#5f8aab', slab: '#ffffff', up: ['#fbfdff', '#d2e6f6'], upDoor: '#6f98b8', balc: '56,150,222', slab2: '#f1f8ff', roofline: '3,105,161', hedge: '#6fb09a', palm: '#4d9a84', block: '#b3d3ec', blockWin: 'rgba(255,255,255,0.7)', groundLine: 'rgba(56,150,222,0.35)', fog: ['190,228,252', '140,205,248'] }
    };
    var T = PAL.dark;
    var W = 0, H = 0, TW = 0, layers = [], sky = null, raf = 0, last = 0, k = 1;

    function rng(seed) {
      return function () {
        seed |= 0; seed = (seed + 0x6D2B79F5) | 0;
        var t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
      };
    }

    function glowWin(g, x, y, w, h, a) {
      var gr = g.createLinearGradient(0, y, 0, y + h);
      gr.addColorStop(0, 'rgba(' + T.winA + ',' + a.toFixed(2) + ')');
      gr.addColorStop(1, 'rgba(' + T.winB + ',' + (a * 0.55).toFixed(2) + ')');
      g.fillStyle = gr; g.fillRect(x, y, w, h);
      g.fillStyle = T.mull;
      g.fillRect(x + w * 0.5 - 0.5, y, 1, h);
    }

    function lightStrip(g, x1, x2, y, u, a) {
      g.save();
      g.strokeStyle = 'rgba(' + T.strip + ',' + a.toFixed(2) + ')';
      g.lineWidth = Math.max(1, 1.6 * u);
      g.shadowColor = 'rgba(' + T.stripGlow + ',' + a.toFixed(2) + ')';
      g.shadowBlur = 8 * u;
      g.beginPath(); g.moveTo(x1, y); g.lineTo(x2, y); g.stroke();
      g.restore();
    }

    function palm(g, x, base, u, r) {
      var h = (50 + r() * 30) * u;
      g.strokeStyle = T.palm; g.lineWidth = 3 * u;
      g.beginPath(); g.moveTo(x, base); g.quadraticCurveTo(x + 4 * u, base - h * 0.5, x + 2 * u, base - h); g.stroke();
      g.fillStyle = T.palm;
      for (var i = 0; i < 7; i++) {
        var an = -Math.PI + (i / 6) * Math.PI, len = (22 + r() * 10) * u;
        g.beginPath(); g.moveTo(x + 2 * u, base - h);
        g.quadraticCurveTo(x + 2 * u + Math.cos(an) * len * 0.6, base - h + Math.sin(an) * len * 0.9 - 6 * u, x + 2 * u + Math.cos(an) * len, base - h + Math.sin(an) * len * 0.3 + 10 * u);
        g.quadraticCurveTo(x + 2 * u + Math.cos(an) * len * 0.55, base - h + Math.sin(an) * len * 0.5, x + 2 * u, base - h);
        g.fill();
      }
    }

    function villa(g, x, base, w, u, detail, r) {
      var fh = 78 * u, slab = 9 * u, a = 0.14 + 0.38 * detail;
      var two = r() < 0.72, upH = (66 + r() * 14) * u;
      var body = g.createLinearGradient(0, base - fh, 0, base);
      body.addColorStop(0, T.body[0]); body.addColorStop(1, T.body[1]);
      g.fillStyle = body; g.fillRect(x, base - fh, w, fh);
      /* garage + porte + baie */
      g.fillStyle = T.garage; g.fillRect(x + w * 0.06, base - fh * 0.74, w * 0.27, fh * 0.74);
      g.fillStyle = T.door; g.fillRect(x + w * 0.4, base - fh * 0.82, w * 0.09, fh * 0.82);
      glowWin(g, x + w * 0.56, base - fh * 0.78, w * 0.34, fh * 0.7, a);
      /* dalle + liseré lumineux */
      g.fillStyle = T.slab; g.fillRect(x - 6 * u, base - fh - slab, w + 12 * u, slab);
      lightStrip(g, x - 2 * u, x + w + 2 * u, base - fh, u, a);
      var top = base - fh - slab;
      if (two) {
        var ow = w * (0.6 + r() * 0.28), ox = r() * (w - ow);
        var ub = g.createLinearGradient(0, top - upH, 0, top);
        ub.addColorStop(0, T.up[0]); ub.addColorStop(1, T.up[1]);
        g.fillStyle = ub; g.fillRect(x + ox, top - upH, ow, upH);
        g.fillStyle = T.upDoor; g.fillRect(x + ox + ow * 0.04, top - upH * 0.9, ow * 0.2, upH * 0.82);
        glowWin(g, x + ox + ow * 0.3, top - upH * 0.84, ow * 0.34, upH * 0.7, a);
        g.fillStyle = 'rgba(' + T.balc + ',' + (0.12 + 0.2 * detail).toFixed(2) + ')';
        g.fillRect(x + ox + ow * 0.66, top - upH * 0.5, ow * 0.3, upH * 0.5);   /* balcon vitré */
        g.fillStyle = T.slab2; g.fillRect(x + ox - 6 * u, top - upH - slab, ow + 12 * u, slab);
        lightStrip(g, x + ox - 2 * u, x + ox + ow + 2 * u, top - upH, u, a * 0.9);
        top -= upH + slab;
      }
      g.strokeStyle = 'rgba(' + T.roofline + ',' + (0.25 + 0.3 * detail).toFixed(2) + ')';
      g.lineWidth = Math.max(0.7, u);
      g.beginPath(); g.moveTo(x - 6 * u, top + 0.5); g.lineTo(x + w + 6 * u, top + 0.5); g.stroke();
      /* haie */
      if (detail > 0.35) {
        g.fillStyle = T.hedge;
        g.fillRect(x - 10 * u, base - 12 * u, w + 20 * u, 12 * u);
        if (r() < 0.8) palm(g, x + w + (8 + r() * 14) * u, base, u, r);
        if (r() < 0.4) palm(g, x - (10 + r() * 12) * u, base, u, r);
      }
    }

    function block(g, x, base, w, u, r) {   /* petit immeuble lointain */
      var h = (110 + r() * 160) * u;
      g.fillStyle = T.block; g.fillRect(x, base - h, w, h);
      g.fillStyle = T.blockWin;
      for (var yy = base - h + 6 * u; yy < base - 6 * u; yy += 11 * u)
        for (var xx = x + 5 * u; xx < x + w - 6 * u; xx += 9 * u)
          if (r() < 0.38) g.fillRect(xx, yy, 3.5 * u, 5 * u);
    }

    var P = [
      { s: 0.1, fog: 0.75, speed: 2 },  { s: 0.16, fog: 0.62, speed: 3.5 },
      { s: 0.24, fog: 0.48, speed: 6 }, { s: 0.34, fog: 0.34, speed: 9 },
      { s: 0.47, fog: 0.2, speed: 14 }, { s: 0.62, fog: 0.06, speed: 21 }
    ];

    function build() {
      T = PAL[theme()];
      W = window.innerWidth; H = window.innerHeight;
      cv.width = W; cv.height = H;
      k = H / 900;
      TW = Math.max(Math.round(W * 1.5), 1600);
      var hy = H * 0.58, i;
      layers = [];
      for (i = 0; i < P.length; i++) {
        var L = P[i], r = rng(101 + i * 17);
        var u = L.s * k;
        var base = hy + H * 0.27 * Math.pow(L.s / 0.62, 1.2);
        var c = document.createElement('canvas'); c.width = TW; c.height = H;
        var g = c.getContext('2d');
        var x = r() * 40 * u, detail = Math.min(1, L.s * 1.6);
        while (true) {
          var isBlock = i < 3 && r() < 0.3;
          var w = isBlock ? (50 + r() * 50) * u * 1.4 : (210 + r() * 130) * u;
          if (x + w + 10 * u > TW) break;
          if (isBlock) block(g, x, base, w, u * 1.4, r); else villa(g, x, base, w, u, detail, r);
          x += w + (isBlock ? 8 : 40 + r() * 110) * u;
        }
        /* sol + brume de profondeur */
        g.fillStyle = T.ground; g.fillRect(0, base, TW, H - base);
        g.fillStyle = T.groundLine; g.fillRect(0, base, TW, Math.max(1, 1.5 * u));
        g.globalCompositeOperation = 'source-atop';
        var fg = g.createLinearGradient(0, base - 340 * u, 0, base);
        fg.addColorStop(0, 'rgba(' + T.fog[0] + ',' + (L.fog * 0.75).toFixed(2) + ')');
        fg.addColorStop(1, 'rgba(' + T.fog[1] + ',' + L.fog.toFixed(2) + ')');
        g.fillStyle = fg; g.fillRect(0, 0, TW, H);
        g.globalCompositeOperation = 'source-over';
        layers.push({ c: c, off: r() * TW, speed: L.speed * k });
      }
      /* ciel */
      sky = document.createElement('canvas'); sky.width = W; sky.height = H;
      var s = sky.getContext('2d');
      var sg = s.createLinearGradient(0, 0, 0, H * 0.7);
      sg.addColorStop(0, T.sky[0]); sg.addColorStop(0.45, T.sky[1]); sg.addColorStop(0.8, T.sky[2]); sg.addColorStop(1, T.sky[3]);
      s.fillStyle = sg; s.fillRect(0, 0, W, H);
      s.fillStyle = T.ground; s.fillRect(0, hy + H * 0.02, W, H);
      var st = rng(7), n;
      for (n = 0; n < (T.stars ? 90 : 0); n++) {
        s.fillStyle = 'rgba(221,200,255,' + (0.2 + st() * 0.5).toFixed(2) + ')';
        s.fillRect(st() * W, st() * H * 0.45, 1.2, 1.2);
      }
      var hg = s.createRadialGradient(W / 2, hy, 0, W / 2, hy, W * 0.6);
      hg.addColorStop(0, T.horizon); hg.addColorStop(1, T.horizon.replace(/[\d.]+\)$/, '0)'));
      s.fillStyle = hg; s.fillRect(0, 0, W, H);
    }

    function draw(dt) {
      ctx.drawImage(sky, 0, 0);
      for (var i = 0; i < layers.length; i++) {
        var L = layers[i];
        L.off = (L.off + L.speed * dt) % TW;
        ctx.drawImage(L.c, -L.off, 0);
        ctx.drawImage(L.c, TW - L.off, 0);
        if (TW - L.off < W - TW) ctx.drawImage(L.c, 2 * TW - L.off, 0);
      }
    }

    function loop(now) {
      var dt = Math.min(0.05, (now - last) / 1000); last = now;
      draw(dt);
      raf = requestAnimationFrame(loop);
    }

    build();
    if (reduced) { draw(0); } else { last = performance.now(); raf = requestAnimationFrame(loop); }
    window.addEventListener('nehodo-theme', function () { build(); if (reduced) draw(0); });
    var rt = 0;
    window.addEventListener('resize', function () {
      clearTimeout(rt);
      rt = setTimeout(function () { build(); if (reduced) draw(0); }, 150);
    });
  })();

  /* ───────── « BIENVENUE » tapé lettre par lettre ───────── */
  var typed = document.getElementById('typed');
  var typeTimer = 0;
  function stopTyping() {
    clearTimeout(typeTimer);
    if (!typed) return;
    typed.textContent = '';
    typed.parentNode.classList.remove('is-typed');
  }
  function startTyping(delay) {
    if (!typed) return;
    clearTimeout(typeTimer);
    var text = typed.getAttribute('data-text') || '', i = 0, h = typed.parentNode;
    h.classList.remove('is-typed');
    typed.textContent = '';
    if (reduced) { typed.textContent = text; h.classList.add('is-typed'); return; }
    function step() {
      i++;
      typed.textContent = text.slice(0, i);
      if (i < text.length) {
        typeTimer = setTimeout(step, 85 + Math.random() * 70);
      } else {
        h.classList.add('is-typed');
      }
    }
    typeTimer = setTimeout(step, delay || 0);
  }

  /* ───────── Machine d'états de l'animation ───────── */
  function clearTimers() {
    clearTimeout(leaveTimer);
    clearTimeout(doneTimer);
  }

  function finishIntro() {
    clearTimers();
    startTyping(300);
    root.classList.remove('intro-playing', 'intro-leaving');
    root.classList.add('intro-done');
    try { sessionStorage.setItem('nehodo-intro', '1'); } catch (e) { /* stockage indisponible : on continue */ }
  }

  function leaveIntro() {
    root.classList.add('intro-leaving');
    doneTimer = setTimeout(finishIntro, FADE_MS);
  }

  function playIntro() {
    if (!intro) return;
    clearTimers();
    stopTyping();
    root.classList.remove('intro-done', 'no-intro', 'intro-leaving');
    root.classList.add('intro-playing');
    /* relance propre des animations CSS */
    void intro.offsetWidth;
    leaveTimer = setTimeout(leaveIntro, LEAVE_AT);
  }

  if (intro) {
    var skip = intro.querySelector('.intro-skip');
    if (skip) skip.addEventListener('click', finishIntro);
  }

  if (intro && root.classList.contains('intro-playing')) {
    playIntro();
  } else {
    root.classList.remove('intro-playing');
    root.classList.add('intro-done');
    startTyping(root.classList.contains('page-arriving') ? SMOKE_MS * 0.7 : 350);
  }

  /* Clic sur le logo de l'en-tête : revoir l'animation d'ouverture */
  if (replayLink) {
    replayLink.addEventListener('click', function (e) {
      e.preventDefault();
      if (root.classList.contains('intro-playing')) return;
      window.scrollTo(0, 0);
      if (reduced) return;
      playIntro();
    });
  }

  /* ── Menu mobile ── */
  var toggle = document.querySelector('.menu-toggle');
  var nav = document.getElementById('navigation');

  function setMenu(open) {
    if (!toggle || !nav) return;
    toggle.setAttribute('aria-expanded', String(open));
    toggle.setAttribute('aria-label', open ? 'Fermer le menu' : 'Ouvrir le menu');
    nav.classList.toggle('is-open', open);
  }

  if (toggle && nav) {
    toggle.addEventListener('click', function () {
      setMenu(toggle.getAttribute('aria-expanded') !== 'true');
    });
    nav.addEventListener('click', function (e) {
      if (e.target.closest('a')) setMenu(false);
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') setMenu(false);
    });
  }

  /* ── En-tête qui s'assombrit au défilement ── */
  var header = document.querySelector('.header');
  function onScroll() {
    if (header) header.classList.toggle('is-scrolled', window.scrollY > 12);
  }
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  /* ── Apparition des sections au défilement ── */
  var items = document.querySelectorAll('.reveal');
  if ('IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          io.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12 });
    items.forEach(function (el) { io.observe(el); });
  } else {
    items.forEach(function (el) { el.classList.add('is-visible'); });
  }

  /* ── Année du pied de page ── */
  var year = document.getElementById('year');
  if (year) year.textContent = String(new Date().getFullYear());
})();
