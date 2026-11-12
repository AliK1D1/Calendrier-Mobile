import { describe, expect, it } from "vitest";

import { avatarTone, dateTile, dayOfInstant, defaultDay, initials, namesSummary, weekRangeLabel } from "../display";

describe("initials", () => {
  it("prend la première lettre du premier et du dernier mot", () => {
    expect(initials("Ali Khaldi")).toBe("AK");
    expect(initials("  marie-ève tremblay ")).toBe("MT");
    expect(initials("sam")).toBe("S");
    expect(initials("élodie")).toBe("É");
  });
  it("donne « ? » pour un nom vide", () => {
    expect(initials("   ")).toBe("?");
  });
});

describe("avatarTone", () => {
  it("reste la même pour le même nom, sans tenir compte de la casse", () => {
    expect(avatarTone("Ali")).toBe(avatarTone(" ali "));
  });
  it("va de 1 à 7", () => {
    for (const n of ["Ali", "Sam", "Léa", "Noah", "Jade", "Zoé", "Max", "", "Équipe de soccer"]) {
      expect(avatarTone(n)).toBeGreaterThanOrEqual(1);
      expect(avatarTone(n)).toBeLessThanOrEqual(7);
    }
  });
});

describe("dateTile", () => {
  it("donne le jour de semaine, le numéro et le mois abrégés", () => {
    expect(dateTile("2026-11-16")).toEqual({ weekday: "lun.", day: "16", month: "nov." });
    expect(dateTile("2027-03-07")).toEqual({ weekday: "dim.", day: "7", month: "mars" });
  });
});

describe("dayOfInstant", () => {
  it("donne le jour à Montréal, pas le jour UTC", () => {
    expect(dayOfInstant("2026-11-17T01:30:00Z")).toBe("2026-11-16");
    expect(dayOfInstant("2026-11-16T17:00:00Z")).toBe("2026-11-16");
  });
  it("tient compte de l'heure avancée", () => {
    // 3 h 30 UTC le 2 juillet = 23 h 30 le 1er juillet (UTC−4).
    expect(dayOfInstant("2026-07-02T03:30:00Z")).toBe("2026-07-01");
  });
});

describe("weekRangeLabel", () => {
  it("écrit le mois une seule fois dans le même mois", () => {
    expect(weekRangeLabel("2026-11-16")).toBe("16 – 22 nov.");
  });
  it("écrit les deux mois quand la semaine en chevauche deux", () => {
    expect(weekRangeLabel("2026-11-30")).toBe("30 nov. – 6 déc.");
    expect(weekRangeLabel("2026-12-28")).toBe("28 déc. – 3 janv.");
  });
  it("écrit « 1er »", () => {
    expect(weekRangeLabel("2026-05-25")).toBe("25 – 31 mai");
    expect(weekRangeLabel("2026-06-01")).toBe("1er – 7 juin");
  });
});

describe("defaultDay", () => {
  const week = ["2026-11-16", "2026-11-17", "2026-11-18"];
  it("choisit aujourd'hui s'il est dans la semaine", () => {
    expect(defaultDay(week, "2026-11-17")).toBe("2026-11-17");
  });
  it("sinon le premier jour", () => {
    expect(defaultDay(week, "2026-11-30")).toBe("2026-11-16");
  });
});

describe("namesSummary", () => {
  it("résume une liste de noms", () => {
    expect(namesSummary([])).toBe("");
    expect(namesSummary(["Ali"])).toBe("Ali");
    expect(namesSummary(["Ali", "Sam"])).toBe("Ali et Sam");
    expect(namesSummary(["Ali", "Sam", "Léa"])).toBe("Ali, Sam et 1 autre");
    expect(namesSummary(["Ali", "Sam", "Léa", "Max"])).toBe("Ali, Sam et 2 autres");
    expect(namesSummary(["Ali", "Sam", "Léa"], 3)).toBe("Ali, Sam et Léa");
  });
});
