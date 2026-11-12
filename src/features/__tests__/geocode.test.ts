import { describe, expect, it, vi } from "vitest";

import { MOBILE_USER_AGENT, searchAddress } from "../geocode";

const answer = [
  {
    place_id: 1,
    osm_type: "way",
    osm_id: 42,
    lat: "45.5381",
    lon: "-73.5103",
    name: "Cégep Édouard-Montpetit",
    display_name: "Cégep Édouard-Montpetit, Longueuil, Québec, Canada",
    category: "amenity",
    type: "college",
  },
];

describe("searchAddress", () => {
  it("identifie l'app, lit la réponse et garde le résultat en cache", async () => {
    const fetch = vi.fn(async () => ({ ok: true, status: 200, json: async () => answer }));
    const r = await searchAddress("Cégep Édouard-Montpetit", { fetch, wait: async () => {} });
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.results[0]).toMatchObject({ name: "Cégep Édouard-Montpetit", lat: 45.5381 });
    const call = fetch.mock.calls[0] as unknown as [string, { headers: Record<string, string> }];
    expect(call[1].headers["User-Agent"]).toBe(MOBILE_USER_AGENT);
    await searchAddress("cégep édouard-montpetit", { fetch, wait: async () => {} });
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it("attend entre deux requêtes (1 par seconde au plus)", async () => {
    const waits: number[] = [];
    const fetch = vi.fn(async () => ({ ok: true, status: 200, json: async () => [] }));
    let t = 10_000;
    const deps = { fetch, now: () => t, wait: async (ms: number) => { waits.push(ms); t += ms; } };
    await searchAddress("rue Saint-Denis", deps);
    await searchAddress("rue Sherbrooke", deps);
    expect(waits.at(-1)).toBeGreaterThan(1000);
  });

  it("refuse une recherche trop courte et explique une panne", async () => {
    expect((await searchAddress("ab")).ok).toBe(false);
    const down = vi.fn(async () => ({ ok: false, status: 503, json: async () => null }));
    const r = await searchAddress("rue Ontario", { fetch: down, wait: async () => {} });
    expect(r).toMatchObject({ ok: false });
  });
});
