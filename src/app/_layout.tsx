import { Stack, ThemeProvider } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import { useEffect } from "react";

import { SessionProvider, useSession } from "@/services/session";
import { headerOptions } from "@/theme/header-options";
import { useNavTheme, usePalette } from "@/theme/use-palette";

void SplashScreen.preventAutoHideAsync();

function RootStack() {
  const { session } = useSession();
  // Thème clair ou sombre : toujours celui de l'appareil (app.json : userInterfaceStyle « automatic »).
  const theme = useNavTheme();
  const c = usePalette();

  useEffect(() => {
    if (session !== undefined) void SplashScreen.hideAsync();
  }, [session]);

  // Écran de démarrage tant que la session gardée sur le téléphone n'est pas lue.
  if (session === undefined) return null;
  const signedIn = session !== null;

  return (
    <ThemeProvider value={theme}>
      <StatusBar style="auto" />
      <Stack screenOptions={headerOptions(c)}>
        <Stack.Protected guard={signedIn}>
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen name="groupe/[id]" options={{ title: "Groupe" }} />
          <Stack.Screen name="lieux" options={{ title: "Mes lieux" }} />
          <Stack.Screen name="bienvenue" options={{ title: "Bienvenue !" }} />
          <Stack.Screen name="etude" options={{ title: "Étude" }} />
        </Stack.Protected>
        <Stack.Protected guard={!signedIn}>
          <Stack.Screen name="connexion" options={{ headerShown: false }} />
          <Stack.Screen name="inscription" options={{ title: "Créer un compte" }} />
        </Stack.Protected>
      </Stack>
    </ThemeProvider>
  );
}

export default function RootLayout() {
  return (
    <SessionProvider>
      <RootStack />
    </SessionProvider>
  );
}
