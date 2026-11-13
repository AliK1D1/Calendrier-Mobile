/**
 * Valeur d'un `Stepper` qu'on peut aussi toucher pour la choisir directement :
 * - iPhone : le sélecteur compact d'Apple (une capsule grise qui ouvre la roulette) ;
 * - Android : l'horloge ou le calendrier Material, en boîte de dialogue.
 * Sur le web, voir `value-picker.web.tsx` (le texte seul).
 */
import DateTimePicker, { DateTimePickerAndroid, type DateTimePickerEvent } from "@react-native-community/datetimepicker";
import { Platform, Pressable, StyleSheet, Text, View } from "react-native";

import { applyPicked, iosMinuteInterval, type PickerSpec, pickerDate } from "@/features/pickers";
import { hapticSelect } from "@/services/haptics";
import { type } from "@/theme/tokens";
import { usePalette, useScheme } from "@/theme/use-palette";

export function ValuePicker({ spec, label, text }: { spec: PickerSpec; label: string; text: string }) {
  const c = usePalette();
  const scheme = useScheme();
  const value = pickerDate(spec);
  const onChange = (e: DateTimePickerEvent, picked?: Date) => {
    if (e.type !== "set" || !picked) return;
    hapticSelect();
    applyPicked(spec, picked);
  };

  if (Platform.OS === "ios") {
    return (
      <View style={styles.center}>
        <DateTimePicker
          value={value}
          mode={spec.mode}
          display="compact"
          locale="fr-CA"
          minuteInterval={spec.mode === "time" ? iosMinuteInterval(spec.step) : undefined}
          accentColor={c.primary}
          themeVariant={scheme}
          accessibilityLabel={label}
          onChange={onChange}
        />
      </View>
    );
  }

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${label} : ${text}`}
      accessibilityHint={spec.mode === "time" ? "Ouvre l'horloge pour choisir l'heure" : "Ouvre le calendrier pour choisir la date"}
      onPress={() =>
        DateTimePickerAndroid.open({ value, mode: spec.mode, is24Hour: true, onChange })
      }
      android_ripple={{ color: c.text, borderless: true }}
      style={styles.center}
    >
      <Text numberOfLines={1} adjustsFontSizeToFit style={[type.headline, styles.value, { color: c.text }]}>
        {text}
      </Text>
      <View style={[styles.underline, { backgroundColor: c.primary }]} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: "center", justifyContent: "center", minHeight: 44 },
  value: { textAlign: "center", fontVariant: ["tabular-nums"] },
  underline: { height: 2, width: 28, borderRadius: 1, marginTop: 2, opacity: 0.6 },
});
