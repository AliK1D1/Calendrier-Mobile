import { DarkTheme, DefaultTheme, type Theme } from "expo-router";
import { useColorScheme } from "react-native";

import { type Palette, palettes, type Scheme } from "./colors";

/** Mode (clair ou sombre) choisi sur l'appareil. */
export function useScheme(): Scheme {
  return useColorScheme() === "dark" ? "dark" : "light";
}

/** Web : la palette fixe du site, en mode clair ou sombre selon l'appareil. */
export function usePalette(): Palette {
  return palettes[useScheme()];
}

/** Thème de la navigation (fond des écrans, en-têtes) assorti à la palette. */
export function useNavTheme(): Theme {
  const scheme = useScheme();
  const c = palettes[scheme];
  const base = scheme === "dark" ? DarkTheme : DefaultTheme;
  return {
    ...base,
    colors: { ...base.colors, primary: c.primary, background: c.background, card: c.card, text: c.text, border: c.border },
  };
}
