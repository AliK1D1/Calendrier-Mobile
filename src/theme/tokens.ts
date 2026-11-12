import { Platform, type TextStyle } from "react-native";

/**
 * Allure de l'interface : « ios » (composants et tailles d'Apple) ou « android » (Material 3).
 * Le web (aperçu dans un navigateur) prend l'allure iPhone.
 */
export type Flavour = "ios" | "android";
export const flavour: Flavour = Platform.OS === "android" ? "android" : "ios";
export const IOS = flavour === "ios";
export const ANDROID = flavour === "android";

/** Choisit la valeur de la plateforme. */
export function pick<T>(values: { ios: T; android: T }): T {
  return values[flavour];
}

/**
 * Échelle typographique. iPhone : styles de texte d'Apple (Large Title, Title 2, Headline,
 * Body, Subheadline, Footnote, Caption). Android : échelle Material 3 (Headline, Title, Body,
 * Label). La police reste celle du système (San Francisco, Roboto) : c'est elle qui donne
 * l'allure native.
 */
export const type = {
  /** Grand titre d'un écran sans en-tête (connexion). */
  display: pick<TextStyle>({
    ios: { fontSize: 34, lineHeight: 41, fontWeight: "700", letterSpacing: 0.37 },
    android: { fontSize: 32, lineHeight: 40, fontWeight: "400" },
  }),
  /** Titre d'une feuille ou d'un bloc mis en avant. */
  title: pick<TextStyle>({
    ios: { fontSize: 22, lineHeight: 28, fontWeight: "700", letterSpacing: 0.35 },
    android: { fontSize: 22, lineHeight: 28, fontWeight: "400" },
  }),
  /** Titre de section dans une page. */
  heading: pick<TextStyle>({
    ios: { fontSize: 20, lineHeight: 25, fontWeight: "700", letterSpacing: 0.38 },
    android: { fontSize: 16, lineHeight: 24, fontWeight: "500", letterSpacing: 0.15 },
  }),
  /** Titre d'une carte ou d'une rangée. */
  headline: pick<TextStyle>({
    ios: { fontSize: 17, lineHeight: 22, fontWeight: "600", letterSpacing: -0.4 },
    android: { fontSize: 16, lineHeight: 24, fontWeight: "500", letterSpacing: 0.15 },
  }),
  body: pick<TextStyle>({
    ios: { fontSize: 17, lineHeight: 22, letterSpacing: -0.4 },
    android: { fontSize: 16, lineHeight: 24, letterSpacing: 0.5 },
  }),
  /** Texte secondaire. */
  subhead: pick<TextStyle>({
    ios: { fontSize: 15, lineHeight: 20, letterSpacing: -0.24 },
    android: { fontSize: 14, lineHeight: 20, letterSpacing: 0.25 },
  }),
  /** Notes, libellés de groupe. */
  footnote: pick<TextStyle>({
    ios: { fontSize: 13, lineHeight: 18, letterSpacing: -0.08 },
    android: { fontSize: 12, lineHeight: 16, letterSpacing: 0.4 },
  }),
  caption: pick<TextStyle>({
    ios: { fontSize: 12, lineHeight: 16 },
    android: { fontSize: 11, lineHeight: 16, fontWeight: "500", letterSpacing: 0.5 },
  }),
  /** Libellé d'un champ ou d'un groupe de choix. */
  label: pick<TextStyle>({
    ios: { fontSize: 15, lineHeight: 20, fontWeight: "600", letterSpacing: -0.24 },
    android: { fontSize: 14, lineHeight: 20, fontWeight: "500", letterSpacing: 0.1 },
  }),
  /** Texte d'un bouton. */
  button: pick<TextStyle>({
    ios: { fontSize: 17, lineHeight: 22, fontWeight: "600", letterSpacing: -0.4 },
    android: { fontSize: 14, lineHeight: 20, fontWeight: "500", letterSpacing: 0.1 },
  }),
  buttonSmall: pick<TextStyle>({
    ios: { fontSize: 15, lineHeight: 20, fontWeight: "600", letterSpacing: -0.24 },
    android: { fontSize: 14, lineHeight: 20, fontWeight: "500", letterSpacing: 0.1 },
  }),
} as const;

/** Graisse d'un mot mis en avant dans un texte. */
export const strong: TextStyle = { fontWeight: pick({ ios: "600", android: "500" }) };

/** Arrondis. iPhone : cartes groupées (16) ; Android : formes Material 3 (12 et 16). */
export const shape = {
  card: pick({ ios: 16, android: 16 }),
  control: pick({ ios: 12, android: 999 }),
  field: pick({ ios: 12, android: 4 }),
  chip: pick({ ios: 999, android: 8 }),
  tile: pick({ ios: 12, android: 12 }),
} as const;

/** Hauteur minimale d'une cible tactile (44 pt chez Apple, 48 dp chez Material). */
export const touch = pick({ ios: 44, android: 48 });
