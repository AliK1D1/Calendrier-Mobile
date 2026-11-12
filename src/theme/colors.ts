/**
 * Couleurs de l'app, proches de celles du site (palette bleue par défaut, src/app/globals.css
 * du site). Mode clair et mode sombre suivent le téléphone.
 */
export interface Palette {
  background: string;
  card: string;
  text: string;
  muted: string;
  border: string;
  primary: string;
  primaryText: string;
  accent: string;
  accentText: string;
  danger: string;
  success: string;
}

export const palettes: Record<"light" | "dark", Palette> = {
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
