import { NativeTabs } from "expo-router/native-tabs";
import { Platform } from "react-native";

import { usePalette } from "@/theme/use-palette";

/**
 * Onglets du bas : mêmes sections que la barre d'onglets du site sur téléphone.
 * - iPhone : barre d'onglets d'Apple (Liquid Glass sur iOS 26, qui se réduit quand on fait
 *   défiler), icônes SF Symbols, teinte bleue Freecrew.
 * - Android : barre de navigation Material 3 (surface, pastille d'indicateur, icônes Material).
 */
export default function TabsLayout() {
  const c = usePalette();
  const android = Platform.OS === "android";
  return (
    <NativeTabs
      minimizeBehavior="onScrollDown"
      tintColor={android ? c.accentText : c.primary}
      backgroundColor={android ? c.card : undefined}
      indicatorColor={android ? c.accent : undefined}
      iconColor={android ? { default: c.muted, selected: c.accentText } : undefined}
      labelStyle={android ? { default: { color: c.muted }, selected: { color: c.text } } : undefined}
    >
      <NativeTabs.Trigger name="(accueil)">
        <NativeTabs.Trigger.Label>Accueil</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf={{ default: "house", selected: "house.fill" }} md="home" />
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="groupes">
        <NativeTabs.Trigger.Label>Groupes</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf={{ default: "person.3", selected: "person.3.fill" }} md="group" />
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="plans">
        <NativeTabs.Trigger.Label>Plans</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf={{ default: "calendar", selected: "calendar" }} md="event" />
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="horaire">
        <NativeTabs.Trigger.Label>Horaire</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf={{ default: "clock", selected: "clock.fill" }} md="schedule" />
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="profil">
        <NativeTabs.Trigger.Label>Profil</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf={{ default: "person.crop.circle", selected: "person.crop.circle.fill" }} md="account_circle" />
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}
