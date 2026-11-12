import { Color, DarkTheme, DefaultTheme, type Theme } from "expo-router";
import { useColorScheme } from "react-native";

import { type Palette, palettes, type Scheme } from "./colors";

/** Mode (clair ou sombre) choisi sur l'iPhone. */
export function useScheme(): Scheme {
  return useColorScheme() === "dark" ? "dark" : "light";
}

/**
 * iPhone : couleurs système d'Apple. Elles suivent seules le mode sombre, le contraste élevé et
 * les réglages d'accessibilité. Seule la couleur d'accent garde le bleu Freecrew.
 */
export function usePalette(): Palette {
  const brand = palettes[useScheme()];
  return {
    background: Color.ios.systemGroupedBackground,
    card: Color.ios.secondarySystemGroupedBackground,
    text: Color.ios.label,
    muted: Color.ios.secondaryLabel,
    border: Color.ios.separator,
    primary: brand.primary,
    primaryText: brand.primaryText,
    accent: Color.ios.tertiarySystemFill,
    accentText: brand.primary,
    danger: Color.ios.systemRed,
    success: Color.ios.systemGreen,
  };
}

/**
 * Thème de navigation. Il demande des chaînes : on reprend les valeurs des couleurs système
 * d'Apple (fond groupé, carte groupée, étiquette, séparateur) en clair et en sombre.
 */
const IOS_HEX: Record<Scheme, { background: string; card: string; text: string; border: string }> = {
  light: { background: "#f2f2f7", card: "#ffffff", text: "#000000", border: "#c6c6c8" },
  dark: { background: "#000000", card: "#1c1c1e", text: "#ffffff", border: "#38383a" },
};

export function useNavTheme(): Theme {
  const scheme = useScheme();
  const base = scheme === "dark" ? DarkTheme : DefaultTheme;
  return {
    ...base,
    colors: { ...base.colors, ...IOS_HEX[scheme], primary: palettes[scheme].primary },
  };
}
