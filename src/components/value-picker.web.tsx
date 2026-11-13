/** Sur le web, pas de sélecteur natif : la valeur seule (les boutons − / + suffisent). */
import { StyleSheet, Text } from "react-native";

import type { PickerSpec } from "@/features/pickers";
import { type } from "@/theme/tokens";
import { usePalette } from "@/theme/use-palette";

export function ValuePicker({ text }: { spec: PickerSpec; label: string; text: string }) {
  const c = usePalette();
  return (
    <Text accessibilityLiveRegion="polite" numberOfLines={1} adjustsFontSizeToFit style={[type.headline, styles.value, { color: c.text }]}>
      {text}
    </Text>
  );
}

const styles = StyleSheet.create({
  value: { flex: 1, textAlign: "center", fontVariant: ["tabular-nums"] },
});
