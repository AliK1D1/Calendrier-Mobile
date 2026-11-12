import { describe, expect, it } from "vitest";

import type { BusyBlockInput } from "@/lib/db/convert";

import { dayLabelFr, mondayOf, weekAgenda } from "../agenda";

function row(over: Partial<BusyBlockInput> & { id: string }): BusyBlockInput {
  return {
    owner_id: "moi",
    title: "Chimie",
    place_id: null,
    start_time: "08:30:00",
    end_time: "10:20:00",
    weekday: 1,
    valid_from: "2026-08-24",
    valid_until: "2026-12-18",
    ...over,
  };
}

describe("weekAgenda", () => {
  it("donne les 7 jours du lundi au dimanche, avec aujourd'hui marqué", () => {
    const days = weekAgenda([], "2026-11-16", "2026-11-18");
    expect(days.map((d) => d.day)).toEqual([
      "2026-11-16", "2026-11-17", "2026-11-18", "2026-11-19",
      "2026-11-20", "2026-11-21", "2026-11-22",
    ]);
    expect(days.filter((d) => d.isToday).map((d) => d.day)).toEqual(["2026-11-18"]);
    expect(days[0].label).toBe("lundi 16 novembre");
  });

  it("place un cours hebdomadaire sur son jour et trie par heure", () => {
    const days = weekAgenda(
      [
        row({ id: "b", title: "Philo", start_time: "13:00:00", end_time: "14:50:00" }),
        row({ id: "a" }),
      ],
      "2026-11-16",
      "2026-11-16",
    );
    expect(days[0].items.map((i) => i.title)).toEqual(["Chimie", "Philo"]);
    expect(days[0].items[0].timeLabel).toBe("8 h 30 – 10 h 20");
    expect(days.slice(1).every((d) => d.items.length === 0)).toBe(true);
  });

  it("respecte le cours annulé cette fois-ci et la fin de session", () => {
    const skipped = weekAgenda([row({ id: "a", skip_days: ["2026-11-16"] })], "2026-11-16", "2026-11-16");
    expect(skipped[0].items.map((i) => i.skipped)).toEqual([true]);
    const next = weekAgenda([row({ id: "a", skip_days: ["2026-11-16"] })], "2026-11-23", "2026-11-16");
    expect(next[0].items.map((i) => i.skipped)).toEqual([false]);
    const after = weekAgenda([row({ id: "a" })], "2026-12-21", "2026-12-21");
    expect(after[0].items).toEqual([]);
  });

  it("montre un bloc ponctuel seulement son jour", () => {
    const days = weekAgenda(
      [row({ id: "p", title: "Dentiste", weekday: null, valid_from: "2026-11-19", valid_until: null })],
      "2026-11-16",
      "2026-11-16",
    );
    expect(days.map((d) => d.items.length)).toEqual([0, 0, 0, 1, 0, 0, 0]);
  });
});

describe("dates", () => {
  it("trouve le lundi de la semaine, même autour du changement d'heure", () => {
    expect(mondayOf("2026-11-01", 0)).toBe("2026-10-26");
    expect(mondayOf("2026-11-01", 1)).toBe("2026-11-02");
    expect(mondayOf("2026-03-08", -1)).toBe("2026-02-23");
  });

  it("écrit le 1er du mois", () => {
    expect(dayLabelFr("2026-12-01")).toBe("mardi 1er décembre");
  });
});
