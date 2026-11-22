/* NEHODO.22 — réglages à modifier */
window.NEHODO_CONFIG = {
  /* Accès propriétaire (voir NEHODO.22admin → Réglages → « Accès propriétaire sur le site »). Colle ici la ligne ownerHash générée. */
  ownerHash: '09839a338f3559c089cafcd293464f2f04c46c0e2d67275866dc40df4e41642b',
  /* Adresse qui reçoit propositions, idées et confirmations de soutien */
  email: 'contact@nehodo22.com',
  /* Numéro WhatsApp au format international, sans + ni espaces (ex. 22990000000). Laisse vide pour masquer. */
  whatsapp: '',

  /* Abonnements : prix en dollars, par mois (30 jours). Ils sont convertis en FCFA pour le paiement. */
  tarifs: { premium: 5.13, vip: 10.25 },
  dureeJours: 30,

  /* Vente de plans à l'unité (paiement unique, en FCFA). Un plan peut avoir son propre prix (champ « prix » en $ dans l'admin) ;
     sinon on prend le prix du niveau ci-dessous. ⚠ Valeurs d'exemple : remplace-les par TES prix. */
  prixPlans: { rdc: 25000, r1: 40000, r2: 60000, r3: 80000, r4: 100000 },

  /* Paiement FedaPay (https://fedapay.com) — mobile money MTN, Moov, Celtiis et cartes, payé en FCFA (XOF) */
  fedapay: {
    cle: '',          /* ta clé PUBLIQUE : pk_sandbox_… pour tester, pk_live_… pour de vrai. Vide = paiement pas encore actif. */
    tauxXOF: 585,     /* 1 $ = 585 FCFA (5,13 $ = 3 000 FCFA ; 10,25 $ = 6 000 FCFA). Change selon le cours. */
    verifUrl: '/api/verifier-paiement'   /* vérification côté serveur (server.js) */
  },

  /* Musique d'ambiance : place ton fichier dans le dossier audio/ */
  musique: { fichier: 'audio/ost.mp3', titre: 'Humanity’s Scientific Endeavors', artiste: 'Dr. STONE — OST' },

  /* Autres moyens de paiement du soutien (manuels). Remplis « detail » (numéro, lien…) ; un moyen sans détail est masqué. */
  paiements: [
    { nom: 'MTN Mobile Money', detail: '' },
    { nom: 'Moov Money', detail: '' },
    { nom: 'Celtiis Cash', detail: '' },
    { nom: 'PayPal', detail: '' },
    { nom: 'Virement bancaire', detail: '' }
  ]
};
