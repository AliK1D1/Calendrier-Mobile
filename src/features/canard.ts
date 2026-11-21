/**
 * « Mode canard » : l'œuf de Pâques de l'app. Toucher 7 fois de suite le numéro de version en
 * bas de Profil fait pleuvoir des canards sur tout l'écran. Fonctions pures (testées) : le
 * compte des touchers, les petites phrases et la position de chaque canard. Le hasard est
 * injecté (`rand`, comme `Math.random`) pour que les tests soient reproductibles.
 */

/** Touchers d'affilée pour débloquer le mode canard. */
export const TAPS_TO_UNLOCK = 7;

/** Plus long que ça entre deux touchers : on recommence à compter. */
export const TAP_WINDOW_MS = 1_500;

/** Nombre de canards (et d'intrus) dans une pluie. */
export const DUCK_COUNT = 36;

/** Durée d'apparition du canard géant au centre. */
export const BIG_DUCK_MS = 2_400;

export interface TapState {
  /** Touchers comptés jusqu'ici. */
  count: number;
  /** Moment (ms) du dernier toucher, ou `null`. */
  last: number | null;
}

export const NO_TAPS: TapState = { count: 0, last: null };

export interface TapResult {
  state: TapState;
  /** Vrai au 7e toucher : place aux canards. Le compte repart alors de zéro. */
  unlocked: boolean;
  /** Touchers qui manquent encore (0 quand c'est débloqué). */
  left: number;
}

/** Compte un toucher fait au moment `now` (ms). */
export function countTap(state: TapState, now: number): TapResult {
  const fresh = state.last === null || now - state.last > TAP_WINDOW_MS || now < state.last;
  const count = (fresh ? 0 : state.count) + 1;
  if (count >= TAPS_TO_UNLOCK) return { state: NO_TAPS, unlocked: true, left: 0 };
  return { state: { count, last: now }, unlocked: false, left: TAPS_TO_UNLOCK - count };
}

const HINTS: Record<number, string> = {
  3: "Hmm ? Il se passe quelque chose…",
  2: "Continue. Les canards s'approchent.",
  1: "Encore une fois. Il n'y aura pas de retour en arrière.",
};

/** Indice quand il manque 3 touchers ou moins (rien avant, pour garder la surprise). */
export function tapHint(left: number): string | null {
  return HINTS[left] ?? null;
}

export const QUACKS = [
  "Mode canard activé. Tes amis ne sont pas prêts.",
  "Coin coin. Ton horaire est maintenant 40 % plus aérodynamique.",
  "Bravo, tu as trouvé le canard. Le canard t'a trouvé aussi.",
  "Freecrew est maintenant propulsé par des canards. Ne pose pas de questions.",
  "Aucun cours n'a été annulé. Des canards, par contre…",
  "Coin. (En canard, ça veut dire « t'es libre jeudi ? ».)",
  "Les canards ont voté : tu es libre ce soir.",
] as const;

/** Une phrase au hasard pour le bandeau. */
export function quackMessage(rand: () => number): string {
  return QUACKS[pickIndex(QUACKS.length, rand)];
}

/** Ce qui tombe : surtout des canards, parfois un intrus. */
export const DUCK = "🦆";
export const INTRUDERS = ["🍁", "🍟", "🧀", "🥞"] as const;

/** Part des intrus dans la pluie. */
const INTRUDER_SHARE = 0.15;

export interface Duck {
  id: number;
  emoji: string;
  /** Position de départ, depuis la gauche de l'écran (points). */
  x: number;
  /** Taille de l'émoji (points). */
  size: number;
  /** Attente avant de tomber (ms). */
  delay: number;
  /** Temps de la chute, du haut au bas de l'écran (ms). */
  duration: number;
  /** Tours sur lui-même pendant la chute (degrés, négatif = sens inverse). */
  spin: number;
  /** Amplitude du dandinement de gauche à droite (points). */
  sway: number;
  /** Nombre d'allers-retours du dandinement pendant la chute. */
  wiggles: number;
  /** Regarde vers la droite plutôt que vers la gauche. */
  flip: boolean;
}

const between = (min: number, max: number, rand: () => number) => min + (max - min) * clamp01(rand());

/** Une pluie de `count` canards sur un écran de `width` points de large. */
export function makeDucks(count: number, width: number, rand: () => number): Duck[] {
  const ducks: Duck[] = [];
  for (let id = 0; id < count; id++) {
    const intruder = clamp01(rand()) < INTRUDER_SHARE;
    const size = Math.round(between(28, 64, rand));
    ducks.push({
      id,
      emoji: intruder ? INTRUDERS[pickIndex(INTRUDERS.length, rand)] : DUCK,
      x: Math.round(between(0, Math.max(0, width - size), rand)),
      size,
      delay: Math.round(between(0, 900, rand)),
      duration: Math.round(between(1_600, 2_800, rand)),
      spin: Math.round(between(-540, 540, rand)),
      sway: Math.round(between(10, 40, rand)),
      wiggles: Math.round(between(1, 3, rand)),
      flip: clamp01(rand()) < 0.5,
    });
  }
  return ducks;
}

/** Temps avant que le dernier canard soit sorti de l'écran (ms). */
export function rainLength(ducks: readonly Duck[]): number {
  return ducks.reduce((max, d) => Math.max(max, d.delay + d.duration), 0);
}

function clamp01(n: number): number {
  if (!Number.isFinite(n) || n < 0) return 0;
  return n >= 1 ? 0.999_999 : n;
}

function pickIndex(length: number, rand: () => number): number {
  return Math.floor(clamp01(rand()) * length);
}
