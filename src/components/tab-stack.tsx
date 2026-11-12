import { Stack } from "expo-router";

import { headerOptions } from "@/theme/header-options";
import { usePalette } from "@/theme/use-palette";

/**
 * Pile de navigation d'un onglet : chaque onglet a son propre en-tête natif (grand titre sur
 * iPhone, barre du haut Material sur Android). Le titre vient de l'écran (`<Screen title>`).
 */
export function TabStack() {
  const c = usePalette();
  return <Stack screenOptions={headerOptions(c, true)} />;
}
