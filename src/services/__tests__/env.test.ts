import { describe, expect, it } from "vitest";

import { readSupabaseEnv } from "../env";

describe("readSupabaseEnv", () => {
  it("nettoie l'URL et la clé collée sur plusieurs lignes", () => {
    expect(readSupabaseEnv({ url: " https://abc.supabase.co/ ", anonKey: "ey J\nhb" })).toEqual({
      url: "https://abc.supabase.co",
      anonKey: "eyJhb",
    });
  });

  it("refuse une configuration absente ou une URL sans https://", () => {
    expect(readSupabaseEnv({ url: undefined, anonKey: "k" })).toBeNull();
    expect(readSupabaseEnv({ url: "https://abc.supabase.co", anonKey: "" })).toBeNull();
    expect(readSupabaseEnv({ url: "abc.supabase.co", anonKey: "k" })).toBeNull();
  });
});
