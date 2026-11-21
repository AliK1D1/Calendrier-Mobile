import { describe, expect, it } from "vitest";

import { parseSeen, serializeSeen, TIPS } from "../tips";

describe("astuces vues", () => {
  it("rien de gardé : aucune astuce vue", () => {
    expect(parseSeen(null).size).toBe(0);
    expect(parseSeen("").size).toBe(0);
  });
  it("lit les astuces connues et ignore les autres", () => {
    expect([...parseSeen("swipePlan, inconnue,pickTime")].sort()).toEqual(["pickTime", "swipePlan"]);
  });
  it("aller-retour stable", () => {
    const seen = parseSeen("swipeBlock,pickTime");
    expect(serializeSeen(seen)).toBe("pickTime,swipeBlock");
    expect(parseSeen(serializeSeen(seen))).toEqual(seen);
  });
  it("chaque astuce a un titre et un texte en français", () => {
    for (const tip of Object.values(TIPS)) {
      expect(tip.title.length).toBeGreaterThan(0);
      expect(tip.text.length).toBeGreaterThan(20);
    }
  });
});
