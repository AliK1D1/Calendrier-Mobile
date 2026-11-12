import { useColorScheme } from "react-native";

import { type Palette, palettes } from "./colors";

/** Palette du mode (clair ou sombre) choisi sur le téléphone. */
export function usePalette(): Palette {
  return palettes[useColorScheme() === "dark" ? "dark" : "light"];
}
