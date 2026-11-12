import { describe, expect, it } from "vitest";

import { loginErrorCode, normalizeEmail, validateLogin } from "../auth";

describe("connexion mobile", () => {
  it("normalise le courriel", () => {
    expect(normalizeEmail("  Ali@Exemple.CA ")).toBe("ali@exemple.ca");
  });

  it("refuse un formulaire incomplet avant l'appel réseau", () => {
    expect(validateLogin("pas-un-courriel", "Secret123")).toBe("motdepasse");
    expect(validateLogin("ali@exemple.ca", "")).toBe("motdepasse");
    expect(validateLogin("ali@exemple.ca", "x".repeat(201))).toBe("motdepasse");
    expect(validateLogin("ali@exemple.ca", "Secret123")).toBeNull();
  });

  it("traduit les erreurs de Supabase en codes du site", () => {
    expect(loginErrorCode({ status: 429 })).toBe("limite");
    expect(loginErrorCode({ status: 400, code: "email_not_confirmed" })).toBe("confirmer");
    expect(loginErrorCode({ status: 400, code: "invalid_credentials" })).toBe("motdepasse");
    // Pas de réponse du serveur (hors ligne) : ce n'est pas un mauvais mot de passe.
    expect(loginErrorCode({ status: 0 })).toBe("echec");
    expect(loginErrorCode({})).toBe("echec");
  });
});
