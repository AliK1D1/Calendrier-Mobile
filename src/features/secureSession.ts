/**
 * Où Supabase garde la session (jeton d'accès + jeton de rafraîchissement) sur le téléphone.
 *
 * Avant : en clair dans `localStorage` d'expo-sqlite, un fichier SQLite du dossier Documents
 * (iOS) ou `databases` (Android). Ce fichier est copié dans les sauvegardes iCloud, de
 * l'ordinateur et de Google : qui a la sauvegarde a le jeton de rafraîchissement, donc le
 * compte, sans mot de passe.
 *
 * Maintenant : dans le trousseau (iOS Keychain, Android Keystore) avec expo-secure-store,
 * « cet appareil seulement » (jamais restauré sur un autre téléphone). Le trousseau limite la
 * taille d'une valeur, donc la session est coupée en morceaux. Une session encore dans
 * l'ancien `localStorage` est déplacée au premier lancement, puis effacée de là.
 *
 * Fonctions pures, testées : le trousseau et l'ancien stockage sont injectés.
 */

/** Ce dont on a besoin du trousseau (expo-secure-store). */
export interface SecureStoreLike {
  getItemAsync(key: string): Promise<string | null>;
  setItemAsync(key: string, value: string): Promise<void>;
  deleteItemAsync(key: string): Promise<void>;
}

/** Ancien stockage (localStorage d'expo-sqlite), seulement pour déplacer une vieille session. */
export interface LegacyStorageLike {
  getItem(key: string): string | null;
  removeItem(key: string): void;
}

/** Stockage asynchrone attendu par supabase-js (`auth.storage`). */
export interface AsyncStorageLike {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
  removeItem(key: string): Promise<void>;
}

/** Taille d'un morceau : sous la limite de 2048 octets d'expo-secure-store (iOS). */
export const CHUNK_SIZE = 1800;
/** Au plus 64 morceaux (115 ko) : une session Supabase fait 2 à 4 ko. */
export const MAX_CHUNKS = 64;

/** Le trousseau n'accepte que lettres, chiffres, « . », « - » et « _ » dans une clé. */
export function secureKey(key: string): string {
  return key.replace(/[^A-Za-z0-9._-]/g, "_");
}

const countKey = (key: string) => `${secureKey(key)}.n`;
const chunkKey = (key: string, i: number) => `${secureKey(key)}.${i}`;

async function readCount(store: SecureStoreLike, key: string): Promise<number | null> {
  const raw = await store.getItemAsync(countKey(key));
  if (raw === null) return null;
  const n = Number(raw);
  return Number.isInteger(n) && n >= 0 && n <= MAX_CHUNKS ? n : null;
}

async function removeChunks(store: SecureStoreLike, key: string, from = 0): Promise<void> {
  const n = (await readCount(store, key)) ?? MAX_CHUNKS;
  for (let i = from; i < n; i++) await store.deleteItemAsync(chunkKey(key, i));
}

export function createSecureSessionStorage(
  store: SecureStoreLike,
  legacy: LegacyStorageLike | null = null,
): AsyncStorageLike {
  async function write(key: string, value: string): Promise<void> {
    const parts: string[] = [];
    for (let i = 0; i < value.length; i += CHUNK_SIZE) parts.push(value.slice(i, i + CHUNK_SIZE));
    if (parts.length > MAX_CHUNKS) throw new Error("Session trop grande pour le trousseau.");
    const before = await readCount(store, key);
    for (let i = 0; i < parts.length; i++) await store.setItemAsync(chunkKey(key, i), parts[i]);
    await store.setItemAsync(countKey(key), String(parts.length));
    if (before !== null) {
      for (let i = parts.length; i < before; i++) await store.deleteItemAsync(chunkKey(key, i));
    }
  }

  async function read(key: string): Promise<string | null> {
    const n = await readCount(store, key);
    if (n === null) return null;
    const parts: string[] = [];
    for (let i = 0; i < n; i++) {
      const part = await store.getItemAsync(chunkKey(key, i));
      if (part === null) return null; // écriture interrompue : pas de session
      parts.push(part);
    }
    return parts.join("");
  }

  function readLegacy(key: string): string | null {
    try {
      return legacy?.getItem(key) ?? null;
    } catch {
      return null;
    }
  }

  function removeLegacy(key: string): void {
    try {
      legacy?.removeItem(key);
    } catch {
      // Ancien stockage illisible : rien à effacer.
    }
  }

  return {
    async getItem(key) {
      const value = await read(key);
      if (value !== null) return value;
      const old = readLegacy(key);
      if (old === null) return null;
      // Session d'avant ce correctif : on la déplace dans le trousseau, puis on l'efface.
      await write(key, old);
      removeLegacy(key);
      return old;
    },
    async setItem(key, value) {
      await write(key, value);
      removeLegacy(key);
    },
    async removeItem(key) {
      await removeChunks(store, key);
      await store.deleteItemAsync(countKey(key));
      removeLegacy(key);
    },
  };
}
