/**
 * Briques d'interface communes (écran, textes, carte, bouton, champ, pastilles, bandeaux).
 * Cibles tactiles d'au moins 44 pt (iPhone) ou 48 dp (Android).
 *
 * Chaque brique prend l'allure de sa plateforme (voir `theme/tokens.ts`) :
 * - iPhone : styles de texte d'Apple, cartes groupées sans bordure, boutons « remplis » et
 *   « teintés », pastilles en capsule, champs gris arrondis, contrôle segmenté.
 * - Android : Material 3 : boutons en pilule (rempli, tonal, texte) avec effet d'onde, cartes de
 *   surface, pastilles de filtre avec coche, champs à contour, boutons segmentés.
 */
import { Stack } from "expo-router";
import { type ReactNode, useEffect, useState } from "react";
import {
  ActivityIndicator,
  type ColorValue,
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
import Animated, { ReduceMotion, useAnimatedStyle, useSharedValue, withSpring } from "react-native-reanimated";
import { SafeAreaView } from "react-native-safe-area-context";

import { Icon, type IconName } from "@/components/icon";
import { Appear, PressScale, Reveal } from "@/components/motion";
import { hapticSelect, hapticSuccess } from "@/services/haptics";
import { radius, space } from "@/theme/colors";
import { ANDROID, IOS, pick, shape, strong, touch, type } from "@/theme/tokens";
import { usePalette } from "@/theme/use-palette";

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

/** Un groupe d'éléments qui vont ensemble (titre de section + son contenu), serrés entre eux. */
export function Section({ children, gap = space.md }: { children: ReactNode; gap?: number }) {
  return <View style={{ gap }}>{children}</View>;
}

export function Title({ children }: { children: ReactNode }) {
  const c = usePalette();
  return (
    <Text accessibilityRole="header" style={[type.display, { color: c.text }]}>
      {children}
    </Text>
  );
}

/** Titre de section. `count` : petit compteur à côté ; `action` : lien à droite. */
export function Heading({
  children,
  count,
  action,
}: {
  children: ReactNode;
  count?: number;
  action?: { label: string; onPress: () => void };
}) {
  const c = usePalette();
  return (
    <View style={styles.headingRow}>
      <View style={styles.headingTitle}>
        <Text accessibilityRole="header" style={[type.heading, { color: c.text, flexShrink: 1 }]}>
          {children}
        </Text>
        {count !== undefined && count > 0 ? (
          <View style={[styles.count, { backgroundColor: c.primary }]}>
            <Text style={[type.caption, strong, { color: c.primaryText }]}>{count}</Text>
          </View>
        ) : null}
      </View>
      {action ? (
        <Pressable
          accessibilityRole="button"
          onPress={action.onPress}
          hitSlop={12}
          style={({ pressed }) => ({ opacity: pressed ? 0.5 : 1 })}
        >
          <Text style={[type.subhead, strong, { color: c.primary }]}>{action.label}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

export function Body({ children, bold, color }: { children: ReactNode; bold?: boolean; color?: ColorValue }) {
  const c = usePalette();
  return <Text style={[bold ? type.headline : type.body, { color: color ?? c.text }]}>{children}</Text>;
}

export function Muted({ children, color }: { children: ReactNode; color?: ColorValue }) {
  const c = usePalette();
  return <Text style={[type.subhead, { color: color ?? c.muted }]}>{children}</Text>;
}

/** Note en petit (sous un groupe, en bas de page). */
export function Footnote({ children, center }: { children: ReactNode; center?: boolean }) {
  const c = usePalette();
  return <Text style={[type.footnote, { color: c.muted }, center ? { textAlign: "center" } : null]}>{children}</Text>;
}

export function ErrorText({ children }: { children: ReactNode }) {
  const c = usePalette();
  if (!children) return null;
  return (
    <Reveal>
      <View accessibilityRole="alert" style={styles.inline}>
        <View style={styles.inlineIcon}>
          <Icon name="alert" size={16} color={c.danger} />
        </View>
        <Text style={[type.subhead, { color: c.danger, flex: 1 }]}>{children}</Text>
      </View>
    </Reveal>
  );
}

/** Message après une action réussie (« Plan envoyé »), ou une information à remarquer. */
export function Notice({ children, tone = "success" }: { children: ReactNode; tone?: "success" | "info" | "warning" }) {
  if (!children) return null;
  // Nouveau message = nouvel élément : il se glisse en place (et vibre s'il annonce une réussite).
  return <NoticeBody key={typeof children === "string" ? children : undefined} tone={tone}>{children}</NoticeBody>;
}

function NoticeBody({ children, tone }: { children: ReactNode; tone: "success" | "info" | "warning" }) {
  const c = usePalette();
  useEffect(() => {
    if (tone === "success") hapticSuccess();
  }, [tone]);
  const color = tone === "success" ? c.success : tone === "warning" ? c.warning : c.primary;
  return (
    <Reveal>
      <View accessibilityRole="alert" accessibilityLiveRegion="polite" style={[styles.notice, { backgroundColor: c.card }]}>
        <View style={styles.inlineIcon}>
          <Icon name={tone === "success" ? "checkCircle" : tone === "warning" ? "alert" : "info"} size={18} color={color} />
        </View>
        <Text style={[type.subhead, strong, { color: c.text, flex: 1 }]}>{children}</Text>
      </View>
    </Reveal>
  );
}

/**
 * Carte. `tone="accent"` : mise en avant (teinte d'accent). `onPress` : toute la carte se
 * touche (onde sur Android, léger fondu sur iPhone).
 */
export function Card({
  children,
  style,
  tone = "plain",
  onPress,
  accessibilityLabel,
}: {
  children: ReactNode;
  style?: ViewStyle;
  tone?: "plain" | "accent";
  onPress?: () => void;
  accessibilityLabel?: string;
}) {
  const c = usePalette();
  const look = [styles.card, { backgroundColor: tone === "accent" ? c.accent : c.card }, style];
  if (!onPress) return <View style={look}>{children}</View>;
  return (
    <PressScale
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      onPress={onPress}
      android_ripple={{ color: c.border, foreground: true }}
      to={0.96}
      dim={ANDROID ? 1 : 0.75}
      style={look}
    >
      {children}
    </PressScale>
  );
}

export type Tone = "neutral" | "primary" | "success" | "warning" | "danger";

/** Petite étiquette. Avec un ton, un point de couleur et le texte prennent ce ton. */
export function Badge({ children, tone = "neutral", icon }: { children: ReactNode; tone?: Tone; icon?: IconName }) {
  const c = usePalette();
  const fg =
    tone === "primary" ? c.accentText
    : tone === "success" ? c.success
    : tone === "warning" ? c.warning
    : tone === "danger" ? c.danger
    : c.muted;
  return (
    <View style={[styles.badge, { backgroundColor: c.accent }]}>
      {icon ? <Icon name={icon} size={12} color={fg} /> : null}
      {!icon && tone !== "neutral" && tone !== "primary" ? <View style={[styles.dot, { backgroundColor: fg }]} /> : null}
      <Text numberOfLines={1} style={[type.caption, strong, { color: tone === "neutral" ? c.text : fg, flexShrink: 1 }]}>
        {children}
      </Text>
    </View>
  );
}

/**
 * Bouton. iPhone : « rempli » (primary), « teinté » (secondary), teinté rouge (danger) ou
 * simple texte (plain), comme les boutons de SwiftUI. Android : bouton Material 3 rempli,
 * tonal, tonal rouge ou texte, en pilule avec effet d'onde. `size="small"` : bouton compact, à
 * mettre dans une rangée ou une carte.
 */
export function Button({
  label,
  onPress,
  variant = "primary",
  size = "large",
  icon,
  busy,
  disabled,
}: {
  label: string;
  onPress: () => void;
  variant?: "primary" | "secondary" | "danger" | "plain";
  size?: "large" | "small";
  icon?: IconName;
  busy?: boolean;
  disabled?: boolean;
}) {
  const c = usePalette();
  const bg =
    variant === "primary" ? c.primary
    : variant === "plain" ? "transparent"
    : c.accent;
  const fg =
    variant === "primary" ? c.primaryText
    : variant === "plain" ? c.primary
    : variant === "danger" ? c.danger
    : c.accentText;
  const off = disabled || busy;
  const small = size === "small";
  return (
    // Désactivé : un View autour porte l'opacité (l'animation gère celle du bouton pressé).
    <View style={off ? styles.off : null}>
    <PressScale
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: off, busy }}
      disabled={off}
      onPress={onPress}
      android_ripple={{ color: fg, foreground: true }}
      to={0.97}
      dim={ANDROID ? 1 : 0.7}
      style={[small ? styles.buttonSmall : styles.button, { backgroundColor: bg }]}
    >
      {busy ? <ActivityIndicator color={fg} size="small" /> : icon ? <Icon name={icon} size={small ? 16 : 18} color={fg} /> : null}
      <Text numberOfLines={1} style={[small ? type.buttonSmall : type.button, { color: fg, flexShrink: 1 }]}>
        {label}
      </Text>
    </PressScale>
    </View>
  );
}

/** Bouton rond qui ne montre qu'une icône (flèches de semaine, fermer). */
export function IconButton({
  icon,
  label,
  onPress,
  disabled,
  filled,
}: {
  icon: IconName;
  label: string;
  onPress: () => void;
  disabled?: boolean;
  filled?: boolean;
}) {
  const c = usePalette();
  return (
    <View style={disabled ? styles.off : null}>
      <PressScale
        accessibilityRole="button"
        accessibilityLabel={label}
        accessibilityState={{ disabled }}
        disabled={disabled}
        onPress={onPress}
        hitSlop={4}
        android_ripple={{ color: c.border, borderless: true, radius: 22 }}
        to={0.86}
        dim={ANDROID ? 1 : 0.6}
        style={[styles.iconButton, { backgroundColor: filled ? c.accent : "transparent" }]}
      >
        <Icon name={icon} size={20} color={filled ? c.accentText : c.primary} />
      </PressScale>
    </View>
  );
}

export function Field({
  label,
  hint,
  ...input
}: TextInputProps & { label: string; hint?: string }) {
  const c = usePalette();
  return (
    <View style={{ gap: space.xs + 2 }}>
      <Text style={[type.label, { color: c.text }]}>{label}</Text>
      <TextInput
        placeholderTextColor={c.muted}
        selectionColor={c.primary}
        cursorColor={c.primary}
        style={[
          styles.input,
          IOS ? { color: c.text, backgroundColor: c.accent } : { color: c.text, borderColor: c.muted },
        ]}
        accessibilityLabel={label}
        {...input}
      />
      {hint ? <Footnote>{hint}</Footnote> : null}
    </View>
  );
}

export function Loading() {
  const c = usePalette();
  return (
    <View style={{ padding: space.xxl, alignItems: "center" }}>
      <ActivityIndicator color={IOS ? c.muted : c.primary} size={ANDROID ? "large" : "small"} />
    </View>
  );
}

/** Page ou section vide : une icône, une phrase, et l'action à faire ensuite. */
export function EmptyState({
  icon,
  title,
  text,
  action,
}: {
  icon: IconName;
  title: string;
  text?: string;
  action?: { label: string; onPress: () => void; icon?: IconName };
}) {
  const c = usePalette();
  return (
    <Appear style={[styles.empty, { backgroundColor: c.card }]}>
      <View style={[styles.emptyIcon, { backgroundColor: c.accent }]}>
        <Icon name={icon} size={26} color={c.accentText} />
      </View>
      <Text style={[type.headline, { color: c.text, textAlign: "center" }]}>{title}</Text>
      {text ? <Text style={[type.subhead, { color: c.muted, textAlign: "center" }]}>{text}</Text> : null}
      {action ? (
        <View style={{ marginTop: space.xs }}>
          <Button label={action.label} icon={action.icon} size="small" variant="secondary" onPress={action.onPress} />
        </View>
      ) : null}
    </Appear>
  );
}

export function Row({
  children,
  gap = space.sm,
  nowrap,
  align = "center",
}: {
  children: ReactNode;
  gap?: number;
  nowrap?: boolean;
  align?: ViewStyle["alignItems"];
}) {
  return <View style={{ flexDirection: "row", flexWrap: nowrap ? "nowrap" : "wrap", gap, alignItems: align }}>{children}</View>;
}

/** Prend toute la place qui reste dans une rangée. */
export function Fill({ children }: { children?: ReactNode }) {
  return <View style={{ flex: 1, minWidth: 0 }}>{children}</View>;
}

/** Une ligne « icône + texte » (lieu, heure, personnes) dans une carte. */
export function Meta({
  icon,
  children,
  color,
  accessibilityLabel,
}: {
  icon: IconName;
  children: ReactNode;
  color?: ColorValue;
  accessibilityLabel?: string;
}) {
  const c = usePalette();
  return (
    <View accessible={accessibilityLabel !== undefined} accessibilityLabel={accessibilityLabel} style={styles.inline}>
      <View style={styles.inlineIcon}>
        <Icon name={icon} size={15} color={color ?? c.muted} />
      </View>
      <Text style={[type.subhead, { color: color ?? c.muted, flex: 1 }]}>{children}</Text>
    </View>
  );
}

/** Fin trait entre deux parties d'une carte. */
export function Divider() {
  const c = usePalette();
  return <View style={{ height: StyleSheet.hairlineWidth, backgroundColor: c.border }} />;
}

/**
 * Pastille à choisir (choix unique ou multiple). iPhone : capsule teintée ; Android : pastille
 * de filtre Material 3 (coins de 8 dp, contour, coche quand elle est choisie). `swatch` :
 * pastille de couleur avant le libellé.
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
  swatch?: ColorValue;
}) {
  const c = usePalette();
  const colors = IOS
    ? { bg: selected ? c.primary : c.accent, border: "transparent" as ColorValue, fg: selected ? c.primaryText : c.text }
    : { bg: selected ? c.accent : ("transparent" as ColorValue), border: selected ? c.accent : c.border, fg: selected ? c.accentText : c.muted };
  return (
    <PressScale
      accessibilityRole={ANDROID ? "checkbox" : "button"}
      accessibilityState={ANDROID ? { checked: selected } : { selected }}
      onPress={() => {
        hapticSelect();
        onPress();
      }}
      android_ripple={{ color: c.text, foreground: true }}
      to={0.94}
      dim={ANDROID ? 1 : 0.8}
      style={[chipStyles.chip, { backgroundColor: colors.bg, borderColor: colors.border }]}
    >
      <View style={chipStyles.inner}>
        {ANDROID && selected ? <Icon name="check" size={16} color={colors.fg} /> : null}
        {swatch ? <View style={[chipStyles.swatch, { backgroundColor: swatch, borderColor: c.border }]} /> : null}
        <Text style={[type.buttonSmall, IOS ? { fontWeight: "500" } : null, { color: colors.fg }]}>{label}</Text>
      </View>
    </PressScale>
  );
}

/**
 * Choix unique entre 2 à 4 options courtes. iPhone : contrôle segmenté d'Apple ; Android :
 * boutons segmentés Material 3.
 */
export function Segmented<T extends string>({
  options,
  value,
  onChange,
  accessibilityLabel,
}: {
  options: readonly { value: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
  accessibilityLabel?: string;
}) {
  const c = usePalette();
  // iPhone : la pastille blanche glisse d'un segment à l'autre, comme le contrôle d'Apple.
  const [width, setWidth] = useState(0);
  const index = Math.max(0, options.findIndex((o) => o.value === value));
  const segment = width > 0 ? (width - 4) / options.length : 0;
  const x = useSharedValue(0);
  useEffect(() => {
    x.value = withSpring(index * segment, { damping: 22, stiffness: 260, mass: 0.7, reduceMotion: ReduceMotion.System });
  }, [index, segment, x]);
  const thumb = useAnimatedStyle(() => ({ transform: [{ translateX: x.value }] }));
  return (
    <View
      accessibilityRole="radiogroup"
      accessibilityLabel={accessibilityLabel}
      onLayout={(e) => setWidth(e.nativeEvent.layout.width)}
      style={[segStyles.track, IOS ? { backgroundColor: c.accent } : { borderColor: c.muted }]}
    >
      {IOS && segment > 0 ? (
        <Animated.View style={[segStyles.thumb, segStyles.slider, { width: segment, backgroundColor: c.card }, thumb]} />
      ) : null}
      {options.map((o, i) => {
        const on = o.value === value;
        return (
          <Pressable
            key={o.value}
            accessibilityRole="radio"
            accessibilityState={{ selected: on, checked: on }}
            onPress={() => {
              if (!on) hapticSelect();
              onChange(o.value);
            }}
            android_ripple={{ color: c.text, foreground: true }}
            style={[
              segStyles.item,
              IOS
                ? null
                : { backgroundColor: on ? c.accent : "transparent", borderLeftWidth: i === 0 ? 0 : 1, borderColor: c.muted },
            ]}
          >
            {ANDROID && on ? <Icon name="check" size={16} color={c.accentText} /> : null}
            <Text
              numberOfLines={1}
              style={[
                IOS ? { fontSize: 13, lineHeight: 18, fontWeight: on ? "600" : "500" } : type.buttonSmall,
                { color: IOS ? c.text : on ? c.accentText : c.text },
              ]}
            >
              {o.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

/** Libellé d'un groupe de champs. */
export function Label({ children }: { children: ReactNode }) {
  const c = usePalette();
  return <Text style={[type.label, { color: c.text }]}>{children}</Text>;
}

const styles = StyleSheet.create({
  screen: { padding: space.lg, gap: space.xl, paddingBottom: space.xxl * 2 },
  headingRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: space.md, minHeight: 28 },
  headingTitle: { flexDirection: "row", alignItems: "center", gap: space.sm, flexShrink: 1 },
  count: { minWidth: 22, height: 22, borderRadius: 11, paddingHorizontal: 6, alignItems: "center", justifyContent: "center" },
  inline: { flexDirection: "row", gap: space.sm, alignItems: "flex-start" },
  // Aligne l'icône sur la première ligne du texte.
  inlineIcon: { height: pick({ ios: 20, android: 20 }), justifyContent: "center" },
  notice: { flexDirection: "row", gap: space.sm, alignItems: "flex-start", borderRadius: shape.tile, padding: space.md },
  card: { borderRadius: shape.card, padding: space.lg, gap: space.sm, overflow: "hidden" },
  badge: {
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    maxWidth: "100%",
    borderRadius: pick({ ios: radius.pill, android: radius.sm }),
    paddingHorizontal: space.sm + 2,
    paddingVertical: 4,
  },
  dot: { width: 7, height: 7, borderRadius: 4 },
  off: { opacity: 0.45 },
  button: {
    minHeight: pick({ ios: 50, android: 48 }),
    borderRadius: pick({ ios: 14, android: radius.pill }),
    paddingHorizontal: pick({ ios: space.lg, android: space.xl }),
    overflow: "hidden",
    flexDirection: "row",
    gap: space.sm,
    alignItems: "center",
    justifyContent: "center",
  },
  buttonSmall: {
    minHeight: pick({ ios: 36, android: 40 }),
    borderRadius: radius.pill,
    paddingHorizontal: pick({ ios: space.lg - 2, android: space.lg }),
    overflow: "hidden",
    flexDirection: "row",
    gap: space.xs + 2,
    alignItems: "center",
    justifyContent: "center",
  },
  iconButton: { width: touch, height: touch, borderRadius: touch / 2, alignItems: "center", justifyContent: "center" },
  input: pick<ViewStyle & { fontSize: number }>({
    ios: { minHeight: 48, borderRadius: shape.field, paddingHorizontal: space.md + 2, fontSize: 17 },
    // Champ « à contour » de Material 3.
    android: { minHeight: 56, borderWidth: 1, borderRadius: shape.field, paddingHorizontal: space.lg, fontSize: 16 },
  }),
  empty: { borderRadius: shape.card, paddingVertical: space.xl, paddingHorizontal: space.lg, gap: space.sm, alignItems: "center" },
  emptyIcon: { width: 56, height: 56, borderRadius: 28, alignItems: "center", justifyContent: "center", marginBottom: space.xs },
});

const chipStyles = StyleSheet.create({
  chip: {
    minHeight: pick({ ios: 40, android: 40 }),
    paddingHorizontal: pick({ ios: space.md + 2, android: space.md + 2 }),
    borderRadius: shape.chip,
    borderWidth: pick({ ios: 0, android: 1 }),
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
  },
  inner: { flexDirection: "row", alignItems: "center", gap: space.sm },
  swatch: { width: 14, height: 14, borderRadius: 7, borderWidth: StyleSheet.hairlineWidth },
});

const segStyles = StyleSheet.create({
  track: pick<ViewStyle>({
    ios: { flexDirection: "row", borderRadius: 9, padding: 2, minHeight: 36 },
    android: { flexDirection: "row", borderRadius: radius.pill, borderWidth: 1, minHeight: 40, overflow: "hidden" },
  }),
  item: { flex: 1, flexDirection: "row", gap: space.xs, alignItems: "center", justifyContent: "center", paddingHorizontal: space.sm, overflow: "hidden" },
  slider: { position: "absolute", top: 2, bottom: 2, left: 2 },
  thumb: {
    borderRadius: 7,
    shadowColor: "#000",
    shadowOpacity: 0.12,
    shadowRadius: 3,
    shadowOffset: { width: 0, height: 1 },
  },
});
