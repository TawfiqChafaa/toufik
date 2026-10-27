# Organisation et évolutions

## Structure actuelle
- index.html : structure et formulaires accessibles.
- src/styles.css : présentation responsive sans dépendance.
- src/domain.js : modèle validé, catégories, priorités, dates et filtres.
- src/repository.js : adaptateur localStorage, clé historique conservée.
- src/app.js : interactions, rendu sûr par textContent, dictée et transferts JSON.
- tests : tests métier, stockage et parcours navigateur.

L'application n'a pas de compilation et ne dépend pas de Playwright à l'exécution.
L'interface de stockage permet d'introduire ensuite un adaptateur distant.
Ce découpage est une préparation, pas une synchronisation déjà implémentée.

## Vision : secrétaire personnel intelligent

Le cahier des charges inclut désormais une conversation accessible dès l'accueil,
par texte et voix, des demandes multi-tâches/idées/rendez-vous, un planning proposé,
des créations après confirmation, le suivi des engagements et personnes à relancer,
ainsi qu'un coach encourageant et ferme sur les reports répétés.
Les réponses sont écrites, avec lecture vocale facultative selon l'appareil.

Spécification complète : [secrétaire personnel](docs/SECRETAIRE_PERSONNEL.md).
Ordre de référence : [plan de développement](docs/PLAN_DEVELOPPEMENT.md).
Ce sont des évolutions prévues, pas des fonctions déjà disponibles.

Architecture envisagée après validation :
- Interface de conversation et passerelle vocale séparées de la capture rapide.
- Analyse de demande vers propositions structurées, puis validation et confirmation
  utilisateur, puis exécution via les services métier ; jamais de création par l'IA seule.
- Moteur de planning déterministe vérifiant priorités, disponibilités et chevauchements.
- Conversations, messages, propositions confirmées, relances et historique des reports
  distincts, reliés aux tâches, idées, objectifs et futurs rendez-vous.
- Adaptateur IA côté serveur seulement après accord, droits minimaux et plafond de coût.
- Service de planification/livraison des notifications distinct de l'IA et du stockage.
- Stockage local puis synchronisation par compte selon la proposition Supabase ;
  règles de propriété également sur conversations, personnes et mémoire de préférences.

Le dialogue guidé, le planning simple et le coach à règles peuvent fonctionner sans
IA payante. La conversation ouverte peut dépendre d'une API IA facturée ; les
notifications CAP fermé exigent pour cette architecture un service serveur et un
canal compatible. Aucun de ces services n'est activé par l'ajout à ce document.
La capture d'idées reste la priorité de la prochaine version.

## Prochaine priorité : comptes et synchronisation des tâches et idées

Préparation documentée sur la base du module idées réellement livré :
[architecture Supabase actualisée](docs/PROPOSITION_SUPABASE.md) et
[guide des configurations personnelles](docs/GUIDE_CONFIGURATION_SUPABASE.md).
Prévoir un stockage local transactionnel avec file d'attente, versions serveur,
isolation par utilisateur, migration vérifiée et reprise sans écrasement.
Le dépôt actuel d’idées protège les écritures entre onglets via IndexedDB ;
il ne fournit ni rafraîchissement temps réel des onglets ni synchronisation des appareils.
La préparation ne connecte aucun service ; attendre l'accord avant activation
et décider séparément de tout accès HTTPS de test ou dépense.

## Étapes futures
0. Ma boîte à idées : priorité à la capture rapide et à la sauvegarde locale,
   sans attendre les comptes ni l’IA. Détail ci-dessous et dans
   [le plan de développement](docs/PLAN_DEVELOPPEMENT.md).
1. Comptes : choisir avec le propriétaire un hébergement, son coût et ses conditions
   de confidentialité. Prévoir authentification, isolation des données par utilisateur,
   récupération de compte, export et suppression.
2. Synchronisation : version du modèle, propriétaire, dates de modification,
   file locale des changements, suppressions et résolution des conflits. Migrer les
   données locales avec confirmation, sans écraser une sauvegarde.
3. Rendez-vous : modèle distinct des tâches, fuseau horaire explicite, récurrences
   et tests des changements d'heure. Ne pas utiliser la seule date de tâche.
4. Rappels : service de planification durable, consentement aux notifications,
   déduplication et canal alternatif. Tester les restrictions d'arrière-plan Huawei.
5. Coach IA : API côté serveur, clés jamais dans le navigateur, budget et accord
   sur les données transmises. Confirmer toute modification suggérée avant application.
6. PWA : icônes, service worker versionné, stratégie de mise à jour et tests hors ligne.

Une migration vers TypeScript ou un framework pourra être évaluée lorsque ces
besoins seront définis ; elle n'est pas nécessaire pour faire fonctionner ce prototype.

## Avant utilisation sur les appareils réels
Tester sur Huawei P60 Pro, Mate 50 Pro et navigateur Windows : création, rechargement,
export/import, dates, zoom, clavier et dictée autorisée/refusée.
L'accès depuis un téléphone à un serveur sur Windows nécessite une configuration
réseau locale ; le serveur actuel est volontairement lié à la boucle locale.
Ne pas exposer ce serveur de développement sur Internet.

## Ma boîte à idées — première version locale réalisée

Statut : capture texte/dictée, sauvegarde IndexedDB, consultation, édition, recherche,
catégories, statuts, date de révision et export/import développés et testés.
Les notes audio, rappels, historique détaillé, IA, conversions et synchronisation
ci-dessous restent des évolutions prévues, pas des fonctions disponibles.

Modules : src/ideas-domain.js (validation et sauvegarde JSON),
src/ideas-repository.js (transactions IndexedDB et contrôle de version),
src/ideas-ui.js (capture, autosauvegarde et interface).
Les idées sont séparées de cap.tasks.v1. L'import fusionne sans écraser et annule
tout le lot en cas de conflit ; voir README.md pour les limites et la récupération.
Aucun service payant ou assistant IA n'est nécessaire pour cette première étape.

### Capture immédiate
- Bouton « + Idée » visible sur l'écran principal, accessible au pouce, au clavier
  et au lecteur d'écran, sans masquer les autres commandes.
- Un appui ouvre une saisie avec le curseur prêt ; texte libre, sans titre,
  catégorie ou priorité obligatoires. Classement possible après la capture.
- Dictée si le navigateur la prend en charge, avec confirmation du texte et
  alternative par clavier vocal Huawei. Ne pas confondre dictée et note audio :
  la dictée produit du texte, la note audio conserve un enregistrement.
- Sauvegarde automatique locale après une courte pause, puis à la validation ;
  ne pas dépendre uniquement de la fermeture de page. Afficher « Enregistrement… »,
  « Enregistrée sur cet appareil » ou une erreur réelle et proposer « Terminer ».
- Identifiant et date de création fixés dès le premier enregistrement réussi ;
  les saisies suivantes mettent à jour la même idée, sans créer de doublons.
- Cible de conception : ouverture en un appui et capture d'une courte idée en
  quelques secondes. Mesurer sur les appareils réels, sans promettre un délai garanti.
- La fermeture brutale avant confirmation de sauvegarde peut perdre les derniers
  caractères : conserver des brouillons fréquents et rendre l'état visible.

### Modèle et organisation proposés
Les idées sont distinctes des tâches ; aucune modification de cap.tasks.v1.
Un module métier « idées », un adaptateur de stockage et une interface dédiés
sont présents, sans transformer les tâches existantes.

Champs envisagés : id, texte, source (texte/dictée/audio), created_at, updated_at,
catégorie facultative, statut et références aux pièces audio.
Statuts livrés : « À explorer », « En cours », « Réalisée », « Archivée ».
La capture attribue « À explorer » par défaut ; ne jamais imposer le classement.
Prévoir ensuite version, propriétaire et suppression logique pour la synchronisation.

Utiliser IndexedDB pour les idées et les futurs fichiers audio, avec transactions
et version du schéma. Ne pas enregistrer d'audio en base64 dans localStorage.
Un brouillon vide n'encombre pas la liste ; conserver les idées incomplètes non vides.
La liste affiche un extrait, la date, la catégorie et le statut.
Édition, recherche, statut Archivée et suppression confirmée sont disponibles.
L'archivage conserve les données ; une suppression définitive doit être explicite.

### Notes audio
Lot distinct après le minimum texte/dictée : enregistrement volontaire via microphone
et MediaRecorder, indicateur visible, arrêt, écoute et suppression.
Détecter les formats réellement supportés, conserver le type MIME et tester
lecture/enregistrement sur les deux Huawei et Windows.
Gérer refus, interruption, durée/taille maximales, quota plein et fichier partiel.
Ne pas afficher « Enregistrée » avant persistance effective du fichier.
HTTPS ou localhost peut être requis ; aucun accès microphone automatique.
Conserver l'audio localement, sans transcription distante ni envoi implicite.

### Fonctions ultérieures
- Rappels : date, heure et fuseau explicites, consentement, service de planification
  et notification testée sur Huawei. Une date affichée ne constitue pas un rappel fiable.
- Assistant IA par idée : propositions, pistes, solutions, avantages, risques et
  améliorations. Historique daté des échanges, erreurs et demandes en cours ;
  aucun conseil ne modifie automatiquement les données.
  L'utilisateur choisit le contenu envoyé, valide le fournisseur et le budget.
  Aucune idée ou note audio n'est envoyée à une IA sans action explicite.
- Conversion en objectif, projet ou tâches : aperçu et confirmation, lien vers
  l'idée d'origine et conservation de son historique. Les modèles « objectif »
  et « projet » restent à définir ; ne pas présenter une conversion déjà disponible.
  Une action répétée ne doit pas dupliquer involontairement les tâches.
- Historique : versions du contenu et du classement, conversions et discussions,
  séparés et datés ; permettre export et effacement selon une rétention documentée.
  L'historique n'est ni une sauvegarde indépendante ni une conservation infinie imposée.
- Synchronisation après les comptes : mêmes règles RLS par propriétaire pour idées,
  versions et discussions ; cache par compte, file d'attente, conflits et migration
  des données locales avec accord. Fichiers audio dans un espace Supabase Storage
  privé, accès autorisés par propriétaire, liens temporaires et suppression cohérente.

### Sauvegarde et critères de validation
Prévoir export/import des idées textuelles sans remplacer les exports historiques
de tâches. Pour l'audio : format de sauvegarde incluant fichiers et métadonnées ;
un JSON seul ne préserve pas les enregistrements. Tester une restauration complète.
Distinguer absence de connexion, stockage interdit, quota plein et donnée illisible ;
ne jamais effacer une sauvegarde illisible ou annoncer une réussite fictive.

Tests à ajouter pendant le développement : capture rapide, caractères français,
sauvegarde et rechargement, édition sans doublon, dates stables, brouillons,
échec de stockage, dictée simulée et repli, classement, export/import et non-régression
des tâches. Puis tests audio réels, sécurité inter-comptes, conflits, rappels et IA
dans leurs lots respectifs. Le chargement hors ligne complet nécessite la PWA ;
le stockage local seul ne suffit pas.
