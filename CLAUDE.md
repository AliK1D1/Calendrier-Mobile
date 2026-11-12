# Règles du projet « Freecrew mobile »

Voir aussi `AGENTS.md` (règles Expo) et le `CLAUDE.md` du site (dépôt `AliK1D1/calendrier`).

- **Langue** : interface en français (Québec), textes repris de `src/lib/i18n/messages`.
- **Fuseau** : `America/Toronto`, avec `date-fns` / `date-fns-tz` (jamais 24 h = 1 jour).
- **Logique partagée** : `src/lib/` est copié du site par `npm run sync:web`. Ne pas le
  modifier ici (sauf `actions.ts`) : corriger le site, puis resynchroniser.
- **Logique propre au mobile** : fonctions pures dans `src/features/`, testées dans
  `src/features/__tests__/` (Vitest). Écrans dans `src/app/`, briques dans `src/components/`.
- **Données** : supabase-js avec la session de l'utilisateur (RLS), clé « anon » seulement,
  jamais `service_role`. Mêmes fonctions SQL (RPC) que les actions serveur du site.
- **Typage** : TypeScript strict, aucun `any`.
- **Avant de dire qu'une tâche est finie** : `npm test`, `npm run lint`,
  `npx expo export --platform android`, et `npx expo-doctor`.
- **Commits** : un segment = un commit, message `Segment M<N> : ...`.
