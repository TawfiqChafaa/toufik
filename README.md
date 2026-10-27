# CAP — Chaque Action Compte

Application personnelle en français, sans compte et sans serveur de données.
Interface adaptée aux petits écrans et aux ordinateurs, sans ressource externe.

## Développement
Prérequis : Node.js 24, npm et Python 3.
Depuis la racine du dépôt :
```sh
npm ci --cache /tmp/cap-npm-cache
npm run dev
```
Ouvrir ensuite le serveur local sur le port 8000 sur le même ordinateur.
Les modules JavaScript nécessitent le serveur : ne pas ouvrir directement index.html.
Aucun secret ni service payant nécessaire.

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

## Huawei et Windows
L'interface utilise des standards web et aucun service Google.
Les tests mobiles automatisés simulent un petit écran : ils ne certifient pas
le Huawei P60 Pro, le Mate 50 Pro ou leurs navigateurs.
La dictée dépend du navigateur, du microphone, des autorisations et parfois
d'un service distant du navigateur. HTTPS ou localhost peut être nécessaire.
La dictée réelle n'a pas été testée ici. Le clavier vocal du téléphone reste
une solution alternative. Aucun enregistrement vocal n'est sauvegardé par CAP.

## Limites
Les tâches restent dans le navigateur de cet appareil, pour cette adresse.
Changer de navigateur ou d'adresse ne les transfère pas.
Sauvegarder régulièrement en JSON avant toute réinitialisation.
Pas de comptes, synchronisation, rendez-vous, rappels automatiques ni IA.
Le manifeste est une base ; installation PWA et fonctionnement hors connexion
ne sont pas garantis, sans service worker ni icônes d'installation.
Aucun déploiement n'a été effectué.

Voir ARCHITECTURE.md pour la suite.
