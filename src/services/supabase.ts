/**
 * Client Supabase de l'app : même projet que le site, clé publique « anon » protégée par la
 * RLS (jamais la clé service_role). La session est gardée sur le téléphone (expo-sqlite), donc
 * on reste connecté d'un lancement à l'autre.
 */
import "expo-sqlite/localStorage/install";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { AppState } from "react-native";

import { readSupabaseEnv } from "./env";

let client: SupabaseClient | null | undefined;

/** Le client, ou `null` si les variables EXPO_PUBLIC_SUPABASE_* manquent. */
export function getSupabase(): SupabaseClient | null {
  if (client !== undefined) return client;
  const env = readSupabaseEnv({
    url: process.env.EXPO_PUBLIC_SUPABASE_URL,
    anonKey: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY,
  });
  client = env
    ? createClient(env.url, env.anonKey, {
        auth: {
          storage: localStorage,
          autoRefreshToken: true,
          persistSession: true,
          detectSessionInUrl: false,
        },
      })
    : null;
  if (client) {
    const supabase = client;
    // Recommandé par Supabase : rafraîchir le jeton seulement quand l'app est à l'écran.
    AppState.addEventListener("change", (state) => {
      if (state === "active") void supabase.auth.startAutoRefresh();
      else void supabase.auth.stopAutoRefresh();
    });
  }
  return client;
}
