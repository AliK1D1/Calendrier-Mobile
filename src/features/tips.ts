/**
 * Astuces montrées une seule fois, la première fois qu'un geste est utile sur un écran.
 * Ce téléphone garde la liste des astuces déjà vues (une seule clé, texte « a,b,c »).
 */

export const TIPS = {
  swipePlan: {
    title: "Réponds plus vite",
    text: "Glisse une invitation vers la droite pour l'accepter, ou vers la gauche pour la refuser.",
  },
  swipeBlock: {
    title: "Glisse un bloc",
    text: "Vers la gauche : l'annuler juste cette fois-ci, ou le supprimer. Touche-le pour le modifier.",
  },
  pickTime: {
    title: "Choisis l'heure d'un coup",
    text: "Touche l'heure au centre pour ouvrir la roulette, ou ajuste avec les boutons − et +.",
  },
} as const;

export type TipId = keyof typeof TIPS;

/** Clé de stockage sur le téléphone. */
export const TIPS_KEY = "tlc-astuces-vues";

/** Texte gardé → astuces déjà vues (les noms inconnus sont ignorés). */
export function parseSeen(raw: string | null): Set<TipId> {
  const out = new Set<TipId>();
  for (const part of (raw ?? "").split(",")) {
    const id = part.trim();
    if (id in TIPS) out.add(id as TipId);
  }
  return out;
}

/** Astuces vues → texte à garder (trié, pour rester stable). */
export function serializeSeen(seen: ReadonlySet<TipId>): string {
  return [...seen].sort().join(",");
}
