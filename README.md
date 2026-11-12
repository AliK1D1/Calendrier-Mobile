# Freecrew — application mobile

Application mobile (Android et iPhone) de Freecrew, en **React Native avec Expo** (SDK 58,
Expo Router, TypeScript strict). Le site web (dépôt `AliK1D1/calendrier`, en ligne sur
https://calendrier-opal.vercel.app) reste tel quel : l'app et le site partagent **la même base
Supabase et les mêmes comptes**. Ce qu'on fait dans l'app se voit sur le site, et l'inverse.

## Ce que l'app fait

- Connexion et création de compte (courriel + mot de passe, mêmes règles que le site).
- **Bienvenue** : maison, cégep ou école, mode de transport (3 questions).
- **Accueil** : plans qui attendent ta réponse, tes prochains plans.
- **Groupes** : créer, rejoindre (lien ou code), partager le lien d'invitation ; dans un
  groupe, **« Quand on peut se voir »** (même calcul que le site, compromis « Pourquoi
  pas ? », appels) et **proposer un moment** (à partir d'une carte, ou libre, avec
  répétition).
- **Plans** : accepter, refuser, quitter ou arrêter une série, annuler.
- **Horaire** : ma semaine en liste ; ajouter, modifier, supprimer un bloc ; « annulé cette
  fois-ci » et rétablir.
- **Étude** (depuis Horaire) : examens et travaux, « Planifier mon étude », accepter les
  séances, replanifier les conflits, séance déplaçable ou retirée.
- **Profil** : nom, transport, **mes lieux** (recherche d'adresse OpenStreetMap), heures où
  je ne sors pas, limite de sorties, confidentialité, déconnexion.

Différence avec le site : dans l'app, les temps de trajet sont **estimés** d'après la
distance (les clés des API de trajet restent sur le serveur du site).

Encore sur le site seulement : import .ics et Omnivox, Outlook, calendriers abonnés,
disponibilités ponctuelles, couleurs, langue, préférences d'étude, « Je suis libre
maintenant », connexion Google.

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

1. Notifications (nouveau plan, rappel « quand partir »).
2. Liens d'invitation qui ouvrent l'app (`freecrew://rejoindre/<code>`), connexion Google.
3. Vrais temps de trajet (petite route d'API sur le site), choix de la langue.
