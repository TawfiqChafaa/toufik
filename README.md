# CAP — Chaque Action Compte

Application personnelle en français, sans compte et sans serveur de données.
Interface adaptée aux petits écrans et aux ordinateurs, sans ressource externe.

## Développement
Prérequis : Node.js 24, npm et Python 3.
Depuis la racine du dépôt :
```sh
npm ci --cache /tmp/cap-npm-cache
npm run build
npm run dev
```
Ouvrir ensuite le serveur local sur le port 8000 sur le même ordinateur.
Les modules JavaScript nécessitent le serveur : ne pas ouvrir directement index.html.
Aucun secret ni service payant nécessaire au mode local.
La commande dev prépare aussi automatiquement le SDK et le cache hors ligne.
Après une modification du code, relancer npm run build. Un nouveau service worker
s'active après fermeture des anciens onglets ; éviter de laisser plusieurs versions
ouvertes pendant une mise à jour.

## Vérification
- `npm test` : validation des tâches, filtres et stockage.
- `npm run test:browser` : parcours Chromium sur formats ordinateur et mobile.
- Le navigateur de test est /usr/bin/chromium dans cet environnement.
  Ailleurs, définir CAP_CHROMIUM avec le chemin d'un Chromium installé.
- Le serveur de test démarre automatiquement si nécessaire.

## Fonctionnalités
Création, domaines, urgence et importance, date et durée, filtres, tâches terminées,
progression, suppression avec confirmation, export et import JSON.
L'import remplace les données après validation et confirmation.
La clé historique cap.tasks.v1 est conservée.
Une sauvegarde illisible n'est pas écrasée par une nouvelle tâche.
La suggestion CAP utilise une règle locale : ce n'est pas un coach IA.

## Ma boîte à idées
Le bouton « + Idée » ouvre directement la saisie. Le texte et le classement sont
enregistrés automatiquement après une courte pause (350 ms), ainsi qu'à la fermeture
avec « Terminer », « Fermer » ou Échap. Attendre « Enregistrée sur cet appareil »
avant de quitter : une fermeture forcée peut perdre les derniers caractères.

Les idées utilisent une base IndexedDB séparée, cap.ideas, sans modifier les tâches.
Recherche insensible aux accents, édition, suppression confirmée, catégories,
statuts À explorer / En cours / Réalisée / Archivée, et date locale « À revoir le ».
La date ne déclenche aucune notification. Le bouton de discussion explique que
l'IA n'est pas encore disponible ; aucun envoi distant n'est effectué par ce bouton.

Exporter les idées crée cap-idees.json (format cap.ideas, schemaVersion 1).
Importer ajoute sans écraser : doublons identiques ignorés, conflit annulant
l'import entier. La limite d'import est 5 Mo. Les exports des tâches restent distincts.
Un export n'est pas une synchronisation automatique.
En cas d'erreur de stockage, garder l'éditeur ouvert et exporter le brouillon
de secours : son texte est récupérable manuellement, ce fichier n'est pas accepté
par l'import normal. Aucun fichier personnel exporté ne doit être publié sur GitHub.

La dictée d'idées fonctionne selon le navigateur, avec clavier vocal comme repli.
Pas de note audio enregistrée dans cette version. Pas de comptes ou synchronisation.
Les suppressions sont définitives ; conserver des sauvegardes régulières.
Les protections de version empêchent deux onglets d'écraser la même idée silencieusement.

## Huawei et Windows
L'interface utilise des standards web et aucun service Google.
Les tests mobiles automatisés simulent un petit écran : ils ne certifient pas
le Huawei P60 Pro, le Mate 50 Pro ou leurs navigateurs.
La dictée dépend du navigateur, du microphone, des autorisations et parfois
d'un service distant du navigateur. HTTPS ou localhost peut être nécessaire.
La dictée réelle n'a pas été testée ici. Le clavier vocal du téléphone reste
une solution alternative. Aucun enregistrement vocal n'est sauvegardé par CAP.

## Comptes et synchronisation : préparation désactivée par défaut
Le panneau « Mon compte » n'active aucun service tant que vous n'avez pas fourni
l'URL et la clé publique de votre projet, puis confirmé son activation.
Ne jamais y saisir de mot de passe de base ou clé administrative.
L'espace historique est séparé de l'espace par compte ; la migration est explicite.
La synchronisation réelle exige les opérations décrites dans
[le guide personnel](docs/GUIDE_CONFIGURATION_SUPABASE.md).
Voir [l'état de l'intégration et ses limites](docs/INTEGRATION_SUPABASE.md).
Le compte et ses sessions ne sont pas inclus dans les exports de tâches/idées.
Le panneau permet un export/restauration du compte (cap.account, schemaVersion 1),
refusant une sauvegarde d'un autre compte et tout conflit.
Les copies locales de compte sont conservées sur cet appareil après déconnexion,
mais masquées par CAP. Protéger l'accès au navigateur.

Un cache du code permet la réouverture hors ligne après une première visite complète.
Il ne met pas en cache les réponses API ou les liens de connexion avec code.
Aucune promesse de disponibilité permanente du navigateur ou du plan Free.

## Limites
Les tâches restent dans le navigateur de cet appareil, pour cette adresse.
Changer de navigateur ou d'adresse ne les transfère pas.
Sauvegarder régulièrement en JSON avant toute réinitialisation.
Comptes et synchronisation préparés mais non activés ni validés sur un service réel.
Pas de rendez-vous, rappels automatiques ou IA.
Le service worker prépare la réouverture hors ligne ; l’installation PWA complète
et les icônes restent à terminer.
Aucun déploiement n'a été effectué.

Voir ARCHITECTURE.md pour la suite.
