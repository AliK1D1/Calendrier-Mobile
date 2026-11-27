import { describe, expect, it } from "vitest";

import { formatPosition, isMagicWord, MAGIC_WORD, QUEUE_MS, queueAt, START_POSITION } from "../fileAttente";

describe("isMagicWord", () => {
  it("reconnaît le mot, peu importe les majuscules et les espaces autour", () => {
    expect(isMagicWord(MAGIC_WORD)).toBe(true);
    expect(isMagicWord("Omnivox")).toBe(true);
    expect(isMagicWord("  OMNIVOX ")).toBe(true);
  });

  it("rien d'autre ne compte", () => {
    expect(isMagicWord("")).toBe(false);
    expect(isMagicWord("omnivo")).toBe(false);
    expect(isMagicWord("omnivox 2")).toBe(false);
    expect(isMagicWord("mon omnivox")).toBe(false);
  });
});

describe("queueAt", () => {
  /** Positions relevées toutes les 100 ms pendant l'étape `step`. */
  function positionsOf(step: number): number[] {
    const out: number[] = [];
    for (let t = 0; t < QUEUE_MS; t += 100) {
      const f = queueAt(t);
      if (f.step === step && f.position !== null) out.push(f.position);
    }
    return out;
  }

  it("commence au fond de la file", () => {
    expect(queueAt(0)).toMatchObject({ step: 0, position: START_POSITION, tone: "wait", progress: 0, done: false });
  });

  it("la position descend d'abord, vite", () => {
    const p = positionsOf(0);
    expect(p.length).toBeGreaterThan(10);
    for (let i = 1; i < p.length; i++) expect(p[i]).toBeLessThanOrEqual(p[i - 1]);
    expect(p.at(-1)).toBeLessThan(100);
  });

  it("puis on se fait dépasser : la position remonte et la barre recule", () => {
    const p = positionsOf(1);
    for (let i = 1; i < p.length; i++) expect(p[i]).toBeGreaterThanOrEqual(p[i - 1]);
    expect(p.at(-1)).toBeGreaterThan(p[0]);
    expect(queueAt(3_700).tone).toBe("bad");
    expect(queueAt(3_700).progress).toBeLessThan(queueAt(2_300).progress);
  });

  it("reste coincé à 2 un bon moment", () => {
    const p = positionsOf(3);
    expect(p.length).toBeGreaterThan(5);
    expect(new Set(p)).toEqual(new Set([2]));
  });

  it("arrive à 1, puis la session expire", () => {
    expect(queueAt(7_500)).toMatchObject({ position: 1, tone: "good", progress: 1 });
    expect(queueAt(9_000)).toMatchObject({ position: null, tone: "bad", progress: 0, done: false });
  });

  it("finit sur la chute, puis se ferme", () => {
    expect(queueAt(QUEUE_MS - 1)).toMatchObject({ position: null, tone: "good", progress: 1, done: false });
    expect(queueAt(QUEUE_MS).done).toBe(true);
    expect(queueAt(QUEUE_MS * 10).done).toBe(true);
  });

  it("les étapes se suivent dans l'ordre, sans en sauter", () => {
    const steps: number[] = [];
    for (let t = 0; t <= QUEUE_MS; t += 50) {
      const s = queueAt(t).step;
      if (steps.at(-1) !== s) steps.push(s);
    }
    expect(steps).toEqual([0, 1, 2, 3, 4, 5, 6]);
  });

  it("la barre reste entre 0 et 1, et il y a toujours un texte", () => {
    for (let t = 0; t <= QUEUE_MS; t += 50) {
      const f = queueAt(t);
      expect(f.progress).toBeGreaterThanOrEqual(0);
      expect(f.progress).toBeLessThanOrEqual(1);
      expect(f.text.length).toBeGreaterThan(0);
    }
  });

  it("une horloge bizarre ne plante pas", () => {
    expect(queueAt(-500)).toEqual(queueAt(0));
    expect(queueAt(Number.NaN)).toEqual(queueAt(0));
  });
});

describe("formatPosition", () => {
  it("sépare les milliers par une espace fine insécable", () => {
    expect(formatPosition(4_812)).toBe("4 812");
    expect(formatPosition(1_234_567)).toBe("1 234 567");
  });

  it("laisse les petits nombres tels quels", () => {
    expect(formatPosition(2)).toBe("2");
    expect(formatPosition(214)).toBe("214");
  });
});
