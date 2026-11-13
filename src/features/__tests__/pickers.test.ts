import { describe, expect, it } from "vitest";

import { applyPicked, clockParts, dayFromParts, dayParts, iosMinuteInterval, pickedClock, pickerDate } from "../pickers";

describe("clockParts", () => {
  it("découpe les minutes depuis minuit", () => {
    expect(clockParts(0)).toEqual({ hours: 0, minutes: 0 });
    expect(clockParts(8 * 60 + 30)).toEqual({ hours: 8, minutes: 30 });
    expect(clockParts(23 * 60 + 45)).toEqual({ hours: 23, minutes: 45 });
  });
  it("24 h devient minuit pour le sélecteur", () => {
    expect(clockParts(24 * 60)).toEqual({ hours: 0, minutes: 0 });
  });
  it("ne descend pas sous zéro", () => {
    expect(clockParts(-20)).toEqual({ hours: 0, minutes: 0 });
  });
});

describe("pickedClock", () => {
  it("arrondit au pas le plus proche", () => {
    expect(pickedClock(9, 7, 15, 0, 1440)).toBe(9 * 60);
    expect(pickedClock(9, 8, 15, 0, 1440)).toBe(9 * 60 + 15);
    expect(pickedClock(14, 50, 30, 0, 1440)).toBe(15 * 60);
  });
  it("garde la valeur entre min et max", () => {
    expect(pickedClock(0, 0, 15, 15, 1440)).toBe(15);
    expect(pickedClock(23, 59, 15, 0, 23 * 60 + 45)).toBe(23 * 60 + 45);
  });
  it("pas nul : pas d'arrondi", () => {
    expect(pickedClock(10, 7, 0, 0, 1440)).toBe(607);
  });
});

describe("dayParts / dayFromParts", () => {
  it("aller-retour", () => {
    expect(dayParts("2026-11-03")).toEqual({ year: 2026, month: 11, date: 3 });
    expect(dayFromParts(2026, 3, 8)).toBe("2026-03-08");
  });
  it("texte invalide", () => {
    expect(dayParts("3 nov.")).toBeNull();
  });
});

describe("iosMinuteInterval", () => {
  it("garde les pas acceptés par iOS", () => {
    expect(iosMinuteInterval(15)).toBe(15);
    expect(iosMinuteInterval(30)).toBe(30);
  });
  it("sinon 1 minute", () => {
    expect(iosMinuteInterval(45)).toBe(1);
  });
});

describe("pickerDate / applyPicked", () => {
  it("heure : aller-retour avec arrondi au pas", () => {
    let got = -1;
    const spec = { mode: "time" as const, minutes: 8 * 60 + 30, step: 15, min: 0, max: 1440, onPick: (m: number) => (got = m) };
    const d = pickerDate(spec);
    expect([d.getHours(), d.getMinutes()]).toEqual([8, 30]);
    applyPicked(spec, new Date(2000, 0, 1, 10, 52));
    expect(got).toBe(10 * 60 + 45);
  });
  it("date : aller-retour", () => {
    let got = "";
    const spec = { mode: "date" as const, day: "2026-11-03", onPick: (d: string) => (got = d) };
    const d = pickerDate(spec);
    expect([d.getFullYear(), d.getMonth(), d.getDate()]).toEqual([2026, 10, 3]);
    applyPicked(spec, new Date(2027, 0, 9, 12));
    expect(got).toBe("2027-01-09");
  });
});
