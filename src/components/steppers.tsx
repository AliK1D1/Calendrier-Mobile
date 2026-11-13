/**
 * Réglage d'une heure ou d'une date par petits pas (sans clavier) : la valeur au centre, les
 * boutons « moins » à gauche et « plus » à droite, dans une seule barre. Avec `picker`, on peut
 * aussi toucher la valeur pour ouvrir le sélecteur natif (roulette d'iOS, horloge Material).
 */
import { StyleSheet, Text, View } from "react-native";

import { PressScale } from "@/components/motion";
import { ValuePicker } from "@/components/value-picker";
import type { PickerSpec } from "@/features/pickers";
import { hapticSelect } from "@/services/haptics";

import { space } from "@/theme/colors";
import { ANDROID, shape, type } from "@/theme/tokens";
import { usePalette } from "@/theme/use-palette";

function Step({ label, hint, onPress }: { label: string; hint: string; onPress: () => void }) {
  const c = usePalette();
  return (
    <PressScale
      accessibilityRole="button"
      accessibilityLabel={hint}
      onPress={() => {
        hapticSelect();
        onPress();
      }}
      android_ripple={{ color: c.text, foreground: true }}
      to={0.9}
      dim={ANDROID ? 1 : 0.6}
      style={[styles.step, { backgroundColor: c.card }]}
    >
      <Text style={[type.buttonSmall, { color: c.primary }]}>{label}</Text>
    </PressScale>
  );
}

/** Barre « − grand, − petit, valeur, + petit, + grand ». */
export function Stepper({
  label,
  hideLabel,
  value,
  steps,
  onShift,
  picker,
}: {
  label: string;
  /** Le libellé n'est dit qu'aux lecteurs d'écran (il est déjà écrit au-dessus). */
  hideLabel?: boolean;
  /** Valeur déjà mise en forme (« 14 h 30 », « lundi 16 novembre »). */
  value: string;
  /** Pas proposés, du plus petit au plus grand : `{ label: "15", by: 15 }`. */
  steps: readonly { label: string; by: number }[];
  onShift: (by: number) => void;
  /** Sélecteur natif (heure ou date) ouvert en touchant la valeur. Sans lui, texte seul. */
  picker?: PickerSpec;
}) {
  const c = usePalette();
  const down = [...steps].reverse();
  return (
    <View style={{ gap: space.xs + 2 }}>
      {hideLabel ? null : <Text style={[type.label, { color: c.text }]}>{label}</Text>}
      <View style={[styles.bar, { backgroundColor: c.accent }]}>
        {down.map((s) => (
          <Step key={`-${s.by}`} label={`− ${s.label}`} hint={`${label} : moins ${s.label}`} onPress={() => onShift(-s.by)} />
        ))}
        {picker ? (
          <ValuePicker spec={picker} label={label} text={value} />
        ) : (
          <Text
            accessibilityLiveRegion="polite"
            numberOfLines={1}
            adjustsFontSizeToFit
            style={[type.headline, styles.value, { color: c.text }]}
          >
            {value}
          </Text>
        )}
        {steps.map((s) => (
          <Step key={`+${s.by}`} label={`+ ${s.label}`} hint={`${label} : plus ${s.label}`} onPress={() => onShift(s.by)} />
        ))}
      </View>
    </View>
  );
}

/** Pas d'une heure : 15 min et 1 h. */
export const CLOCK_STEPS = [{ label: "15", by: 15 }, { label: "1 h", by: 60 }] as const;

const styles = StyleSheet.create({
  bar: { flexDirection: "row", alignItems: "center", gap: space.xs, padding: space.xs, borderRadius: shape.tile + 2 },
  step: {
    minWidth: 48,
    minHeight: 44,
    paddingHorizontal: space.sm,
    borderRadius: shape.tile - 2,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  value: { flex: 1, textAlign: "center", fontVariant: ["tabular-nums"] },
});
