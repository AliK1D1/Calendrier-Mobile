import { NativeTabs } from "expo-router/native-tabs";

import { usePalette } from "@/theme/use-palette";

/** Onglets du bas : mêmes sections que la barre d'onglets du site sur téléphone. */
export default function TabsLayout() {
  const c = usePalette();
  return (
    <NativeTabs
      backgroundColor={c.card}
      indicatorColor={c.accent}
      labelStyle={{ selected: { color: c.primary } }}
      tintColor={c.primary}
    >
      <NativeTabs.Trigger name="index">
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
