# Intégration Supabase — état du développement

## Ce qui est développé
- Panneau « Mon compte », configuration publique après confirmation explicite,
  inscription, connexion, demande de récupération et changement de mot de passe.
- SDK officiel Supabase compilé localement ; pas de CDN, pas de projet configuré
  dans le dépôt, pas de secret administrateur. Le navigateur refuse les clés
  sb_secret et les anciens JWT dont le rôle n'est pas anon.
- L'espace historique sans compte reste intact et séparé.
- Cache IndexedDB cap.accounts.v1 par propriétaire, file transactionnelle,
  sauvegarde locale avant envoi, version serveur et opérations rejouables.
- Synchronisation après enregistrement, ouverture, retour réseau/premier plan,
  et vérification périodique toutes les 15 secondes, avec ralentissement sur erreur.
- Journal ordonné côté PostgreSQL, conflits explicites et choix local/distant/deux.
- Export et restauration manuels du compte ; migration des tâches et idées
  locales confirmée avec export préalable, comparaison et refus des écrasements.
- Cache Service Worker du code statique seulement : réouverture hors ligne après
  préparation complète. Les API et sessions ne sont jamais mises en cache par lui.
- À la déconnexion, le cache est masqué et la file reste liée à son compte.
  Si des changements attendent, export et confirmation supplémentaires sont requis.
  Ces copies ne sont pas un coffre-fort sur un appareil déverrouillé.
- Politique CSP de base pour bloquer les scripts externes et les scripts injectés.

## Choix d'implémentation par rapport à la proposition
- Une table cap_records avec un champ kind contraint (task/idea) remplace les deux
  tables envisagées. Les validations propres aux deux types et les droits restent
  distincts ; un protocole unique réduit les différences de comportement.
- Les identifiants historiques TEXT sont conservés, plutôt que remplacés
  systématiquement par des UUID. Clé composée owner/kind/id : deux utilisateurs
  peuvent avoir le même ancien identifiant sans partager leurs données.
- RPC cap_apply est SECURITY DEFINER parce que les écritures directes sont interdites.
  Il n'accepte aucun propriétaire en argument, déduit auth.uid(), fixe search_path,
  qualifie les objets et valide les entrées. Son droit d'exécution est réservé
  au rôle authenticated. Les lectures des tables utilisent RLS.
- Le journal est conservé sans purge dans le pilote. L'allocation du curseur
  est sérialisée par utilisateur dans la transaction d'écriture.
- Le rattrapage périodique remplace Realtime pour cette première livraison.
  Realtime pourra ensuite réduire la latence, sans changer le protocole de reprise.
- La récupération des données locales lors de la migration refuse les variantes
  contradictoires. Un manifeste journalise les migrations ; les identifiants stables
  permettent de rejouer l'import sans doublon.
- Les sauvegardes manuelles incluent données, conflits et file d'attente, sans
  mots de passe ou jetons. La restauration réenfile les états comme opérations
  nouvelles et refuse tout conflit. Les sauvegardes complètes de la base et des
  comptes Auth ne sont pas remplacées par cet export.
  Le contrôle de restauration accepte aussi cap-avant-migration.json pour rejouer
  l'import des sources, toujours sans écraser une variante différente.

## Fichiers
- src/cloud/supabase.js : SDK, garde de configuration et adaptateur réseau.
- src/cloud/runtime.js : cycle de session, reprise et séparation du mode local.
- src/cloud/local-store.js : transactions du cache par compte.
- src/cloud/sync.js : opérations, conflits, migration et restauration.
- src/cloud/account-ui.js : écrans et confirmations.
- supabase/migrations/001_cap_sync.sql : schéma, RLS et fonction d'écriture.
- scripts/build.js et src/sw-template.js : SDK et cache hors ligne générés.
- tests/sync.test.js, tests/browser/cloud.spec.js et tests/security : validations.

## Reproduire les vérifications localement
Depuis /workspace/toufik :
```sh
npm ci --cache /tmp/cap-npm-cache
npm run build
npm test
npm run test:browser
npm run test:security
```
Le test de sécurité exige Docker et télécharge si nécessaire l'image PostgreSQL
épinglée par digest. Il crée un conteneur temporaire sans réseau ni port publié,
avec uniquement des données fictives, puis le supprime.
Le SQL de tests/security/bootstrap.sql SIMULE les identités Supabase et ne doit
JAMAIS être exécuté sur un projet Supabase réel.

## Résultats de cette livraison
- 19 tests métier et moteur de synchronisation réussis.
- 30 parcours navigateur réussis aux formats ordinateur/mobile.
- 20 contrôles SQL réussis en PostgreSQL 17 local.
- Les 34 tests d'origine sont conservés ; aucune fonction supprimée.

## Portée de la validation
Les tests SQL vérifient les règles réelles dans PostgreSQL 17 avec deux identités
simulées et un rôle anonyme. Les parcours navigateur utilisent le vrai SDK mais
interceptent toutes les requêtes vers un fournisseur fictif.
Les tests du moteur simulent un serveur, deux appareils, les conflits, la réponse
perdue, la reprise et la restauration. Ils ne valident pas le service hébergé,
la délivrabilité des e-mails, les restrictions du plan Free ni les appareils Huawei.
Aucun test automatisé ne garantit l'absence absolue de perte : les exports vérifiés
et les essais de restauration restent nécessaires.

## Avant la première connexion réelle
Suivre GUIDE_CONFIGURATION_SUPABASE.md. Aucun utilisateur ne doit activer le projet
dans CAP avant revue de la migration, configuration de l'authentification et
vérification du projet choisi.
La connexion ne doit utiliser qu'un projet Free personnel dédié à CAP.
Les quotas sont à vérifier dans le tableau de bord ; CAP n'achète aucune ressource.

Après votre création du projet et une autorisation explicite d'accès :
1. Appliquer UNIQUEMENT la migration 001 sur un projet dédié, via l'éditeur SQL
   sous votre contrôle (une seule application ; pas de script de test ni de DROP).
2. Vérifier les autorisations par deux comptes CAP de test et un accès anonyme,
   avec les véritables jetons utilisateur, avant d'importer des données personnelles.
3. Tester confirmations, récupération et déconnexion réelles, puis migration d'un
   petit jeu fictif et restauration. Ne jamais désactiver la confirmation d'e-mail.
4. Exporter vos anciennes données sur tous les appareils, lancer la migration
   confirmée puis comparer tous les champs sur un second appareil.
5. Décider séparément d'un accès HTTPS de test privé pour les téléphones.

Ne pas exécuter les tests locaux en les pointant directement sur vos données personnelles.
Ne jamais publier de JSON personnel dans le dépôt.

## Limites encore à lever avant usage quotidien
- Aucun projet, compte CAP réel, SMTP ou domaine de test n'a été connecté.
- E-mails, récupération PKCE, accès multi-appareils réel, révocation de session
  et règles sur le service Supabase hébergé restent à valider.
- Les essais Huawei et Windows réels restent à faire ; Chromium mobile n'est
  pas une certification du navigateur Huawei.
- Le cache hors ligne ne fonctionne qu'après une première visite complète ;
  son effacement ou une purge par le navigateur peut supprimer les copies locales.
- Le journal et les tombstones conservent du contenu ancien. Une suppression dans
  l'interface n'efface pas immédiatement toutes les traces ou sauvegardes.
  La rétention, la purge cohérente et la suppression complète du compte devront
  être décidées et testées avant une ouverture à d'autres utilisateurs.
- Les sauvegardes serveur automatisées et leur restauration ne sont pas configurées.
  Supabase Free n'inclut pas les sauvegardes restaurables de Pro.
- Une session expirée peut nécessiter une reconnexion. Les données/file restent
  présentes, et le mode hors ligne d'un compte déjà ouvert est préparé.
- Le cache local et les jetons SDK ne sont pas chiffrés de bout en bout.
  Utiliser un appareil personnel verrouillé ; la CSP réduit le risque d'injection
  sans éliminer tous les risques.
- Pas de notifications, IA, audio distant, stockage de fichiers ou déploiement public.
