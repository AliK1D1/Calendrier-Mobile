import { Switch } from "react-native";

import { usePalette } from "@/theme/use-palette";

/** Interrupteur. iPhone et web : l'interrupteur natif (UISwitch sur iPhone), teinte Freecrew. */
export function Toggle({
  value,
  onValueChange,
  accessibilityLabel,
}: {
  value: boolean;
  onValueChange: (value: boolean) => void;
  accessibilityLabel: string;
}) {
  const c = usePalette();
  return (
    <Switch
      value={value}
      onValueChange={onValueChange}
      trackColor={{ true: c.primary }}
      accessibilityLabel={accessibilityLabel}
    />
  );
}
