import { describe, expect, it } from "vitest";

import type { SessionView } from "@/lib/study/service";
import { validateSessionList } from "@/lib/study/validation";

import { sessionInput } from "../study";

describe("sessionInput", () => {
  it("donne une séance que la validation du site accepte", () => {
    const view: SessionView = {
      key: "abc-1",
      deadlineId: "11111111-1111-4111-8111-111111111111",
      replacesId: null,
      kind: "study",
      title: "Étude : Chimie",
      start: "2026-11-17T15:00:00.000Z",
      end: "2026-11-17T16:00:00.000Z",
      day: "2026-11-17",
      startMinute: 600,
      endMinute: 660,
      placeId: "22222222-2222-4222-8222-222222222222",
      placeName: "Maison",
      label: "mardi 17 novembre, 10 h à 11 h",
    };
    const r = validateSessionList([sessionInput(view)]);
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.value[0].start.toISOString()).toBe(view.start);
  });
});
