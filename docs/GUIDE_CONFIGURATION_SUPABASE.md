# Comptes CAP et synchronisation : vos interventions après accord

Statut : intégration préparée en code, aucune connexion réelle activée.
Vous pouvez maintenant créer vous-même le compte et le projet Free (étapes 2 et 3).
N'activez pas encore le projet dans CAP : revenez après sa création pour appliquer
et vérifier les protections avant toute connexion réelle de l'application.
Aucun projet Supabase ni fournisseur e-mail n'a été créé par Codex.
Aucun mot de passe ou secret ne doit être envoyé dans la conversation ou sur GitHub.

## Étape 1 — Mettre vos données à l'abri
Sur chaque navigateur déjà utilisé, exporter tâches ET idées.
Nommer les sauvegardes avec l'appareil, le navigateur et la date.
Les données d'une ancienne adresse web ne sont pas accessibles depuis une nouvelle :
garder l'ancienne application accessible jusqu'aux exports.
Si l'appareil ne contient aucune donnée CAP, le noter ; ne rien inventer.
Conserver les fichiers dans un espace personnel protégé, pas dans le dépôt GitHub.
Codex préparera les contrôles d'import/restauration ; vous confirmerez que le résultat
contient bien vos données avant de supprimer une ancienne copie.

## Étape 2 — Créer votre compte administrateur Supabase
Après validation, aller sur https://supabase.com/dashboard.
Créer votre compte, activer la double authentification et conserver les moyens
de récupération dans un gestionnaire sécurisé.
C'est le compte qui administre le service, distinct de votre compte CAP quotidien.
Une authentification Supabase via GitHub ne vous oblige pas à utiliser Google
sur vos Huawei.

## Étape 3 — Créer un seul projet gratuit
Créer une organisation explicitement Free et un projet, par exemple cap-pilote.
Choisir une région européenne disponible et un mot de passe de base solide.
Garder le mot de passe pour vous. Si l'écran impose un achat ou un changement
d'offre, s'arrêter : aucune dépense n'est nécessairement autorisée par le plan.
Le tableau de bord doit confirmer l'offre Free, pas une option Pro ou un essai
qui deviendrait payant. Noter les quotas et alertes d'usage.

À fournir pour la configuration après accord : URL du projet, référence du projet,
clé PUBLIABLE (publishable key, ou clé anon publique si l'interface utilise ce nom).
Ces informations ne sont pas des secrets administrateur.
Ne pas fournir service_role, secret key, mot de passe de base ou token d'accès.
Tout secret nécessaire à une opération administrative future sera géré séparément,
dans les paramètres sécurisés appropriés, jamais dans les messages.

## Étape 4 — Configurer l'authentification et les e-mails
Choix proposé : e-mail et mot de passe, confirmation de l'adresse et récupération.
Votre compte utilisateur CAP sera ensuite créé avec votre adresse habituelle.
Un même compte CAP sur Windows et les deux Huawei suffit.

Codex préparera les paramètres et règles ; vous devrez confirmer dans Supabase :
- fournisseur Email activé et confirmation des adresses maintenue ;
- URL du site de test et URLs de retour autorisées, exactes et validées ;
- modèles d'e-mail en français et comportement de récupération ;
- service SMTP pour une utilisation quotidienne.

Le SMTP Supabase intégré est réservé aux essais avec les adresses de l'équipe,
actuellement limité à 2 e-mails/heure et sans garantie de livraison.
Ne pas inviter vos utilisateurs dans l'équipe administrative pour contourner cela.
Après comparaison et votre accord, créer un compte chez le fournisseur SMTP choisi.
Son offre gratuite, son quota, l'éventuel domaine d'expédition et les paramètres
DNS devront être vérifiés. Aucun fournisseur n'est encore retenu.
Saisir ses identifiants SMTP directement dans les paramètres sécurisés Supabase.
Ne pas acheter de domaine ou abonnement sans validation distincte.

## Étape 5 — Appliquer les protections et vérifier
La migration supabase/migrations/001_cap_sync.sql et les tests locaux sont préparés.
Après accord de connexion seulement, il faudra appliquer les protections au projet. Selon les outils d'accès disponibles, vous devrez
exécuter les scripts revus dans le tableau de bord, ou autoriser leur application
par une voie sécurisée. Aucune donnée personnelle ne sera importée avant les tests
d'isolation avec deux utilisateurs fictifs.

Ne jamais désactiver RLS pour débloquer un essai.
Seuls les propriétaires doivent lire ou modifier leurs tâches et idées.
Les accès administrateur nécessaires aux sauvegardes ne sont pas utilisés par CAP.

## Étape 6 — Choisir un accès de test aux trois appareils
Le serveur actuel est local à la machine cloud ; les téléphones ne peuvent pas
ouvrir son localhost. Un simple lien localhost ne résout pas ce problème.
Définir ensemble une adresse HTTPS de test avec accès contrôlé, ou un dispositif
de test privé adapté. Cela nécessite une décision distincte avant mise en place.
Ne pas activer GitHub Pages ou un hébergement public automatiquement.
Une adresse HTTPS ne rend pas à elle seule un site privé.

Les API Supabase sont accessibles sur Internet, même si CAP n'est pas publié ;
RLS et les sessions protègent les données. Elles ne sont pas un réseau privé.
Vous devrez tester l'accès depuis vos deux Huawei, connexion, dictée et veille.
Si un domaine ou un abonnement devient nécessaire, le coût sera présenté d'abord.

## Étape 7 — Migrer et vérifier sur les trois appareils
Vous confirmerez le compte destinataire avant tout transfert.
Codex préparera un aperçu des imports, doublons et conflits, sans écraser les originaux.
Vérifier tâches, catégories, priorités, états, idées et dates sur un second appareil.
Créer et modifier des données de test sur chaque appareil, couper le réseau,
puis vérifier la reprise et la résolution des conflits.
Ne supprimer aucune sauvegarde sur la seule foi du message « synchronisé ».

## Étape 8 — Sauvegardes et suivi quotidien
Choisir un emplacement protégé pour les sauvegardes et leur fréquence.
Sur Free, prévoir exports réguliers et sauvegarde indépendante de la base ;
une automatisation peut nécessiter un autre service, soumis à accord.
La synchronisation copie aussi les suppressions : ce n'est pas une sauvegarde.
Le pilote ne sera déclaré prêt qu'après un essai de restauration.
Surveiller les quotas, la livraison des e-mails et les mises en pause éventuelles.

## Ce que vous n'avez pas à créer pour ce lot
Pas de compte IA, pas de fournisseur SMS, pas de service de notifications,
pas de domaine personnalisé Supabase et pas de service payant imposé.
Les dates « À revoir le » restent des repères sans notification.
Aucun besoin de publier vos données, mots de passe ou clés secrètes.

Référence : [architecture proposée](PROPOSITION_SUPABASE.md).


## Repère dans la version préparée
CAP propose « Mon compte » puis l'URL du projet et la clé publiable.
Ces champs n'ont pas à être remplis maintenant : attendre la vérification du schéma
et de l'Auth. Ne jamais coller une clé sb_secret ou service_role.
Le bouton d'activation confirme explicitement la première connexion au service.
Ensuite seulement : créer votre compte CAP quotidien et confirmer son e-mail.
Pour l'état précis des tests et les limites : INTEGRATION_SUPABASE.md.


## Activation sur chaque appareil, plus tard
La configuration publique URL/clé est locale au navigateur. Il faudra saisir la
même configuration sur Windows et les deux Huawei, puis se connecter au même
compte CAP (pas au compte administrateur Supabase).
Pour les liens de confirmation/récupération PKCE, utiliser le même navigateur
et appareil que celui ayant initié la demande. Un lien ouvert ailleurs peut
nécessiter une nouvelle demande sur cet appareil.

## Résultats locaux de cette livraison
19 tests métier/synchronisation et 30 parcours navigateur ont réussi.
20 contrôles SQL ont réussi dans PostgreSQL 17 local avec deux utilisateurs fictifs.
Les 34 tests précédents sont conservés. Aucun service hébergé, envoi d'e-mail réel
ou téléphone physique n'a été validé par ces résultats.
