/**
 * Choix d'apparence gardé sur ce téléphone (comme le site le garde dans le navigateur) :
 * thème (selon l'appareil, clair, sombre) et couleur d'accent. Mêmes clés que le site
 * (`tlc-theme`, `tlc-accent`), dans le localStorage d'expo-sqlite, lisible tout de suite au
 * démarrage (aucun flash de la mauvaise couleur).
 *
 * Le thème forcé passe par `Appearance.setColorScheme` : les couleurs système d'Apple, les
 * couleurs Material You, la barre d'état et les en-têtes natifs suivent alors d'eux-mêmes.
 */
import "expo-sqlite/localStorage/install";

import { useSyncExternalStore } from "react";
import { Appearance, Platform } from "react-native";

import { type AccentMobile, lireAccentMobile, schemaForce } from "@/features/apparence";
import { CLE_ACCENT, CLE_THEME, type ChoixTheme, lireTheme } from "@/lib/ux/apparence";

export interface Apparence {
  theme: ChoixTheme;
  accent: AccentMobile;
}

function lire(cle: string): string | null {
  try {
    return typeof localStorage === "undefined" ? null : localStorage.getItem(cle);
  } catch {
    return null;
  }
}

function ecrire(cle: string, valeur: string) {
  try {
    localStorage.setItem(cle, valeur);
  } catch {
    // Stockage indisponible : le choix vaut jusqu'à la fermeture de l'app.
  }
}

function charger(): Apparence {
  return { theme: lireTheme(lire(CLE_THEME)), accent: lireAccentMobile(lire(CLE_ACCENT), Platform.OS) };
}

let actuel: Apparence = charger();
const abonnes = new Set<() => void>();

function appliquerTheme(theme: ChoixTheme) {
  if (Platform.OS === "web") return;
  try {
    Appearance.setColorScheme(schemaForce(theme));
  } catch {
    // Module natif absent : on reste sur le thème du téléphone.
  }
}

appliquerTheme(actuel.theme);

function changer(patch: Partial<Apparence>) {
  actuel = { ...actuel, ...patch };
  for (const rappel of abonnes) rappel();
}

export function choisirTheme(theme: ChoixTheme) {
  ecrire(CLE_THEME, theme);
  appliquerTheme(theme);
  changer({ theme });
}

export function choisirAccent(accent: AccentMobile) {
  ecrire(CLE_ACCENT, accent);
  changer({ accent });
}

function abonner(rappel: () => void) {
  abonnes.add(rappel);
  return () => {
    abonnes.delete(rappel);
  };
}

const lecture = () => actuel;

/** Le choix d'apparence actuel ; l'écran se redessine quand il change. */
export function useApparence(): Apparence {
  return useSyncExternalStore(abonner, lecture, lecture);
}
