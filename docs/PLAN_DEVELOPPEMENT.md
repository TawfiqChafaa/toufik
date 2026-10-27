# Plan de développement de CAP

Statut : première version locale des idées réalisée ; lots suivants proposés.
Aucun service externe intégré.
Conserver toutes les fonctionnalités existantes et leurs tests.
La proposition Supabase reste à valider avant sa mise en œuvre.
Références : [architecture](../ARCHITECTURE.md),
[secrétaire personnel](SECRETAIRE_PERSONNEL.md),
[proposition Supabase](PROPOSITION_SUPABASE.md).

## 1. Réalisé : capturer et retrouver ses idées
Bouton « + Idée », texte, dictée si compatible, sauvegarde automatique locale
avec date et état visible, liste, édition, catégorie facultative et statut.
Export/import et restauration sans toucher aux données de tâches.
Tester erreurs, rechargement, doublons et saisie rapide sur les appareils réels.
Ce minimum n'attend ni les comptes ni l'IA et ne nécessite pas de service payant.

Validation automatisée : capture, édition, classement, recherche, rechargement,
suppression, export/import, conflits et erreurs de stockage.
Dictée simulée ; essai physique sur Huawei toujours nécessaire.
Statuts livrés : À explorer, En cours, Réalisée, Archivée.
La date « À revoir le » est un repère sans notification et le bouton de discussion
annonce explicitement l'absence d'IA.

## 2. Prochain lot prioritaire : comptes, sauvegardes et synchronisation
La priorité décidée après la livraison des idées est ce lot, avant le dialogue guidé.
Préparation détaillée : PROPOSITION_SUPABASE.md et GUIDE_CONFIGURATION_SUPABASE.md.
Les 34 tests actuels restent la base de régression ; ajouter les tests RLS, de reprise
et de migration avant de déclarer le lot prêt.
Après validation Supabase : authentification, isolation serveur par utilisateur,
cache par compte, file d'attente et résolution des conflits.
Migrer tâches, idées et conversations seulement après sauvegarde et vérification.
Prévoir stockage audio privé et sauvegardes distinctes avant tout envoi d'audio.
Vérifier récupération du compte, restauration et essais entre les trois appareils.
Pas de dépendance à la présence des services Google sur les téléphones.

## 3. Conversation guidée — après la synchronisation
Entrée « Discuter avec CAP » sur l'accueil, conversation guidée clairement annoncée,
microphone volontaire, transcription à vérifier et lecture vocale facultative.
Questions de bilan locales, réponses par règles et cartes à confirmer pour
les objets déjà disponibles (tâches et idées).
Notes audio locales avec écoute et export incluant les fichiers.
Vérifier compatibilité et interruptions Huawei ; conserver tous les accès écrits.
Ce lot ne promet pas encore une conversation naturelle générale.

## 4. Organisation : rendez-vous, personnes et planning
Définir objectifs/projets/rendez-vous séparément, disponibilité et fuseau.
Permettre la conversion confirmée d'idées en objectifs, projets et tâches.
Ajouter personnes à rappeler/relancer et historique des engagements et reports.
Proposer un planning quotidien par règles, ajustable avant confirmation ;
les disponibilités sont manuelles tant qu'aucun agenda externe n'est connecté.
Coach local configurable : bilan, petits pas, nouvelle date ou abandon assumé.
Ces fonctions ne demandent pas d'IA payante ; elles ne notifient pas CAP fermé.

## 5. Rappels quand CAP est fermé
Préparer PWA/service worker et tester le support Web Push sur les deux Huawei.
Après accord sur l'infrastructure : planificateur persistant, file de livraison,
permissions, heures calmes, annulation, reports et déduplication multi-appareils.
Couvrir tâches, idées, rendez-vous et relances. Choisir un canal de secours si
nécessaire, avec présentation préalable du coût.
Tester réception réelle, veille et coupures ; ne pas se satisfaire d'un statut serveur.
Aucune promesse de rappel fiable par une minuterie dans une page fermée.

## 6. Conversation naturelle et analyse IA
Avant développement : choisir fournisseur, politique de données et budget maximal.
Ajouter passerelle serveur sécurisée, extraction de plusieurs demandes,
clarifications, contexte choisi et propositions modifiables.
L'IA prépare ; le code valide ; l'utilisateur confirme ; les services métier exécutent.
Ne créer un rappel confirmé que si la chaîne de notification est disponible,
sinon proposer explicitement une simple échéance.
Conserver la trace des décisions et afficher les réussites/échecs sans doublon.
Tester ambiguïtés, instructions malveillantes dans les données et plafond de coût.

## 7. Assistant et coach enrichis
Discussions par idée : pistes, solutions, avantages, risques et améliorations.
Planning expliqué et bilan des engagements, en s'appuyant sur des faits vérifiables.
Historique, mémoire de préférences consultable et effaçable, ton réglable et pauses.
Aucun appel ou message à un tiers envoyé automatiquement.
Transcription et voix premium seulement en options, après validation des coûts.

## Critères transversaux et décisions
Pour chaque lot : tests métier et navigateur appropriés, conservation des tâches
existantes, accessibilité, français et essais manuels Windows/P60 Pro/Mate 50 Pro.
Le chargement hors ligne complet nécessite une stratégie PWA testée ;
une simple base locale ne suffit pas.
Ne pas confondre fonction prévue, implémentée, simulée et vérifiée sur appareil réel.
Avant service externe : accord, configuration sécurisée et coûts présentés.
Avant tout accès distant ou déploiement : décision séparée.
Aucune publication Internet ni activation de service payant par ce plan.
