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

## Étapes futures
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
