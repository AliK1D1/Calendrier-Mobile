/**
 * Icônes dans la page : SF Symbols sur iPhone, Material Symbols sur Android (et dans un
 * navigateur). Toujours décoratives : le texte à côté dit la même chose aux lecteurs d'écran.
 */
import { SymbolView } from "expo-symbols";
import type { ComponentProps } from "react";
import type { ColorValue } from "react-native";

import { usePalette } from "@/theme/use-palette";

type Names = Exclude<ComponentProps<typeof SymbolView>["name"], string>;
type Ios = NonNullable<Names["ios"]>;
type Material = NonNullable<Names["android"]>;

const MAP = {
  add: ["plus", "add"],
  alert: ["exclamationmark.triangle.fill", "warning"],
  calendar: ["calendar", "event"],
  call: ["phone.fill", "call"],
  check: ["checkmark", "check"],
  checkCircle: ["checkmark.circle.fill", "check_circle"],
  chevron: ["chevron.right", "chevron_right"],
  chevronLeft: ["chevron.left", "chevron_left"],
  clock: ["clock", "schedule"],
  close: ["xmark", "close"],
  edit: ["pencil", "edit"],
  external: ["arrow.up.right", "open_in_new"],
  group: ["person.2.fill", "group"],
  home: ["house.fill", "home"],
  info: ["info.circle", "info"],
  key: ["key.fill", "key"],
  link: ["link", "link"],
  lock: ["lock.fill", "lock"],
  moon: ["moon.fill", "bedtime"],
  palette: ["paintpalette.fill", "palette"],
  person: ["person.fill", "person"],
  personAdd: ["person.badge.plus", "person_add"],
  pin: ["mappin.and.ellipse", "location_on"],
  repeat: ["repeat", "repeat"],
  search: ["magnifyingglass", "search"],
  share: ["square.and.arrow.up", "share"],
  signOut: ["rectangle.portrait.and.arrow.right", "logout"],
  sparkles: ["sparkles", "auto_awesome"],
  study: ["graduationcap.fill", "school"],
  travel: ["figure.walk", "directions_walk"],
  trash: ["trash", "delete"],
  tune: ["slider.horizontal.3", "tune"],
} as const satisfies Record<string, readonly [Ios, Material]>;

export type IconName = keyof typeof MAP;

export function Icon({ name, size = 20, color }: { name: IconName; size?: number; color?: ColorValue }) {
  const c = usePalette();
  const [ios, material] = MAP[name];
  return (
    <SymbolView
      name={{ ios, android: material, web: material }}
      size={size}
      tintColor={color ?? c.muted}
      accessibilityElementsHidden
      importantForAccessibility="no"
    />
  );
}
