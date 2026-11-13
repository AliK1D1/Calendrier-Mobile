/**
 * « Annuler » au lieu de « Es-tu sûr ? » : une suppression disparaît tout de suite de l'écran,
 * un bandeau propose « Annuler » pendant quelques secondes, et elle n'est envoyée au serveur
 * qu'ensuite (ou tout de suite si l'app passe en arrière-plan).
 */

/** Temps pendant lequel « Annuler » reste proposé. */
export const UNDO_MS = 5_000;

/** Les éléments, sans ceux dont la suppression attend encore (cachés en attendant). */
export function withoutHidden<T>(items: readonly T[], hidden: ReadonlySet<string>, id: (item: T) => string): T[] {
  if (hidden.size === 0) return [...items];
  return items.filter((item) => !hidden.has(id(item)));
}

/** Ajoute ou retire un identifiant d'un ensemble, sans modifier l'original (état React). */
export function toggled(set: ReadonlySet<string>, id: string, on: boolean): Set<string> {
  const next = new Set(set);
  if (on) next.add(id);
  else next.delete(id);
  return next;
}
