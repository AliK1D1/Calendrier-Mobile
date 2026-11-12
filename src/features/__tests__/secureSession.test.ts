import { describe, expect, it } from "vitest";

import {
  CHUNK_SIZE,
  createSecureSessionStorage,
  type LegacyStorageLike,
  type SecureStoreLike,
  secureKey,
} from "../secureSession";

/** Faux trousseau : refuse les clés invalides et les valeurs de plus de 2048 caractères. */
function fakeStore(): SecureStoreLike & { data: Map<string, string> } {
  const data = new Map<string, string>();
  return {
    data,
    async getItemAsync(k) {
      return data.get(k) ?? null;
    },
    async setItemAsync(k, v) {
      if (!/^[A-Za-z0-9._-]+$/.test(k)) throw new Error(`clé invalide : ${k}`);
      if (v.length > 2048) throw new Error("valeur trop longue");
      data.set(k, v);
    },
    async deleteItemAsync(k) {
      data.delete(k);
    },
  };
}

function fakeLegacy(init: Record<string, string> = {}): LegacyStorageLike & { data: Map<string, string> } {
  const data = new Map(Object.entries(init));
  return {
    data,
    getItem: (k) => data.get(k) ?? null,
    removeItem: (k) => void data.delete(k),
  };
}

const KEY = "sb-wfjwxwhrqhjeagbwmneu-auth-token";
const session = (n: number) => JSON.stringify({ access_token: "a".repeat(n), refresh_token: "r" });

describe("session dans le trousseau", () => {
  it("garde une grande session en morceaux et la relit telle quelle", async () => {
    const store = fakeStore();
    const s = createSecureSessionStorage(store);
    const value = session(5000);
    await s.setItem(KEY, value);
    expect(await s.getItem(KEY)).toBe(value);
    expect(store.data.get(`${KEY}.n`)).toBe(String(Math.ceil(value.length / CHUNK_SIZE)));
  });

  it("une session plus courte efface les morceaux en trop", async () => {
    const store = fakeStore();
    const s = createSecureSessionStorage(store);
    await s.setItem(KEY, session(5000));
    await s.setItem(KEY, session(10));
    expect(await s.getItem(KEY)).toBe(session(10));
    expect([...store.data.keys()].sort()).toEqual([`${KEY}.0`, `${KEY}.n`]);
  });

  it("déconnexion : tout est effacé", async () => {
    const store = fakeStore();
    const s = createSecureSessionStorage(store);
    await s.setItem(KEY, session(5000));
    await s.removeItem(KEY);
    expect(store.data.size).toBe(0);
    expect(await s.getItem(KEY)).toBeNull();
  });

  it("déplace une session de l'ancien localStorage, puis l'efface de là", async () => {
    const store = fakeStore();
    const legacy = fakeLegacy({ [KEY]: session(3000), autre: "garde" });
    const s = createSecureSessionStorage(store, legacy);
    expect(await s.getItem(KEY)).toBe(session(3000));
    expect(legacy.data.has(KEY)).toBe(false);
    expect(legacy.data.get("autre")).toBe("garde");
    expect(await createSecureSessionStorage(store, null).getItem(KEY)).toBe(session(3000));
  });

  it("écrire ou se déconnecter efface aussi l'ancienne copie en clair", async () => {
    const legacy = fakeLegacy({ [KEY]: "vieille" });
    const s = createSecureSessionStorage(fakeStore(), legacy);
    await s.setItem(KEY, session(10));
    expect(legacy.data.has(KEY)).toBe(false);
    legacy.data.set(KEY, "vieille");
    await s.removeItem(KEY);
    expect(legacy.data.has(KEY)).toBe(false);
  });

  it("morceau manquant (écriture interrompue) : pas de session plutôt qu'une session coupée", async () => {
    const store = fakeStore();
    const s = createSecureSessionStorage(store);
    await s.setItem(KEY, session(5000));
    store.data.delete(`${KEY}.1`);
    expect(await s.getItem(KEY)).toBeNull();
  });

  it("clé du trousseau : seulement les caractères permis", () => {
    expect(secureKey("sb-abc-auth-token")).toBe("sb-abc-auth-token");
    expect(secureKey("a b/c:d")).toBe("a_b_c_d");
  });
});
