import { describe, expect, it, vi } from "vitest";

import { buildReverseUrl, MOBILE_USER_AGENT, parseReverse, reverseName, searchAddress } from "../geocode";

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

describe("géocodage inverse (point touché sur la carte)", () => {
  it("lien Nominatim en français, 6 décimales", () => {
    const url = buildReverseUrl(45.5231234567, -73.6);
    expect(url).toContain("https://nominatim.openstreetmap.org/reverse?");
    expect(url).toContain("lat=45.523123");
    expect(url).toContain("lon=-73.600000");
    expect(url).toContain("accept-language=fr");
  });
  it("nom du lieu d'abord", () => {
    expect(parseReverse({ name: " Café Olimpico ", address: { road: "rue Saint-Viateur" } })).toBe("Café Olimpico");
  });
  it("sinon le type de lieu, puis numéro et rue", () => {
    expect(parseReverse({ name: "", address: { leisure: "Parc Jarry" } })).toBe("Parc Jarry");
    expect(parseReverse({ address: { house_number: "124", road: "rue Saint-Viateur O" } })).toBe("124 rue Saint-Viateur O");
    expect(parseReverse({ address: { road: "rue Saint-Denis" } })).toBe("rue Saint-Denis");
  });
  it("rien d'utile : null", () => {
    expect(parseReverse({ error: "Unable to geocode" })).toBeNull();
    expect(parseReverse(null)).toBeNull();
  });
  it("reverseName : réponse lue, puis gardée en cache", async () => {
    let calls = 0;
    const fetch = async () => {
      calls++;
      return { ok: true, status: 200, json: async () => ({ name: "Parc La Fontaine" }) };
    };
    const deps = { fetch, now: () => 1e12, wait: async () => {} };
    expect(await reverseName(45.527, -73.569, deps)).toBe("Parc La Fontaine");
    expect(await reverseName(45.527, -73.569, deps)).toBe("Parc La Fontaine");
    expect(calls).toBe(1);
  });
  it("reverseName : erreur réseau ou réponse refusée : null", async () => {
    const deps = { now: () => 2e12, wait: async () => {} };
    expect(await reverseName(1, 2, { ...deps, fetch: async () => { throw new Error("x"); } })).toBeNull();
    expect(await reverseName(3, 4, { ...deps, fetch: async () => ({ ok: false, status: 429, json: async () => ({}) }) })).toBeNull();
  });
});
