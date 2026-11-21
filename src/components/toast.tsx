/**
 * Bandeau en bas de l'écran (« snackbar » de Material) : un message court, avec « Annuler »
 * quand l'action peut être défaite.
 *
 * - `show(message, undo?)` : l'action est déjà faite ; « Annuler » appelle `undo`.
 * - `later(message, commit, undo)` : l'action attend `UNDO_MS` avant d'être faite (`commit`).
 *   « Annuler » appelle `undo` et rien n'est envoyé. Si un autre bandeau arrive, ou si l'app
 *   passe en arrière-plan, l'action en attente est faite tout de suite.
 */
import { createContext, type ReactNode, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { AccessibilityInfo, AppState, Pressable, StyleSheet, Text, View } from "react-native";
import Animated, { Easing, ReduceMotion, useAnimatedStyle, useSharedValue, withTiming } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { UNDO_MS } from "@/features/undo";
import { hapticTap } from "@/services/haptics";
import { space } from "@/theme/colors";
import { pick, shape, strong, type } from "@/theme/tokens";
import { usePalette } from "@/theme/use-palette";

type Toast = { id: number; message: string; undo?: () => void; commit?: () => void };

type ToastApi = {
  show: (message: string, undo?: () => void) => void;
  later: (message: string, commit: () => void, undo: () => void) => void;
};

const ToastContext = createContext<ToastApi | null>(null);

export function useToast(): ToastApi {
  const api = useContext(ToastContext);
  if (!api) throw new Error("useToast doit être dans <ToastProvider>.");
  return api;
}

/** Au-dessus de la barre d'onglets. */
const ABOVE_TABS = pick({ ios: 64, android: 88 });

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toast, setToast] = useState<Toast | null>(null);
  const current = useRef<Toast | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const nextId = useRef(1);

  /** Fait l'action en attente (s'il y en a une) et ferme le bandeau. */
  const flush = useCallback(() => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
    const t = current.current;
    current.current = null;
    setToast(null);
    t?.commit?.();
  }, []);

  const open = useCallback(
    (t: Omit<Toast, "id">) => {
      flush();
      const next = { ...t, id: nextId.current++ };
      current.current = next;
      setToast(next);
      AccessibilityInfo.announceForAccessibility(next.undo ? `${next.message}. Annuler est proposé.` : next.message);
      timer.current = setTimeout(flush, next.undo ? UNDO_MS : 3_000);
    },
    [flush],
  );

  const undo = useCallback(() => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
    const t = current.current;
    current.current = null;
    setToast(null);
    hapticTap();
    t?.undo?.();
  }, []);

  // L'app passe en arrière-plan (ou se ferme) : on n'attend plus.
  useEffect(() => {
    const sub = AppState.addEventListener("change", (s) => {
      if (s !== "active") flush();
    });
    return () => {
      sub.remove();
      flush();
    };
  }, [flush]);

  const api = useMemo<ToastApi>(
    () => ({
      show: (message, undoFn) => open({ message, undo: undoFn }),
      later: (message, commit, undoFn) => open({ message, commit, undo: undoFn }),
    }),
    [open],
  );

  return (
    <ToastContext.Provider value={api}>
      {children}
      {toast ? <Bar key={toast.id} toast={toast} onUndo={undo} onClose={flush} /> : null}
    </ToastContext.Provider>
  );
}

function Bar({ toast, onUndo, onClose }: { toast: Toast; onUndo: () => void; onClose: () => void }) {
  const c = usePalette();
  const insets = useSafeAreaInsets();
  const shown = useSharedValue(0);
  useEffect(() => {
    shown.value = withTiming(1, { duration: 220, easing: Easing.out(Easing.cubic), reduceMotion: ReduceMotion.System });
  }, [shown]);
  const style = useAnimatedStyle(() => ({ opacity: shown.value, transform: [{ translateY: 16 * (1 - shown.value) }] }));
  return (
    <View pointerEvents="box-none" style={[StyleSheet.absoluteFill, styles.wrap, { paddingBottom: insets.bottom + ABOVE_TABS }]}>
      <Animated.View accessibilityLiveRegion="polite" style={[styles.bar, { backgroundColor: c.text }, style]}>
        <Pressable accessibilityRole="button" accessibilityLabel={`${toast.message}. Fermer`} onPress={onClose} style={styles.text}>
          <Text numberOfLines={2} style={[type.subhead, { color: c.background }]}>
            {toast.message}
          </Text>
        </Pressable>
        {toast.undo ? (
          <Pressable accessibilityRole="button" accessibilityLabel="Annuler" hitSlop={8} onPress={onUndo} style={styles.undo}>
            <Text style={[type.subhead, strong, { color: c.accent }]}>Annuler</Text>
          </Pressable>
        ) : null}
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { justifyContent: "flex-end", paddingHorizontal: space.lg },
  bar: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.sm,
    minHeight: 48,
    paddingLeft: space.lg,
    paddingRight: space.sm,
    borderRadius: pick({ ios: shape.card, android: 4 }),
    shadowColor: "#000",
    shadowOpacity: 0.2,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
  text: { flex: 1, paddingVertical: space.md },
  undo: { paddingHorizontal: space.md, paddingVertical: space.md },
});
