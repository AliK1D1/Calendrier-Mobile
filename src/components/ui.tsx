/**
 * Petites briques d'interface communes (écran, carte, texte, bouton, champ). Cibles tactiles
 * d'au moins 44 px, comme sur le site en mode téléphone.
 *
 * Chaque brique prend l'allure de sa plateforme :
 * - iPhone : tailles de texte d'Apple (17 pt), cartes groupées sans bordure, boutons « remplis »
 *   et « teintés », pastilles en capsule, champs gris arrondis.
 * - Android : Material 3 : boutons en pilule (rempli et tonal) avec effet d'onde, cartes de
 *   surface, pastilles de filtre avec coche, champs à contour.
 */
import { Stack } from "expo-router";
import type { ReactNode } from "react";
import {
  ActivityIndicator,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  type TextInputProps,
  View,
  type ViewStyle,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { radius, space } from "@/theme/colors";
import { usePalette } from "@/theme/use-palette";

const IOS = Platform.OS === "ios";
const ANDROID = Platform.OS === "android";

/**
 * Un écran qui défile. `title` va dans l'en-tête natif (grand titre sur iPhone, barre du haut
 * Material sur Android) au lieu d'être écrit dans la page. `edges` ne sert qu'aux écrans sans
 * en-tête (connexion).
 */
export function Screen({
  children,
  title,
  subtitle,
  refreshing,
  onRefresh,
  edges = [],
}: {
  children: ReactNode;
  title?: string;
  subtitle?: string;
  refreshing?: boolean;
  onRefresh?: () => void;
  edges?: ("top" | "bottom")[];
}) {
  const c = usePalette();
  const scroll = (
    <ScrollView
      style={{ flex: 1, backgroundColor: c.background }}
      contentContainerStyle={styles.screen}
      // iPhone : le contenu passe sous l'en-tête translucide et la barre d'onglets, et le grand
      // titre rétrécit quand on fait défiler.
      contentInsetAdjustmentBehavior="automatic"
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode={IOS ? "interactive" : "on-drag"}
      refreshControl={
        onRefresh ? (
          <RefreshControl
            refreshing={refreshing ?? false}
            onRefresh={onRefresh}
            tintColor={c.muted}
            colors={[c.primary]}
            progressBackgroundColor={c.card}
          />
        ) : undefined
      }
    >
      {subtitle ? <Muted>{subtitle}</Muted> : null}
      {children}
    </ScrollView>
  );
  return (
    <>
      {title ? <Stack.Screen options={{ title }} /> : null}
      {edges.length > 0 ? (
        <SafeAreaView edges={edges} style={{ flex: 1, backgroundColor: c.background }} collapsable={false}>
          {scroll}
        </SafeAreaView>
      ) : (
        scroll
      )}
    </>
  );
}

export function Title({ children }: { children: ReactNode }) {
  const c = usePalette();
  return (
    <Text accessibilityRole="header" style={[styles.title, { color: c.text }]}>
      {children}
    </Text>
  );
}

export function Heading({ children }: { children: ReactNode }) {
  const c = usePalette();
  return (
    <Text accessibilityRole="header" style={[styles.heading, { color: c.text }]}>
      {children}
    </Text>
  );
}

export function Body({ children, bold }: { children: ReactNode; bold?: boolean }) {
  const c = usePalette();
  return (
    <Text style={[styles.body, { color: c.text }, bold ? styles.bold : null]}>
      {children}
    </Text>
  );
}

export function Muted({ children }: { children: ReactNode }) {
  const c = usePalette();
  return <Text style={[styles.muted, { color: c.muted }]}>{children}</Text>;
}

export function ErrorText({ children }: { children: ReactNode }) {
  const c = usePalette();
  if (!children) return null;
  return (
    <Text accessibilityRole="alert" style={[styles.body, { color: c.danger }]}>
      {children}
    </Text>
  );
}

export function Card({ children, style }: { children: ReactNode; style?: ViewStyle }) {
  const c = usePalette();
  return (
    <View style={[styles.card, { backgroundColor: c.card, borderColor: c.border }, style]}>
      {children}
    </View>
  );
}

export function Badge({ children }: { children: ReactNode }) {
  const c = usePalette();
  return (
    <View style={[styles.badge, { backgroundColor: c.accent }]}>
      <Text style={[styles.badgeText, { color: c.accentText }]}>{children}</Text>
    </View>
  );
}

/**
 * Bouton. iPhone : « rempli » (primary), « teinté » (secondary) ou texte rouge (danger), comme
 * les boutons larges de SwiftUI. Android : bouton Material 3 rempli, tonal ou d'erreur, en pilule
 * avec effet d'onde.
 */
export function Button({
  label,
  onPress,
  variant = "primary",
  busy,
  disabled,
}: {
  label: string;
  onPress: () => void;
  variant?: "primary" | "secondary" | "danger";
  busy?: boolean;
  disabled?: boolean;
}) {
  const c = usePalette();
  const bg =
    variant === "primary"
      ? c.primary
      : variant === "danger"
        ? IOS ? c.accent : c.danger
        : c.accent;
  const fg =
    variant === "primary"
      ? c.primaryText
      : variant === "danger"
        ? IOS ? c.danger : c.primaryText
        : c.accentText;
  const off = disabled || busy;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: off, busy }}
      disabled={off}
      onPress={onPress}
      android_ripple={{ color: fg, foreground: true }}
      style={({ pressed }) => [
        styles.button,
        { backgroundColor: bg, opacity: off ? 0.5 : pressed && !ANDROID ? 0.7 : 1 },
      ]}
    >
      {busy ? <ActivityIndicator color={fg} /> : null}
      <Text style={[styles.buttonText, { color: fg }]}>{label}</Text>
    </Pressable>
  );
}

export function Field({
  label,
  hint,
  ...input
}: TextInputProps & { label: string; hint?: string }) {
  const c = usePalette();
  return (
    <View style={{ gap: space.xs }}>
      <Text style={[styles.label, { color: c.text }]}>{label}</Text>
      <TextInput
        placeholderTextColor={c.muted}
        selectionColor={c.primary}
        cursorColor={c.primary}
        style={[
          styles.input,
          IOS
            ? { color: c.text, backgroundColor: c.accent }
            : { color: c.text, borderColor: ANDROID ? c.muted : c.border, backgroundColor: ANDROID ? "transparent" : c.card },
        ]}
        accessibilityLabel={label}
        {...input}
      />
      {hint ? <Muted>{hint}</Muted> : null}
    </View>
  );
}

export function Loading() {
  const c = usePalette();
  return (
    <View style={{ padding: space.xl, alignItems: "center" }}>
      <ActivityIndicator color={IOS ? c.muted : c.primary} size={ANDROID ? "large" : "small"} />
    </View>
  );
}

export function Row({ children, gap = space.sm }: { children: ReactNode; gap?: number }) {
  return <View style={{ flexDirection: "row", flexWrap: "wrap", gap, alignItems: "center" }}>{children}</View>;
}

const styles = StyleSheet.create({
  screen: { padding: space.lg, gap: space.lg, paddingBottom: space.xxl * 2 },
  title: Platform.select({
    ios: { fontSize: 34, fontWeight: "700", letterSpacing: 0.4 },
    android: { fontSize: 32, fontWeight: "400" },
    default: { fontSize: 28, fontWeight: "700", letterSpacing: -0.4 },
  }),
  // iPhone : « Title 3 » ; Android : « Title large » de Material 3.
  heading: Platform.select({
    ios: { fontSize: 20, fontWeight: "600", marginTop: space.sm },
    android: { fontSize: 22, fontWeight: "400", marginTop: space.sm },
    default: { fontSize: 19, fontWeight: "700", marginTop: space.sm },
  }),
  body: Platform.select({
    ios: { fontSize: 17, lineHeight: 22 },
    android: { fontSize: 16, lineHeight: 24, letterSpacing: 0.5 },
    default: { fontSize: 16, lineHeight: 22 },
  }),
  bold: { fontWeight: Platform.OS === "android" ? "500" : "600" },
  muted: Platform.select({
    ios: { fontSize: 15, lineHeight: 20 },
    android: { fontSize: 14, lineHeight: 20, letterSpacing: 0.25 },
    default: { fontSize: 15, lineHeight: 21 },
  }),
  label: Platform.select({
    ios: { fontSize: 15, fontWeight: "600" },
    android: { fontSize: 14, fontWeight: "500", letterSpacing: 0.1 },
    default: { fontSize: 15, fontWeight: "600" },
  }),
  card: Platform.select({
    // Liste groupée d'Apple : pas de bordure, coins arrondis.
    ios: { borderRadius: 14, padding: space.lg, gap: space.sm },
    // Carte Material 3 « remplie » : surface teintée, coins de 12 dp.
    android: { borderRadius: 12, padding: space.lg, gap: space.sm },
    default: { borderWidth: StyleSheet.hairlineWidth, borderRadius: radius.lg, padding: space.lg, gap: space.sm },
  }),
  badge: {
    alignSelf: "flex-start",
    borderRadius: Platform.OS === "android" ? radius.sm : radius.pill,
    paddingHorizontal: space.sm + 2,
    paddingVertical: 3,
  },
  badgeText: { fontSize: Platform.OS === "android" ? 12 : 13, fontWeight: Platform.OS === "android" ? "500" : "600" },
  button: {
    minHeight: Platform.OS === "android" ? 48 : 50,
    // Android : pilule Material 3 ; iPhone : bouton large de SwiftUI.
    borderRadius: Platform.OS === "android" ? radius.pill : radius.md,
    paddingHorizontal: Platform.OS === "android" ? space.xl : space.lg,
    overflow: "hidden",
    flexDirection: "row",
    gap: space.sm,
    alignItems: "center",
    justifyContent: "center",
  },
  buttonText: Platform.select({
    ios: { fontSize: 17, fontWeight: "600" },
    android: { fontSize: 14, fontWeight: "500", letterSpacing: 0.1 },
    default: { fontSize: 16, fontWeight: "600" },
  }),
  input: Platform.select({
    ios: { minHeight: 44, borderRadius: 10, paddingHorizontal: space.md, fontSize: 17 },
    // Champ « à contour » de Material 3.
    android: { minHeight: 56, borderWidth: 1, borderRadius: 4, paddingHorizontal: space.lg, fontSize: 16 },
    default: { minHeight: 48, borderWidth: 1, borderRadius: radius.md, paddingHorizontal: space.md, fontSize: 16 },
  }),
});

/**
 * Pastille à choisir (choix unique ou multiple). iPhone : capsule teintée ; Android : pastille
 * de filtre Material 3 (coins de 8 dp, contour, coche quand elle est choisie).
 */
export function Chip({
  label,
  selected,
  onPress,
  swatch,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
  /** Pastille de couleur avant le texte (choix d'une couleur d'accent). */
  swatch?: string;
}) {
  const c = usePalette();
  const colors = IOS
    ? { bg: selected ? c.primary : c.accent, border: "transparent", fg: selected ? c.primaryText : c.text }
    : ANDROID
      ? { bg: selected ? c.accent : "transparent", border: selected ? c.accent : c.border, fg: selected ? c.accentText : c.muted }
      : { bg: selected ? c.primary : c.card, border: selected ? c.primary : c.border, fg: selected ? c.primaryText : c.text };
  return (
    <Pressable
      accessibilityRole={ANDROID ? "checkbox" : "button"}
      accessibilityState={ANDROID ? { checked: selected } : { selected }}
      onPress={onPress}
      android_ripple={{ color: c.text, foreground: true }}
      style={({ pressed }) => [
        chipStyles.chip,
        { backgroundColor: colors.bg, borderColor: colors.border, opacity: pressed && !ANDROID ? 0.7 : 1 },
      ]}
    >
      <View style={chipStyles.inner}>
        {swatch ? (
          <View
            accessibilityElementsHidden
            importantForAccessibility="no"
            style={[chipStyles.swatch, { backgroundColor: swatch, borderColor: colors.fg }]}
          />
        ) : null}
        <Text style={[chipStyles.text, { color: colors.fg }]}>
          {ANDROID && selected ? `✓  ${label}` : label}
        </Text>
      </View>
    </Pressable>
  );
}

const chipStyles = StyleSheet.create({
  inner: { flexDirection: "row", alignItems: "center", gap: space.sm },
  swatch: { width: 16, height: 16, borderRadius: 8, borderWidth: StyleSheet.hairlineWidth },
  chip: {
    minHeight: 44,
    paddingHorizontal: Platform.OS === "android" ? space.lg : space.md + 2,
    borderRadius: Platform.OS === "android" ? radius.sm : radius.pill,
    borderWidth: Platform.OS === "ios" ? 0 : 1,
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
  },
  text: Platform.select({
    ios: { fontSize: 15, fontWeight: "500" },
    android: { fontSize: 14, fontWeight: "500", letterSpacing: 0.1 },
    default: { fontSize: 15, fontWeight: "600" },
  }),
});

/** Libellé d'un groupe de champs. */
export function Label({ children }: { children: ReactNode }) {
  const c = usePalette();
  return <Text style={[styles.label, { color: c.text }]}>{children}</Text>;
}
