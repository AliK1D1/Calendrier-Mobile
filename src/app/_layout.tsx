import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import { useEffect } from "react";
import { useColorScheme } from "react-native";

import { SessionProvider, useSession } from "@/services/session";
import { palettes } from "@/theme/colors";

void SplashScreen.preventAutoHideAsync();

function RootStack() {
  const { session } = useSession();
  const scheme = useColorScheme() === "dark" ? "dark" : "light";
  const c = palettes[scheme];

  useEffect(() => {
    if (session !== undefined) void SplashScreen.hideAsync();
  }, [session]);

  // Écran de démarrage tant que la session gardée sur le téléphone n'est pas lue.
  if (session === undefined) return null;
  const signedIn = session !== null;
  const base = scheme === "dark" ? DarkTheme : DefaultTheme;

  return (
    <ThemeProvider
      value={{
        ...base,
        colors: { ...base.colors, primary: c.primary, background: c.background, card: c.card, text: c.text, border: c.border },
      }}
    >
      <StatusBar style="auto" />
      <Stack screenOptions={{ headerBackButtonDisplayMode: "minimal", contentStyle: { backgroundColor: c.background } }}>
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
