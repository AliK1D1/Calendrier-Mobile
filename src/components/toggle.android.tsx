import { Host, Switch } from "@expo/ui";
import { View } from "react-native";

/**
 * Interrupteur Android : le Switch de Material 3 (Jetpack Compose), aux couleurs dynamiques du
 * téléphone.
 */
export function Toggle({
  value,
  onValueChange,
  accessibilityLabel,
}: {
  value: boolean;
  onValueChange: (value: boolean) => void;
  accessibilityLabel: string;
}) {
  return (
    <View
      accessible
      accessibilityRole="switch"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ checked: value }}
      accessibilityActions={[{ name: "activate" }]}
      onAccessibilityAction={() => onValueChange(!value)}
    >
      <Host matchContents>
        <Switch value={value} onValueChange={onValueChange} />
      </Host>
    </View>
  );
}
