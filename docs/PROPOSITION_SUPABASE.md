# Proposition : comptes CAP et synchronisation avec Supabase

Statut : proposition à valider, aucune modification de l'architecture exécutée.
Analyse du code CAP au commit a83b1eeb78057bd80eda90a17beadcf033816b4c.
Recherche du 27 octobre 2026. Aucun projet, fournisseur e-mail ou hébergement créé.
Aucune migration SQL ni nouvelle dépendance applicative ajoutée.

## 1. Conclusion

Supabase Free convient pour un pilote personnel : un même compte CAP sur Windows,
Huawei P60 Pro et Mate 50 Pro. Les trois appareils ne comptent pas comme trois
utilisateurs distincts. Ce choix ne garantit pas une disponibilité permanente.
Il faut préparer des sauvegardes indépendantes et un service d'e-mails adapté.

Recommandation : conserver l'interface JavaScript actuelle, Supabase Auth pour les
comptes, PostgreSQL avec contrôle d'accès par ligne pour les tâches et Realtime
comme signal de rafraîchissement. Ajouter un cache local IndexedDB et une file
d'opérations pour les coupures de connexion. Aucun besoin de Next.js à ce stade.

## 2. Ce que l'architecture actuelle permet et ce qui manque

| Élément | Aujourd'hui | Évolution proposée après accord |
| --- | --- | --- |
| Interface | index.html et styles responsive | Conservés, ajout des écrans de compte et de l'état de synchronisation |
| Métier | domain.js valide tâches, domaines, dates et priorités | Conservé et complété par des métadonnées de synchronisation |
| Stockage | repository.js lit et remplace toute la liste localStorage | Adaptateur asynchrone, cache local et mises à jour par tâche |
| Coordination | app.js attend une sauvegarde immédiate | Gestion explicite des états attente, erreur, session expirée et conflit |
| Identité | Aucune | Supabase Auth |
| Tests | 5 tests métier/stockage et 6 parcours Chromium | Conservés, plus tests de sécurité et multi-appareils |

Les identifiants existants sont des chaînes, parfois non UUID ; leur conversion
devra être explicite. Les dates de tâches ne contiennent pas de fuseau horaire.
Les 11 tests existants ne prouvent pas encore la sécurité ou la synchronisation.

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

Chaque tâche aura un propriétaire user_id lié à auth.users.
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
- Champs actuels conservés : titre, domaine, date, durée, urgence, importance, terminé.
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
4. Si un autre appareil a changé la tâche, conserver les deux versions et demander
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

Mise à jour du cahier des charges : « Ma boîte à idées » passe en priorité pour
la prochaine version, avec capture texte/dictée et sauvegarde locale automatique.
Cette préparation ne valide ni ne déclenche la mise en œuvre de Supabase.
Voir [le plan général](PLAN_DEVELOPPEMENT.md) et [l’architecture](../ARCHITECTURE.md).

Après les comptes, étendre les règles de propriété et de synchronisation aux idées,
à leurs versions et aux discussions. L’audio exigera un espace Storage privé et
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
- Les 11 tests actuels restent utiles et passent après adaptation nécessaire.

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
