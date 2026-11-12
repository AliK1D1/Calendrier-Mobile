import { Color, DarkTheme, DefaultTheme, type Theme } from "expo-router";

import { ACCENT_APPAREIL, paletteAccent } from "@/features/apparence";
import { useApparence } from "@/services/apparence";

import { type HexPalette, palettes } from "./colors";
import { useScheme } from "./scheme";

export { useScheme };

/** Une couleur dynamique Material 3, ou la couleur fixe si le téléphone ne la donne pas. */
function dyn(value: unknown, fallback: string): string {
  return typeof value === "string" && value.startsWith("#") ? value : fallback;
}

/**
 * Android, rôles de couleur Material 3 :
 * - « Couleurs du téléphone » (par défaut) : couleurs dynamiques Material You, tirées du fond
 *   d'écran sur Android 12+, sinon les couleurs de base ;
 * - un accent du site (bleu, rose…) : toute la palette est tirée de cet accent, comme un
 *   schéma Material 3 à couleur source (surfaces légèrement teintées, comme sur le site).
 * Le mode sombre est relu à chaque changement (`useScheme`).
 */
export function usePalette(): HexPalette {
  const scheme = useScheme();
  const { accent } = useApparence();
  if (accent !== ACCENT_APPAREIL) return paletteAccent(accent, scheme);
  const f = palettes[scheme];
  const m = Color.android.dynamic;
  return {
    background: dyn(m.surface, f.background),
    card: dyn(m.surfaceContainerLow, f.card),
    text: dyn(m.onSurface, f.text),
    muted: dyn(m.onSurfaceVariant, f.muted),
    border: dyn(m.outlineVariant, f.border),
    primary: dyn(m.primary, f.primary),
    primaryText: dyn(m.onPrimary, f.primaryText),
    accent: dyn(m.secondaryContainer, f.accent),
    accentText: dyn(m.onSecondaryContainer, f.accentText),
    danger: dyn(m.error, f.danger),
    success: f.success,
    warning: f.warning,
  };
}

/** Thème de navigation : barre du haut Material (surface) et fond des écrans. */
export function useNavTheme(): Theme {
  const scheme = useScheme();
  const c = usePalette();
  const base = scheme === "dark" ? DarkTheme : DefaultTheme;
  return {
    ...base,
    colors: { ...base.colors, primary: c.primary, background: c.background, card: c.background, text: c.text, border: c.border },
  };
}
