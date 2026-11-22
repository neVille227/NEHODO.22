# NEHODO.22

Site de plans de villa (RDC à R+4, trois types de toiture, catégorie libre « Atelier »), avec abonnements Premium / VIP, achat de plan à l'unité, paiement FedaPay, 5 langues et un espace admin.

C'est une application **Node/Express** (pas un site statique) :

| Chemin | Rôle |
| --- | --- |
| `server.js` | Serveur : site public, `/admin` protégé par mot de passe, `/api/verifier-paiement` (vérification FedaPay) |
| `public/` | Le site (HTML, CSS, JS, images, polices, traductions dans `lang/`) |
| `admin/` | NEHODO.22admin : ajout des plans, export de `plans-data.js`, suivi des idées, commandes et soutiens |
| `render.yaml` | Déploiement sur Render |
| `docs/LISEZ-MOI.md` | Liste de ce qu'il reste à faire avant la mise en ligne |

## Lancer en local

```bash
npm install
npm start        # http://localhost:3000   (admin : http://localhost:3000/admin)
```

## Variables d'environnement

Voir `.env.example`. `ADMIN_USER` et `ADMIN_PASSWORD` protègent `/admin` (en production, l'admin est désactivé tant qu'elles ne sont pas définies). `FEDAPAY_SECRET` (clé secrète `sk_…`) sert à vérifier les paiements ; la clé **publique** va dans `public/config.js` (`fedapay.cle`).

## Avant la mise en ligne

1. Ajouter les vrais plans (admin → exporter `plans-data.js` → remplacer `public/plans-data.js`).
2. Compte FedaPay : clé publique dans `public/config.js`, clé secrète dans `FEDAPAY_SECRET`. Tester en sandbox d'abord (la vérification serveur n'est pas encore testée avec FedaPay).
3. Remplacer l'e-mail et le WhatsApp d'exemple dans `public/config.js`, fixer les prix.
4. Ajouter la musique dans `public/audio/ost.mp3` (fichier dont tu as les droits ; ignoré par Git).
5. Pages légales (CGU, confidentialité, mentions).

Limites connues : l'abonnement et l'essai de 72 h sont encore enregistrés dans le navigateur du visiteur (pas de comptes utilisateurs), et les plans sont dans `plans-data.js`, donc lisibles par un visiteur averti. Les protections anti-capture sont dissuasives, pas absolues.
