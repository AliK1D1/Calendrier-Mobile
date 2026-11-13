/**
 * Astuces déjà vues sur ce téléphone (localStorage d'expo-sqlite, comme l'apparence).
 * Si le stockage manque, l'astuce se ferme quand même, jusqu'à la fermeture de l'app.
 */
import "expo-sqlite/localStorage/install";

import { useSyncExternalStore } from "react";

import { parseSeen, serializeSeen, type TipId, TIPS_KEY } from "@/features/tips";

function read(): Set<TipId> {
  try {
    return parseSeen(typeof localStorage === "undefined" ? null : localStorage.getItem(TIPS_KEY));
  } catch {
    return new Set();
  }
}

let seen = read();
const listeners = new Set<() => void>();

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** L'astuce est-elle encore à montrer ? Et de quoi la fermer pour de bon. */
export function useTip(id: TipId): { show: boolean; dismiss: () => void } {
  const show = useSyncExternalStore(subscribe, () => !seen.has(id), () => false);
  return {
    show,
    dismiss: () => {
      seen = new Set(seen).add(id);
      try {
        localStorage.setItem(TIPS_KEY, serializeSeen(seen));
      } catch {
        // Stockage indisponible : fermée pour cette fois.
      }
      listeners.forEach((l) => l());
    },
  };
}
