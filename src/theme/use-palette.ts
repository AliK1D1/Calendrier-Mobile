import { DarkTheme, DefaultTheme, type Theme } from "expo-router";

import { paletteAccent } from "@/features/apparence";
import { ACCENT_PAR_DEFAUT } from "@/lib/ux/apparence";
import { useApparence } from "@/services/apparence";

import type { HexPalette } from "./colors";
import { useScheme } from "./scheme";

export { useScheme };

/** Web : la palette du site pour l'accent choisi, en mode clair ou sombre. */
export function usePalette(): HexPalette {
  const { accent } = useApparence();
  return paletteAccent(accent === "appareil" ? ACCENT_PAR_DEFAUT : accent, useScheme());
}

/** Thème de la navigation (fond des écrans, en-têtes) assorti à la palette. */
export function useNavTheme(): Theme {
  const scheme = useScheme();
  const c = usePalette();
  const base = scheme === "dark" ? DarkTheme : DefaultTheme;
  return {
    ...base,
    colors: { ...base.colors, primary: c.primary, background: c.background, card: c.card, text: c.text, border: c.border },
  };
}
