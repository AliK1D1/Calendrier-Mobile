/**
 * Ligne qu'on glisse du doigt pour faire apparaître des actions, comme dans Mail (iPhone) ou
 * Gmail (Android) : glisser vers la gauche montre les actions de fin (`trailing`, ex.
 * Supprimer), vers la droite celles du début (`leading`, ex. Accepter). Toucher une action la
 * fait et referme la ligne. Les lecteurs d'écran ont les mêmes actions dans le menu des
 * actions (`accessibilityActions`), puisqu'ils ne peuvent pas glisser.
 */
import type { ReactNode } from "react";
import { type ColorValue, Pressable, StyleSheet, Text, View } from "react-native";
import Swipeable, { type SwipeableMethods } from "react-native-gesture-handler/ReanimatedSwipeable";
import Animated, { type SharedValue, useAnimatedStyle } from "react-native-reanimated";

import { Icon, type IconName } from "@/components/icon";
import { hapticSelect, hapticTap } from "@/services/haptics";
import { space } from "@/theme/colors";
import { type } from "@/theme/tokens";

export type SwipeAction = { label: string; icon: IconName; color: ColorValue; onPress: () => void };

const WIDTH = 76;

function Actions({ actions, methods, progress }: { actions: SwipeAction[]; methods: SwipeableMethods; progress: SharedValue<number> }) {
  // Invisibles tant que la ligne est fermée (sinon un liseré de couleur dépasse des coins).
  const shown = useAnimatedStyle(() => ({ opacity: progress.value > 0.01 ? 1 : 0 }));
  return (
    <Animated.View style={[styles.actions, shown]}>
      {actions.map((a) => (
        <Pressable
          key={a.label}
          accessibilityRole="button"
          accessibilityLabel={a.label}
          onPress={() => {
            hapticTap();
            methods.close();
            // Après la fermeture : l'action peut retirer la ligne de l'écran.
            setTimeout(a.onPress, 250);
          }}
          style={({ pressed }) => [styles.action, { backgroundColor: a.color, opacity: pressed ? 0.8 : 1 }]}
        >
          <Icon name={a.icon} size={22} color="#fff" />
          <Text numberOfLines={1} adjustsFontSizeToFit style={[type.caption, styles.label]}>
            {a.label}
          </Text>
        </Pressable>
      ))}
    </Animated.View>
  );
}

export function SwipeRow({
  children,
  leading = [],
  trailing = [],
  radius = 0,
}: {
  children: ReactNode;
  leading?: SwipeAction[];
  trailing?: SwipeAction[];
  /** Coins arrondis de la ligne (une carte), pour que les actions restent dedans. */
  radius?: number;
}) {
  if (leading.length === 0 && trailing.length === 0) return <>{children}</>;
  const all = [...leading, ...trailing];
  return (
    <View
      accessibilityActions={all.map((a) => ({ name: a.label, label: a.label }))}
      onAccessibilityAction={(e) => all.find((a) => a.label === e.nativeEvent.actionName)?.onPress()}
    >
      <Swipeable
        friction={1.6}
        overshootLeft={false}
        overshootRight={false}
        leftThreshold={WIDTH * 0.5}
        rightThreshold={WIDTH * 0.5}
        onSwipeableWillOpen={() => hapticSelect()}
        containerStyle={radius ? { borderRadius: radius, overflow: "hidden" } : undefined}
        renderLeftActions={leading.length ? (p, _t, m) => <Actions actions={leading} methods={m} progress={p} /> : undefined}
        renderRightActions={trailing.length ? (p, _t, m) => <Actions actions={trailing} methods={m} progress={p} /> : undefined}
      >
        {children}
      </Swipeable>
    </View>
  );
}

const styles = StyleSheet.create({
  actions: { flexDirection: "row" },
  action: { width: WIDTH, alignItems: "center", justifyContent: "center", gap: space.xs, paddingHorizontal: space.xs },
  label: { color: "#fff", fontWeight: "600" },
});
