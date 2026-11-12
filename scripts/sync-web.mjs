#!/usr/bin/env node
/**
 * Copie la logique partagée du site (dépôt AliK1D1/calendrier) dans `src/lib/` de l'app mobile.
 *
 *   npm run sync:web -- ../calendrier
 *
 * Le site reste la source : on ne modifie JAMAIS `src/lib/` à la main (sauf les fichiers
 * propres au mobile listés dans MOBILE_ONLY), on relance ce script. Les lignes
 * `import "server-only";` sont retirées (elles ne servent qu'à Next.js) ; le reste du code est
 * copié tel quel, donc les mêmes fonctions pures et les mêmes requêtes Supabase (RLS) tournent
 * sur le site et dans l'app.
 */
import { cpSync, existsSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const mobileLib = resolve(here, "..", "src", "lib");
const webRoot = resolve(process.argv[2] ?? join(here, "..", "..", "calendrier"));
const webLib = join(webRoot, "src", "lib");

if (!existsSync(join(webLib, "scheduling"))) {
  console.error(`Dépôt du site introuvable : ${webRoot}\nUsage : npm run sync:web -- <chemin du dépôt calendrier>`);
  process.exit(1);
}

/** Dossiers ou fichiers copiés (chemins relatifs à src/lib). */
const SHARED = [
  "scheduling",
  "db/convert.ts",
  "db/schema.ts",
  "i18n/config.ts",
  "i18n/format.ts",
  "i18n/lookup.ts",
  "i18n/messages",
  "auth/signup.ts",
  "auth/paths.ts",
  "groups/queries.ts",
  "groups/validation.ts",
  "places/validation.ts",
  "plans/view.ts",
  "plans/validation.ts",
  "plans/queries.ts",
  "plans/review.ts",
  "plans/reviewQueries.ts",
  "plans/replan.ts",
  "plans/leaveBy.ts",
  "travel/googleRoutes.ts",
  "travel/transitRouter.ts",
  "travel/matrix.ts",
  "travel/fallback.ts",
  "geocoding/cache.ts",
  "geocoding/rateLimiter.ts",
  "geocoding/nominatim.ts",
  "ux",
  "meetups/search.ts",
  "meetups/supabaseStore.ts",
  "meetups/freeNow.ts",
  "study/service.ts",
  "study/validation.ts",
  "study/supabaseStore.ts",
  "profile.ts",
];

/** Fichiers du site à ne pas copier (ils lisent des fichiers propres au site). */
const EXCLUDE = new Set(["ux/__tests__/apparence-css.test.ts"]);

/** Fichiers écrits pour le mobile, jamais écrasés ni supprimés par la synchro. */
const MOBILE_ONLY = new Set(["actions.ts", "README.md"]);

// On repart de zéro pour ne pas garder un fichier supprimé du site.
for (const entry of readdirSync(mobileLib, { withFileTypes: true })) {
  if (!MOBILE_ONLY.has(entry.name)) rmSync(join(mobileLib, entry.name), { recursive: true, force: true });
}

for (const item of SHARED) {
  const from = join(webLib, item);
  if (!existsSync(from)) {
    console.error(`Absent du site : src/lib/${item}`);
    process.exit(1);
  }
  cpSync(from, join(mobileLib, item), { recursive: true });
}

let count = 0;
function clean(dir) {
  for (const name of readdirSync(dir)) {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) {
      clean(path);
      continue;
    }
    if (!/\.(ts|tsx)$/.test(name)) continue;
    if (dir === mobileLib && MOBILE_ONLY.has(name)) continue;
    const text = readFileSync(path, "utf8");
    const out = text.replace(/^import "server-only";\r?\n\r?\n?/m, "");
    writeFileSync(path, out);
    count++;
  }
}
for (const item of EXCLUDE) rmSync(join(mobileLib, item), { force: true });
clean(mobileLib);
console.log(`${count} fichiers copiés depuis ${relative(process.cwd(), webLib) || webLib}.`);
