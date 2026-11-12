/**
 * Avatar : les initiales dans un rond de couleur. La couleur vient du nom (toujours la même
 * pour la même personne), dans les teintes des jours de l'horaire.
 */
import { StyleSheet, Text, View } from "react-native";

import { couleurJour } from "@/features/apparence";
import { avatarTone, initials } from "@/features/display";
import { usePalette, useScheme } from "@/theme/use-palette";

export function Avatar({ name, size = 40 }: { name: string; size?: number }) {
  const scheme = useScheme();
  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={[styles.round, { width: size, height: size, borderRadius: size / 2, backgroundColor: couleurJour(avatarTone(name), scheme) }]}
    >
      <Text
        allowFontScaling={false}
        style={{ fontSize: size * 0.38, fontWeight: "600", color: scheme === "dark" ? "#10141c" : "#ffffff" }}
      >
        {initials(name)}
      </Text>
    </View>
  );
}

/** Quelques avatars qui se chevauchent, puis « +N ». */
export function AvatarStack({ names, max = 4, size = 28 }: { names: readonly string[]; max?: number; size?: number }) {
  const c = usePalette();
  if (names.length === 0) return null;
  const shown = names.slice(0, max);
  const rest = names.length - shown.length;
  const ring = { borderWidth: 2, borderColor: c.card, borderRadius: (size + 4) / 2 };
  return (
    <View
      accessible
      accessibilityLabel={names.join(", ")}
      style={{ flexDirection: "row", alignItems: "center", paddingLeft: size * 0.3 }}
    >
      {shown.map((n, i) => (
        <View key={`${n}-${i}`} style={[ring, { marginLeft: -size * 0.3 }]}>
          <Avatar name={n} size={size} />
        </View>
      ))}
      {rest > 0 ? (
        <View style={[ring, styles.round, { marginLeft: -size * 0.3, width: size + 4, height: size + 4, backgroundColor: c.accent }]}>
          <Text allowFontScaling={false} style={{ fontSize: size * 0.38, fontWeight: "600", color: c.muted }}>{`+${rest}`}</Text>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  round: { alignItems: "center", justifyContent: "center" },
});
