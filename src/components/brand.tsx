/** En-tête des écrans de connexion : l'icône de l'app, « Freecrew », puis le titre de l'écran. */
import { Image } from "expo-image";
import { Text, View } from "react-native";

import { space } from "@/theme/colors";
import { strong, type } from "@/theme/tokens";
import { usePalette } from "@/theme/use-palette";

export function BrandHeader({ title, text }: { title: string; text: string }) {
  const c = usePalette();
  return (
    <View style={{ alignItems: "center", gap: space.sm, marginTop: space.xl }}>
      <Image
        source={require("@/assets/images/icon.png")}
        accessibilityElementsHidden
        importantForAccessibility="no"
        style={{ width: 76, height: 76, borderRadius: 18 }}
      />
      <Text style={[type.subhead, strong, { color: c.primary, letterSpacing: 0.3 }]}>Freecrew</Text>
      <Text accessibilityRole="header" style={[type.display, { color: c.text, textAlign: "center" }]}>{title}</Text>
      <Text style={[type.subhead, { color: c.muted, textAlign: "center" }]}>{text}</Text>
    </View>
  );
}
