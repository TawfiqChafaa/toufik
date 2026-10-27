# CAP — Chaque Action Compte

Première version expérimentale de CAP, application d'organisation personnelle en français.

## Fonctionnalités actuellement disponibles
- Ajouter des tâches par écrit
- Dicter le titre d'une tâche si le navigateur prend en charge la reconnaissance vocale
- Classer par domaine, urgence et importance
- Indiquer une date prévue et une durée
- Marquer une tâche comme terminée, filtrer et supprimer
- Visualiser la progression et une suggestion du coach
- Exporter et importer les tâches en JSON

## Lancer le projet
Aucune dépendance n'est nécessaire pour cette première version. Ouvrez `index.html` dans un navigateur récent, ou utilisez un serveur statique local :

```bash
python3 -m http.server 8000
```

Puis ouvrez http://localhost:8000.

## Limitations importantes
- Les données sont stockées uniquement dans le navigateur avec localStorage. **Pas de compte ni de synchronisation entre appareils**.
- Les rappels automatiques et Google Calendar ne sont **pas encore implémentés**.
- La reconnaissance vocale dépend du navigateur et peut nécessiter HTTPS ou localhost.
- La PWA possède un manifeste de base, mais n'est pas encore une installation hors ligne complète : il manque notamment des icônes et un service worker.
- Ce prototype n'a pas été testé sur les appareils Huawei.

## Prochaines étapes pour Codex
1. Installer un environnement de tests et vérifier la compatibilité Huawei.
2. Migrer progressivement vers Next.js/TypeScript et Supabase avec règles RLS.
3. Ajouter authentification, synchronisation et édition de tâches.
4. Ajouter calendrier, routines et rappels fiables avec canal de secours.
5. Améliorer la dictée vocale avec extraction et confirmation des dates/heures.
6. Ajouter tests automatisés, PWA complète et accessibilité.

Aucune clé API ou donnée personnelle ne doit être ajoutée au dépôt public.
