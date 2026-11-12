/** Étiquette de date d'une carte : « lun. / 16 / nov. », comme une page de calendrier. */
import { StyleSheet, Text, View } from "react-native";

import { dateTile } from "@/features/display";
import { shape, type } from "@/theme/tokens";
import { usePalette } from "@/theme/use-palette";

export function DateTile({ day, dimmed }: { day: string; dimmed?: boolean }) {
  const c = usePalette();
  const parts = dateTile(day);
  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={[styles.tile, { backgroundColor: c.accent, opacity: dimmed ? 0.6 : 1 }]}
    >
      <Text allowFontScaling={false} style={[type.caption, styles.small, { color: dimmed ? c.muted : c.accentText }]}>
        {parts.weekday.toLocaleUpperCase("fr-CA")}
      </Text>
      <Text allowFontScaling={false} style={[styles.day, { color: c.text }]}>{parts.day}</Text>
      <Text allowFontScaling={false} style={[type.caption, { color: c.muted }]}>{parts.month}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  tile: { width: 54, paddingVertical: 7, borderRadius: shape.tile, alignItems: "center" },
  small: { fontWeight: "700", letterSpacing: 0.4 },
  day: { fontSize: 22, lineHeight: 26, fontWeight: "700" },
});
