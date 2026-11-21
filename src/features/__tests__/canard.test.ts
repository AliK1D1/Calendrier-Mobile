import { describe, expect, it } from "vitest";

import {
  countTap,
  DUCK,
  INTRUDERS,
  makeDucks,
  NO_TAPS,
  QUACKS,
  quackMessage,
  rainLength,
  TAP_WINDOW_MS,
  tapHint,
  TAPS_TO_UNLOCK,
  type TapState,
} from "../canard";

/** Hasard reproductible (générateur congruentiel). */
function seeded(seed: number): () => number {
  let s = seed;
  return () => {
    s = (s * 1_664_525 + 1_013_904_223) % 4_294_967_296;
    return s / 4_294_967_296;
  };
}

/** Touche `n` fois, à `gap` ms d'écart. */
function tapTimes(n: number, gap: number, from: TapState = NO_TAPS, start = 10_000) {
  let state = from;
  const results = [];
  for (let i = 0; i < n; i++) {
    const r = countTap(state, start + i * gap);
    state = r.state;
    results.push(r);
  }
  return results;
}

describe("countTap", () => {
  it("débloque au 7e toucher rapide, pas avant", () => {
    const results = tapTimes(TAPS_TO_UNLOCK, 300);
    expect(results.slice(0, -1).every((r) => !r.unlocked)).toBe(true);
    expect(results.map((r) => r.left)).toEqual([6, 5, 4, 3, 2, 1, 0]);
    expect(results.at(-1)?.unlocked).toBe(true);
  });

  it("recommence à zéro après le déblocage", () => {
    const after = tapTimes(TAPS_TO_UNLOCK, 300).at(-1)!.state;
    expect(after).toEqual(NO_TAPS);
    expect(countTap(after, 20_000)).toMatchObject({ unlocked: false, left: TAPS_TO_UNLOCK - 1 });
  });

  it("une pause trop longue remet le compte à un", () => {
    const state = tapTimes(5, 300).at(-1)!.state;
    const r = countTap(state, (state.last ?? 0) + TAP_WINDOW_MS + 1);
    expect(r).toMatchObject({ unlocked: false, left: TAPS_TO_UNLOCK - 1 });
  });

  it("une pause pile à la limite compte encore", () => {
    const state = tapTimes(2, 300).at(-1)!.state;
    expect(countTap(state, (state.last ?? 0) + TAP_WINDOW_MS).left).toBe(TAPS_TO_UNLOCK - 3);
  });

  it("une horloge qui recule ne débloque rien par erreur", () => {
    const state = tapTimes(6, 300).at(-1)!.state;
    expect(countTap(state, (state.last ?? 0) - 1)).toMatchObject({ unlocked: false, left: TAPS_TO_UNLOCK - 1 });
  });
});

describe("tapHint", () => {
  it("rien tant qu'il manque plus de 3 touchers, ni une fois débloqué", () => {
    expect(tapHint(6)).toBeNull();
    expect(tapHint(4)).toBeNull();
    expect(tapHint(0)).toBeNull();
  });

  it("un indice différent pour 3, 2 et 1", () => {
    const hints = [3, 2, 1].map(tapHint);
    expect(hints.every((h) => typeof h === "string" && h.length > 0)).toBe(true);
    expect(new Set(hints).size).toBe(3);
  });
});

describe("quackMessage", () => {
  it("pioche dans les phrases, de la première à la dernière", () => {
    expect(quackMessage(() => 0)).toBe(QUACKS[0]);
    expect(quackMessage(() => 0.999_999)).toBe(QUACKS[QUACKS.length - 1]);
  });

  it("un hasard hors bornes ne plante pas", () => {
    expect(QUACKS).toContain(quackMessage(() => 1));
    expect(QUACKS).toContain(quackMessage(() => -3));
    expect(QUACKS).toContain(quackMessage(() => Number.NaN));
  });
});

describe("makeDucks", () => {
  const width = 390;
  const ducks = makeDucks(200, width, seeded(42));

  it("autant de canards que demandé, chacun son identifiant", () => {
    expect(ducks).toHaveLength(200);
    expect(new Set(ducks.map((d) => d.id)).size).toBe(200);
  });

  it("chaque canard reste dans la largeur de l'écran", () => {
    for (const d of ducks) {
      expect(d.x).toBeGreaterThanOrEqual(0);
      expect(d.x + d.size).toBeLessThanOrEqual(width);
    }
  });

  it("tailles, délais et durées dans les bornes", () => {
    for (const d of ducks) {
      expect(d.size).toBeGreaterThanOrEqual(28);
      expect(d.size).toBeLessThanOrEqual(64);
      expect(d.delay).toBeGreaterThanOrEqual(0);
      expect(d.delay).toBeLessThanOrEqual(900);
      expect(d.duration).toBeGreaterThanOrEqual(1_600);
      expect(d.duration).toBeLessThanOrEqual(2_800);
      expect(Math.abs(d.spin)).toBeLessThanOrEqual(540);
    }
  });

  it("surtout des canards, avec quelques intrus", () => {
    const share = ducks.filter((d) => d.emoji === DUCK).length / ducks.length;
    expect(share).toBeGreaterThan(0.7);
    expect(share).toBeLessThan(1);
    for (const d of ducks) expect([DUCK, ...INTRUDERS]).toContain(d.emoji);
  });

  it("même graine, même pluie", () => {
    expect(makeDucks(20, width, seeded(7))).toEqual(makeDucks(20, width, seeded(7)));
  });

  it("écran plus étroit qu'un canard : collé à gauche, sans position négative", () => {
    for (const d of makeDucks(10, 10, seeded(3))) expect(d.x).toBe(0);
  });
});

describe("rainLength", () => {
  it("le dernier canard qui sort de l'écran", () => {
    const ducks = makeDucks(30, 390, seeded(1));
    expect(rainLength(ducks)).toBe(Math.max(...ducks.map((d) => d.delay + d.duration)));
  });

  it("pas de canard, pas de pluie", () => {
    expect(rainLength([])).toBe(0);
  });
});
