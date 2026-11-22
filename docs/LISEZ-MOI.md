# NEHODO.22 — à faire avant la mise en ligne

1. **Musique** : mets ton fichier dans `audio/ost.mp3` (nom exact). « Humanity's Scientific Endeavors » (Dr. STONE) est protégée par des droits d'auteur : pour un site public/commercial, il faut une licence, ou une musique libre de droits.
2. **FedaPay** : crée ton compte sur fedapay.com, copie ta clé PUBLIQUE dans `config.js` → `fedapay.cle` (`pk_sandbox_…` pour tester, `pk_live_…` en vrai). Le paiement reste inactif tant que la clé est vide.
3. **E-mail et WhatsApp** : remplace `contact@nehodo22.com` et ajoute ton numéro dans `config.js`.
4. **Plans** : exporte `plans-data.js` depuis NEHODO.22admin et remplace celui du site.
5. **Images de démonstration** : `img/villa-*.jpg` et `img/plan-*.jpg` s'affichent tant qu'aucun plan n'est publié.
6. **Vérification serveur des paiements** (recommandé) : voir `backend-exemple/verif.js`.

## Nouveautés (langues, Atelier, mode léger, curseur)
- **5 langues** : français (défaut), anglais, arabe (droite → gauche), espagnol, portugais. Le français est écrit dans les pages ; les traductions sont dans `lang/en.js`, `lang/es.js`, `lang/pt.js`, `lang/ar.js` (texte français → traduction). Si tu modifies un texte français, ajoute-le dans ces fichiers, sinon il restera en français. Les traductions sont faites par IA : fais-les relire par un locuteur natif (surtout l'arabe).
- **Atelier** : catégorie gratuite (terrasses, cuisines, garages, engins, autres). Dans l'admin, choisis le niveau « Atelier ».
- **12 vues par plan** : Premium = dossier de base (masse, plan, coté, aménagé, façades, perspective) ; VIP = tout (+ électricité, plomberie, coupes, toiture, VRD, animation). Chaque plan peut aussi être acheté seul : prix par niveau dans `config.js` (`prixPlans`) ou prix propre au plan dans l'admin.
- **Curseur gamer** (souris RGB animée) : seulement sur ordinateur à souris. **Mode léger** ⚡ : coupe animations, fumée, fonds animés et curseur ; proposé automatiquement sur appareil modeste.
