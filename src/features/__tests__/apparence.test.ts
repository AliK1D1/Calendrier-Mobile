import { describe, expect, it } from "vitest";

import { ACCENTS } from "@/lib/ux/apparence";

import {
  ACCENT_APPAREIL,
  accentParDefaut,
  couleurJour,
  couleurPastille,
  jourDeSemaine,
  lireAccentMobile,
  oklchVersHex,
  paletteAccent,
  schemaForce,
} from "../apparence";

/** Luminance relative WCAG d'un « #rrggbb ». */
function luminance(hex: string): number {
  const [r, g, b] = [1, 3, 5].map((i) => {
    const v = Number.parseInt(hex.slice(i, i + 2), 16) / 255;
    return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}
function contraste(a: string, b: string): number {
  const [x, y] = [luminance(a), luminance(b)].sort((p, q) => q - p);
  return (x + 0.05) / (y + 0.05);
}

describe("oklchVersHex", () => {
  it("donne le blanc et le noir aux extrêmes", () => {
    expect(oklchVersHex(1, 0, 0)).toBe("#ffffff");
    expect(oklchVersHex(0, 0, 0)).toBe("#000000");
  });

  it("retrouve des couleurs connues (à un cran près)", () => {
    // oklch(0.628 0.2577 29.23) = rouge pur #ff0000.
    expect(oklchVersHex(0.628, 0.2577, 29.23)).toMatch(/^#(ff|fe)0[0-2]0[0-2]$/);
    // Gris moyen : pas de teinte, mêmes canaux.
    const gris = oklchVersHex(0.6, 0, 120);
    expect(gris.slice(1, 3)).toBe(gris.slice(3, 5));
    expect(gris.slice(3, 5)).toBe(gris.slice(5, 7));
  });

  it("ramène dans la gamme sRGB au lieu de produire n'importe quoi", () => {
    expect(oklchVersHex(0.9, 0.4, 140)).toMatch(/^#[0-9a-f]{6}$/);
  });
});

describe("accents", () => {
  it("Android garde les couleurs du téléphone par défaut, les autres le bleu", () => {
    expect(accentParDefaut("android")).toBe(ACCENT_APPAREIL);
    expect(accentParDefaut("ios")).toBe("bleu");
    expect(accentParDefaut("web")).toBe("bleu");
  });

  it("lit un accent gardé, sinon le défaut", () => {
    expect(lireAccentMobile("rose", "ios")).toBe("rose");
    expect(lireAccentMobile("rose", "android")).toBe("rose");
    expect(lireAccentMobile(null, "ios")).toBe("bleu");
    expect(lireAccentMobile("violet", "android")).toBe(ACCENT_APPAREIL);
    expect(lireAccentMobile(ACCENT_APPAREIL, "android")).toBe(ACCENT_APPAREIL);
    // « Couleurs du téléphone » n'existe que sur Android.
    expect(lireAccentMobile(ACCENT_APPAREIL, "ios")).toBe("bleu");
  });

  it("chaque accent donne une couleur différente", () => {
    const vues = new Set(ACCENTS.map((a) => couleurPastille(a.id, "light")));
    expect(vues.size).toBe(ACCENTS.length);
  });

  it("le bleu par défaut reste proche de l'ancien bleu de l'app", () => {
    const p = paletteAccent("bleu", "light");
    expect(contraste(p.primary, "#2c5fa9")).toBeLessThan(1.3);
  });

  it.each(ACCENTS.map((a) => a.id))("%s : texte lisible en clair et en sombre (WCAG AA)", (id) => {
    for (const scheme of ["light", "dark"] as const) {
      const p = paletteAccent(id, scheme);
      expect(contraste(p.primary, p.primaryText)).toBeGreaterThanOrEqual(4.5);
      expect(contraste(p.text, p.background)).toBeGreaterThanOrEqual(7);
      expect(contraste(p.text, p.card)).toBeGreaterThanOrEqual(7);
      expect(contraste(p.muted, p.card)).toBeGreaterThanOrEqual(4.5);
      expect(contraste(p.accentText, p.accent)).toBeGreaterThanOrEqual(4.5);
      // Bouton principal visible sur le fond.
      expect(contraste(p.primary, p.background)).toBeGreaterThanOrEqual(3);
    }
  });

  it("le mode sombre est vraiment sombre", () => {
    for (const a of ACCENTS) {
      expect(luminance(paletteAccent(a.id, "dark").background)).toBeLessThan(0.03);
      expect(luminance(paletteAccent(a.id, "light").background)).toBeGreaterThan(0.85);
    }
  });
});

describe("schemaForce", () => {
  it("traduit le choix du profil pour le système", () => {
    expect(schemaForce("systeme")).toBe("unspecified");
    expect(schemaForce("clair")).toBe("light");
    expect(schemaForce("sombre")).toBe("dark");
  });
});

describe("couleurs des jours", () => {
  it("une couleur différente par jour, en clair et en sombre", () => {
    for (const scheme of ["light", "dark"] as const) {
      const set = new Set(([1, 2, 3, 4, 5, 6, 7] as const).map((j) => couleurJour(j, scheme)));
      expect(set.size).toBe(7);
    }
  });

  it("visibles sur le fond de carte", () => {
    for (const j of [1, 2, 3, 4, 5, 6, 7] as const) {
      expect(contraste(couleurJour(j, "light"), "#ffffff")).toBeGreaterThanOrEqual(2.5);
      expect(contraste(couleurJour(j, "dark"), "#1c1c1e")).toBeGreaterThanOrEqual(3);
    }
  });

  it("jourDeSemaine : lundi = 1, dimanche = 7, y compris au changement d'heure", () => {
    expect(jourDeSemaine("2026-11-09")).toBe(1);
    expect(jourDeSemaine("2026-11-15")).toBe(7);
    // 1er novembre 2026 : retour à l'heure normale (journée de 25 h), un dimanche.
    expect(jourDeSemaine("2026-11-01")).toBe(7);
    // 8 mars 2026 : passage à l'heure avancée (journée de 23 h), un dimanche.
    expect(jourDeSemaine("2026-03-08")).toBe(7);
    expect(jourDeSemaine("2026-03-09")).toBe(1);
  });
});
