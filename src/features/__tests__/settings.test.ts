import type { SupabaseClient } from "@supabase/supabase-js";
import { describe, expect, it } from "vitest";

import { addGroupFavorite } from "../settings";

const G = "11111111-1111-4111-8111-111111111111";

/** Faux client : garde la ligne insérée. */
function fakeClient(error: { message: string; code?: string } | null = null) {
  const inserted: unknown[] = [];
  const client = {
    from: (table: string) => ({
      insert: async (row: unknown) => {
        inserted.push({ table, row });
        return { error };
      },
    }),
  } as unknown as SupabaseClient;
  return { client, inserted };
}

describe("addGroupFavorite", () => {
  it("ajoute un lieu du groupe, marqué favori, à mon nom", async () => {
    const { client, inserted } = fakeClient();
    const r = await addGroupFavorite(client, "u1", G, { name: "Parc Jarry", lat: 45.534, lng: -73.628 });
    expect(r).toEqual({ ok: true });
    expect(inserted).toEqual([
      { table: "places", row: { owner_id: "u1", name: "Parc Jarry", lat: 45.534, lng: -73.628, group_id: G, is_group_favorite: true } },
    ]);
  });
  it("refuse un groupe invalide ou un lieu sans nom, sans rien écrire", async () => {
    const { client, inserted } = fakeClient();
    expect((await addGroupFavorite(client, "u1", "pas-un-uuid", { name: "X", lat: 1, lng: 1 })).ok).toBe(false);
    expect((await addGroupFavorite(client, "u1", G, { name: "  ", lat: 1, lng: 1 })).ok).toBe(false);
    expect(inserted).toEqual([]);
  });
  it("erreur de la base : message en français", async () => {
    const { client } = fakeClient({ message: "boom" });
    const r = await addGroupFavorite(client, "u1", G, { name: "Café", lat: 45.5, lng: -73.6 });
    expect(r.ok).toBe(false);
  });
});
