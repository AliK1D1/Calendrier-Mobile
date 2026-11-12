/**
 * PROPRE AU MOBILE (la synchro ne l'écrase pas) : équivalent de `src/lib/actions.ts` du site,
 * avec le client Supabase de l'app (session de l'utilisateur sur le téléphone, donc RLS).
 */
import type { SupabaseClient, User } from "@supabase/supabase-js";

import { getSupabase } from "@/services/supabase";

/** Résultat d'une action, affiché tel quel dans l'interface. */
export type ActionResult = { ok: true } | { ok: false; error: string };

export const fail = (error: string): ActionResult => ({ ok: false, error });

/** Client Supabase + utilisateur connecté, ou un message d'erreur. */
export async function requireUser(): Promise<
  { ok: true; supabase: SupabaseClient; user: User } | { ok: false; error: string }
> {
  const supabase = getSupabase();
  if (!supabase) return { ok: false, error: "La base de données n'est pas configurée." };
  const { data } = await supabase.auth.getUser();
  if (!data.user) return { ok: false, error: "Ta session a expiré. Reconnecte-toi." };
  return { ok: true, supabase, user: data.user };
}

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
