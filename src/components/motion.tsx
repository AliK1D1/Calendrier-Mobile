/**
 * Animations de l'interface (Reanimated). Toutes suivent le réglage « Réduire les animations »
 * du téléphone (`ReduceMotion.System`) : s'il est activé, les éléments apparaissent tout de
 * suite, sans glisser ni rebondir.
 *
 * - `Appear` : un élément arrive en fondu en montant un peu ; dans une liste, en cascade.
 * - `Reveal` : un bloc qui s'ouvre (formulaire replié, message).
 * - `Swap` : un contenu remplacé par un autre (le jour choisi dans l'horaire).
 * - `PressScale` : un élément qui s'enfonce légèrement sous le doigt.
 */
import { useEffect, type ReactNode } from "react";
import { Pressable, type PressableProps, type StyleProp, type ViewStyle } from "react-native";
import Animated, {
  Easing,
  ReduceMotion,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSpring,
  withTiming,
} from "react-native-reanimated";

import { APPEAR_MS, staggerDelay } from "@/features/display";

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

const EASE = Easing.out(Easing.cubic);
const SYSTEM = ReduceMotion.System;

/**
 * Fondu + léger glissement joués une fois, à l'arrivée de l'élément. Fait avec des valeurs
 * partagées plutôt qu'avec la prop `entering` de Reanimated : celle-ci sort l'élément du flux
 * (position absolue) quand la fenêtre change de taille sur le web.
 */
function useEnter(fromY: number, duration: number, delay: number) {
  const shown = useSharedValue(0);
  useEffect(() => {
    shown.value = withDelay(delay, withTiming(1, { duration, easing: EASE, reduceMotion: SYSTEM }));
  }, [shown, delay, duration]);
  return useAnimatedStyle(() => ({
    opacity: shown.value,
    transform: [{ translateY: fromY * (1 - shown.value) }],
  }));
}

type BoxProps = { children: ReactNode; style?: StyleProp<ViewStyle> };

/** Apparition en fondu, en montant de quelques points. `index` : rang dans une liste. */
export function Appear({ children, index = 0, style }: BoxProps & { index?: number }) {
  const enter = useEnter(12, APPEAR_MS, staggerDelay(index));
  return <Animated.View style={[style, enter]}>{children}</Animated.View>;
}

/** Bloc qui s'ouvre en fondu, en descendant un peu (formulaire replié, message). */
export function Reveal({ children, style }: BoxProps) {
  const enter = useEnter(-8, 220, 0);
  return <Animated.View style={[style, enter]}>{children}</Animated.View>;
}

/** Contenu remplacé : donner une `key` différente à chaque contenu pour rejouer le fondu. */
export function Swap({ children, style }: BoxProps) {
  const enter = useEnter(0, 200, 0);
  return <Animated.View style={[style, enter]}>{children}</Animated.View>;
}

/**
 * `Pressable` qui rétrécit un peu sous le doigt et revient avec un petit ressort, comme les
 * boutons d'iOS. Sur Android, l'onde Material reste (prop `android_ripple`), avec le même
 * léger enfoncement.
 */
export function PressScale({
  children,
  style,
  to = 0.97,
  dim = 1,
  onPressIn,
  onPressOut,
  ...rest
}: Omit<PressableProps, "style" | "children"> & {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  /** Échelle quand on appuie. */
  to?: number;
  /** Opacité quand on appuie (1 = inchangée). */
  dim?: number;
}) {
  const pressed = useSharedValue(0);
  const animated = useAnimatedStyle(() => ({
    transform: [{ scale: 1 + (to - 1) * pressed.value }],
    opacity: 1 + (dim - 1) * pressed.value,
  }));
  return (
    <AnimatedPressable
      {...rest}
      onPressIn={(e) => {
        pressed.value = withTiming(1, { duration: 90, easing: EASE, reduceMotion: SYSTEM });
        onPressIn?.(e);
      }}
      onPressOut={(e) => {
        pressed.value = withSpring(0, { damping: 16, stiffness: 260, mass: 0.6, reduceMotion: SYSTEM });
        onPressOut?.(e);
      }}
      style={[style, animated]}
    >
      {children}
    </AnimatedPressable>
  );
}
