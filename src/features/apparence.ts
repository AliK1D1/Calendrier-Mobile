/**
 * Apparence sur le téléphone : thème (selon l'appareil, clair, sombre) et couleur d'accent,
 * les mêmes que Profil > Apparence du site (src/lib/ux/apparence.ts, copié du site).
 *
 * Le site calcule ses couleurs en OKLCH dans globals.css. React Native ne lit pas OKLCH : on
 * refait ici les mêmes calculs (mêmes clartés, même teinte et saturation par accent) et on les
 * convertit en hexadécimal. Fonctions pures, testées dans __tests__/apparence.test.ts.
 */
import { ACCENT_PAR_DEFAUT, ACCENTS, type AccentId, type ChoixTheme } from "@/lib/ux/apparence";
import type { Weekday } from "@/lib/scheduling/weeklyBlocks";

import type { HexPalette, Scheme } from "@/theme/colors";

/**
 * Sur Android, en plus des accents du site : « Couleurs du téléphone » (Material You, tirées
 * du fond d'écran). C'est le choix par défaut sur Android, comme avant cette option.
 */
export const ACCENT_APPAREIL = "appareil" as const;
export type AccentMobile = AccentId | typeof ACCENT_APPAREIL;

export type Plateforme = "ios" | "android" | "web" | string;

/** Accent par défaut : couleurs du téléphone sur Android, le bleu Freecrew ailleurs. */
export function accentParDefaut(plateforme: Plateforme): AccentMobile {
  return plateforme === "android" ? ACCENT_APPAREIL : ACCENT_PAR_DEFAUT;
}

/** Lit un accent gardé ; valeur inconnue (ou « appareil » hors Android) = accent par défaut. */
export function lireAccentMobile(valeur: unknown, plateforme: Plateforme): AccentMobile {
  if (valeur === ACCENT_APPAREIL) return plateforme === "android" ? ACCENT_APPAREIL : ACCENT_PAR_DEFAUT;
  return ACCENTS.some((a) => a.id === valeur) ? (valeur as AccentId) : accentParDefaut(plateforme);
}

/** Valeur à donner à `Appearance.setColorScheme` : « unspecified » rend la main au système. */
export function schemaForce(choix: ChoixTheme): "light" | "dark" | "unspecified" {
  if (choix === "clair") return "light";
  if (choix === "sombre") return "dark";
  return "unspecified";
}

const clamp01 = (x: number) => Math.min(1, Math.max(0, x));

/** sRGB linéaire → sRGB (gamma), 0 à 1. */
function gamma(x: number): number {
  return x <= 0.0031308 ? 12.92 * x : 1.055 * Math.pow(x, 1 / 2.4) - 0.055;
}

/**
 * Couleur OKLCH (clarté 0–1, saturation, teinte en degrés) en hexadécimal `#rrggbb`.
 * Hors de la gamme sRGB, chaque canal est ramené entre 0 et 1 (comme un navigateur simple).
 */
export function oklchVersHex(l: number, c: number, h: number): string {
  const rad = (h * Math.PI) / 180;
  const a = c * Math.cos(rad);
  const b = c * Math.sin(rad);
  const l_ = l + 0.3963377774 * a + 0.2158037573 * b;
  const m_ = l - 0.1055613458 * a - 0.0638541728 * b;
  const s_ = l - 0.0894841775 * a - 1.291485548 * b;
  const L = l_ ** 3;
  const M = m_ ** 3;
  const S = s_ ** 3;
  const rgb = [
    4.0767416621 * L - 3.3077115913 * M + 0.2309699292 * S,
    -1.2684380046 * L + 2.6097574011 * M - 0.3413193965 * S,
    -0.0041960863 * L - 0.7034186147 * M + 1.707614701 * S,
  ];
  return `#${rgb
    .map((v) => Math.round(clamp01(gamma(clamp01(v))) * 255).toString(16).padStart(2, "0"))
    .join("")}`;
}

function accentInfo(id: AccentId): { teinte: number; chroma: number } {
  return ACCENTS.find((a) => a.id === id) ?? ACCENTS[0];
}

/** Pastille d'aperçu d'un accent (même couleur que le bouton principal). */
export function couleurPastille(id: AccentId, scheme: Scheme): string {
  return paletteAccent(id, scheme).primary;
}

/**
 * Palette complète tirée d'un accent, comme le site : gris teintés par l'accent, bouton
 * principal, fond d'accent. Les valeurs reprennent globals.css du site (`:root` et
 * `:root[data-theme="sombre"]`). Rouge et vert restent fixes.
 */
export function paletteAccent(id: AccentId, scheme: Scheme): HexPalette {
  const { teinte: h, chroma: k } = accentInfo(id);
  const o = (l: number, c: number, hue = h) => oklchVersHex(l, c, hue);
  if (scheme === "dark") {
    return {
      background: o(0.17, k * 0.12),
      card: o(0.215, k * 0.13),
      text: o(0.95, k * 0.05),
      muted: o(0.73, k * 0.14),
      border: o(0.3, k * 0.12),
      primary: o(0.74, k * 0.85),
      primaryText: o(0.18, 0.03, 260),
      accent: o(0.29, k * 0.3),
      accentText: o(0.95, k * 0.05),
      danger: o(0.69, 0.18, 24),
      success: o(0.72, 0.14, 155),
    };
  }
  return {
    background: o(0.972, k * 0.06),
    card: "#ffffff",
    text: o(0.21, k * 0.22),
    muted: o(0.46, k * 0.16),
    border: o(0.9, k * 0.1),
    primary: o(0.49, k),
    primaryText: o(0.985, 0.002, 250),
    accent: o(0.94, k * 0.24),
    accentText: o(0.3, k * 0.6),
    danger: o(0.56, 0.2, 27),
    success: o(0.55, 0.13, 155),
  };
}

/**
 * Couleur propre à chaque jour (lundi = 1), comme la grille de l'horaire du site
 * (`--jour-1` à `--jour-7` de globals.css, version claire et sombre).
 */
const JOURS: Record<Weekday, { c: number; h: number; lSombre: number; cSombre: number }> = {
  1: { c: 0.13, h: 255, lSombre: 0.72, cSombre: 0.12 },
  2: { c: 0.12, h: 165, lSombre: 0.72, cSombre: 0.11 },
  3: { c: 0.14, h: 300, lSombre: 0.72, cSombre: 0.13 },
  4: { c: 0.13, h: 70, lSombre: 0.74, cSombre: 0.12 },
  5: { c: 0.15, h: 25, lSombre: 0.72, cSombre: 0.13 },
  6: { c: 0.1, h: 210, lSombre: 0.72, cSombre: 0.09 },
  7: { c: 0.14, h: 345, lSombre: 0.72, cSombre: 0.13 },
};

export function couleurJour(jour: Weekday, scheme: Scheme): string {
  const j = JOURS[jour];
  return scheme === "dark" ? oklchVersHex(j.lSombre, j.cSombre, j.h) : oklchVersHex(0.6, j.c, j.h);
}

/** Jour de la semaine (lundi = 1 … dimanche = 7) d'une date « aaaa-mm-jj ». */
export function jourDeSemaine(isoDate: string): Weekday {
  const [y, m, d] = isoDate.split("-").map(Number);
  // Date civile seulement (midi UTC) : aucun décalage de fuseau ni d'heure avancée possible.
  const js = new Date(Date.UTC(y, m - 1, d, 12)).getUTCDay();
  return (js === 0 ? 7 : js) as Weekday;
}
