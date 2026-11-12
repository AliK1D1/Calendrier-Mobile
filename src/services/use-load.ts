import { useFocusEffect } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";

function message(e: unknown): string {
  console.error(e);
  return e instanceof Error && e.message ? e.message : "Le chargement n'a pas fonctionné.";
}

/**
 * Dernières données de chaque écran, gardées en mémoire tant que l'app est ouverte. En revenant
 * sur un écran, on montre tout de suite ces données, puis on les remplace par les nouvelles
 * (au lieu d'une roue qui tourne à chaque fois).
 */
const memory = new Map<string, { value: unknown; at: number }>();

/** Vide la mémoire (à la déconnexion, pour ne rien montrer du compte précédent). */
export function clearLoadCache(): void {
  memory.clear();
}

/**
 * Charge des données (avec « tirer pour rafraîchir »). L'erreur est un message en français
 * prêt à afficher. `key` : le chargement repart quand elle change (ex. l'identifiant du
 * groupe). `reload` relance le chargement (après une action, par exemple). `cache` : nom de
 * l'écran ; avec lui, les données déjà vues s'affichent tout de suite pendant le rechargement.
 */
export function useLoad<T>(load: () => Promise<T>, key: string, cache?: string) {
  const slot = cache ? `${cache}:${key}` : null;
  const [data, setData] = useState<T | undefined>(() =>
    slot ? (memory.get(slot)?.value as T | undefined) : undefined,
  );
  const [error, setError] = useState<string | null>(null);
  // Nouvelle clé (ex. un autre groupe) : on montre ses données gardées, sinon rien.
  const [shownSlot, setShownSlot] = useState(slot);
  if (shownSlot !== slot) {
    setShownSlot(slot);
    setData(slot ? (memory.get(slot)?.value as T | undefined) : undefined);
  }
  const [refreshing, setRefreshing] = useState(false);
  const loadRef = useRef(load);
  const slotRef = useRef(slot);
  const lastLoad = useRef(0);
  useEffect(() => {
    loadRef.current = load;
    slotRef.current = slot;
  });

  function keep(value: T) {
    lastLoad.current = Date.now();
    if (slotRef.current) memory.set(slotRef.current, { value, at: lastLoad.current });
  }

  useEffect(() => {
    let alive = true;
    loadRef.current().then(
      (value) => {
        if (!alive) return;
        keep(value);
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  async function reload(pull = false): Promise<void> {
    if (pull) setRefreshing(true);
    try {
      const value = await loadRef.current();
      keep(value);
      setData(value);
      setError(null);
    } catch (e) {
      setError(message(e));
    } finally {
      setRefreshing(false);
    }
  }

  /** Temps depuis le dernier chargement réussi (en ms), pour éviter de recharger pour rien. */
  const age = () => Date.now() - lastLoad.current;

  return { data, error, refreshing, refresh: () => void reload(true), reload: () => reload(false), age };
}

/**
 * Relit les données quand on revient sur l'écran (ex. après avoir accepté un plan ailleurs),
 * mais pas à la première ouverture (le chargement initial vient d'être lancé) ni si les
 * données ont moins de `minAgeMs`.
 */
export function useReloadOnFocus(
  reload: () => Promise<void>,
  age: () => number,
  minAgeMs = 15_000,
): void {
  const first = useRef(true);
  const reloadRef = useRef(reload);
  const ageRef = useRef(age);
  useEffect(() => {
    reloadRef.current = reload;
    ageRef.current = age;
  });
  useFocusEffect(
    useCallback(() => {
      if (first.current) {
        first.current = false;
        return;
      }
      if (ageRef.current() >= minAgeMs) void reloadRef.current();
    }, [minAgeMs]),
  );
}
