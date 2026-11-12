/**
 * Recherche d'adresse depuis le téléphone, avec Nominatim (OpenStreetMap). Même lecture des
 * réponses que le site (src/lib/geocoding/nominatim.ts). Politique d'utilisation respectée :
 * User-Agent qui identifie l'app, au plus 1 requête par seconde, résultats gardés en cache,
 * recherche seulement quand on touche « Chercher » (jamais à chaque touche).
 */
import {
  buildSearchUrl,
  cacheKey,
  type GeocodeResult,
  normalizeQuery,
  parseSearchResponse,
} from "@/lib/geocoding/nominatim";

export const MOBILE_USER_AGENT = "Freecrew-mobile/0.1 (projet étudiant)";
const MIN_INTERVAL_MS = 1100;

const cache = new Map<string, GeocodeResult[]>();
let last = 0;

type FetchLike = (url: string, init: { headers: Record<string, string> }) => Promise<{ ok: boolean; status: number; json(): Promise<unknown> }>;

export async function searchAddress(
  raw: string,
  deps: { fetch?: FetchLike; now?: () => number; wait?: (ms: number) => Promise<void> } = {},
): Promise<{ ok: true; results: GeocodeResult[] } | { ok: false; error: string }> {
  const q = normalizeQuery(raw);
  if (!q.ok) return q;
  const key = cacheKey(q.query);
  const hit = cache.get(key);
  if (hit) return { ok: true, results: hit };

  const now = deps.now ?? Date.now;
  const wait = deps.wait ?? ((ms: number) => new Promise<void>((r) => setTimeout(r, ms)));
  const gap = last + MIN_INTERVAL_MS - now();
  if (gap > 0) await wait(gap);
  last = now();

  try {
    const doFetch: FetchLike = deps.fetch ?? ((url, init) => fetch(url, init));
    const res = await doFetch(buildSearchUrl(q.query), {
      headers: { "User-Agent": MOBILE_USER_AGENT, Accept: "application/json" },
    });
    if (!res.ok) {
      return {
        ok: false,
        error: res.status === 429 ? "Le service de recherche d'adresses est occupé. Réessaie dans quelques secondes." : "Le service de recherche d'adresses ne répond pas. Réessaie plus tard.",
      };
    }
    const results = parseSearchResponse(await res.json());
    if (cache.size > 200) cache.clear();
    cache.set(key, results);
    return { ok: true, results };
  } catch {
    return { ok: false, error: "Pas de connexion : la recherche d'adresse n'a pas fonctionné." };
  }
}
