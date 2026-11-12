# Freecrew — application mobile

Application mobile (Android et iPhone) de Freecrew, en **React Native avec Expo** (SDK 58,
Expo Router, TypeScript strict). Le site web (dépôt `AliK1D1/calendrier`, en ligne sur
https://calendrier-opal.vercel.app) reste tel quel : l'app et le site partagent **la même base
Supabase et les mêmes comptes**. Ce qu'on fait dans l'app se voit sur le site, et l'inverse.

## Ce que l'app fait (étape 1)

- Connexion et création de compte (courriel + mot de passe, mêmes règles que le site).
- **Accueil** : plans qui attendent ta réponse, tes prochains plans.
- **Groupes** : mes groupes, créer un groupe, rejoindre avec un lien ou un code ; page d'un
  groupe avec le lien d'invitation (bouton Partager), les plans à venir et les membres.
- **Plans** : mêmes sections que le site ; accepter, refuser, annuler un plan.
- **Horaire** : ma semaine en liste, jour par jour (semaine d'avant / d'après).
- **Profil** : qui est connecté, déconnexion ; réglages sur le site pour l'instant.

Pas encore dans l'app (le site s'ouvre pour ça) : modifier l'horaire, « Quand on peut se
voir », lieux, étude, réglages du profil, connexion Google. Voir « Prochaines étapes ».

## Lancer l'app sur ton téléphone

1. Installe Node 22 et, sur ton téléphone, l'app **Expo Go** (Play Store ou App Store).
2. `npm install`
3. Copie `.env.example` en `.env.local` et mets les **mêmes valeurs que
   `NEXT_PUBLIC_SUPABASE_URL` et `NEXT_PUBLIC_SUPABASE_ANON_KEY` du site** (Vercel → Settings →
   Environment Variables, ou Supabase → Project Settings → API). Jamais la clé `service_role`.
4. `npm start`, puis scanne le code QR avec Expo Go (Android) ou l'appareil photo (iPhone).

## Installer un vrai APK (Android)

Avec un compte Expo gratuit : `npx eas-cli@latest build -p android --profile preview`. Le
lien de l'APK arrive à la fin du build. Les variables `EXPO_PUBLIC_SUPABASE_*` doivent être
ajoutées dans Expo (`eas env:create`) ou dans `eas.json`.

## Logique partagée avec le site

`src/lib/` est une **copie** du `src/lib/` du site : mêmes fonctions pures d'horaire
(`scheduling/`, avec leurs tests), mêmes requêtes Supabase (RLS), mêmes textes (`i18n/`).
On ne la modifie pas ici : on corrige le site, puis

```sh
npm run sync:web -- ../calendrier   # chemin du dépôt du site
```

Seuls `src/lib/actions.ts` et `src/lib/README.md` sont propres au mobile.

## Commandes

- `npm start` : serveur de développement (Expo Go)
- `npm test` : tests Vitest (logique du site + fonctions du mobile)
- `npm run lint` : ESLint + vérification des types
- `npx expo export --platform android` : vérifie que l'app se construit
- `npm run sync:web -- <site>` : recopie la logique partagée du site

## Prochaines étapes

1. « Quand on peut se voir » dans la page d'un groupe (la logique est déjà copiée) et
   « Proposer ce moment ».
2. Modifier mon horaire (ajouter, déplacer, annuler un cours cette fois-ci).
3. Lieux et profil (maison, transport, heures calmes), choix de la langue.
4. Notifications (nouveau plan, rappel « quand partir »), connexion Google, liens
   d'invitation qui ouvrent l'app.
