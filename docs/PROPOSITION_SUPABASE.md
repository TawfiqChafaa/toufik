# Proposition : comptes CAP et synchronisation avec Supabase

Statut : architecture validée, code d’intégration préparé, service réel non connecté.
Ce document conserve la proposition d’origine ; les choix exécutés, tests et limites
sont précisés dans INTEGRATION_SUPABASE.md (table commune typée, identifiants conservés,
RPC contrainte et rattrapage périodique).
Analyse du code CAP au commit 9bfcf2df86db17aee4fd6d404f15bbf10be0738c.
Sources officielles réactualisées le 27 octobre 2026 par git fetch du dépôt Supabase.
Aucun projet, fournisseur e-mail ou hébergement créé ; aucune donnée personnelle envoyée.
Aucune migration SQL ni nouvelle dépendance applicative ajoutée.

## 1. Conclusion

Supabase Free convient pour un pilote personnel : un même compte CAP sur Windows,
Huawei P60 Pro et Mate 50 Pro. Les trois appareils ne comptent pas comme trois
utilisateurs distincts. Ce choix ne garantit pas une disponibilité permanente.
Il faut préparer des sauvegardes indépendantes et un service d'e-mails adapté.

Recommandation : conserver l'interface JavaScript actuelle, Supabase Auth pour les
comptes, PostgreSQL avec contrôle d'accès par ligne pour tâches ET idées, et Realtime
comme signal de rafraîchissement. Ajouter un cache local IndexedDB et une file
d'opérations pour les coupures de connexion. Aucun besoin de Next.js à ce stade.

## 2. Ce que l'architecture actuelle permet et ce qui manque

| Élément | Aujourd'hui | Évolution proposée après accord |
| --- | --- | --- |
| Interface | index.html et styles responsive | Conservés, ajout des écrans de compte et de l'état de synchronisation |
| Métier | domain.js valide tâches, domaines, dates et priorités | Conservé et complété par des métadonnées de synchronisation |
| Stockage | repository.js lit et remplace toute la liste localStorage | Adaptateur asynchrone, cache local et mises à jour par tâche |
| Idées | ideas-repository.js utilise IndexedDB et une version contre les conflits entre onglets | Conserver le métier et adapter le dépôt ; version locale distincte de la version serveur |
| Coordination | app.js attend une sauvegarde immédiate ; ideas-ui.js utilise déjà des sauvegardes asynchrones | Gestion explicite des états attente, erreur, session expirée et conflit |
| Identité | Aucune | Supabase Auth |
| Tests | 10 tests métier/stockage et 24 parcours Chromium | Conservés, plus tests de sécurité et multi-appareils |

Les identifiants existants sont des chaînes, parfois non UUID ; leur conversion
devra être explicite. Les dates de tâches et de révision des idées ne contiennent pas de fuseau horaire.
Les 34 tests existants ne prouvent pas encore la sécurité inter-comptes ou la synchronisation.
Les versions des idées sont locales : les conserver comme provenance, sans les utiliser
comme preuve de version serveur. Leurs suppressions actuelles sont définitives ;
les futures suppressions synchronisées devront garder une trace.

## 3. Comptes et connexion

- E-mail et mot de passe, avec confirmation d'adresse et récupération du compte.
  Pas de dépendance à Google, de SMS payant ou d'obligation d'installer une app Google.
- Supabase traite les mots de passe ; CAP ne les copie jamais dans ses tables,
  journaux, exports ou GitHub.
- Connexion au même compte sur les trois appareils ; fermeture de session explicite.
- Adresse e-mail confirmée avant import des tâches. Prévoir limitation des tentatives,
  messages évitant de révéler si une adresse possède un compte et protection anti-abus.
- Sessions gérées par le SDK Supabase officiel, flux de récupération/confirmation
  avec PKCE et URL de retour autorisées précisément, sans wildcard en production.
- Dans cette application côté navigateur, le jeton de session demeure accessible
  au JavaScript : le risque de vol par injection ne doit pas être caché.
  Réduire ce risque par rendu textuel sûr, politique CSP, dépendances verrouillées,
  absence de scripts publicitaires et contrôle des URLs.
- Le stockage de session et le cache ne sont pas un coffre-fort sur un appareil
  déverrouillé. Une protection par cookies HttpOnly demanderait un serveur
  supplémentaire, à réévaluer si le niveau de risque l'exige.
- Activer la double authentification du compte administrateur Supabase ;
  proposer ensuite une seconde vérification TOTP pour les comptes CAP sensibles,
  avec application compatible Huawei et procédure de récupération documentée.

## 4. Protection des données côté serveur

Chaque tâche et chaque idée auront un propriétaire user_id lié à auth.users.
Les journaux de changements, opérations rejouables et migrations auront la même isolation.
Activer RLS (Row Level Security) avant toute exposition des tables.

Pour le rôle authenticated :
- Lecture : seulement si auth.uid() = user_id.
- Création : WITH CHECK impose auth.uid() = user_id.
- Mise à jour : USING et WITH CHECK imposent ce même propriétaire.
- Suppression logique : même contrôle, aucun accès aux données d'un autre compte.
- Aucun accès aux tâches pour le rôle anonyme/non connecté.
- Le propriétaire, la version et les horodatages serveur ne sont pas librement
  modifiables par le navigateur. Les droits de colonnes et fonctions doivent
  imposer cette règle ; une interface masquant un champ ne suffit pas.
- Les fonctions de synchronisation seront à privilèges minimaux et respecteront
  RLS ; éviter SECURITY DEFINER. Tout besoin administratif sera isolé et audité.
- Realtime doit respecter les mêmes droits ; un filtre user_id côté client
  ne remplace jamais RLS.

Utiliser seulement l'URL de projet et la clé publiable dans le navigateur.
Cette clé est publique par conception : la sécurité repose sur RLS et la session.
Aucune clé service_role, clé secrète serveur, chaîne de connexion ou mot de passe
de base de données dans le navigateur, les exports, GitHub ou la conversation.

Choisir une région UE disponible, limiter les données au nécessaire et prévoir
export et suppression du compte. Une région UE ne garantit pas à elle seule toute
la conformité RGPD : vérifier les conditions, sous-traitants et durées de conservation.
Le contenu des tâches ne doit pas figurer dans les journaux techniques.
Les sauvegardes doivent être protégées, avec accès limité et durée de conservation.

Les transferts sont chiffrés par HTTPS. Ce dispositif n'est pas du chiffrement
de bout en bout : un administrateur autorisé et le fournisseur peuvent accéder
aux données dans le cadre de leurs droits. Ne pas y placer de dossier médical
ou autre secret très sensible sans analyse complémentaire.

## 5. Synchronisation fiable

Modèle envisagé, pas encore créé :
- Identifiant UUID serveur et user_id.
- Deux tables métier distinctes tasks et ideas, pas une liste JSON partagée.
- Tâches : titre, domaine, date, durée, urgence, importance et terminé conservés.
- Idées : texte, catégorie, statuts À explorer / En cours / Réalisée / Archivée,
  date de révision et dates historiques conservés.
- created_at, updated_at attribués par le serveur, version croissante,
  deleted_at pour les suppressions logiques.
- Identifiant unique d'opération et correspondance des identifiants historiques
  pour éviter les doublons lors d'une nouvelle tentative ou d'une migration.
- Dates historiques préservées comme heures locales jusqu'au choix explicite
  du fuseau ; ne pas les interpréter arbitrairement comme UTC.

À chaque action :
1. Enregistrer atomiquement le changement et l'opération en attente dans IndexedDB.
2. Montrer « En attente d'envoi » puis « Synchronisé » seulement après confirmation.
3. Envoyer l'opération authentifiée avec la version attendue et un identifiant
   de tentative réutilisable. Une fonction transactionnelle compare la version,
   applique le changement et rend les nouvelles tentatives sans effet supplémentaire.
4. Si un autre appareil a changé la tâche ou l’idée, conserver les deux versions et demander
   laquelle garder, avec possibilité de dupliquer. Ne pas choisir silencieusement
   la dernière horloge de téléphone.
5. Une suppression reste un changement synchronisé, pas une disparition immédiate.
   Un appareil hors ligne ne doit pas recréer une tâche supprimée à son retour.
6. Realtime déclenche une relecture autorisée de la base. Il ne remplace ni la
   sauvegarde, ni les opérations en attente, ni le rattrapage après déconnexion.

Relecture à la connexion, au retour au premier plan et au rétablissement du réseau.
Prévoir un bouton de synchronisation manuelle et un rattrapage si Realtime est coupé.
Le chargement paginé doit préserver les changements locaux non envoyés et gérer
les modifications survenues pendant la lecture. Définir et tester un mécanisme
de curseur ou de snapshot cohérent avant l'implémentation.

Séparer strictement les caches et files d'attente par compte.
À la déconnexion : prévenir des changements non envoyés, proposer une sauvegarde,
puis retirer de l'interface les données de ce compte et nettoyer ses données locales
selon la décision explicite. Ne jamais attribuer sa file d'attente au compte suivant.

Les navigateurs mobiles peuvent suspendre l'application : pas de promesse de
synchronisation continue en arrière-plan. IndexedDB seul ne rend pas l'application
disponible hors ligne après fermeture : le chargement hors ligne complet demandera
un service worker/PWA, étape séparée à valider.

## 6. Migration et sauvegarde sans écrasement

Le but est de préserver toutes les données ; aucune garantie absolue de zéro perte
ne peut être donnée sans sauvegardes vérifiées et essais de restauration.

Avant toute migration :
1. Exporter séparément les tâches de chaque navigateur/appareil et noter leur origine.
   Un navigateur ne peut pas lire le localStorage d'un autre appareil ou d'une autre
   adresse : les exports sont indispensables en cas de changement d'adresse.
2. Conserver les fichiers hors de GitHub, dans un emplacement personnel protégé ;
   les JSON actuels ne sont pas chiffrés et peuvent contenir des informations privées.
3. Vérifier que les fichiers s'ouvrent, compter les tâches et tester la restauration
   dans un profil de navigateur de test, sans toucher aux données originales.
4. Se connecter au compte destinataire et confirmer explicitement le transfert.

Pendant la migration :
- Aperçu du nombre de tâches et des différences ; aucune substitution intégrale
  automatique de la liste distante.
- Import idempotent : même sauvegarde importée deux fois ne crée pas de doublons.
- Pour un même identifiant avec contenus différents sur deux appareils, conserver
  les variantes et demander une résolution ; ne pas dédupliquer par titre seul.
- Valider toutes les tâches, conserver les rejets dans un rapport local, traiter
  l'import de façon transactionnelle par lots identifiés avec reprise sûre.
- Relire les tâches du serveur et comparer tous les champs normalisés, identifiants
  et états, pas seulement le nombre total.
- Conserver cap.tasks.v1 et les exports d'origine ; marquer l'import réussi
  seulement après vérification, ne pas effacer les originaux automatiquement.

Après la migration :
- Test de récupération sur un second appareil avant de considérer le transfert fini.
- Export utilisateur avant tout import, suppression importante ou changement majeur.
- Prévoir une sauvegarde indépendante régulière de la base, par exemple quotidienne
  et après chaque migration, puis des tests de restauration.
- Sur Free, ne pas compter sur une restauration automatique fournie. Une planification
  externe et un emplacement de sauvegarde protégé restent à choisir et à valider.
  Les exports JSON seuls ne sauvegardent pas les comptes ni toute la base.
- Cible de conservation initiale à valider : 7 copies quotidiennes et 4 hebdomadaires,
  avec suppression sécurisée et explication du délai d'effacement des sauvegardes.
- Un retour à l'ancienne version se fera après export des changements récents :
  l'ancien code ignore le nouveau cache et ne récupérera pas seul les tâches du cloud.

## 7. Coûts et limites

Chiffres relevés dans les sources officielles de Supabase, à reconfirmer dans le
tableau de bord avant création ou changement d'offre. Prix en USD, fiscalité et
conversion en euros éventuelles en supplément.

| Élément | Offre Free relevée | Conséquence pour CAP |
| --- | --- | --- |
| Abonnement | 0 USD/mois | Adapté à un pilote personnel |
| Base PostgreSQL | 500 Mo par projet | Suffisant a priori pour des tâches textuelles ; surveiller index et historique |
| Utilisateurs actifs | 50 000/mois | Un compte sur trois appareils reste un utilisateur |
| Trafic sortant | 5 Go + 5 Go de trafic mis en cache | Deux quotas distincts, pas 10 Go librement interchangeables |
| Temps réel | 200 connexions simultanées, 2 millions de messages/mois | Très au-dessus du pilote à trois appareils ; surveiller les reconnexions |
| Fichiers | 1 Go | Audio local d’abord ; stockage privé distant et consommation à valider avant synchronisation audio |
| Projets gratuits actifs | 2 maximum | Ne pas multiplier les environnements |
| Inactivité | Mise en pause après environ une semaine | Reprise possible depuis le tableau de bord ; indisponibilité possible |
| Sauvegarde automatique restaurable | Non incluse | Prévoir ses propres sauvegardes |
| Support | Communautaire | Pas de garantie de support ou disponibilité de niveau entreprise |

L'offre Pro est affichée à partir de 25 USD/mois, incluant un projet Micro,
avec des coûts possibles pour projets supplémentaires, ressources, dépassements
et options. Ne rien activer sans accord. Free n'est pas une promesse d'usage illimité :
des restrictions peuvent s'appliquer aux quotas, il faut les surveiller.

Point critique : le SMTP intégré est limité aux adresses de l'équipe du projet,
avec actuellement 2 messages/heure et sans garantie d'envoi.
Ne pas ajouter tous les utilisateurs comme administrateurs pour contourner cela.
Pour un pilote personnel, il peut servir aux premiers essais avec l'adresse autorisée.
Pour un fonctionnement normal, choisir un fournisseur SMTP, vérifier sa formule
gratuite, ses quotas et ses conditions, et éventuellement un domaine d'expédition
payant. Ne pas désactiver les confirmations d'adresse pour contourner ces limites.
Le passage à Supabase Pro ne remplace pas le besoin de SMTP adapté.

Budget proposé : 0 USD d'abonnement Supabase pour le pilote.
Le coût total de mise en service reste à confirmer : e-mails, éventuel domaine,
hébergement futur et stockage de sauvegarde sont distincts.
Pas de SMS, d'IA, de domaine personnalisé Supabase ou d'option payante à cette étape.

## 8. Vos interventions, après validation

1. Créer votre compte sur Supabase et activer sa double authentification.
   Ce compte admin est distinct du futur compte utilisateur CAP.
2. Créer une organisation/projet explicitement Free dans une région UE disponible.
   Ne pas sélectionner une offre payante ; arrêter si les écrans imposent une dépense.
3. Conserver le mot de passe de base dans un gestionnaire sécurisé. Ne jamais
   transmettre de mot de passe ou clé secrète dans la conversation.
4. Fournir la référence/URL du projet et sa clé publiable par la configuration prévue.
   Tout secret serveur ou SMTP nécessaire sera saisi uniquement dans les paramètres
   sécurisés du service concerné.
5. Choisir avec nous le fournisseur d'e-mails et, seulement si nécessaire, autoriser
   un domaine ou une dépense après présentation du coût.
6. Exporter vos tâches sur les trois appareils, puis confirmer le compte destinataire
   et les éventuelles différences entre sauvegardes.
7. Tester les connexions et confirmations sur vos vrais appareils, avec notre guide.

Le développement peut commencer en local avec des comptes et données fictifs.
Le serveur actuel n'est accessible que sur sa machine ; pour tester les téléphones,
il faudra ensuite un accès HTTPS de test contrôlé, défini et approuvé séparément.
Un projet Supabase dispose d'API accessibles sur Internet, même si l'interface CAP
n'est pas publiée : leur accès aux données doit être verrouillé avant tout import.
Aucun accès de ce type ni publication n'a été créé pendant cette étude.

## 9. Ordre de réalisation proposé après accord

La boîte à idées locale est désormais réalisée. La priorité suivante est la
synchronisation sécurisée des tâches ET des idées, sans intégrer l'IA ou l'audio.
Cette préparation ne valide ni ne déclenche la connexion à Supabase.
Voir [le plan général](PLAN_DEVELOPPEMENT.md) et [l’architecture](../ARCHITECTURE.md).

Dès cette étape, appliquer la propriété et la synchronisation aux idées comme aux
tâches. Les discussions futures feront l'objet d'une extension ultérieure. L’audio exigera un espace Storage privé et
des sauvegardes distinctes des dumps de base ; ses quotas et coûts devront être
réévalués. Le quota gratuit de fichiers ne vaut pas autorisation d’envoi automatique.


1. Tests locaux de la base et des règles RLS avec deux utilisateurs distincts.
2. Connexion, confirmation, récupération et déconnexion.
3. Cache par utilisateur, opérations transactionnelles et résolution des conflits.
4. Migration répétable avec sauvegarde et comparaison complète.
5. Realtime et rattrapage des interruptions réseau.
6. Tests sur Windows et les deux Huawei, revue de sécurité et restauration.
7. Décision séparée sur tout hébergement ou mise à disposition.

Critères de validation :
- Compte A ne peut ni lire, créer pour B, modifier, changer le propriétaire,
  supprimer ou recevoir en Realtime les tâches de B, y compris par requête directe.
- Une personne non connectée n'accède à aucune tâche ; les fonctions ne contournent pas RLS.
- Une tâche créée sur Windows est retrouvée sur les deux Huawei, et réciproquement.
- Une opération rejouée ne produit pas de doublon ; un conflit ne détruit aucune variante.
- Une tâche supprimée n'est pas recréée par un appareil resté hors ligne.
- Déconnexion/reconnexion et changement de compte ne divulguent pas le cache précédent.
- Expiration de session ou projet en pause ne supprime pas les changements locaux.
- Migration interrompue puis reprise et restauration depuis sauvegarde réussissent.
- Les 34 tests actuels sont conservés et passent après adaptation nécessaire.
- Toutes ces vérifications couvrent les tâches ET les idées, y compris recherche,
  catégories, statuts et dates de révision sans notification.

## 10. Sources

Le site supabase.com a renvoyé un refus réseau 403 dans cet environnement.
La documentation et les données tarifaires ont donc été lues depuis le dépôt
officiel supabase/supabase, révision :
5bdb7399e80c8ed09c4633174f6e569fd58d8d7f.

- Offres : https://github.com/supabase/supabase/blob/5bdb7399e80c8ed09c4633174f6e569fd58d8d7f/packages/shared-data/plans.ts
- Détail des fonctions : https://github.com/supabase/supabase/blob/5bdb7399e80c8ed09c4633174f6e569fd58d8d7f/packages/shared-data/pricing.ts
- Limite e-mail : https://github.com/supabase/supabase/blob/5bdb7399e80c8ed09c4633174f6e569fd58d8d7f/packages/shared-data/config.ts
- E-mails : https://github.com/supabase/supabase/blob/5bdb7399e80c8ed09c4633174f6e569fd58d8d7f/apps/docs/content/guides/auth/auth-smtp.mdx
- Sauvegardes : https://github.com/supabase/supabase/blob/5bdb7399e80c8ed09c4633174f6e569fd58d8d7f/apps/docs/content/guides/platform/backups.mdx
- Sécurité et disponibilité : https://github.com/supabase/supabase/blob/5bdb7399e80c8ed09c4633174f6e569fd58d8d7f/apps/docs/content/guides/deployment/going-into-prod.mdx

Page à revérifier lors de la création : https://supabase.com/pricing

## 11. Contrat technique avant implémentation

### Séparation des responsabilités
Conserver index.html, les styles et la logique de validation métier.
Introduire après accord :
- service de session Auth (connexion, confirmation, récupération, déconnexion) ;
- dépôt local asynchrone commun aux tâches et idées dans une NOUVELLE base
  IndexedDB versionnée, sans modifier destructivement les stockages historiques ;
- moteur de synchronisation séparé de l'interface ;
- adaptateur Supabase pour les opérations autorisées et la lecture des changements ;
- assistant de migration avec aperçu et rapport de vérification.
Aucun passage à un nouveau framework requis. Le SDK Supabase sera verrouillé
dans le lockfile et servi localement, sans dépendance à un CDN à l'exécution.

L'interface n'attend pas le réseau pour confirmer une sauvegarde LOCALE réussie.
Elle affiche séparément : « Sur cet appareil », « En attente », « Synchronisé »,
« Hors connexion », « Connexion à renouveler » et « Conflit à résoudre ».
Un échec local ne doit jamais apparaître comme une sauvegarde réussie.

### Modèles proposés, non créés
Tables tasks et ideas : id UUID, user_id, contenu validé, server_version,
server_created_at, server_updated_at, deleted_at.
Provenance conservée : legacy_id, identifiant de source d'import,
dates historiques connues et version locale historique.
Ne pas inventer une date de création pour une ancienne tâche qui n'en possède pas.
Préserver createdAt/updatedAt des idées sans les remplacer par la date d'import.
Les champs datetime-local sont conservés sans conversion implicite en UTC ;
demander le fuseau souhaité avant toute conversion future.

Tables techniques envisagées : opérations traitées par utilisateur et operation_id,
journal de changements ordonné, état de migration et correspondances des identifiants.
Contraintes serveur sur longueur, catégories, statuts, booléens, durées et dates.
Index au minimum par propriétaire et identifiant/ordre de changement.
Les tables techniques ne doivent pas exposer les données d'autres comptes.

### Écriture locale, reprise et conflits
Une transaction IndexedDB écrit le nouvel état ET l'opération à envoyer.
Distinguer la révision locale de server_version. Une idée locale en version 7
n'est pas une idée distante déjà en version 7.
Conserver la base serveur connue, les changements locaux et la version reçue
pour pouvoir expliquer un conflit sans perdre de variante.

Chaque envoi contient operation_id stable, objet et version serveur attendue.
Le serveur authentifie l'utilisateur, vérifie le propriétaire et la version,
puis enregistre objet, résultat d'opération et événement dans une transaction.
Le serveur déduit le propriétaire de la session ; une valeur fournie par le client
n'accorde aucun droit. Les versions et métadonnées sont gérées par le serveur.
Une réponse perdue se récupère en rejouant le même identifiant d'opération :
pas de nouvelle création. Les opérations d'un même objet sont ordonnées.
Si l'utilisateur continue de saisir pendant un envoi, ne pas effacer ces nouvelles
modifications quand l'accusé de réception de l'état précédent arrive.

Au retour réseau : temporisation progressive en cas d'échec, rattrapage,
rapprochement des versions puis reprise des opérations compatibles.
Une session expirée suspend les envois mais ne détruit pas la file locale.
Une validation rejetée reste visible et exportable ; pas de boucle de réessai infinie.

Conflit : présenter « sur cet appareil » et « autre appareil », avec choix explicite
ou conservation des deux, y compris modification contre suppression.
Ne pas utiliser l'heure du téléphone pour désigner silencieusement un gagnant.

### Lecture cohérente et suppressions
Realtime n'est qu'un signal ; relire aussi à l'ouverture, au retour au premier plan
et au rétablissement réseau. Une coupure Realtime ne doit pas perdre des changements.
Le journal doit être paginé avec un curseur dont l'ordre respecte les transactions
validées, et une lecture initiale cohérente avec son point de reprise.
Un simple updated_at ou numéro de séquence attribué avant validation ne suffit pas :
deux transactions peuvent être validées dans un ordre différent.
Prévoir sérialisation transactionnelle par utilisateur pour l'allocation du curseur
et la publication des événements, avec tests d'écritures concurrentes.

Garder les suppressions logiques tant que nécessaire pour les appareils absents.
Si un journal est purgé, imposer une resynchronisation complète aux clients dont
le curseur est trop ancien ; ne pas appliquer aveuglément leur copie ancienne.
Ne pas créer de nouveau un identifiant supprimé par un simple upsert.
Tester la reprise d'un appareil resté hors ligne longtemps.

### Session et appareil partagé
Cache, curseur et file d'attente sont indexés par utilisateur.
Le mode local sans compte reste un espace distinct, jamais attribué automatiquement
au prochain utilisateur connecté.
À la déconnexion, proposer d'abord la synchronisation ou un export des changements
non envoyés, puis fermer les abonnements et masquer les données. Pas de transfert
de la file d'un compte à un autre. La politique de nettoyage/retention sur appareil
personnel sera explicite, sans affirmer qu'un navigateur déverrouillé est inviolable.
Prévoir renouvellement de session et déconnexion des autres sessions dans la mesure
des capacités du fournisseur, à tester notamment après récupération du compte.

## 12. Migration des stockages réellement présents

Sources :
- cap.tasks.v1 : tableau JSON localStorage, sans date/version serveur ;
- base IndexedDB cap.ideas, store ideas : version locale et dates existantes ;
- exports cap-taches.json et cap-idees.json (cap.ideas, schemaVersion 1).
Ne pas assimiler un brouillon de secours cap.ideas.draft à un export complet :
prévoir une récupération manuelle de son texte avant migration.

Geler une copie source pour l'import et conserver toute saisie ultérieure dans
une file séparée jusqu'à la fin : ne pas ignorer une idée ajoutée pendant le transfert.
Enregistrer source, identifiant historique et correspondance UUID dans un manifeste
persistant lié au compte. Réimport d'un même contenu : aucun doublon.
Même identifiant et contenu différent : conserver les variantes et demander un choix.
Identifiants différents avec texte identique : signaler les ressemblances sans fusion forcée.
Comparer les champs, pas seulement les totaux, après relecture distante et sur
un second appareil. Si une validation actuelle rejette une ancienne donnée,
la mettre en quarantaine exportable, sans correction destructive silencieuse.

Les originaux localStorage/IndexedDB et leurs exports restent intacts.
L'ancien bouton d'import des tâches remplace la liste locale : ne pas l'utiliser
comme outil de migration cloud. La nouvelle migration aura son propre parcours.
Un retour à l'ancien code ne voit pas les changements du nouveau cache :
exporter et vérifier la compatibilité de restauration avant tout retour arrière.

## 13. Vérifications et étape d'accord

État présent : application locale seulement, aucun compte ni test RLS déployé.
La suite actuelle comprend 10 tests métier et 24 parcours Chromium (34 au total).
Réexécution pendant cette préparation : 10/10 et 24/24 réussis. Un test de fermeture
rapide a été adapté pour attendre la fermeture effective après transaction, avant
rechargement ; son scénario a également réussi trois fois par format d’écran.
Aucun code applicatif modifié et aucun test existant supprimé.
La réexécuter avant et après les modifications ; conserver les assertions utiles.
Ajouter ensuite :
- tests SQL avec deux comptes et accès non authentifié, y compris fonctions,
  abonnements, journaux et tentatives de changement de propriétaire ;
- tests de synchronisation sur deux contextes avec session et cache indépendants ;
- réponse perdue, reprise, opérations rejouées, curseurs et transactions concurrentes ;
- conflits tâche/idée, suppression contre modification, compte changé en cours d'envoi ;
- migration répétée/interrompue et restauration complète, anciens formats compris ;
- tests physiques sur les trois appareils et coupure réseau prolongée.

La prochaine décision porte sur cette architecture, le périmètre tâches + idées,
le pilote Supabase Free et les étapes de configuration. Elle ne vaut pas autorisation
de dépenses, de publication publique ou d'intégration d'IA.
Voir GUIDE_CONFIGURATION_SUPABASE.md pour vos interventions exactes.
