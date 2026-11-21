/** Petite astuce, montrée une seule fois : une icône, un titre, une phrase, et « Compris ». */
import { Pressable, StyleSheet, Text, View } from "react-native";

import { Icon } from "@/components/icon";
import { Reveal } from "@/components/motion";
import { TIPS, type TipId } from "@/features/tips";
import { useTip } from "@/services/tips";
import { space } from "@/theme/colors";
import { shape, strong, type } from "@/theme/tokens";
import { usePalette } from "@/theme/use-palette";

export function Tip({ id, when = true }: { id: TipId; when?: boolean }) {
  const c = usePalette();
  const { show, dismiss } = useTip(id);
  if (!show || !when) return null;
  const tip = TIPS[id];
  return (
    <Reveal>
      <View accessibilityRole="summary" style={[styles.box, { backgroundColor: c.accent }]}>
        <Icon name="sparkles" size={18} color={c.accentText} />
        <View style={styles.texts}>
          <Text style={[type.subhead, strong, { color: c.accentText }]}>{tip.title}</Text>
          <Text style={[type.subhead, { color: c.accentText }]}>{tip.text}</Text>
        </View>
        <Pressable accessibilityRole="button" accessibilityLabel={`Compris, ne plus montrer : ${tip.title}`} hitSlop={10} onPress={dismiss} style={styles.ok}>
          <Text style={[type.subhead, strong, { color: c.primary }]}>Compris</Text>
        </Pressable>
      </View>
    </Reveal>
  );
}

const styles = StyleSheet.create({
  box: { flexDirection: "row", alignItems: "flex-start", gap: space.sm, padding: space.md, borderRadius: shape.card },
  texts: { flex: 1, gap: 2 },
  ok: { paddingHorizontal: space.xs, paddingVertical: 2, minHeight: 32, justifyContent: "center" },
});
