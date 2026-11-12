import { Color, DarkTheme, DefaultTheme, type Theme } from "expo-router";

import { paletteAccent } from "@/features/apparence";
import { ACCENT_PAR_DEFAUT } from "@/lib/ux/apparence";
import { useApparence } from "@/services/apparence";

import type { Palette, Scheme } from "./colors";
import { useScheme } from "./scheme";

export { useScheme };

/** Couleur d'accent choisie dans Profil > Apparence (bleu Freecrew par défaut). */
function useAccent(scheme: Scheme) {
  const { accent } = useApparence();
  return paletteAccent(accent === "appareil" ? ACCENT_PAR_DEFAUT : accent, scheme);
}

/**
 * iPhone : couleurs système d'Apple. Elles suivent seules le mode sombre, le contraste élevé et
 * les réglages d'accessibilité. Seule la couleur d'accent (boutons, liens, puces choisies)
 * vient du choix de Profil > Apparence, comme la teinte d'une app sur iOS.
 */
export function usePalette(): Palette {
  const brand = useAccent(useScheme());
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
  const brand = useAccent(scheme);
  const base = scheme === "dark" ? DarkTheme : DefaultTheme;
  return {
    ...base,
    colors: { ...base.colors, ...IOS_HEX[scheme], primary: brand.primary },
  };
}
