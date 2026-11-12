import { useColorScheme } from "react-native";

import { useApparence } from "@/services/apparence";

import type { Scheme } from "./colors";

/**
 * Mode affiché : celui du téléphone, sauf si Profil > Apparence force « Clair » ou « Sombre ».
 * (Sur iPhone et Android le choix est aussi donné au système, voir services/apparence.)
 */
export function useScheme(): Scheme {
  const { theme } = useApparence();
  const systeme = useColorScheme();
  if (theme === "clair") return "light";
  if (theme === "sombre") return "dark";
  return systeme === "dark" ? "dark" : "light";
}
