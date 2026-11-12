import { Color, DarkTheme, DefaultTheme, type Theme } from "expo-router";
import { useColorScheme } from "react-native";

import { type HexPalette, palettes, type Scheme } from "./colors";

/** Mode (clair ou sombre) choisi sur le téléphone. */
export function useScheme(): Scheme {
  return useColorScheme() === "dark" ? "dark" : "light";
}

/** Une couleur dynamique Material 3, ou la couleur fixe si le téléphone ne la donne pas. */
function dyn(value: unknown, fallback: string): string {
  return typeof value === "string" && value.startsWith("#") ? value : fallback;
}

/**
 * Android : rôles de couleur Material 3 dynamiques (Material You). Sur Android 12+, ils viennent
 * du fond d'écran ; sinon les couleurs Material 3 de base. `useColorScheme()` fait relire les
 * couleurs quand le mode sombre change.
 */
export function usePalette(): HexPalette {
  const scheme = useScheme();
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
