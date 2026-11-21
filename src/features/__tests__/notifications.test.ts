import { describe, expect, it } from "vitest";

import {
  estJetonExpo,
  idProjetExpo,
  libelleRappel,
  lireRappel,
  MAX_RAPPELS,
  type PlanPourRappel,
  plateformePush,
  pushPossible,
  rappelsDesPlans,
  routeDeNotification,
} from "../notifications";

const PROJET = "0b6c3a51-8f6e-4a43-9d3f-2a8c1e5b7d90";

describe("estJetonExpo", () => {
  it("accepte les deux formes de jeton Expo, comme la BD", () => {
    expect(estJetonExpo("ExponentPushToken[abc_DEF-123]")).toBe(true);
    expect(estJetonExpo("ExpoPushToken[abc]")).toBe(true);
  });
  it("refuse le reste", () => {
    for (const v of ["", "abc", "ExponentPushToken[]", "ExponentPushToken[a b]", null, 3, `ExpoPushToken[${"a".repeat(200)}]`]) {
      expect(estJetonExpo(v)).toBe(false);
    }
  });
});

describe("plateformePush", () => {
  it("iOS et Android seulement", () => {
    expect(plateformePush("ios")).toBe("ios");
    expect(plateformePush("android")).toBe("android");
    expect(plateformePush("web")).toBeNull();
  });
});

describe("idProjetExpo", () => {
  it("lit extra.eas.projectId, sinon easConfig.projectId", () => {
    expect(idProjetExpo({ extra: { eas: { projectId: PROJET } } }, null)).toBe(PROJET);
    expect(idProjetExpo({ extra: {} }, { projectId: PROJET })).toBe(PROJET);
  });
  it("donne null si absent ou mal formé", () => {
    expect(idProjetExpo(null, undefined)).toBeNull();
    expect(idProjetExpo({ extra: { eas: { projectId: "à remplir" } } }, null)).toBeNull();
  });
});

describe("pushPossible", () => {
  it("demande un téléphone, pas Expo Go sur Android, et l'identifiant du projet", () => {
    expect(pushPossible({ os: "web", expoGo: false, projectId: PROJET })).toEqual({ ok: false, raison: "web" });
    expect(pushPossible({ os: "android", expoGo: true, projectId: PROJET })).toEqual({ ok: false, raison: "expo-go-android" });
    expect(pushPossible({ os: "ios", expoGo: false, projectId: null })).toEqual({ ok: false, raison: "projet-absent" });
    expect(pushPossible({ os: "ios", expoGo: true, projectId: PROJET })).toEqual({ ok: true, projectId: PROJET });
    expect(pushPossible({ os: "android", expoGo: false, projectId: PROJET })).toEqual({ ok: true, projectId: PROJET });
  });
});

describe("routeDeNotification", () => {
  it("ouvre seulement les écrans prévus", () => {
    expect(routeDeNotification({ url: "/plans" })).toBe("/plans");
    expect(routeDeNotification({ url: "/groupe/0b6c3a51-8f6e-4a43-9d3f-2a8c1e5b7d90" })).toBe(
      "/groupe/0b6c3a51-8f6e-4a43-9d3f-2a8c1e5b7d90",
    );
  });
  it("ignore une adresse inconnue ou piégée", () => {
    for (const data of [null, {}, { url: "https://exemple.com" }, { url: "/groupe/../profil" }, { url: "/groupe/abc" }, { url: 3 }]) {
      expect(routeDeNotification(data)).toBeNull();
    }
  });
});

describe("lireRappel et libelleRappel", () => {
  it("garde un choix connu, sinon 30 min", () => {
    expect(lireRappel("15")).toBe(15);
    expect(lireRappel(0)).toBe(0);
    expect(lireRappel("45")).toBe(30);
    expect(lireRappel(null)).toBe(30);
  });
  it("écrit le délai", () => {
    expect(libelleRappel(0)).toBe("Aucun");
    expect(libelleRappel(15)).toBe("15 min");
    expect(libelleRappel(60)).toBe("1 h");
    expect(libelleRappel(120)).toBe("2 h");
  });
});

describe("rappelsDesPlans", () => {
  const now = new Date("2026-11-12T20:00:00Z"); // 15 h à Montréal
  const plan = (p: Partial<PlanPourRappel>): PlanPourRappel => ({
    id: "p1",
    title: "Cinéma",
    startsAt: "2026-11-13T23:30:00Z", // vendredi 18 h 30 à Montréal
    where: "Quartier latin",
    state: "upcoming",
    isMine: false,
    myResponse: "yes",
    ...p,
  });

  it("programme un rappel avant un plan accepté, à l'heure de Montréal", () => {
    const [r] = rappelsDesPlans([plan({})], now, 30);
    expect(r.at.toISOString()).toBe("2026-11-13T23:00:00.000Z");
    expect(r.title).toBe("Cinéma, dans 30 min");
    expect(r.body).toBe("À 18 h 30 · Quartier latin");
    expect(r.data).toEqual({ url: "/plans", planId: "p1", kind: "rappel" });
    expect(r.id).toBe(`rappel-p1-${Date.parse("2026-11-13T23:30:00Z")}`);
  });

  it("garde l'heure juste après le passage à l'heure normale (1er novembre)", () => {
    const [r] = rappelsDesPlans([plan({ startsAt: "2026-11-14T00:00:00Z", where: "" })], now, 60);
    expect(r.body).toBe("À 19 h");
    expect(r.title).toBe("Cinéma, dans 1 h");
  });

  it("ma proposition compte ; un plan refusé, en attente, annulé ou passé non", () => {
    const r = rappelsDesPlans(
      [
        plan({ id: "a", isMine: true, myResponse: null }),
        plan({ id: "b", myResponse: "no" }),
        plan({ id: "c", myResponse: null }),
        plan({ id: "d", state: "cancelled" }),
        plan({ id: "e", state: "past" }),
      ],
      now,
      15,
    );
    expect(r.map((x) => x.data.planId)).toEqual(["a"]);
  });

  it("rien si le rappel est déjà passé, trop loin, ou si on n'en veut pas", () => {
    expect(rappelsDesPlans([plan({ startsAt: "2026-11-12T20:10:00Z" })], now, 15)).toEqual([]);
    expect(rappelsDesPlans([plan({ startsAt: "2026-12-12T20:00:00Z" })], now, 15)).toEqual([]);
    expect(rappelsDesPlans([plan({ startsAt: "pas une date" })], now, 15)).toEqual([]);
    expect(rappelsDesPlans([plan({})], now, 0)).toEqual([]);
  });

  it("trie par heure et en garde au plus 20", () => {
    const plans = Array.from({ length: 25 }, (_, i) =>
      plan({ id: `p${i}`, startsAt: new Date(now.getTime() + (25 - i) * 3_600_000 + 7_200_000).toISOString() }),
    );
    const r = rappelsDesPlans(plans, now, 30);
    expect(r).toHaveLength(MAX_RAPPELS);
    expect(r[0].data.planId).toBe("p24");
    expect(r.every((x, i) => i === 0 || x.at >= r[i - 1].at)).toBe(true);
  });
});
