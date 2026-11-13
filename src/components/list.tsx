/**
 * Listes groupées : rangées dans une carte, séparées par un trait fin. iPhone : liste
 * « inset grouped » des Réglages (icône dans un carré de couleur, chevron) ; Android : liste
 * Material 3 (icône simple, rangées de 56 dp).
 */
import { Children, type ReactNode } from "react";
import { type ColorValue, StyleSheet, Text, View } from "react-native";

import { Icon, type IconName } from "@/components/icon";
import { PressScale } from "@/components/motion";
import { space } from "@/theme/colors";
import { ANDROID, IOS, pick, shape, type } from "@/theme/tokens";
import { usePalette } from "@/theme/use-palette";

/** Carte de rangées. `header` : libellé au-dessus ; `footer` : note en dessous. */
export function ListGroup({ children, header, footer }: { children: ReactNode; header?: string; footer?: string }) {
  const c = usePalette();
  const rows = Children.toArray(children);
  return (
    <View style={{ gap: space.sm }}>
      {header ? (
        <Text accessibilityRole="header" style={[styles.header, { color: IOS ? c.muted : c.primary }]}>
          {IOS ? header.toLocaleUpperCase("fr-CA") : header}
        </Text>
      ) : null}
      <View style={[styles.group, { backgroundColor: c.card }]}>
        {rows.map((row, i) => (
          <View key={i}>
            {i > 0 ? <View style={[styles.separator, { backgroundColor: c.border }]} /> : null}
            {row}
          </View>
        ))}
      </View>
      {footer ? <Text style={[type.footnote, styles.footer, { color: c.muted }]}>{footer}</Text> : null}
    </View>
  );
}

/**
 * Une rangée : à gauche une icône (ou `leading`, un avatar par exemple), un titre et un
 * sous-titre, à droite une valeur, un élément (`trailing`) ou un chevron quand elle se touche.
 */
export function ListRow({
  title,
  subtitle,
  icon,
  iconColor,
  leading,
  value,
  trailing,
  onPress,
  chevron,
  destructive,
  accessibilityHint,
}: {
  title: string;
  subtitle?: string;
  icon?: IconName;
  /** Couleur du carré de l'icône (iPhone) ou de l'icône (Android). */
  iconColor?: ColorValue;
  leading?: ReactNode;
  value?: string;
  trailing?: ReactNode;
  onPress?: () => void;
  /** Chevron à droite ; par défaut quand la rangée se touche et n'a rien d'autre à droite. */
  chevron?: boolean;
  destructive?: boolean;
  accessibilityHint?: string;
}) {
  const c = usePalette();
  const tint = destructive ? c.danger : (iconColor ?? c.primary);
  const showChevron = chevron ?? (onPress !== undefined && trailing === undefined && !destructive);
  const content = (
    <View style={styles.row}>
      {leading}
      {icon && !leading ? (
        IOS ? (
          <View style={[styles.iconTile, { backgroundColor: tint }]}>
            <Icon name={icon} size={17} color={c.primaryText} />
          </View>
        ) : (
          <Icon name={icon} size={24} color={destructive ? c.danger : (iconColor ?? c.muted)} />
        )
      ) : null}
      <View style={styles.texts}>
        <Text style={[type.body, { color: destructive ? c.danger : c.text }]}>{title}</Text>
        {subtitle ? <Text style={[type.subhead, { color: c.muted }]}>{subtitle}</Text> : null}
      </View>
      {value ? <Text numberOfLines={1} style={[type.body, styles.value, { color: c.muted }]}>{value}</Text> : null}
      {trailing}
      {showChevron ? <Icon name="chevron" size={IOS ? 14 : 20} color={c.muted} /> : null}
    </View>
  );
  if (!onPress) return content;
  return (
    <PressScale
      accessibilityRole="button"
      accessibilityHint={accessibilityHint}
      onPress={onPress}
      android_ripple={{ color: c.border }}
      to={1}
      dim={ANDROID ? 1 : 0.5}
    >
      {content}
    </PressScale>
  );
}

const styles = StyleSheet.create({
  header: pick({
    ios: { ...type.footnote, paddingHorizontal: space.lg },
    android: { ...type.label, paddingHorizontal: space.xs },
  }),
  footer: { paddingHorizontal: pick({ ios: space.lg, android: space.xs }) },
  group: { borderRadius: shape.card, overflow: "hidden" },
  separator: { height: StyleSheet.hairlineWidth, marginLeft: space.lg },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.md,
    minHeight: pick({ ios: 52, android: 56 }),
    paddingHorizontal: space.lg,
    paddingVertical: space.sm + 2,
  },
  iconTile: { width: 30, height: 30, borderRadius: 7, alignItems: "center", justifyContent: "center" },
  texts: { flex: 1, minWidth: 0, gap: 1 },
  value: { maxWidth: "45%" },
});
