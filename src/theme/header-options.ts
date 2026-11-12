import type { NativeStackNavigationOptions } from "expo-router/native-stack";
import { Platform } from "react-native";

import type { Palette } from "./colors";

/** iOS 26 et plus : en-têtes « Liquid Glass », le système gère le flou seul. */
const IOS_26 = Platform.OS === "ios" && Number.parseInt(String(Platform.Version), 10) >= 26;

/**
 * En-têtes natifs de chaque plateforme.
 * - iPhone : barre de navigation translucide d'Apple, bouton retour réduit à la flèche, grands
 *   titres sur les onglets (`large`), qui rétrécissent quand on fait défiler.
 * - Android : barre du haut Material 3 (surface, sans ombre, titre 22 sp aligné à gauche).
 */
export function headerOptions(c: Palette, large = false): NativeStackNavigationOptions {
  if (Platform.OS === "ios") {
    return {
      headerTransparent: true,
      headerBlurEffect: IOS_26 ? undefined : "systemChromeMaterial",
      headerLargeTitleEnabled: large,
      headerLargeTitleShadowVisible: false,
      headerBackButtonDisplayMode: "minimal",
      headerTintColor: c.primary,
      contentStyle: { backgroundColor: c.background },
    };
  }
  if (Platform.OS === "android") {
    return {
      headerStyle: { backgroundColor: c.background },
      headerTintColor: c.text,
      headerShadowVisible: false,
      headerTitleStyle: { fontSize: 22, fontWeight: "400" },
      contentStyle: { backgroundColor: c.background },
      animation: "fade_from_bottom",
    };
  }
  return { contentStyle: { backgroundColor: c.background } };
}
