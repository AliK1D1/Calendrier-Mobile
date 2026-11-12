/**
 * Écritures faites depuis l'app : les MÊMES fonctions SQL que les actions serveur du site
 * (create_group, join_group_by_code, respond_to_meetup, cancel_meetup), appelées avec la
 * session de la personne connectée, donc soumises à la RLS.
 */
import type { SupabaseClient } from "@supabase/supabase-js";

import { type ActionResult, dbErrorMessage } from "@/lib/actions";
import { normalizeInviteCode, validateGroupName, validateUuid } from "@/lib/groups/validation";

export type IdResult = { ok: true; id: string } | { ok: false; error: string };

/** Message d'une erreur des fonctions de plans (même règle que le site). */
export function planError(context: string, error: { code?: string; message: string }): string {
  if (error.code === "54000" && /blocs/.test(error.message)) {
    return "Ton horaire est plein (1000 blocs au maximum) : supprime des blocs dans Mon horaire, puis réessaie.";
  }
  const own =
    error.code === "22023" ||
    error.code === "54000" ||
    error.code === "P0002" ||
    (error.code === "42501" && !/permission denied|row-level security/i.test(error.message));
  if (own) return error.message;
  return dbErrorMessage(context, error);
}

export async function createGroup(supabase: SupabaseClient, name: string): Promise<IdResult> {
  const groupName = validateGroupName(name);
  if (!groupName.ok) return groupName;
  const { data, error } = await supabase.rpc("create_group", { group_name: groupName.value });
  if (error) return { ok: false, error: dbErrorMessage("Création du groupe", error) };
  if (typeof data !== "string") return { ok: false, error: "La création du groupe n'a pas fonctionné." };
  return { ok: true, id: data };
}

export async function joinGroup(supabase: SupabaseClient, code: string): Promise<IdResult> {
  const invite = normalizeInviteCode(code);
  if (!invite.ok) return invite;
  const { data, error } = await supabase.rpc("join_group_by_code", { code: invite.value });
  if (error) {
    if (error.code === "P0002") {
      return { ok: false, error: "Ce lien d'invitation n'est plus valide. Demande un nouveau lien." };
    }
    return { ok: false, error: dbErrorMessage("Rejoindre le groupe", error) };
  }
  if (typeof data !== "string") return { ok: false, error: "Impossible de rejoindre ce groupe." };
  return { ok: true, id: data };
}

export async function respondToPlan(
  supabase: SupabaseClient,
  planId: string,
  accept: boolean,
): Promise<ActionResult> {
  const pid = validateUuid(planId, "Plan introuvable.");
  if (!pid.ok) return pid;
  const { error } = await supabase.rpc("respond_to_meetup", { p_plan: pid.value, p_accept: accept });
  return error ? { ok: false, error: planError("Répondre au plan", error) } : { ok: true };
}

export async function cancelPlan(supabase: SupabaseClient, planId: string): Promise<ActionResult> {
  const pid = validateUuid(planId, "Plan introuvable.");
  if (!pid.ok) return pid;
  const { error } = await supabase.rpc("cancel_meetup", { p_plan: pid.value });
  return error ? { ok: false, error: planError("Annuler le plan", error) } : { ok: true };
}
