import { useEffect, useRef, useState } from "react";

function message(e: unknown): string {
  console.error(e);
  return e instanceof Error && e.message ? e.message : "Le chargement n'a pas fonctionné.";
}

/**
 * Charge des données (avec « tirer pour rafraîchir »). L'erreur est un message en français
 * prêt à afficher. `key` : le chargement repart quand elle change (ex. l'identifiant du
 * groupe). `reload` relance le chargement (après une action, par exemple).
 */
export function useLoad<T>(load: () => Promise<T>, key: string) {
  const [data, setData] = useState<T | undefined>(undefined);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const loadRef = useRef(load);
  useEffect(() => {
    loadRef.current = load;
  });

  useEffect(() => {
    let alive = true;
    loadRef.current().then(
      (value) => {
        if (!alive) return;
        setData(value);
        setError(null);
      },
      (e: unknown) => {
        if (alive) setError(message(e));
      },
    );
    return () => {
      alive = false;
    };
  }, [key]);

  async function reload(pull = false): Promise<void> {
    if (pull) setRefreshing(true);
    try {
      setData(await loadRef.current());
      setError(null);
    } catch (e) {
      setError(message(e));
    } finally {
      setRefreshing(false);
    }
  }

  return { data, error, refreshing, refresh: () => void reload(true), reload: () => reload(false) };
}
