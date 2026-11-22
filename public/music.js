/* NEHODO.22 — musique d'ambiance (le fichier audio est à placer dans audio/) */
(function () {
  'use strict';
  var cfg = (window.NEHODO_CONFIG || {}).musique || {};
  var SRC = cfg.fichier || 'audio/ost.mp3';
  var K_OFF = 'nehodo-music-off', K_VOL = 'nehodo-music-vol', K_T = 'nehodo-music-t';

  function get(s, k) { try { return s.getItem(k); } catch (e) { return null; } }
  function set(s, k, v) { try { s.setItem(k, v); } catch (e) { /* ignoré */ } }

  var audio = new Audio();
  audio.loop = true; audio.preload = 'auto';
  var vol = parseFloat(get(localStorage, K_VOL)); if (!(vol >= 0 && vol <= 1)) vol = 0.35;
  audio.volume = vol;
  var missing = false, wantPlay = get(localStorage, K_OFF) !== '1' && !document.documentElement.classList.contains('lite');

  var box = document.createElement('div');
  box.className = 'music'; box.id = 'music';
  box.innerHTML =
    '<button class="music-btn" type="button" aria-label="Musique d’ambiance" aria-pressed="false">' +
    '<span class="eq" aria-hidden="true"><i></i><i></i><i></i><i></i></span></button>' +
    '<div class="music-pop"><strong class="music-title"></strong><small class="music-artist"></small>' +
    '<input class="music-vol" type="range" min="0" max="100" aria-label="Volume"><em class="music-note" hidden></em></div>';
  box.querySelector('.music-title').textContent = cfg.titre || 'Musique';
  box.querySelector('.music-artist').textContent = cfg.artiste || '';
  var btn = box.querySelector('.music-btn'), range = box.querySelector('.music-vol'), note = box.querySelector('.music-note');
  range.value = Math.round(vol * 100);

  function paint() {
    var on = !audio.paused && !missing;
    box.classList.toggle('is-playing', on);
    box.classList.toggle('is-missing', missing);
    btn.setAttribute('aria-pressed', on ? 'true' : 'false');
  }

  function play() {
    if (missing) return Promise.resolve();
    return audio.play().then(paint, function () { paint(); });
  }
  function pause() { audio.pause(); paint(); }

  btn.addEventListener('click', function () {
    if (missing) { note.hidden = false; note.textContent = 'Fichier introuvable : place ton morceau dans « ' + SRC + ' ».'; box.classList.add('is-open'); return; }
    if (audio.paused) { set(localStorage, K_OFF, '0'); wantPlay = true; play(); }
    else { set(localStorage, K_OFF, '1'); wantPlay = false; pause(); }
  });
  range.addEventListener('input', function () { audio.volume = range.value / 100; set(localStorage, K_VOL, String(audio.volume)); });

  audio.addEventListener('error', function () { missing = true; paint(); try { console.info('NEHODO.22 : fichier audio introuvable (' + SRC + ').'); } catch (e) { /* ignoré */ } });
  audio.addEventListener('play', paint); audio.addEventListener('pause', paint);
  audio.addEventListener('loadedmetadata', function () {
    var t = parseFloat(get(sessionStorage, K_T));
    if (t > 0 && audio.duration && t < audio.duration - 1) { try { audio.currentTime = t; } catch (e) { /* ignoré */ } }
  });
  function keepTime() { if (!audio.paused) set(sessionStorage, K_T, String(audio.currentTime)); }
  setInterval(keepTime, 1000);
  window.addEventListener('pagehide', keepTime);

  /* pause quand l'onglet est caché, reprise au retour */
  var pausedByHide = false;
  document.addEventListener('visibilitychange', function () {
    if (document.hidden) { if (!audio.paused) { pausedByHide = true; audio.pause(); } }
    else if (pausedByHide) { pausedByHide = false; if (wantPlay) play(); }
  });

  /* les navigateurs interdisent le son avant un premier geste : on démarre au premier clic ou à la première touche */
  function firstGesture() {
    document.removeEventListener('pointerdown', firstGesture, true);
    document.removeEventListener('keydown', firstGesture, true);
    if (wantPlay && audio.paused) play();
  }

  function init() {
    document.body.appendChild(box);
    audio.src = SRC;
    paint();
    document.addEventListener('pointerdown', firstGesture, true);
    document.addEventListener('keydown', firstGesture, true);
    if (wantPlay) play();   /* fonctionne si le navigateur l'autorise déjà */
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
