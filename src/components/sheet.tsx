/**
 * Feuille de formulaire (plein écran sur Android, feuille qui monte sur iPhone). Les actions
 * sont dans la barre du haut, toujours visibles : « Annuler » à gauche et l'action principale à
 * droite sur iPhone ; une croix, le titre et l'action sur Android.
 */
import type { ReactNode } from "react";
import { ActivityIndicator, KeyboardAvoidingView, Modal, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { IconButton } from "@/components/ui";
import { space } from "@/theme/colors";
import { IOS, type } from "@/theme/tokens";
import { usePalette } from "@/theme/use-palette";

export function Sheet({
  title,
  confirmLabel,
  onConfirm,
  onClose,
  busy,
  confirmDisabled,
  children,
}: {
  title: string;
  confirmLabel: string;
  onConfirm: () => void;
  onClose: () => void;
  busy?: boolean;
  confirmDisabled?: boolean;
  children: ReactNode;
}) {
  const c = usePalette();
  const off = busy || confirmDisabled;
  const confirm = (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={confirmLabel}
      accessibilityState={{ disabled: off, busy }}
      disabled={off}
      onPress={onConfirm}
      hitSlop={10}
      style={({ pressed }) => [styles.action, { opacity: off ? 0.4 : pressed ? 0.5 : 1 }]}
    >
      {busy ? <ActivityIndicator size="small" color={c.primary} /> : null}
      <Text style={[type.button, { color: c.primary }]}>{confirmLabel}</Text>
    </Pressable>
  );
  return (
    <Modal visible animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      {/* iPhone : la feuille commence déjà sous la barre d'état. */}
      <SafeAreaView edges={IOS ? ["bottom"] : ["top", "bottom"]} style={{ flex: 1, backgroundColor: c.background }}>
        <View style={[styles.bar, { borderBottomColor: c.border }]}>
          {IOS ? (
            <Pressable accessibilityRole="button" disabled={busy} onPress={onClose} hitSlop={10} style={({ pressed }) => [styles.action, { opacity: pressed ? 0.5 : 1 }]}>
              <Text style={[type.body, { color: c.primary }]}>Annuler</Text>
            </Pressable>
          ) : (
            <IconButton icon="close" label="Fermer" disabled={busy} onPress={onClose} />
          )}
          <Text
            accessibilityRole="header"
            numberOfLines={1}
            style={[IOS ? type.headline : type.title, styles.title, { color: c.text, textAlign: IOS ? "center" : "left" }]}
          >
            {title}
          </Text>
          {confirm}
        </View>
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={IOS ? "padding" : undefined}>
          <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled" keyboardDismissMode={IOS ? "interactive" : "on-drag"}>
            {children}
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.md,
    minHeight: 56,
    paddingHorizontal: space.lg,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  title: { flex: 1 },
  action: { flexDirection: "row", gap: space.sm, alignItems: "center", minHeight: 44 },
  body: { padding: space.lg, gap: space.xl, paddingBottom: space.xxl * 2 },
});
