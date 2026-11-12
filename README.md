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
  je ne sors pas, limite de sorties, confidentialité, **notifications**, déconnexion.
- **Notifications** (Profil) : notifications poussées quand on te propose un plan, quand on
  répond au tien ou qu'un plan où tu vas est annulé ; rappel avant un plan (15 min à 2 h).

Différence avec le site : dans l'app, les temps de trajet sont **estimés** d'après la
distance (les clés des API de trajet restent sur le serveur du site).

Encore sur le site seulement : import .ics et Omnivox, Outlook, calendriers abonnés,
disponibilités ponctuelles, couleurs, langue, préférences d'étude, « Je suis libre
maintenant », connexion Google.

## Lancer l'app sur ton téléphone

1. Installe Node 22 et, sur ton téléphone, l'app **Expo Go** (Play Store ou App Store).
2. `npm install`
3. Rien à configurer : l'URL Supabase et la clé publique sont dans `.env` (commité). Pour
   utiliser d'autres valeurs, crée un `.env.local` (voir `.env.example`), qui a priorité.
   Jamais la clé `service_role` dans ces fichiers.
4. `npm start`, puis scanne le code QR avec Expo Go (Android) ou l'appareil photo (iPhone).

## Installer un vrai APK (Android)

Avec un compte Expo gratuit : `npx eas-cli@latest build -p android --profile preview`. Le
lien de l'APK arrive à la fin du build. Les variables `EXPO_PUBLIC_SUPABASE_*` viennent du
`.env` commité.

## Notifications

- **Poussées** : envoyées par la base de données Supabase (migration 0023 du site,
  `supabase/migration-0023.sql`), que l'action vienne du site ou de l'app. Le téléphone
  s'inscrit avec son jeton Expo (`register_push_token`) quand on active « Notifications des
  plans », se réinscrit à chaque ouverture et se retire à la déconnexion.
- **Rappels** : notifications locales programmées sur le téléphone, recalculées à chaque
  chargement de l'accueil ou des plans (`src/features/notifications.ts`, testé).
- Toucher une notification ouvre l'onglet Plans.
- Limites : **Expo Go sur Android ne reçoit pas de notifications poussées** (depuis le SDK 53) :
  il faut un APK (`--profile preview`) ou une version de développement. Les rappels marchent
  dans Expo Go. Sur iPhone, il faut un compte Apple Developer payant pour les notifications
  poussées.
- Configuration (une fois) : `extra.eas.projectId` dans `app.json` (`npx eas-cli@latest init`),
  `google-services.json` de Firebase à la racine (ou variable fichier `GOOGLE_SERVICES_JSON`,
  lue par `app.config.js`), clé de compte de service FCM V1 et clé APNs dans Expo
  (`npx eas-cli@latest credentials`).

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

1. Rappel « quand partir » avec le vrai trajet (demande une route d'API sur le site).
2. Liens d'invitation qui ouvrent l'app (`freecrew://rejoindre/<code>`), connexion Google.
3. Vrais temps de trajet (petite route d'API sur le site), choix de la langue.
