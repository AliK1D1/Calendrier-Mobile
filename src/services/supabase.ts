/**
 * Client Supabase de l'app : même projet que le site, clé publique « anon » protégée par la
 * RLS (jamais la clé service_role). La session est gardée dans le trousseau du téléphone
 * (expo-secure-store, cet appareil seulement), donc on reste connecté d'un lancement à
 * l'autre sans que le jeton soit copié dans les sauvegardes (revue sécurité mobile 1).
 */
// Ancien emplacement de la session (en clair) : lu une fois pour la déplacer, puis effacé.
import "expo-sqlite/localStorage/install";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import * as SecureStore from "expo-secure-store";
import { AppState, Platform } from "react-native";

import { createSecureSessionStorage } from "@/features/secureSession";

import { readSupabaseEnv } from "./env";

/** Lisible après le premier déverrouillage (rafraîchissement en arrière-plan), jamais restauré ailleurs. */
const KEYCHAIN = { keychainAccessible: SecureStore.AFTER_FIRST_UNLOCK_THIS_DEVICE_ONLY };

// Le trousseau n'existe pas dans un navigateur (`expo start --web`) : localStorage, comme avant.
const sessionStorage = Platform.OS === "web" ? localStorage : createSecureSessionStorage(
  {
    getItemAsync: (k) => SecureStore.getItemAsync(k, KEYCHAIN),
    setItemAsync: (k, v) => SecureStore.setItemAsync(k, v, KEYCHAIN),
    deleteItemAsync: (k) => SecureStore.deleteItemAsync(k, KEYCHAIN),
  },
  typeof localStorage === "undefined" ? null : localStorage,
);

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
          storage: sessionStorage,
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
