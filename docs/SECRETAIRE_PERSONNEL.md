# CAP — Cahier des charges du secrétaire personnel intelligent

Statut : fonctionnalités prévues, pas encore implémentées.
Ce document complète ARCHITECTURE.md et PLAN_DEVELOPPEMENT.md.
Aucun fournisseur IA, serveur de notifications ou déploiement n'est activé.
Les fonctions actuelles de tâches et la priorité donnée à la capture d'idées restent conservées.

## 1. Une entrée simple sur l'accueil

Afficher « Discuter avec CAP » et un bouton microphone, à côté des accès rapides
« + Tâche » et « + Idée ». La capture directe reste possible sans conversation.
Un appui permet d'écrire ; le microphone demande une action volontaire et une
autorisation. Ne pas écouter en permanence ou en arrière-plan.
Interface française, commandes grandes et accessibles au pouce, clavier et lecteur
d'écran ; historique consultable, indicateurs d'écoute et d'enregistrement clairs.
Afficher les états : écoute, transcription à vérifier, réflexion, proposition,
attente de confirmation, enregistré localement et synchronisé.
Le texte reste utilisable si microphone, réseau ou IA sont indisponibles.

## 2. Conversation naturelle, texte et voix

L'utilisateur peut écrire ou dicter une demande contenant plusieurs éléments :
« Demain, rappelle-moi d'appeler Nadia, prévois une heure pour le devis et note
mon idée d'atelier. » CAP distingue relance, tâche, idée et éventuel rendez-vous.
Une simple conversation ne vaut pas autorisation de créer ces objets.

- Reconnaissance vocale native si disponible ou clavier vocal Huawei ; la dictée
  du navigateur peut utiliser un service distant, même sans facturation CAP.
  Informer l'utilisateur et vérifier la compatibilité avant de promettre ce mode.
- Transcription distante facultative seulement après choix du fournisseur, budget
  et information sur l'envoi de l'audio. Pas d'audio envoyé automatiquement.
- Réponse écrite systématique ; lecture vocale facultative par speechSynthesis si
  une voix française est installée. Prévoir arrêt, désactivation et retour au texte.
  Une voix premium distante est une option distincte, potentiellement payante.
- L'audio brut n'est conservé que si l'utilisateur choisit une note audio.
- Conserver les conversations et leur contexte sélectionné, permettre export,
  effacement et désactivation de l'historique. Ne pas transmettre tout l'historique
  ou toutes les tâches à l'IA par défaut.

Le premier dialogue gratuit peut être guidé, avec commandes et règles limitées.
Il doit annoncer ses limites : ce n'est pas une compréhension générale équivalente
à un assistant humain. La conversation ouverte et l'extraction robuste de demandes
complexes seront un lot IA distinct.

## 3. Proposition, clarification et confirmation

Séparer l'analyse du message, la proposition structurée et l'exécution métier.
Afficher chaque élément proposé avec type, texte, date, heure, durée et personne
concernée. Permettre modification, sélection, refus ou confirmation du lot.

Demander une précision pour une date ambiguë, une durée inconnue, un homonyme,
un manque de disponibilités ou « rappelle-moi » sans échéance.
Résoudre « demain » dans le fuseau de l'utilisateur et afficher la date complète.
Ne pas inventer une disponibilité ni un rendez-vous confirmé avec un tiers.
Une entrée dans CAP ne crée pas d'invitation ou d'événement dans un agenda externe.

À la confirmation, revalider les versions et conflits d'agenda, appliquer par
opérations identifiables et rejouables sans doublon. Afficher exactement ce qui
a réussi ou échoué, y compris un lot partiellement exécuté, et proposer une reprise.
Une création locale n'est pas encore une synchronisation ni un rappel programmé.
Une nouvelle demande ou modification de proposition invalide la confirmation antérieure.
Prévoir annulation des changements lorsque possible, sans promettre de retirer
une notification déjà distribuée.

Le modèle IA n'accède ni directement à la base avec des droits administrateur,
ni aux clés secrètes. Il ne peut pas s'auto-confirmer.
Les textes importés, les notes et les réponses IA sont des données non fiables ;
ils ne peuvent pas donner d'autorisation ou contourner les contrôles.
Les opérations respectent toujours les règles de propriété, limites et validations.

## 4. Planning quotidien

Recueillir plages disponibles, horaires fixes, pauses, durées estimées, échéances,
priorités et préférences. Les disponibilités sont saisies manuellement au départ ;
une intégration d'agenda externe nécessitera un accord et un lot séparé.

Un moteur local peut répartir les tâches par règles explicables, sans IA payante :
respecter les rendez-vous, conserver des marges, éviter les chevauchements et
signaler les tâches qui ne rentrent pas dans la journée.
L'IA pourra aider à interpréter une demande ou expliquer un compromis, mais les
contraintes horaires seront vérifiées par du code déterministe.
Présenter un brouillon ajustable avant validation ; ne pas déplacer seul un engagement.
Prévoir fuseaux, changement d'heure, retard, tâches sans durée et journée déjà remplie.

## 5. Engagements, relances et coach

À l'ouverture ou dans le bilan du jour, proposer « Terminée », « Reporter »,
« Découper en petites étapes » ou « Abandonner ».
Enregistrer les reports et leur contexte, sans assimiler un report à une faute.
Les vérifications dans une page ouverte sont possibles localement ; les sollicitations
quand CAP est fermé nécessitent une infrastructure de notifications.

Relances de personnes : saisie manuelle du nom ou pseudonyme, motif, échéance,
dernier échange et prochaine action, liés à une tâche.
Aucun import du carnet d'adresses sans consentement, aucun appel, SMS ou e-mail
envoyé à un tiers automatiquement. La première version rappelle uniquement
à l'utilisateur de contacter la personne ; ne pas exposer son nom dans une
notification sur écran verrouillé par défaut.

Coach réglable (doux, équilibré, direct), désactivable, avec heures calmes,
fréquence maximale et possibilité de suspendre les sollicitations.
Seuil de reports configurable ; exemple à valider : après trois reports,
« Tu as reporté cette action trois fois. Choisissons un petit pas réaliste,
une nouvelle date ou un abandon assumé. »
Ferme sur les choix, sans culpabilisation, harcèlement ou jugement de la personne.
Les encouragements et bilans factuels peuvent fonctionner avec des règles locales.
Le coach n'est pas un professionnel de santé et n'émet pas de diagnostic.

## 6. Boîte à idées et mémoire

Conserver le cahier des charges « Ma boîte à idées » : capture immédiate,
texte, dictée puis notes audio, date, catégories, statuts, rappels et historique.
Chaque idée peut avoir son fil de discussion pour pistes, solutions, avantages,
risques et améliorations. Une conversation générale peut aussi être liée à une idée.
Ne pas créer de copies divergentes de la même idée ou conversation.

Transformation en objectif, projet ou tâches après aperçu et confirmation,
avec liens de provenance, conservation de l'idée et historique.
Distinguer informations explicites, hypothèses de l'IA et décisions de l'utilisateur.
La mémoire de préférences doit être consultable, corrigeable et effaçable ;
aucune mémorisation implicite permanente des propos sensibles.

## 7. Ce qui peut être gratuit, ce qui dépend d'un service

Ces catégories se cumulent : une fonction peut nécessiter IA ET serveur.
« Sans abonnement » n'élimine pas le coût éventuel du réseau ou du matériel.

| Fonction | Sans IA payante | IA distante / coût possible | Serveur de notifications |
| --- | --- | --- | --- |
| Tâches, idées, catégories, historique, relances manuelles | Oui, en local | Non nécessaire | Non |
| Dialogue guidé, questions de bilan dans CAP ouvert | Oui, règles limitées | Non nécessaire | Non |
| Planning par priorités et disponibilités saisies | Oui, moteur de règles | Option pour dialogue et explications | Non |
| Dictée native / clavier vocal, note audio locale | Selon navigateur et appareil | Transcription externe si choisie | Non |
| Lecture des réponses | Voix native française si disponible | Voix premium facultative | Non |
| Conversation ouverte, extraction complexe, analyse d'idées | Pas garantie avec de simples règles | API IA à budgéter, sauf quota gratuit vérifié | Non, mais passerelle serveur pour protéger la clé |
| Comptes et synchronisation | Supabase Free possible sous quotas | IA non nécessaire | Backend de données, pas un service de rappel à lui seul |
| Échéances visibles et bilan lors de l'ouverture | Oui | Non nécessaire | Non |
| Rappels et suivi lorsque CAP est fermé | Pas fiables avec une page seule | IA non nécessaire | Oui pour cette architecture web |
| E-mail ou SMS de secours | Selon offre, domaine et quotas ; SMS généralement payants | IA non nécessaire | Oui et fournisseur de livraison |

Une IA locale peut éviter la facturation à la requête, mais sa qualité, sa mémoire,
son autonomie et ses performances sur ces Huawei ne sont pas établies.
Ne pas la promettre comme alternative gratuite prête à l'emploi.
Un essai ou quota IA gratuit n'est pas une garantie durable.
Aucun prix IA n'est engagé : fournisseur, confidentialité, plafond et arrêt en cas
d'épuisement du budget doivent être validés avant intégration.

## 8. Notifications et sécurité

Pour les rappels web quand CAP est fermé : planificateur persistant, file de livraison,
service worker/Web Push si supporté, permission explicite et accès HTTPS de test.
Tester abonnement, désabonnement, fuseau, reports, annulations, tentatives répétées
et expiration. Une notification acceptée par le service n'est pas une preuve de
réception ou de lecture. Prévenir les doublons entre appareils selon les préférences.
Supabase seul ne fournit pas toute cette chaîne ; un ordonnanceur et une livraison
sont à définir. Un quota gratuit peut suffire à un pilote, sans garantie de disponibilité.
Les contraintes de navigateur et d'économie d'énergie Huawei doivent être testées ;
prévoir un canal de secours choisi, qui peut être payant.

RLS et stockage privé par propriétaire pour conversations, idées, relances et audio,
avec caches séparés par compte. Minimiser les données des tiers et ne transmettre
à l'IA que le contexte choisi, après information et accord.
Prévoir rétention, export, suppression et sauvegardes restaurables.
Les secrets IA/SMTP restent côté serveur. Aucun contenu privé dans les journaux.
Un futur serveur possède une surface réseau même si l'interface CAP n'est pas publiée :
création et accès de test doivent être décidés séparément.

## 9. Validation avant livraison des lots concernés

- Régression des tâches, capture d'idées, sauvegarde, export et restauration.
- Dictée réelle, refus microphone, absence de voix française, arrêt de lecture,
  interruption d'appel et réseau coupé sur Windows et les deux Huawei.
- Demandes multi-objets, dates ambiguës, annulation, confirmation partielle,
  doublons et échec serveur : aucun objet créé avant confirmation.
- Planning sans chevauchement, sans disponibilités et changement d'heure.
- Rappels réellement reçus CAP fermé, refus des notifications et retour de veille.
- Coach respectant arrêt, heures calmes et seuil de reports.
- Aucune fuite entre comptes, aucune clé serveur dans le navigateur,
  aucune instruction contenue dans une idée ne déclenchant une action.
- Budget IA atteint : arrêt explicite du service, fonctions locales conservées.

Ces vérifications sont des critères futurs ; elles n'ont pas été exécutées
sur des fonctionnalités qui ne sont pas encore développées.
