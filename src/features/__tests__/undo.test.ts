import { describe, expect, it } from "vitest";

import { toggled, UNDO_MS, withoutHidden } from "../undo";

describe("withoutHidden", () => {
  const rows = [{ id: "a" }, { id: "b" }, { id: "c" }];
  it("retire les éléments cachés", () => {
    expect(withoutHidden(rows, new Set(["b"]), (r) => r.id)).toEqual([{ id: "a" }, { id: "c" }]);
  });
  it("rien de caché : copie de la liste", () => {
    const out = withoutHidden(rows, new Set(), (r) => r.id);
    expect(out).toEqual(rows);
    expect(out).not.toBe(rows);
  });
});

describe("toggled", () => {
  it("ajoute et retire sans toucher l'original", () => {
    const start = new Set(["a"]);
    const added = toggled(start, "b", true);
    expect([...added].sort()).toEqual(["a", "b"]);
    expect([...toggled(added, "a", false)]).toEqual(["b"]);
    expect([...start]).toEqual(["a"]);
  });
});

describe("UNDO_MS", () => {
  it("laisse le temps de réagir", () => {
    expect(UNDO_MS).toBeGreaterThanOrEqual(4_000);
  });
});
