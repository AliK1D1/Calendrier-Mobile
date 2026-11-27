/**
 * « Mode canard » (œuf de Pâques, voir `src/features/canard.ts`) : une pluie de canards
 * par-dessus toute l'app, et un canard géant au centre qui fait « COIN COIN ! ». La pluie
 * laisse passer les doigts : on peut continuer à utiliser l'app pendant qu'il pleut.
 *
 * Avec « Réduire les animations » sur le téléphone : pas de pluie, seulement le canard géant
 * qui apparaît et disparaît en fondu.
 *
 * `useDuckRain()` renvoie la fonction qui déclenche la pluie (relancée si elle est rappelée).
 */
import { createContext, type ReactNode, useCallback, useContext, useEffect, useRef, useState } from "react";
import { StyleSheet, Text, useWindowDimensions, View } from "react-native";
import Animated, {
  Easing,
  ReduceMotion,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
} from "react-native-reanimated";

import { BIG_DUCK_MS, DUCK, DUCK_COUNT, type Duck, makeDucks, rainLength } from "@/features/canard";
import { space } from "@/theme/colors";
import { shape } from "@/theme/tokens";
import { usePalette } from "@/theme/use-palette";

type Rain = { id: number; ducks: Duck[] };

const DuckRainContext = createContext<(() => void) | null>(null);

export function useDuckRain(): () => void {
  const rain = useContext(DuckRainContext);
  if (!rain) throw new Error("useDuckRain doit être dans <DuckRainProvider>.");
  return rain;
}

export function DuckRainProvider({ children }: { children: ReactNode }) {
  const [rain, setRain] = useState<Rain | null>(null);
  const { width } = useWindowDimensions();
  const reduced = useReducedMotion();
  const nextId = useRef(1);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const start = useCallback(() => {
    if (timer.current) clearTimeout(timer.current);
    const ducks = reduced ? [] : makeDucks(DUCK_COUNT, width, Math.random);
    setRain({ id: nextId.current++, ducks });
    timer.current = setTimeout(() => setRain(null), Math.max(rainLength(ducks), BIG_DUCK_MS) + 150);
  }, [reduced, width]);

  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );

  return (
    <DuckRainContext.Provider value={start}>
      {children}
      {rain ? <Overlay key={rain.id} ducks={rain.ducks} reduced={reduced} /> : null}
    </DuckRainContext.Provider>
  );
}

function Overlay({ ducks, reduced }: { ducks: readonly Duck[]; reduced: boolean }) {
  const { height } = useWindowDimensions();
  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={[StyleSheet.absoluteFill, styles.overlay]}
    >
      {ducks.map((d) => (
        <FallingDuck key={d.id} duck={d} height={height} />
      ))}
      <BigDuck reduced={reduced} />
    </View>
  );
}

/** Un canard qui tombe en tournant et en se dandinant. */
function FallingDuck({ duck, height }: { duck: Duck; height: number }) {
  const fall = useSharedValue(0);
  useEffect(() => {
    // La pluie n'existe pas quand « Réduire les animations » est activé (voir le fournisseur).
    fall.value = withDelay(duck.delay, withTiming(1, { duration: duck.duration, easing: Easing.linear, reduceMotion: ReduceMotion.Never }));
  }, [fall, duck]);
  const { size, x, sway, wiggles, spin, flip } = duck;
  const style = useAnimatedStyle(() => {
    const p = fall.value;
    return {
      opacity: p > 0 ? 1 : 0,
      transform: [
        { translateX: x + sway * Math.sin(p * Math.PI * 2 * wiggles) },
        { translateY: -size * 1.5 + (height + size * 3) * p },
        { rotate: `${spin * p}deg` },
        { scaleX: flip ? -1 : 1 },
      ],
    };
  });
  return (
    <Animated.Text allowFontScaling={false} style={[styles.falling, { fontSize: size, lineHeight: size * 1.25 }, style]}>
      {duck.emoji}
    </Animated.Text>
  );
}

/** Le canard géant : il surgit en rebondissant, se dandine, crie, puis s'efface. */
function BigDuck({ reduced }: { reduced: boolean }) {
  const c = usePalette();
  const pop = useSharedValue(reduced ? 1 : 0);
  const wobble = useSharedValue(0);
  const shown = useSharedValue(reduced ? 0 : 1);

  useEffect(() => {
    const fadeOut = withTiming(0, { duration: 400, reduceMotion: ReduceMotion.Never });
    if (reduced) {
      // Un fondu, sans mouvement.
      shown.value = withSequence(
        withTiming(1, { duration: 250, reduceMotion: ReduceMotion.Never }),
        withDelay(BIG_DUCK_MS - 650, fadeOut),
      );
      return;
    }
    pop.value = withSpring(1, { damping: 5, stiffness: 180, mass: 0.7 });
    wobble.value = withSequence(
      withTiming(-1, { duration: 110 }),
      withRepeat(withTiming(1, { duration: 220, easing: Easing.inOut(Easing.quad) }), 6, true),
      withTiming(0, { duration: 110 }),
    );
    shown.value = withDelay(BIG_DUCK_MS - 400, fadeOut);
  }, [reduced, pop, wobble, shown]);

  const duckStyle = useAnimatedStyle(() => ({
    opacity: shown.value,
    transform: [{ scale: pop.value }, { rotate: `${wobble.value * 14}deg` }],
  }));

  return (
    <View style={styles.center}>
      <Animated.View style={[styles.bigDuck, duckStyle]}>
        <View style={[styles.bubble, { backgroundColor: c.text }]}>
          <Text allowFontScaling={false} style={[styles.quack, { color: c.background }]}>
            COIN COIN !
          </Text>
        </View>
        <Text allowFontScaling={false} style={styles.bigEmoji}>
          {DUCK}
        </Text>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: { pointerEvents: "none", overflow: "hidden" },
  falling: { position: "absolute", top: 0, left: 0 },
  center: { position: "absolute", top: 0, right: 0, bottom: 0, left: 0, alignItems: "center", justifyContent: "center" },
  bigDuck: { alignItems: "center", gap: space.xs },
  bubble: {
    paddingHorizontal: space.lg,
    paddingVertical: space.sm,
    borderRadius: shape.card,
    shadowColor: "#000",
    shadowOpacity: 0.25,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
  quack: { fontSize: 26, lineHeight: 32, fontWeight: "900", letterSpacing: 1 },
  bigEmoji: { fontSize: 150, lineHeight: 180 },
});
