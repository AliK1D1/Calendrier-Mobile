import { Stack, ThemeProvider } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import { useEffect } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";

import { ToastProvider } from "@/components/toast";

import { SessionProvider, useSession } from "@/services/session";
import { useNotifications } from "@/services/use-notifications";
import { headerOptions } from "@/theme/header-options";
import { useNavTheme, usePalette, useScheme } from "@/theme/use-palette";

void SplashScreen.preventAutoHideAsync();

function RootStack() {
  const { session, supabase } = useSession();
  // Notifications : réinscription du téléphone et ouverture de l'écran quand on en touche une.
  useNotifications(supabase, session?.user.id ?? null);
  // Thème clair ou sombre : celui de l'appareil (app.json : userInterfaceStyle « automatic »),
  // sauf si Profil > Apparence force « Clair » ou « Sombre ». Accent : choix de Profil > Apparence.
  const theme = useNavTheme();
  const c = usePalette();
  const scheme = useScheme();

  useEffect(() => {
    if (session !== undefined) void SplashScreen.hideAsync();
  }, [session]);

  // Écran de démarrage tant que la session gardée sur le téléphone n'est pas lue.
  if (session === undefined) return null;
  const signedIn = session !== null;

  return (
    <ThemeProvider value={theme}>
      <ToastProvider>
      <StatusBar style={scheme === "dark" ? "light" : "dark"} />
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
      </ToastProvider>
    </ThemeProvider>
  );
}

export default function RootLayout() {
  return (
    // Racine des gestes (glisser une ligne pour voir ses actions).
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SessionProvider>
        <RootStack />
      </SessionProvider>
    </GestureHandlerRootView>
  );
}
