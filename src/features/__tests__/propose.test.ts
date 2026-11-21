import { describe, expect, it } from "vitest";

import type { ProposalView } from "@/lib/meetups/search";
import { validatePropose } from "@/lib/plans/validation";

import { draftFromFreeNow, draftFromProposal, nextDays, repeatOf, shiftStart } from "../propose";

const G = "11111111-1111-4111-8111-111111111111";
const A = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const B = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
const C = "cccccccc-cccc-4ccc-8ccc-cccccccccccc";
const P = "dddddddd-dddd-4ddd-8ddd-dddddddddddd";

const proposal: ProposalView = {
  key: "k",
  kind: "in-person",
  placeId: P,
  placeName: "Café",
  // 18 h à Toronto le 17 novembre 2026 (heure normale, UTC−5).
  start: "2026-11-17T23:00:00.000Z",
  end: "2026-11-18T00:30:00.000Z",
  dayLabel: "mardi 17 novembre",
  timeLabel: "18 h – 19 h 30",
  durationMinutes: 90,
  travel: [],
  score: 1,
};
const opts = {
  groupId: G,
  memberIds: [A, B, C],
  defaultTitle: "On se voit",
  callTitle: "Appel",
  callLocation: "Appel ou visio",
};

describe("draftFromProposal", () => {
  it("reprend le jour, l'heure locale, la durée et le lieu", () => {
    const d = draftFromProposal(proposal, { ...opts, participantIds: [A, B, C] });
    expect(d).toMatchObject({
      groupId: G,
      title: "On se voit",
      date: "2026-11-17",
      start: "18:00",
      durationMinutes: 90,
      placeId: P,
      location: "",
      inviteeIds: null,
    });
    expect(d.fromSlot).toBe("mardi 17 novembre, 18 h – 19 h 30 · Café");
  });

  it("invite seulement les participants choisis s'ils ne sont pas tout le groupe", () => {
    expect(draftFromProposal(proposal, { ...opts, participantIds: [A, B] }).inviteeIds).toEqual([A, B]);
  });

  it("un appel n'a pas de lieu", () => {
    const d = draftFromProposal({ ...proposal, kind: "call", placeId: null, placeName: null }, { ...opts, participantIds: [A, B, C] });
    expect(d).toMatchObject({ title: "Appel", placeId: null, location: "Appel ou visio" });
  });

  it("passe la validation du site", () => {
    const d = draftFromProposal(proposal, { ...opts, participantIds: [A, B] });
    const r = validatePropose(d, new Date("2026-11-16T12:00:00Z"));
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.value.startsAt).toBe("2026-11-17T23:00:00.000Z");
  });
});

describe("choix du moment", () => {
  it("liste les prochains jours", () => {
    expect(nextDays("2026-11-30", 3)).toEqual([
      { day: "2026-11-30", label: "Aujourd'hui" },
      { day: "2026-12-01", label: "Demain" },
      { day: "2026-12-02", label: "mercredi 2 décembre" },
    ]);
  });

  it("déplace l'heure par 15 min sans sortir de la journée", () => {
    expect(shiftStart("18:00", 1)).toBe("18:15");
    expect(shiftStart("18:00", -4)).toBe("17:00");
    expect(shiftStart("00:00", -1)).toBe("00:00");
    expect(shiftStart("23:45", 1)).toBe("23:45");
  });

  it("traduit le choix de répétition", () => {
    expect(repeatOf("none")).toBeNull();
    expect(repeatOf("week1")).toEqual({ unit: "week", every: 1, until: null });
  });
});

describe("draftFromFreeNow", () => {
  const match = {
    personId: B,
    name: "Maya",
    groups: ["Gang"],
    kind: "in-person" as const,
    placeId: P,
    placeName: "Café",
    // 15 h 30 à Toronto le 13 novembre 2026.
    start: "2026-11-13T20:30:00.000Z",
    end: "2026-11-13T21:30:00.000Z",
    timeLabel: "15 h 30 – 16 h 30",
    dayLabel: "vendredi 13 novembre",
    durationMinutes: 60,
    myTravel: 12,
    theirTravel: 8,
  };
  const o = { groupId: G, userId: A, defaultTitle: "On se voit", callTitle: "Appel", callLocation: "Appel ou visio" };

  it("invite seulement moi et cette personne, au lieu trouvé", () => {
    const d = draftFromFreeNow(match, o);
    expect(d).toMatchObject({ groupId: G, title: "On se voit", date: "2026-11-13", start: "15:30", durationMinutes: 60, placeId: P, location: "", inviteeIds: [A, B] });
    expect(d.fromSlot).toBe("vendredi 13 novembre, 15 h 30 – 16 h 30 · Maya · Café");
  });

  it("appel : pas de lieu", () => {
    const d = draftFromFreeNow({ ...match, kind: "call", placeId: null, placeName: null }, o);
    expect(d).toMatchObject({ title: "Appel", placeId: null, location: "Appel ou visio" });
  });
});
