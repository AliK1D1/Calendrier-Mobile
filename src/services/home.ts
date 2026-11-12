import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Prénom et « configuration terminée » en une seule requête. Remplace, sur l'accueil,
 * `getMyProfile` + `getOnboardingStatus` du site : cette dernière appelle `auth.getUser()`, un
 * aller-retour de plus vers le serveur d'authentification à chaque ouverture de l'accueil.
 */
export async function getHomeProfile(
  supabase: SupabaseClient,
  userId: string,
): Promise<{ displayName: string | null; onboarded: boolean | null }> {
  const { data, error } = await supabase
    .from("profiles")
    .select("display_name, onboarded_at")
    .eq("id", userId)
    .maybeSingle<{ display_name: string | null; onboarded_at: string | null }>();
  if (error) {
    // Colonne `onboarded_at` absente (vieille base) : on se rabat sur le prénom seul.
    console.error("Profil (accueil) :", error.message);
    const fallback = await supabase
      .from("profiles")
      .select("display_name")
      .eq("id", userId)
      .maybeSingle<{ display_name: string | null }>();
    return { displayName: fallback.data?.display_name ?? null, onboarded: null };
  }
  return { displayName: data?.display_name ?? null, onboarded: data ? data.onboarded_at !== null : null };
}
