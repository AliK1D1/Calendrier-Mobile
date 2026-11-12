/**
 * PROPRE AU MOBILE (la synchro ne l'écrase pas) : la partie de `src/lib/actions.ts` du site
 * dont les fichiers copiés ont besoin, sans dépendre du client Supabase (testable).
 */
/** Résultat d'une action, affiché tel quel dans l'interface. */
export type ActionResult = { ok: true } | { ok: false; error: string };

export const fail = (error: string): ActionResult => ({ ok: false, error });

/** Message français pour une erreur PostgREST/Postgres (même règle que le site). */
export function dbErrorMessage(context: string, error: { code?: string; message: string }): string {
  console.error(`${context} :`, error.code, error.message);
  if (error.code === "42501") return "Action non permise.";
  if (error.code === "23514") return "Valeur refusée par la base de données.";
  if (error.code === "54000") return error.message;
  if (error.code === "PGRST202" || error.code === "42703" || error.code === "42883") {
    return "La base de données n'est pas à jour : applique les migrations manquantes (voir le README du site).";
  }
  return "L'enregistrement n'a pas fonctionné. Réessaie.";
}
