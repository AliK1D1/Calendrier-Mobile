/** Web (aperçu dans le navigateur) : pas de notifications. */
import type { SupabaseClient } from "@supabase/supabase-js";

export function useNotifications(_supabase: SupabaseClient | null, _userId: string | null): void {}
