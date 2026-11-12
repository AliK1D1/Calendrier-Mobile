/**
 * Lecture des variables Supabase (fonction pure, testée). Mêmes règles que le site : espaces
 * retirés de la clé (collée sur plusieurs lignes), URL sans « / » final et en http(s).
 */
export interface SupabaseEnv {
  url: string;
  anonKey: string;
}

export function readSupabaseEnv(raw: {
  url: string | undefined;
  anonKey: string | undefined;
}): SupabaseEnv | null {
  const url = raw.url?.trim().replace(/\/+$/, "");
  const anonKey = raw.anonKey?.replace(/\s+/g, "");
  if (!url || !anonKey) return null;
  try {
    const { protocol } = new URL(url);
    if (protocol !== "https:" && protocol !== "http:") return null;
  } catch {
    return null;
  }
  return { url, anonKey };
}
