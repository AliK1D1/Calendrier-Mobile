import type { ColorValue } from "react-native";

/**
 * Couleurs de l'app. Mode clair et mode sombre suivent toujours le réglage du téléphone.
 *
 * - `palettes` : couleurs fixes, proches du site (palette bleue de src/app/globals.css du site).
 *   Servent sur le web et de repli quand une couleur du système n'existe pas.
 * - Sur iPhone (`use-palette.ios.ts`) : couleurs système d'Apple (fond groupé, étiquettes,
 *   séparateurs, rouge et vert système), qui changent seules avec le mode sombre.
 * - Sur Android (`use-palette.android.ts`) : rôles de couleur Material 3 dynamiques (Material You,
 *   tirés du fond d'écran sur Android 12+), avec repli sur la palette fixe.
 */
export interface Palette {
  background: ColorValue;
  card: ColorValue;
  text: ColorValue;
  muted: ColorValue;
  border: ColorValue;
  primary: ColorValue;
  primaryText: ColorValue;
  accent: ColorValue;
  accentText: ColorValue;
  danger: ColorValue;
  success: ColorValue;
}

/** Palette en codes hexadécimaux (le thème de navigation demande des chaînes). */
export type HexPalette = { [K in keyof Palette]: string };

export type Scheme = "light" | "dark";

export const palettes: Record<Scheme, HexPalette> = {
  light: {
    background: "#f5f7fb",
    card: "#ffffff",
    text: "#1a2232",
    muted: "#5a6578",
    border: "#dfe4ec",
    primary: "#2c5fa9",
    primaryText: "#fbfcfe",
    accent: "#e6edf9",
    accentText: "#22406f",
    danger: "#cc3a2e",
    success: "#1f7a4d",
  },
  dark: {
    background: "#11151c",
    card: "#1a1f29",
    text: "#eef1f6",
    muted: "#a8b1c0",
    border: "#2a303b",
    primary: "#8fb3ef",
    primaryText: "#141a26",
    accent: "#242d3d",
    accentText: "#eef1f6",
    danger: "#ef6b5b",
    success: "#5fc48f",
  },
};

export const space = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 } as const;
export const radius = { sm: 8, md: 12, lg: 16, pill: 999 } as const;
