/* NEHODO.22 — guide pour les nouveaux visiteurs (bouton « ? » pour le rouvrir à tout moment) */
(function () {
  'use strict';
  var KEY = 'nehodo-tuto';
  var root = document.documentElement;

  var STEPS = [
    { t: 'Bienvenue sur NEHODO.22', p: 'Ici, tu consultes des plans de villa classés par catégorie. Ce petit tour dure 30 secondes.', icon: 'N' },
    { t: 'Choisis une catégorie', p: 'De RDC à R+4, chaque niveau existe en toiture dalle, toiture charpente ou charpente mixte. Et l’Atelier (terrasses, cuisines, garages, engins…) est entièrement gratuit.', go: ['projets.html', 'Voir les catégories'], hl: 'a[href="projets.html"]', icon: '1' },
    { t: 'Ouvre un plan', p: 'Un plan se présente jusqu’en 12 vues : plan de masse, vue en plan, plan coté, plan aménagé, électricité, plomberie, coupes, façades, toiture, VRD, perspective et animation intérieure. Passe de l’une à l’autre avec les onglets.', go: ['plans.html', 'Voir tous les plans'], icon: '2' },
    { t: 'Abonne-toi ou achète un plan', p: 'Premium ouvre le dossier de base, VIP ouvre tout (électricité, plomberie, coupes, VRD, animation…). Tu peux aussi acheter un plan seul. Essai gratuit de 72 h, paiement par carte ou Mobile Money (MTN, Moov, Celtiis).', go: ['abonnements.html', 'Voir les abonnements'], hl: 'a[href="abonnements.html"]', icon: '3' },
    { t: 'Un plan rien que pour toi', p: 'Tu ne trouves pas ton bonheur ? Décris ton projet (surface, chambres, style…) et un plan sur mesure est dessiné pour toi.', go: ['personnalise.html', 'Demander un plan'], hl: 'a[href="personnalise.html"]', icon: '4' },
    { t: 'Langue, musique, mode léger', p: 'Change de langue avec le sélecteur en haut (français, anglais, arabe, espagnol, portugais). La note de musique coupe le son, et le bouton ⚡ active le mode léger si ton appareil est lent.', icon: '5' },
    { t: 'Besoin d’aide ?', p: 'Écris-moi depuis « Me contacter », propose une idée ou soutiens le projet. Le bouton « ? » en bas à droite rouvre ce guide.', go: ['contact.html', 'Me contacter'], hl: '.nav-contact', icon: '6' }
  ];

  var card = null, i = 0, hlEl = null;

  function seen() { try { localStorage.setItem(KEY, '1'); } catch (e) { /* ignoré */ } }
  function clearHl() { if (hlEl) { hlEl.classList.remove('tuto-hl'); hlEl = null; } }

  function build() {
    card = document.createElement('div');
    card.className = 'tuto'; card.hidden = true;
    card.setAttribute('role', 'dialog'); card.setAttribute('aria-labelledby', 'tuto-t');
    card.innerHTML =
      '<button class="tuto-x" type="button" aria-label="Fermer le guide">×</button>' +
      '<span class="tuto-icon" id="tuto-icon"></span>' +
      '<p class="eyebrow" id="tuto-count"></p><h2 id="tuto-t"></h2><p id="tuto-p"></p>' +
      '<a class="text-link" id="tuto-go" href="#" data-transition hidden></a>' +
      '<div class="tuto-dots" id="tuto-dots"></div>' +
      '<div class="tuto-nav"><button class="button button-ghost" type="button" id="tuto-prev">Précédent</button>' +
      '<button class="button button-primary" type="button" id="tuto-next">Suivant</button></div>';
    document.body.appendChild(card);
    card.querySelector('.tuto-x').addEventListener('click', close);
    card.querySelector('#tuto-prev').addEventListener('click', function () { step(i - 1); });
    card.querySelector('#tuto-next').addEventListener('click', function () { if (i >= STEPS.length - 1) close(); else step(i + 1); });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && card && !card.hidden) close(); });
  }

  function step(n) {
    i = Math.max(0, Math.min(STEPS.length - 1, n));
    var s = STEPS[i];
    card.querySelector('#tuto-icon').textContent = s.icon;
    card.querySelector('#tuto-count').textContent = 'GUIDE · ' + (i + 1) + ' / ' + STEPS.length;
    card.querySelector('#tuto-t').textContent = s.t;
    card.querySelector('#tuto-p').textContent = s.p;
    var go = card.querySelector('#tuto-go');
    if (s.go) { go.hidden = false; go.href = s.go[0]; go.textContent = s.go[1] + ' →'; } else go.hidden = true;
    var dots = card.querySelector('#tuto-dots'); dots.textContent = '';
    STEPS.forEach(function (_, k) { var d = document.createElement('i'); if (k === i) d.className = 'is-on'; dots.appendChild(d); });
    card.querySelector('#tuto-prev').disabled = i === 0;
    card.querySelector('#tuto-next').textContent = i === STEPS.length - 1 ? 'Terminer' : 'Suivant';
    clearHl();
    if (s.hl) { var t = document.querySelector('.navigation ' + s.hl); if (t) { t.classList.add('tuto-hl'); hlEl = t; } }
  }

  function open(start) {
    if (!card) build();
    removePrompt();
    card.hidden = false; step(start || 0);
    card.querySelector('#tuto-next').focus();
  }
  function close() { if (card) card.hidden = true; clearHl(); seen(); }

  /* petite invitation à la première visite */
  var prompt = null;
  function removePrompt() { if (prompt) { prompt.remove(); prompt = null; } }
  function invite() {
    if (prompt || (card && !card.hidden)) return;
    prompt = document.createElement('div');
    prompt.className = 'tuto-invite';
    prompt.innerHTML = '<p><strong>Première visite ?</strong> Je te fais faire le tour du site en 30 secondes.</p>' +
      '<div><button class="button button-primary" type="button" data-yes>Faire le tour</button><button class="button button-ghost" type="button" data-no>Non merci</button></div>';
    document.body.appendChild(prompt);
    prompt.querySelector('[data-yes]').addEventListener('click', function () { open(0); });
    prompt.querySelector('[data-no]').addEventListener('click', function () { removePrompt(); seen(); });
  }

  function waitIntro(done) {
    var tries = 0;
    var t = setInterval(function () {
      tries++;
      var busy = root.classList.contains('intro-playing') || root.classList.contains('intro-leaving') || root.classList.contains('page-arriving') || root.classList.contains('page-revealing');
      if (!busy || tries > 120) { clearInterval(t); setTimeout(done, 1200); }
    }, 500);
  }

  function init() {
    var b = document.createElement('button');
    b.className = 'help-btn'; b.type = 'button'; b.setAttribute('aria-label', 'Ouvrir le guide du site'); b.title = 'Guide du site';
    b.textContent = '?';
    b.addEventListener('click', function () { if (card && !card.hidden) close(); else open(0); });
    document.body.appendChild(b);
    var done = null; try { done = localStorage.getItem(KEY); } catch (e) { /* ignoré */ }
    if (!done) waitIntro(invite);
    var q = new URLSearchParams(location.search);
    if (q.get('guide') === '1') open(0);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
  window.NehodoGuide = { open: open };
})();
