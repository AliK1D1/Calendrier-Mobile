/**
 * Icônes des barres d'outils et des menus natifs : SF Symbols sur iPhone, Material Symbols
 * (fichiers vectoriels Android) ailleurs. Seules les icônes importées ici sont embarquées.
 */
import Add from "@expo/material-symbols/add.xml";
import CalendarToday from "@expo/material-symbols/calendar_today.xml";
import MoreVert from "@expo/material-symbols/more_vert.xml";
import OpenInBrowser from "@expo/material-symbols/open_in_browser.xml";
import School from "@expo/material-symbols/school.xml";
import Share from "@expo/material-symbols/share.xml";
import { type ImageSourcePropType, Platform } from "react-native";
import type { SFSymbol } from "expo-symbols";

export type ToolbarIcon = SFSymbol | ImageSourcePropType;

function pick(sf: SFSymbol, material: ImageSourcePropType): ToolbarIcon {
  return Platform.OS === "ios" ? sf : material;
}

export const icons = {
  add: pick("plus", Add),
  more: pick("ellipsis.circle", MoreVert),
  share: pick("square.and.arrow.up", Share),
  study: pick("graduationcap", School),
  today: pick("calendar.badge.clock", CalendarToday),
  web: pick("safari", OpenInBrowser),
} as const;
