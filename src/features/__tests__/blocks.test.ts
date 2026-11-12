import { describe, expect, it } from "vitest";

import { validateBlockForm } from "@/lib/scheduling/weeklyBlocks";

import { editBlockDraft, isEditableSource, newBlockDraft, shiftClock, shiftWeeks } from "../blocks";

const session = { from: "2026-08-24", to: "2026-12-18" };

describe("brouillons de bloc", () => {
  it("un nouveau bloc tombe le jour choisi, chaque semaine de la session, et passe la validation", () => {
    const d = newBlockDraft("2026-11-18", session, null);
    expect(d).toMatchObject({ kind: "weekly", weekdays: [3], date: "2026-11-18", sessionStart: "2026-08-24" });
    const v = validateBlockForm({ ...d, title: "Chimie" });
    expect(v.ok).toBe(true);
    if (v.ok) expect(v.value[0]).toMatchObject({ weekday: 3, startMinute: 510, endMinute: 600 });
  });

  it("reprend un bloc ponctuel existant", () => {
    const d = editBlockDraft(
      { id: "x", title: "Dentiste", placeId: null, startMinute: 600, endMinute: 660, weekday: null, validFrom: "2026-11-20", validUntil: null },
      "2026-11-16",
      session,
    );
    expect(d).toMatchObject({ id: "x", kind: "once", date: "2026-11-20", start: "10:00", end: "11:00" });
    expect(validateBlockForm(d, { single: true }).ok).toBe(true);
  });

  it("reprend une répétition personnalisée", () => {
    const d = editBlockDraft(
      { id: "y", title: "Gym", placeId: null, startMinute: 1080, endMinute: 1140, weekday: null, validFrom: "2026-11-01", validUntil: null, repeatUnit: "day", repeatEvery: 2 },
      "2026-11-16",
      session,
    );
    expect(d).toMatchObject({ kind: "custom", repeatUnit: "day", repeatEvery: "2", repeatEnd: "never" });
  });
});

describe("petits outils", () => {
  it("décale une heure sans sortir des bornes", () => {
    expect(shiftClock("08:30", 15)).toBe("08:45");
    expect(shiftClock("00:15", -30)).toBe("00:00");
    expect(shiftClock("23:30", 60)).toBe("24:00");
    expect(shiftClock("23:30", 60, 0, 23 * 60 + 45)).toBe("23:45");
  });

  it("décale une date par semaines", () => {
    expect(shiftWeeks("2026-12-18", 1)).toBe("2026-12-25");
    expect(shiftWeeks("2026-08-24", -1)).toBe("2026-08-17");
  });

  it("sait quels blocs se modifient ici", () => {
    expect(isEditableSource("manual")).toBe(true);
    expect(isEditableSource("ics")).toBe(true);
    expect(isEditableSource("meetup")).toBe(false);
    expect(isEditableSource("study")).toBe(false);
  });
});
