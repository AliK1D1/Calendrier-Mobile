/**
 * Règles de connexion côté mobile (fonctions pures, testées). Mêmes codes d'erreur que la page
 * /connexion du site, pour réutiliser ses messages (`auth.errors`).
 */
import { isPlausibleEmail } from "@/lib/auth/paths";

export type LoginErrorCode = "motdepasse" | "limite" | "confirmer" | "config" | "echec";

/** Courriel tel qu'envoyé à Supabase : sans espaces autour, en minuscules. */
export function normalizeEmail(raw: string): string {
  return raw.trim().toLowerCase();
}

/** Vérifie le formulaire avant l'appel réseau (`null` : il peut partir). */
export function validateLogin(email: string, password: string): LoginErrorCode | null {
  if (!isPlausibleEmail(email) || password.length === 0 || password.length > 200) {
    return "motdepasse";
  }
  return null;
}

/** Code d'erreur pour un échec de `signInWithPassword`. */
export function loginErrorCode(error: { status?: number; code?: string }): LoginErrorCode {
  if (error.status === 429) return "limite";
  if (error.code === "email_not_confirmed") return "confirmer";
  if (error.status === undefined || error.status === 0) return "echec";
  return "motdepasse";
}
